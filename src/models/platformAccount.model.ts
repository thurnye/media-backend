// src/models/platformAccount.model.ts

import mongoose, { Schema } from 'mongoose';
import { IPlatformAccount } from '../interfaces/platformAccount.interface';
import { AccountStatus } from '../config/enums/platformAccount';
import { PlatformType } from '../config/enums/platform.enums';

const PlatformAccountSchema = new Schema<IPlatformAccount>(
  {
    userId:       { type: String, required: true, index: true },
    workspaceIds: { type: [String], default: [], index: true },

    platform: { type: String, enum: Object.values(PlatformType), required: true },
    accountId: { type: String, required: true, index: true },
    displayName: { type: String, required: true },
    profilePictureUrl: { type: String },

    accessToken: { type: String, required: true },
    refreshToken: { type: String },
    tokenExpiresAt: { type: Date },

    status: {
      type: String,
      enum: Object.values(AccountStatus),
      default: AccountStatus.ACTIVE,
    },

    lastSyncAt: { type: Date },

    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// One user cannot connect the same social account twice
PlatformAccountSchema.index({ userId: 1, platform: 1, accountId: 1 }, { unique: true });

export default mongoose.model('PlatformAccount', PlatformAccountSchema);
