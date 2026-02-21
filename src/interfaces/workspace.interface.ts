import { WorkspaceRole } from "../config/enums/workspace.enums";

export type WorkspacePlan = 'free' | 'pro' | 'enterprise';

export interface IWorkspaceSettings {
  approvalRequired:   boolean;
  evergreenEnabled:   boolean;
  autoPublishEnabled: boolean;
}

export interface IWorkspaceMember {
  userId: string;
  role: WorkspaceRole;
  joinedAt: Date;
}

export interface IWorkspace {
  _id?: string;
  name: string;
  slug: string;
  description?: string;

  ownerId: string;
  members: IWorkspaceMember[];

  settings: IWorkspaceSettings;
  plan: WorkspacePlan;
  defaultTimezone?: string;
  isActive?: boolean;

  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export interface ICreateWorkspaceData {
  name: string;
  slug: string;
  description?: string;
  ownerId: string;
  defaultTimezone?: string;
  plan?: WorkspacePlan;
  settings?: Partial<IWorkspaceSettings>;
}

export interface IUpdateWorkspaceData extends Partial<Omit<ICreateWorkspaceData, 'ownerId'>> {
  members?: IWorkspaceMember[];
  isActive?: boolean;
  settings?: Partial<IWorkspaceSettings>;
  plan?: WorkspacePlan;
}