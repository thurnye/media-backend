import { IContext } from '../../interfaces/auth.interface';
import { WorkspaceRole } from '../../config/enums/workspace.enums';
import { WorkspacePlan } from '../../interfaces/workspace.interface';
import workspaceService from '../../services/workspace.service';
import { requireAuth } from '../middleware/auth.middleware';

export const workspaceResolvers = {
  Query: {
    workspaces: async (_: unknown, __: unknown, ctx: IContext) => {
      const userId = await requireAuth(ctx);
      return workspaceService.getWorkspaces(userId);
    },
    workspace: async (_: unknown, { id }: { id: string }, ctx: IContext) => {
      const userId = await requireAuth(ctx);
      return workspaceService.getWorkspace(id, userId);
    },
  },
  Mutation: {
    createWorkspace: async (
      _: unknown,
      args: { name: string; slug: string; description?: string; defaultTimezone?: string; plan?: string; settings?: any },
      ctx: IContext,
    ) => {
      const userId = await requireAuth(ctx);
      return workspaceService.createWorkspace({ ...args, plan: args.plan as WorkspacePlan }, userId);
    },
    updateWorkspace: async (
      _: unknown,
      { id, ...data }: { id: string; name?: string; slug?: string; description?: string; defaultTimezone?: string; plan?: string; settings?: any },
      ctx: IContext,
    ) => {
      const userId = await requireAuth(ctx);
      return workspaceService.updateWorkspace(id, { ...data, plan: data.plan as WorkspacePlan }, userId);
    },
    deleteWorkspace: async (_: unknown, { id }: { id: string }, ctx: IContext) => {
      const userId = await requireAuth(ctx);
      return workspaceService.deleteWorkspace(id, userId);
    },
    addWorkspaceMember: async (
      _: unknown,
      { workspaceId, userId: memberId, role }: { workspaceId: string; userId: string; role: string },
      ctx: IContext,
    ) => {
      const callerId = await requireAuth(ctx);
      return workspaceService.addMember(workspaceId, memberId, role as WorkspaceRole, callerId);
    },
    removeWorkspaceMember: async (
      _: unknown,
      { workspaceId, userId: memberId }: { workspaceId: string; userId: string },
      ctx: IContext,
    ) => {
      const callerId = await requireAuth(ctx);
      return workspaceService.removeMember(workspaceId, memberId, callerId);
    },
    updateMemberRole: async (
      _: unknown,
      { workspaceId, userId: memberId, role }: { workspaceId: string; userId: string; role: string },
      ctx: IContext,
    ) => {
      const callerId = await requireAuth(ctx);
      return workspaceService.updateMemberRole(workspaceId, memberId, role as WorkspaceRole, callerId);
    },
  },
};
