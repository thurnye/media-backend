import { WorkspaceRole } from '../config/enums/workspace.enums';

export type InvitationStatus = 'pending' | 'accepted' | 'expired';

export interface IWorkspaceInvitation {
  _id?: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  invitedBy: string;
  token: string;
  status: InvitationStatus;
  expiresAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICreateWorkspaceInvitationData {
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  invitedBy: string;
  token: string;
  expiresAt: Date;
}
