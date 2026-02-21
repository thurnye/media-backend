import mongoose, { Schema } from 'mongoose';
import { IUser } from '../interfaces/user.interface';
import { WorkspaceRole } from '../config/enums/workspace.enums';

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },

    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    avatarUrl: { type: String },
    phoneNumber: { type: String },
    dateOfBirth: { type: Date, required: true },

    workspaces: [
      {
        workspaceId: { type: String, required: true, index: true },
        role: {
          type: String,
          enum: Object.values(WorkspaceRole),
          default: WorkspaceRole.MEMBER,
        },
        joinedAt: { type: Date, default: () => new Date() },
      },
    ],

    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
    token: { type: String, default: null },
  },
  { timestamps: true },
);

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ 'workspaces.workspaceId': 1 });

export default mongoose.model('User', UserSchema);
