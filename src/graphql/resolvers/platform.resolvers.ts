import { IContext } from '../../interfaces/auth.interface';
import platformAccountService from '../../services/platformAccount.service';
import platformPostService from '../../services/platformPost.service';
import { requireAuth } from '../middleware/auth.middleware';

export const platformResolvers = {
  Query: {
    platformAccounts: async (
      _: unknown,
      { workspaceId }: { workspaceId: string },
      ctx: IContext,
    ) => {
      const userId = await requireAuth(ctx);
      return platformAccountService.getPlatformAccounts(workspaceId, userId);
    },
    platformAccount: async (_: unknown, { id }: { id: string }, ctx: IContext) => {
      const userId = await requireAuth(ctx);
      return platformAccountService.getPlatformAccount(id, userId);
    },
    platformPosts: async (
      _: unknown,
      { postId }: { postId: string },
      ctx: IContext,
    ) => {
      const userId = await requireAuth(ctx);
      return platformPostService.getPlatformPostsByPost(postId, userId);
    },
    platformPost: async (_: unknown, { id }: { id: string }, ctx: IContext) => {
      const userId = await requireAuth(ctx);
      return platformPostService.getPlatformPost(id, userId);
    },
  },
  Mutation: {
    connectPlatformAccount: async (
      _: unknown,
      args: { workspaceId: string; platform: string; accountId: string; displayName: string; accessToken: string; refreshToken?: string; profilePictureUrl?: string },
      ctx: IContext,
    ) => {
      const userId = await requireAuth(ctx);
      return platformAccountService.connectPlatformAccount(args as any, userId);
    },
    updatePlatformAccount: async (
      _: unknown,
      { id, ...data }: { id: string; displayName?: string; accessToken?: string; refreshToken?: string; profilePictureUrl?: string; status?: string },
      ctx: IContext,
    ) => {
      const userId = await requireAuth(ctx);
      return platformAccountService.updatePlatformAccount(id, data as any, userId);
    },
    disconnectPlatformAccount: async (_: unknown, { id }: { id: string }, ctx: IContext) => {
      const userId = await requireAuth(ctx);
      return platformAccountService.disconnectPlatformAccount(id, userId);
    },
    createPlatformPost: async (
      _: unknown,
      args: { postId: string; platform: string; accountId: string; caption: string; hashtags?: string[]; firstComment?: string; scheduledAt?: string; timezone?: string },
      ctx: IContext,
    ) => {
      const userId = await requireAuth(ctx);
      return platformPostService.createPlatformPost(args, userId);
    },
    updatePlatformPost: async (
      _: unknown,
      args: { id: string; caption?: string; hashtags?: string[]; scheduledAt?: string; status?: string },
      ctx: IContext,
    ) => {
      const userId = await requireAuth(ctx);
      return platformPostService.updatePlatformPost(args, userId);
    },
    deletePlatformPost: async (_: unknown, { id }: { id: string }, ctx: IContext) => {
      const userId = await requireAuth(ctx);
      return platformPostService.deletePlatformPost(id, userId);
    },
  },
};
