import workspaceRepository from '../repositories/workspace.repository';
import userRepository from '../repositories/user.repository';
import { IWorkspace, ICreateWorkspaceData, IUpdateWorkspaceData } from '../interfaces/workspace.interface';
import { WorkspaceRole } from '../config/enums/workspace.enums';
import { Permission } from '../config/enums/permission.enums';
import { requirePermission, requireMembership } from '../utils/rbac';
import { AppError } from '../errors/AppError';
import { GLOBAL_CONSTANTS } from '../config/constants/globalConstants';
import { CreateWorkspaceSchema, UpdateWorkspaceSchema, validate } from '../validation/schemas';

const { WORKSPACE } = GLOBAL_CONSTANTS.ERROR_MESSAGE;

const workspaceService = {
  /** Returns all workspaces the caller belongs to (as owner or member). */
  getWorkspaces: (userId: string): Promise<IWorkspace[]> =>
    workspaceRepository.findByUserId(userId),

  /** Any workspace member can view the workspace. */
  getWorkspace: async (id: string, userId: string): Promise<IWorkspace> => {
    await requireMembership(id, userId);
    const workspace = await workspaceRepository.findById(id);
    return workspace!;
  },

  /** Any authenticated user can create a workspace; creator becomes owner + ADMIN. */
  createWorkspace: async (data: Omit<ICreateWorkspaceData, 'ownerId'>, userId: string): Promise<IWorkspace> => {
    const { error } = validate(CreateWorkspaceSchema, data);
    if (error) throw new AppError('VALIDATION_ERROR', error);

    const joinedAt = new Date();
    const workspace = await workspaceRepository.create({
      ...data,
      ownerId: userId,
      members: [{ userId, role: WorkspaceRole.ADMIN, joinedAt }],
    });

    // Sync the workspace reference back onto the User document so auth
    // queries (login / me) can return it in user.workspaces[].
    await userRepository.addWorkspace(userId, {
      workspaceId: (workspace as any)._id.toString(),
      role:        WorkspaceRole.ADMIN,
      joinedAt,
    });

    return workspace;
  },

  /** ADMIN and MANAGER can update workspace settings. */
  updateWorkspace: async (id: string, data: IUpdateWorkspaceData, userId: string): Promise<IWorkspace> => {
    const { error } = validate(UpdateWorkspaceSchema, data);
    if (error) throw new AppError('VALIDATION_ERROR', error);

    await requirePermission(id, userId, Permission.MANAGE_WORKSPACE);

    const updated = await workspaceRepository.update(id, data);
    return updated!;
  },

  /** Only ADMIN (or owner) can delete the workspace. */
  deleteWorkspace: async (id: string, userId: string): Promise<IWorkspace> => {
    await requirePermission(id, userId, Permission.DELETE_WORKSPACE);

    const deleted = await workspaceRepository.softDelete(id);
    return deleted!;
  },

  /** Only ADMIN can add members. */
  addMember: async (workspaceId: string, targetUserId: string, role: WorkspaceRole = WorkspaceRole.MEMBER, callerId: string): Promise<IWorkspace> => {
    await requirePermission(workspaceId, callerId, Permission.MANAGE_USERS);

    const workspace = await workspaceRepository.findById(workspaceId);
    const alreadyMember = workspace!.members.some(m => m.userId === targetUserId);
    if (alreadyMember) throw new AppError('BAD_REQUEST', WORKSPACE.MEMBER_ALREADY_EXISTS);

    const updated = await workspaceRepository.addMember(workspaceId, {
      userId: targetUserId, role, joinedAt: new Date(),
    });
    return updated!;
  },

  /** Only ADMIN can remove members; the owner cannot be removed. */
  removeMember: async (workspaceId: string, targetUserId: string, callerId: string): Promise<IWorkspace> => {
    await requirePermission(workspaceId, callerId, Permission.MANAGE_USERS);

    const workspace = await workspaceRepository.findById(workspaceId);
    if (targetUserId === workspace!.ownerId) throw new AppError('BAD_REQUEST', 'Cannot remove the workspace owner');

    const exists = workspace!.members.some(m => m.userId === targetUserId);
    if (!exists) throw new AppError('NOT_FOUND', WORKSPACE.MEMBER_NOT_FOUND);

    const updated = await workspaceRepository.removeMember(workspaceId, targetUserId);
    return updated!;
  },

  /** Only ADMIN can change member roles; the owner's role cannot be changed. */
  updateMemberRole: async (workspaceId: string, targetUserId: string, role: WorkspaceRole, callerId: string): Promise<IWorkspace> => {
    await requirePermission(workspaceId, callerId, Permission.MANAGE_USERS);

    const workspace = await workspaceRepository.findById(workspaceId);
    if (targetUserId === workspace!.ownerId) throw new AppError('BAD_REQUEST', 'Cannot change the workspace owner\'s role');

    const exists = workspace!.members.some(m => m.userId === targetUserId);
    if (!exists) throw new AppError('NOT_FOUND', WORKSPACE.MEMBER_NOT_FOUND);

    const updated = await workspaceRepository.updateMemberRole(workspaceId, targetUserId, role);
    return updated!;
  },
};

export default workspaceService;
