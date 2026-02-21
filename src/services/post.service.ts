import { ICreatePostData, IPost, IUpdatePostData } from '../interfaces/post.interface';
import { IPaginatedResult, IPaginationArgs } from '../interfaces/user.interface';
import postRepository from '../repositories/post.repository';
import workspaceRepository from '../repositories/workspace.repository';
import { WorkspaceRole } from '../config/enums/workspace.enums';
import { PostStatus } from '../config/enums/post.enums';
import { Permission } from '../config/enums/permission.enums';
import { requirePermission, requireMembership } from '../utils/rbac';
import { validateTransition } from '../utils/statusTransitions';
import { AppError } from '../errors/AppError';
import { GLOBAL_CONSTANTS } from '../config/constants/globalConstants';
import { CreatePostSchema, UpdatePostSchema, RejectPostSchema, validate } from '../validation/schemas';

const { POST } = GLOBAL_CONSTANTS.ERROR_MESSAGE;

const postService = {
  /** Any workspace member can list posts. */
  getPosts: async (
    args: IPaginationArgs & { workspaceId: string },
    userId: string,
  ): Promise<IPaginatedResult<IPost>> => {
    await requireMembership(args.workspaceId, userId);
    return postRepository.findAll(args, args.workspaceId);
  },

  /** Any workspace member can read a single post. */
  getPostById: async (id: string, userId: string): Promise<IPost> => {
    const post = await postRepository.findById(id);
    if (!post) throw new AppError('NOT_FOUND', POST.POST_NOT_FOUND);

    await requireMembership(post.workspaceId, userId);
    return post;
  },

  /** ADMIN and MANAGER can create posts. */
  createPost: async (data: ICreatePostData, userId: string): Promise<IPost> => {
    const { error } = validate(CreatePostSchema, data);
    if (error) throw new AppError('VALIDATION_ERROR', error);

    await requirePermission(data.workspaceId, userId, Permission.CREATE_POST);

    return postRepository.create({ ...data, createdBy: userId });
  },

  /**
   * ADMIN and MANAGER can update posts.
   * MANAGER may only update posts they created.
   * Status changes are validated against allowed transitions.
   */
  updatePost: async (id: string, data: IUpdatePostData, userId: string): Promise<IPost> => {
    const { error } = validate(UpdatePostSchema, data);
    if (error) throw new AppError('VALIDATION_ERROR', error);

    const post = await postRepository.findById(id);
    if (!post) throw new AppError('NOT_FOUND', POST.POST_NOT_FOUND);

    const role = await requirePermission(post.workspaceId, userId, Permission.UPDATE_POST);

    if (role === WorkspaceRole.MANAGER && post.createdBy.toString() !== userId) {
      throw new AppError('FORBIDDEN', POST.NOT_OWNER);
    }

    // Enforce status transitions when status is being changed
    if (data.status && data.status !== post.status) {
      validateTransition(post.status as PostStatus, data.status as PostStatus);
    }

    const updated = await postRepository.update(id, data);
    return updated!;
  },

  /** Only ADMIN can delete posts. */
  deletePost: async (id: string, userId: string): Promise<IPost> => {
    const post = await postRepository.findById(id);
    if (!post) throw new AppError('NOT_FOUND', POST.POST_NOT_FOUND);

    await requirePermission(post.workspaceId, userId, Permission.DELETE_POST);

    const deleted = await postRepository.delete(id);
    return deleted!;
  },

  /**
   * Submit a draft post for approval.
   * If workspace doesn't require approval, skips straight to approved.
   */
  submitForApproval: async (postId: string, userId: string): Promise<IPost> => {
    const post = await postRepository.findById(postId);
    if (!post) throw new AppError('NOT_FOUND', POST.POST_NOT_FOUND);

    await requirePermission(post.workspaceId, userId, Permission.CREATE_POST);

    validateTransition(post.status as PostStatus, PostStatus.PENDING_APPROVAL);

    // Check if workspace requires approval
    const workspace = await workspaceRepository.findById(post.workspaceId);
    const requiresApproval = workspace?.settings?.approvalRequired ?? false;

    const newStatus = requiresApproval ? PostStatus.PENDING_APPROVAL : PostStatus.APPROVED;

    const updated = await postRepository.update(postId, { status: newStatus });
    return updated!;
  },

  /** Approve a pending post. Requires APPROVE_POST permission. */
  approvePost: async (postId: string, userId: string): Promise<IPost> => {
    const post = await postRepository.findById(postId);
    if (!post) throw new AppError('NOT_FOUND', POST.POST_NOT_FOUND);

    await requirePermission(post.workspaceId, userId, Permission.APPROVE_POST);

    validateTransition(post.status as PostStatus, PostStatus.APPROVED);

    const approvedBy = [...(post.approvalWorkflow?.approvedBy ?? []), userId];
    const updated = await postRepository.update(postId, {
      status: PostStatus.APPROVED,
      approvalWorkflow: { ...post.approvalWorkflow, approvedBy },
    } as any);
    return updated!;
  },

  /** Reject a pending post with a reason. Requires APPROVE_POST permission. */
  rejectPost: async (postId: string, reason: string, userId: string): Promise<IPost> => {
    const { error } = validate(RejectPostSchema, { reason });
    if (error) throw new AppError('VALIDATION_ERROR', error);

    const post = await postRepository.findById(postId);
    if (!post) throw new AppError('NOT_FOUND', POST.POST_NOT_FOUND);

    await requirePermission(post.workspaceId, userId, Permission.APPROVE_POST);

    validateTransition(post.status as PostStatus, PostStatus.REJECTED);

    const rejectedBy = [...(post.approvalWorkflow?.rejectedBy ?? []), userId];
    const comments = [
      ...(post.approvalWorkflow?.comments ?? []),
      { userId, message: reason, createdAt: new Date() },
    ];
    const updated = await postRepository.update(postId, {
      status: PostStatus.REJECTED,
      approvalWorkflow: { ...post.approvalWorkflow, rejectedBy, comments },
    } as any);
    return updated!;
  },
  /** Update recycle settings for an evergreen post. */
  updateRecycleSettings: async (
    postId: string,
    settings: { enabled: boolean; intervalDays: number; maxRepeats: number },
    userId: string,
  ): Promise<IPost> => {
    const post = await postRepository.findById(postId);
    if (!post) throw new AppError('NOT_FOUND', POST.POST_NOT_FOUND);

    await requirePermission(post.workspaceId, userId, Permission.UPDATE_POST);

    const nextRecycleAt = settings.enabled
      ? new Date(Date.now() + settings.intervalDays * 24 * 60 * 60 * 1000)
      : undefined;

    const updated = await postRepository.update(postId, {
      isEvergreen: settings.enabled,
      recycleSettings: { ...settings, nextRecycleAt },
    } as any);
    return updated!;
  },
};

export default postService;
