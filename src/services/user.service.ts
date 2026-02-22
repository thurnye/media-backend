import bcrypt from 'bcryptjs';
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
import { GLOBAL_CONSTANTS } from '../config/constants/globalConstants';
import { AppError } from '../errors/AppError';
import { CreateUserSchema, LoginSchema, UpdateUserSchema, validate } from '../validation/schemas';

const { USER, AUTH } = GLOBAL_CONSTANTS.ERROR_MESSAGE;
const { ERROR_CODE } = GLOBAL_CONSTANTS;

const userService = {
  getAllUsers: (args: IPaginationArgs): Promise<IPaginatedResult<IUser>> =>
    userRepository.findAll(args),

  createUser: async (args: ICreateUserInput): Promise<IAuthPayload> => {
    const { error } = validate(CreateUserSchema, args);
    if (error) throw new AppError('VALIDATION_ERROR', error);

    const existing = await userRepository.findByEmail(args.email);
    if (existing) throw new AppError('EMAIL_IN_USE', USER.EMAIL_ALREADY_IN_USE);

    const hashedPassword = await bcrypt.hash(args.password, 10);
    const user = await userRepository.create({ ...args, password: hashedPassword });

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
};

export default userService;
