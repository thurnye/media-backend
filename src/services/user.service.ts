import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import userRepository from '../repositories/user.repository';
import {
  ICreateUserInput,
  IPaginatedResult,
  IPaginationArgs,
  IUpdateUserInput,
  IUser,
} from '../interfaces/user.interface';
import { IAuthPayload, ILoginInput } from '../interfaces/auth.interface';
import authService from './auth.service';
import emailService from './email.service';
import { GLOBAL_CONSTANTS } from '../config/constants/globalConstants';
import { AppError } from '../errors/AppError';
import { logger } from '../config/logger';
import {
  CreateUserSchema,
  LoginSchema,
  RequestPasswordResetSchema,
  ResetPasswordSchema,
  UpdateUserSchema,
  VerifyEmailSchema,
  validate,
} from '../validation/schemas';
import { assertPasswordIsStrong } from '../utils/passwordSecurity';

const { USER, AUTH } = GLOBAL_CONSTANTS.ERROR_MESSAGE;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:4200';
const EMAIL_VERIFY_EXPIRY_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_EXPIRY_MS = 60 * 60 * 1000;

const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

const buildEmailVerificationUrl = (token: string): string =>
  `${CLIENT_URL}/verify-email?token=${encodeURIComponent(token)}`;

const buildPasswordResetUrl = (token: string): string =>
  `${CLIENT_URL}/reset-password?token=${encodeURIComponent(token)}`;

const userService = {
  getAllUsers: (args: IPaginationArgs): Promise<IPaginatedResult<IUser>> =>
    userRepository.findAll(args),

  createUser: async (args: ICreateUserInput): Promise<IAuthPayload> => {
    const { error } = validate(CreateUserSchema, args);
    if (error) throw new AppError('VALIDATION_ERROR', error);

    const existing = await userRepository.findByEmail(args.email);
    if (existing) throw new AppError('EMAIL_IN_USE', USER.EMAIL_ALREADY_IN_USE);

    await assertPasswordIsStrong(args.password);

    const hashedPassword = await bcrypt.hash(args.password, 10);
    const rawVerifyToken = crypto.randomBytes(32).toString('hex');
    const user = await userRepository.create({
      ...args,
      password: hashedPassword,
      isEmailVerified: false,
      emailVerificationTokenHash: hashToken(rawVerifyToken),
      emailVerificationExpiresAt: new Date(Date.now() + EMAIL_VERIFY_EXPIRY_MS),
    });

    try {
      await emailService.sendEmailVerification(
        user.email,
        user.firstName,
        buildEmailVerificationUrl(rawVerifyToken),
      );
    } catch (error) {
      logger.warn(
        {
          event: 'email_verification_send_failed',
          userId: String(user._id),
          email: user.email,
          error: error instanceof Error ? error.message : 'unknown',
        },
        'Verification email delivery failed after signup',
      );
    }

    return {
      token: '',
      user: {
        id:        String(user._id),
        email:     user.email,
        firstName: user.firstName,
        lastName:  user.lastName,
        avatarUrl: user.avatarUrl,
        isEmailVerified: user.isEmailVerified,
      },
    };
  },

  loginUser: async ({ email, password }: ILoginInput): Promise<IAuthPayload> => {
    const { error } = validate(LoginSchema, { email, password });
    if (error) throw new AppError('VALIDATION_ERROR', error);

    const user = await userRepository.findByEmail(email);
    if (!user) throw new AppError('INVALID_CREDENTIALS', AUTH.INVALID_CREDENTIALS);

    const valid = await bcrypt.compare(password, user.password!);
    if (!valid) throw new AppError('INVALID_CREDENTIALS', AUTH.INVALID_LOGIN_CREDENTIALS);
    if (!user.isEmailVerified) {
      throw new AppError('FORBIDDEN', 'Email not verified. Please verify your email first.');
    }

    const token = authService.generateToken(String(user._id));
    await userRepository.saveToken(String(user._id), token);

    return {
      token,
      user: {
        id:        String(user._id),
        email:     user.email,
        firstName: user.firstName,
        lastName:  user.lastName,
        avatarUrl: user.avatarUrl,
        isEmailVerified: user.isEmailVerified,
      },
    };
  },

  logoutUser: async (userId: string): Promise<boolean> => {
    await userRepository.saveToken(userId, null);
    return true;
  },

  getUserById: async (userId: string): Promise<IUser> => {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError('NOT_FOUND', USER.USER_NOT_FOUND);
    return user;
  },

  updateUser: async (userId: string, fields: IUpdateUserInput): Promise<IUser> => {
    const { error } = validate(UpdateUserSchema, fields);
    if (error) throw new AppError('VALIDATION_ERROR', error);

    const user = await userRepository.findById(userId);
    if (!user) throw new AppError('NOT_FOUND', USER.USER_NOT_FOUND);

    const updated = await userRepository.update(userId, fields);
    return updated!;
  },

  deleteUser: async (targetId: string): Promise<IUser> => {
    const user = await userRepository.findById(targetId);
    if (!user) throw new AppError('NOT_FOUND', USER.USER_NOT_FOUND);

    const deleted = await userRepository.update(targetId, { isActive: false, deletedAt: new Date() });
    return deleted!;
  },

  verifyEmail: async (token: string): Promise<boolean> => {
    const { error } = validate(VerifyEmailSchema, { token });
    if (error) throw new AppError('VALIDATION_ERROR', error);

    const hashed = hashToken(token);
    const user = await userRepository.findByEmailVerificationHash(hashed);
    if (!user || !user.emailVerificationExpiresAt || user.emailVerificationExpiresAt < new Date()) {
      throw new AppError('BAD_REQUEST', 'Verification link is invalid or expired');
    }

    await userRepository.update(String(user._id), {
      isEmailVerified: true,
      emailVerificationTokenHash: null,
      emailVerificationExpiresAt: null,
    });
    return true;
  },

  requestPasswordReset: async (email: string): Promise<boolean> => {
    const { error } = validate(RequestPasswordResetSchema, { email });
    if (error) throw new AppError('VALIDATION_ERROR', error);

    const user = await userRepository.findByEmail(email);
    if (!user) return true;

    const rawResetToken = crypto.randomBytes(32).toString('hex');
    await userRepository.update(String(user._id), {
      passwordResetTokenHash: hashToken(rawResetToken),
      passwordResetExpiresAt: new Date(Date.now() + PASSWORD_RESET_EXPIRY_MS),
    });

    await emailService.sendPasswordReset(
      user.email,
      user.firstName,
      buildPasswordResetUrl(rawResetToken),
    );
    return true;
  },

  resetPassword: async (token: string, newPassword: string): Promise<boolean> => {
    const { error } = validate(ResetPasswordSchema, { token, newPassword });
    if (error) throw new AppError('VALIDATION_ERROR', error);

    await assertPasswordIsStrong(newPassword);

    const hashedToken = hashToken(token);
    const user = await userRepository.findByPasswordResetHash(hashedToken);
    if (!user || !user.passwordResetExpiresAt || user.passwordResetExpiresAt < new Date()) {
      throw new AppError('BAD_REQUEST', 'Password reset link is invalid or expired');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await userRepository.update(String(user._id), {
      password: hashedPassword,
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
      token: null,
    });
    return true;
  },
};

export default userService;
