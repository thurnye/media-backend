import { IContext } from '../../interfaces/auth.interface';
import { GLOBAL_CONSTANTS } from '../../config/constants/globalConstants';
import userRepository from '../../repositories/user.repository';
import { AppError } from '../../errors/AppError';

const { AUTH } = GLOBAL_CONSTANTS.ERROR_MESSAGE;

export async function requireAuth(context: IContext): Promise<string> {
  if (!context.userId || !context.token) {
    throw new AppError('UNAUTHENTICATED', AUTH.UNAUTHORIZED);
  }

  const user = await userRepository.findById(context.userId);
  if (!user || user.token !== context.token) {
    throw new AppError('UNAUTHENTICATED', AUTH.UNAUTHORIZED);
  }
  return context.userId;
}
