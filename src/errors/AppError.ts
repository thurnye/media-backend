import { GLOBAL_CONSTANTS } from '../config/constants/globalConstants';

export type ErrorCode = keyof typeof GLOBAL_CONSTANTS.ERROR_CODE;

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
