// src/interfaces/platformAccount.interface.ts

import { PlatformType } from "../config/enums/platform.enums";
import { AccountStatus } from "../config/enums/platformAccount";



export interface IPlatformAccount {
  _id?: string;
  workspaceId: string;           // workspace this account belongs to
  platform: PlatformType;        // e.g., 'facebook', 'instagram'
  accountId: string;             // ID from social media platform
  displayName: string;           // Account name, e.g., "Acme FB Page"
  profilePictureUrl?: string;

  accessToken: string;           // OAuth token or API key
  refreshToken?: string;         // If supported

  status: AccountStatus;
  lastSyncAt?: Date;             // last time we refreshed info from API

  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export interface ICreatePlatformAccountData
  extends Omit<IPlatformAccount, '_id' | 'status' | 'lastSyncAt' | 'createdAt' | 'updatedAt' | 'deletedAt'> {}

export interface IUpdatePlatformAccountData extends Partial<ICreatePlatformAccountData> {
  status?: AccountStatus;
}