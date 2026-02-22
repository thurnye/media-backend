import { ICreatePostData, IUpdatePostData } from '../../interfaces/post.interface';
import { IPaginationArgs } from '../../interfaces/user.interface';
import { IContext } from '../../interfaces/auth.interface';
import postService from '../../services/post.service';
import mediaRepository from '../../repositories/media.repository';
import userRepository from '../../repositories/user.repository';
import { requireAuth } from '../middleware/auth.middleware';

const normalizeApprovalMemberIds = (members: Array<{ userId?: string } | string> = []) =>
  members
    .map((member) => (typeof member === 'string' ? member : member?.userId))
    .filter((id): id is string => !!id);

const mapUserSummary = (user: any) => ({
  id: user?._id?.toString?.() ?? null,
  firstName: user?.firstName ?? null,
  lastName: user?.lastName ?? null,
  email: user?.email ?? null,
  avatarUrl: user?.avatarUrl ?? null,
});

const resolveUserSummaries = async (ids: string[]) => {
  if (!ids.length) return [];
  const users = await userRepository.findByIds(Array.from(new Set(ids)));
  const userMap = new Map(users.map((user: any) => [user._id.toString(), user]));
  return ids.map((id) => mapUserSummary(userMap.get(id))).filter((user) => !!user.id);
};

export const postResolvers = {
  Post: {
    mediaUrls: async (parent: { mediaIds?: string[] }) => {
      const mediaIds = parent.mediaIds ?? [];
      if (!mediaIds.length) return [];
      const media = await mediaRepository.findByIds(mediaIds);
      return media.map((item) => item.url);
    },
    createdByUser: async (parent: { createdBy?: string }) => {
      if (!parent.createdBy) return null;
      const user = await userRepository.findById(parent.createdBy);
      return mapUserSummary(user);
    },
  },
  ApprovalWorkflow: {
    requiredApprovers: (parent: { requiredApprovers?: Array<{ userId?: string } | string> }) =>
      normalizeApprovalMemberIds(parent.requiredApprovers),
    requiredApproverUsers: async (parent: { requiredApprovers?: Array<{ userId?: string } | string> }) =>
      resolveUserSummaries(normalizeApprovalMemberIds(parent.requiredApprovers)),
    approvedBy: (parent: { approvedBy?: Array<{ userId?: string } | string> }) =>
      normalizeApprovalMemberIds(parent.approvedBy),
    approvedByUsers: async (parent: { approvedBy?: Array<{ userId?: string } | string> }) =>
      resolveUserSummaries(normalizeApprovalMemberIds(parent.approvedBy)),
    rejectedBy: (parent: { rejectedBy?: Array<{ userId?: string } | string> }) =>
      normalizeApprovalMemberIds(parent.rejectedBy),
    rejectedByUsers: async (parent: { rejectedBy?: Array<{ userId?: string } | string> }) =>
      resolveUserSummaries(normalizeApprovalMemberIds(parent.rejectedBy)),
    cancelledBy: (parent: { cancelledBy?: Array<{ userId?: string } | string>; cancelledBY?: Array<{ userId?: string } | string> }) =>
      normalizeApprovalMemberIds(parent.cancelledBy ?? parent.cancelledBY),
    cancelledByUsers: async (parent: { cancelledBy?: Array<{ userId?: string } | string>; cancelledBY?: Array<{ userId?: string } | string> }) =>
      resolveUserSummaries(normalizeApprovalMemberIds(parent.cancelledBy ?? parent.cancelledBY)),
    archivedBy: (parent: { archivedBy?: Array<{ userId?: string } | string> }) =>
      normalizeApprovalMemberIds(parent.archivedBy),
    archivedByUsers: async (parent: { archivedBy?: Array<{ userId?: string } | string> }) =>
      resolveUserSummaries(normalizeApprovalMemberIds(parent.archivedBy)),
  },
  ApprovalComment: {
    user: async (parent: { userId?: string }) => {
      if (!parent.userId) return null;
      const user = await userRepository.findById(parent.userId);
      return mapUserSummary(user);
    },
  },
  PostReviewComment: {
    author: async (parent: { authorId?: string }) => {
      if (!parent.authorId) return null;
      const user = await userRepository.findById(parent.authorId);
      return mapUserSummary(user);
    },
    mediaUrls: async (parent: { mediaIds?: string[] }) => {
      const mediaIds = parent.mediaIds ?? [];
      if (!mediaIds.length) return [];
      const media = await mediaRepository.findByIds(mediaIds);
      return media.map((item) => item.url);
    },
  },
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
    postReviewComments: async (_: unknown, { postId }: { postId: string }, ctx: IContext) => {
      const userId = await requireAuth(ctx);
      return postService.getPostReviewComments(postId, userId);
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
    addPostReviewComment: async (
      _: unknown,
      {
        postId,
        message,
        mediaIds,
        parentCommentId,
      }: {
        postId: string;
        message: string;
        mediaIds?: string[];
        parentCommentId?: string | null;
      },
      ctx: IContext,
    ) => {
      const userId = await requireAuth(ctx);
      return postService.addPostReviewComment(
        { postId, message, mediaIds, parentCommentId: parentCommentId ?? null },
        userId,
      );
    },
  },
};
