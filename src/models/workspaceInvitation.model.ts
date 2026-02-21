import { Schema, model } from 'mongoose';
import { WorkspaceRole } from '../config/enums/workspace.enums';
import { IWorkspaceInvitation } from '../interfaces/workspaceInvitation.interface';

const WorkspaceInvitationSchema = new Schema<IWorkspaceInvitation>(
  {
    workspaceId: { type: String, required: true, index: true },
    email:       { type: String, required: true },
    role:        { type: String, enum: Object.values(WorkspaceRole), default: WorkspaceRole.MEMBER },
    invitedBy:   { type: String, required: true },
    token:       { type: String, required: true, unique: true },
    status:      { type: String, enum: ['pending', 'accepted', 'expired'], default: 'pending' },
    expiresAt:   { type: Date, required: true },
  },
  { timestamps: true },
);

WorkspaceInvitationSchema.index({ workspaceId: 1, email: 1 });
WorkspaceInvitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default model<IWorkspaceInvitation>('WorkspaceInvitation', WorkspaceInvitationSchema);
