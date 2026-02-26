import { Document } from 'mongoose';
import { WorkspaceRole } from '../config/enums/workspace.enums';

export interface IPaginationArgs {
  page?: number;
  limit?: number;
}

export interface IPaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

export interface IUser {
  _id?: string;

  // Auth info
  email: string;
  password: string;

  // Profile
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  phoneNumber?: string;
  dateOfBirth: Date;

  // Multi-workspace membership
  workspaces: {
    workspaceId: string;
    role: WorkspaceRole;
    joinedAt: Date;
  }[];
  
  token?: string;
  isEmailVerified?: boolean;
  emailVerificationTokenHash?: string | null;
  emailVerificationExpiresAt?: Date | null;
  passwordResetTokenHash?: string | null;
  passwordResetExpiresAt?: Date | null;

  isActive?: boolean;

  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

// For creating a user
export interface ICreateUserData {
  email: string;
  password: string;
  dateOfBirth: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  phoneNumber?: string;

  workspaces?: {
    workspaceId: string;
    role: WorkspaceRole;
  }[];
  isEmailVerified?: boolean;
  emailVerificationTokenHash?: string | null;
  emailVerificationExpiresAt?: Date | null;
  passwordResetTokenHash?: string | null;
  passwordResetExpiresAt?: Date | null;
}

// For updating a user
export interface IUpdateUserInput extends Partial<ICreateUserData> {
  isActive?: boolean;
  deletedAt?: Date | null;
  token?: string | null;
  isEmailVerified?: boolean;
  emailVerificationTokenHash?: string | null;
  emailVerificationExpiresAt?: Date | null;
  passwordResetTokenHash?: string | null;
  passwordResetExpiresAt?: Date | null;
}

export interface ICreateUserInput extends Omit<ICreateUserData, 'workspaces'> {}
