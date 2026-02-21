// src/models/platformAccount.model.ts

import mongoose, { Schema } from 'mongoose';
import { IPlatformAccount } from '../interfaces/platformAccount.interface';
import { AccountStatus } from '../config/enums/platformAccount';
import { PlatformType } from '../config/enums/platform.enums';

const PlatformAccountSchema = new Schema<IPlatformAccount>(
  {
    workspaceId: { type: String, required: true, index: true },

    platform: { type: String, enum: Object.values(PlatformType), required: true },
    accountId: { type: String, required: true, index: true },
    displayName: { type: String, required: true },
    profilePictureUrl: { type: String },

    accessToken: { type: String, required: true },
    refreshToken: { type: String },

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

// Compound index for workspace + platform lookup
PlatformAccountSchema.index({ workspaceId: 1, platform: 1, accountId: 1 });

export default mongoose.model('PlatformAccount', PlatformAccountSchema);