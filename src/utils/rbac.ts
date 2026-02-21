import workspaceRepository from '../repositories/workspace.repository';
import { WorkspaceRole } from '../config/enums/workspace.enums';
import { Permission, rolePermissions } from '../config/enums/permission.enums';
import { AppError } from '../errors/AppError';
import { GLOBAL_CONSTANTS } from '../config/constants/globalConstants';

const { WORKSPACE, AUTH } = GLOBAL_CONSTANTS.ERROR_MESSAGE;

/**
 * Verifies the caller holds the given permission inside a workspace.
 * Workspace owner implicitly has every permission.
 *
 * @returns The caller's role ('owner' | WorkspaceRole) so services can apply
 *          additional conditional logic (e.g. "manager may only edit own posts").
 */
export async function requirePermission(
  workspaceId: string,
  userId: string,
  permission: Permission,
): Promise<WorkspaceRole | 'owner'> {
  const workspace = await workspaceRepository.findById(workspaceId);
  if (!workspace) throw new AppError('NOT_FOUND', WORKSPACE.NOT_FOUND);

  if (workspace.ownerId === userId) return 'owner';

  const member = workspace.members.find(m => m.userId === userId);
  if (!member) throw new AppError('FORBIDDEN', WORKSPACE.NOT_MEMBER);

  if (!rolePermissions[member.role]?.includes(permission)) {
    throw new AppError('FORBIDDEN', AUTH.FORBIDDEN);
  }

  return member.role;
}

/**
 * Verifies the caller is any member (owner or role) of the workspace.
 * Use this for read-only operations that any member may perform.
 */
export async function requireMembership(workspaceId: string, userId: string): Promise<void> {
  const workspace = await workspaceRepository.findById(workspaceId);
  if (!workspace) throw new AppError('NOT_FOUND', WORKSPACE.NOT_FOUND);

  const isMember =
    workspace.ownerId === userId ||
    workspace.members.some(m => m.userId === userId);

  if (!isMember) throw new AppError('FORBIDDEN', WORKSPACE.NOT_MEMBER);
}
