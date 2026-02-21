// src/interfaces/platformAccount.interface.ts

import { PlatformType } from "../config/enums/platform.enums";
import { AccountStatus } from "../config/enums/platformAccount";



export interface IPlatformAccount {
  _id?: string;
  userId: string;              // the user who owns (connected) this account
  workspaceIds: string[];      // workspaces this account is linked to
  platform: PlatformType;      // e.g., 'facebook', 'instagram'
  accountId: string;           // ID from social media platform
  displayName: string;         // Account name, e.g., "Acme FB Page"
  profilePictureUrl?: string;

  accessToken: string;         // OAuth token or API key (encrypted at rest)
  refreshToken?: string;       // If supported (encrypted at rest)
  tokenExpiresAt?: Date;       // When the access token expires

  status: AccountStatus;
  lastSyncAt?: Date;           // last time we refreshed info from API

  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export interface ICreatePlatformAccountData
  extends Omit<IPlatformAccount, '_id' | 'status' | 'lastSyncAt' | 'createdAt' | 'updatedAt' | 'deletedAt'> {}

export interface IUpdatePlatformAccountData extends Partial<Omit<ICreatePlatformAccountData, 'userId' | 'platform' | 'accountId'>> {
  status?: AccountStatus;
}
