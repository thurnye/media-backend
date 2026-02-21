import { WorkspaceRole } from './workspace.enums';

// ─── Permission definitions ───────────────────────────────────────────────────

export enum Permission {
  // Posts
  CREATE_POST  = 'create_post',
  UPDATE_POST  = 'update_post',
  DELETE_POST  = 'delete_post',
  APPROVE_POST = 'approve_post',
  PUBLISH_POST = 'publish_post',

  // Platform accounts
  MANAGE_ACCOUNTS = 'manage_accounts',
  DELETE_ACCOUNT  = 'delete_account',

  // Workspace members
  MANAGE_USERS = 'manage_users',

  // Workspace settings
  MANAGE_WORKSPACE = 'manage_workspace',
  DELETE_WORKSPACE = 'delete_workspace',

  // Analytics
  VIEW_ANALYTICS = 'view_analytics',
}

// ─── Role → permissions map ───────────────────────────────────────────────────

export const rolePermissions: Record<WorkspaceRole, Permission[]> = {
  [WorkspaceRole.ADMIN]: Object.values(Permission),

  [WorkspaceRole.MANAGER]: [
    Permission.CREATE_POST,
    Permission.UPDATE_POST,
    Permission.APPROVE_POST,
    Permission.PUBLISH_POST,
    Permission.MANAGE_ACCOUNTS,
    Permission.MANAGE_WORKSPACE,
    Permission.VIEW_ANALYTICS,
  ],

  [WorkspaceRole.MEMBER]: [
    Permission.APPROVE_POST,
    Permission.VIEW_ANALYTICS,
  ],
};
