import { ICreatePostData, IUpdatePostData } from '../../interfaces/post.interface';
import { IPaginationArgs } from '../../interfaces/user.interface';
import { IContext } from '../../interfaces/auth.interface';
import postService from '../../services/post.service';
import { requireAuth } from '../middleware/auth.middleware';

export const postResolvers = {
  Query: {
    posts: async (
      _: unknown,
      args: IPaginationArgs & { workspaceId: string },
      ctx: IContext,
    ) => {
      const userId = await requireAuth(ctx);
      return postService.getPosts(args, userId);
    },
    post: async (_: unknown, { id }: { id: string }, ctx: IContext) => {
      const userId = await requireAuth(ctx);
      return postService.getPostById(id, userId);
    },
  },
  Mutation: {
    createPost: async (_: unknown, args: Record<string, unknown>, ctx: IContext) => {
      const userId = await requireAuth(ctx);
      return postService.createPost({ ...args, createdBy: userId } as ICreatePostData, userId);
    },
    updatePost: async (_: unknown, { id, ...data }: Record<string, unknown>, ctx: IContext) => {
      const userId = await requireAuth(ctx);
      return postService.updatePost(id as string, data as IUpdatePostData, userId);
    },
    deletePost: async (_: unknown, { id }: { id: string }, ctx: IContext) => {
      const userId = await requireAuth(ctx);
      return postService.deletePost(id, userId);
    },
    submitForApproval: async (_: unknown, { postId }: { postId: string }, ctx: IContext) => {
      const userId = await requireAuth(ctx);
      return postService.submitForApproval(postId, userId);
    },
    approvePost: async (_: unknown, { postId }: { postId: string }, ctx: IContext) => {
      const userId = await requireAuth(ctx);
      return postService.approvePost(postId, userId);
    },
    rejectPost: async (_: unknown, { postId, reason }: { postId: string; reason: string }, ctx: IContext) => {
      const userId = await requireAuth(ctx);
      return postService.rejectPost(postId, reason, userId);
    },
    updateRecycleSettings: async (
      _: unknown,
      { postId, ...settings }: { postId: string; enabled: boolean; intervalDays: number; maxRepeats: number },
      ctx: IContext,
    ) => {
      const userId = await requireAuth(ctx);
      return postService.updateRecycleSettings(postId, settings, userId);
    },
  },
};
