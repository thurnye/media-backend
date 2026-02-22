import { ICreatePostData, IPost, IPostListArgs, IUpdatePostData } from '../interfaces/post.interface';
import { IPostReviewComment } from '../interfaces/postReviewComment.interface';
import { IPaginatedResult, IUser } from '../interfaces/user.interface';
import postRepository from '../repositories/post.repository';
import postReviewCommentRepository from '../repositories/postReviewComment.repository';
import workspaceRepository from '../repositories/workspace.repository';
import userRepository from '../repositories/user.repository';
import { WorkspaceRole } from '../config/enums/workspace.enums';
import { PostStatus } from '../config/enums/post.enums';
import { Permission } from '../config/enums/permission.enums';
import { requirePermission, requireMembership } from '../utils/rbac';
import { validateTransition } from '../utils/statusTransitions';
import { AppError } from '../errors/AppError';
import { GLOBAL_CONSTANTS } from '../config/constants/globalConstants';
import { CreatePostSchema, UpdatePostSchema, RejectPostSchema, validate } from '../validation/schemas';
import emailService from './email.service';

const { POST } = GLOBAL_CONSTANTS.ERROR_MESSAGE;

const toMemberIds = (members: Array<{ userId?: string } | string> = []): string[] => {
  const ids = members
    .map((member) => (typeof member === 'string' ? member : member?.userId))
    .filter((id): id is string => !!id);
  return Array.from(new Set(ids));
};

const getPostId = (post: IPost): string => String(post._id ?? '');

const getDisplayName = (user: IUser | null | undefined): string =>
  [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Someone';

const safeNotify = async (operation: () => Promise<void>) => {
  try {
    await operation();
  } catch (error) {
    console.error('Email notification failed:', error);
  }
};

const getUsersByIds = async (ids: string[]): Promise<Map<string, IUser>> => {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (!uniqueIds.length) return new Map();
  const users = await userRepository.findByIds(uniqueIds);
  return new Map(users.map((user: any) => [String(user._id), user as IUser]));
};

const getReviewerIdsFromPost = (post: IPost): string[] =>
  toMemberIds((post.approvalWorkflow?.requiredApprovers as any) ?? []);

const toWorkflowMembers = (
  members: Array<{ userId?: string; role?: WorkspaceRole } | string> = [],
  roleByUserId: Map<string, WorkspaceRole>,
  fallbackRole: WorkspaceRole | 'owner',
) => {
  const normalizedFallbackRole =
    fallbackRole === 'owner' ? WorkspaceRole.ADMIN : fallbackRole;

  return toMemberIds(members).map((id) => ({
    userId: id,
    role: roleByUserId.get(id) ?? normalizedFallbackRole,
  }));
};

const resolveFinalReviewStatus = (
  requiredReviewerIds: string[],
  approvedByIds: string[],
  rejectedByIds: string[],
  cancelledByIds: string[],
  archivedByIds: string[],
): PostStatus => {
  const decidedIds = new Set([
    ...approvedByIds,
    ...rejectedByIds,
    ...cancelledByIds,
    ...archivedByIds,
  ]);
  const allReviewersDecided =
    requiredReviewerIds.length > 0 &&
    requiredReviewerIds.every((reviewerId) => decidedIds.has(reviewerId));

  if (!allReviewersDecided) return PostStatus.PENDING_APPROVAL;
  if (archivedByIds.length > 0) return PostStatus.ARCHIVED;
  if (cancelledByIds.length > 0) return PostStatus.CANCELLED;
  if (rejectedByIds.some((id) => requiredReviewerIds.includes(id))) return PostStatus.REJECTED;
  if (requiredReviewerIds.every((id) => approvedByIds.includes(id))) return PostStatus.APPROVED;
  return PostStatus.PENDING_APPROVAL;
};

const postService = {
  /** Any workspace member can list posts. */
  getPosts: async (
    args: IPostListArgs,
    userId: string,
  ): Promise<IPaginatedResult<IPost>> => {
    await requireMembership(args.workspaceId, userId);
    return postRepository.findAll(args);
  },

  /** Any workspace member can read a single post. */
  getPostById: async (id: string, userId: string): Promise<IPost> => {
    const post = await postRepository.findById(id);
    if (!post) throw new AppError('NOT_FOUND', POST.POST_NOT_FOUND);

    await requireMembership(post.workspaceId, userId);
    return post;
  },

  /** Any workspace member can read post review comments. */
  getPostReviewComments: async (postId: string, userId: string): Promise<IPostReviewComment[]> => {
    const post = await postRepository.findById(postId);
    if (!post) throw new AppError('NOT_FOUND', POST.POST_NOT_FOUND);

    await requireMembership(post.workspaceId, userId);
    return postReviewCommentRepository.findByPostId(postId);
  },

  /** Any workspace member can add a review comment to a post. */
  addPostReviewComment: async (
    input: {
      postId: string;
      message: string;
      mediaIds?: string[];
      parentCommentId?: string | null;
    },
    userId: string,
  ): Promise<IPostReviewComment> => {
    const message = input.message?.trim();
    if (!message) throw new AppError('VALIDATION_ERROR', 'Comment message is required');

    const post = await postRepository.findById(input.postId);
    if (!post) throw new AppError('NOT_FOUND', POST.POST_NOT_FOUND);

    await requireMembership(post.workspaceId, userId);

    const created = await postReviewCommentRepository.create({
      workspaceId: post.workspaceId,
      postId: input.postId,
      authorId: userId,
      message,
      mediaIds: input.mediaIds ?? [],
      parentCommentId: input.parentCommentId ?? null,
    });

    const [postOwner, commenter] = await Promise.all([
      userRepository.findById(post.createdBy),
      userRepository.findById(userId),
    ]);
    const postId = getPostId(post);
    const commenterName = getDisplayName(commenter);

    if (postOwner?.email) {
      await safeNotify(() =>
        emailService.sendPostCommentToOwner(
          postOwner.email,
          post.title,
          commenterName,
          message,
          post.workspaceId,
          postId,
        ),
      );
    }

    if (input.parentCommentId) {
      const parentComment = await postReviewCommentRepository.findById(input.parentCommentId);
      if (parentComment?.authorId) {
        const parentAuthor = await userRepository.findById(parentComment.authorId);
        if (parentAuthor?.email && String(parentAuthor._id) !== String(postOwner?._id)) {
          await safeNotify(() =>
            emailService.sendCommentReplyToOwner(
              parentAuthor.email,
              post.title,
              commenterName,
              message,
              post.workspaceId,
              postId,
            ),
          );
        }
      }
    }

    return created;
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

    const isReviewerDecisionStatus =
      [PostStatus.CANCELLED, PostStatus.ARCHIVED].includes(data.status as PostStatus) &&
      [PostStatus.PENDING_APPROVAL, PostStatus.REJECTED].includes(post.status as PostStatus);
    const role = await requirePermission(
      post.workspaceId,
      userId,
      isReviewerDecisionStatus ? Permission.APPROVE_POST : Permission.UPDATE_POST,
    );

    if (!isReviewerDecisionStatus && role === WorkspaceRole.MANAGER && post.createdBy.toString() !== userId) {
      throw new AppError('FORBIDDEN', POST.NOT_OWNER);
    }

    if (isReviewerDecisionStatus) {
      const requiredReviewerIds = getReviewerIdsFromPost(post);
      if (!requiredReviewerIds.includes(userId)) {
        throw new AppError('FORBIDDEN', 'Only assigned reviewers can submit review decisions');
      }
    }

    const { requiredApprovers, ...rest } = data;
    const payload: IUpdatePostData = { ...rest };
    let workspace = null;
    const previousReviewerIds = getReviewerIdsFromPost(post);
    let newlyAddedReviewerIds: string[] = [];
    let nextRequiredApproverIds: string[] | null = null;

    if (requiredApprovers !== undefined) {
      workspace = await workspaceRepository.findById(post.workspaceId);
      const members = workspace?.members ?? [];
      const roleByUserId = new Map(members.map((member) => [member.userId, member.role]));
      const uniqueApproverIds = Array.from(new Set(requiredApprovers.filter(Boolean)));
      nextRequiredApproverIds = uniqueApproverIds;

      const invalidApproverIds = uniqueApproverIds.filter((reviewerId) => !roleByUserId.has(reviewerId));
      if (invalidApproverIds.length) {
        throw new AppError('VALIDATION_ERROR', 'All reviewers must belong to this workspace');
      }

      payload.approvalWorkflow = {
        ...(post.approvalWorkflow as any),
        requiredApprovers: uniqueApproverIds.map((reviewerId) => ({
          userId: reviewerId,
          role: roleByUserId.get(reviewerId) ?? WorkspaceRole.MEMBER,
        })),
      } as any;

      newlyAddedReviewerIds = uniqueApproverIds.filter((id) => !previousReviewerIds.includes(id));

      // If no reviewers remain, reset the workflow and send the post back to draft.
      if (uniqueApproverIds.length === 0) {
        payload.status = PostStatus.DRAFT;
        payload.approvalWorkflow = {
          ...(payload.approvalWorkflow as any),
          approvedBy: [],
          rejectedBy: [],
          cancelledBy: [],
          archivedBy: [],
        } as any;
      }
    }

    // Auto-submit for approval once at least one required reviewer is assigned.
    if (
      post.status === PostStatus.DRAFT &&
      !payload.status &&
      nextRequiredApproverIds !== null &&
      nextRequiredApproverIds.length > 0
    ) {
      payload.status = PostStatus.PENDING_APPROVAL;
    }

    // Enforce status transitions when status is being changed
    if (payload.status && payload.status !== post.status) {
      let nextStatus = payload.status as PostStatus;

      if (!workspace) workspace = await workspaceRepository.findById(post.workspaceId);
      const roleByUserId = new Map((workspace?.members ?? []).map((member) => [member.userId, member.role]));
      const workflow = (payload.approvalWorkflow ?? post.approvalWorkflow ?? {}) as any;

      if (
        isReviewerDecisionStatus &&
        [PostStatus.CANCELLED, PostStatus.ARCHIVED].includes(payload.status as PostStatus)
      ) {
        const approvedByIds = toMemberIds(workflow.approvedBy).filter((id) => id !== userId);
        const rejectedByIds = toMemberIds(workflow.rejectedBy).filter((id) => id !== userId);
        const cancelledByIds = toMemberIds(workflow.cancelledBy).filter((id) => id !== userId);
        const archivedByIds = toMemberIds(workflow.archivedBy).filter((id) => id !== userId);

        const nextCancelledByIds =
          payload.status === PostStatus.CANCELLED
            ? Array.from(new Set([...cancelledByIds, userId]))
            : cancelledByIds;
        const nextArchivedByIds =
          payload.status === PostStatus.ARCHIVED
            ? Array.from(new Set([...archivedByIds, userId]))
            : archivedByIds;

        workflow.approvedBy = toWorkflowMembers(approvedByIds, roleByUserId, role);
        workflow.rejectedBy = toWorkflowMembers(rejectedByIds, roleByUserId, role);
        workflow.cancelledBy = toWorkflowMembers(nextCancelledByIds, roleByUserId, role);
        workflow.archivedBy = toWorkflowMembers(nextArchivedByIds, roleByUserId, role);

        const requiredReviewerIds = toMemberIds(
          (workflow.requiredApprovers ?? post.approvalWorkflow?.requiredApprovers) as any,
        );
        nextStatus = resolveFinalReviewStatus(
          requiredReviewerIds,
          approvedByIds,
          rejectedByIds,
          nextCancelledByIds,
          nextArchivedByIds,
        );
      } else if (payload.status === PostStatus.ARCHIVED) {
        const memberIds = Array.from(new Set([...toMemberIds(workflow.archivedBy), userId]));
        workflow.archivedBy = memberIds.map((id) => ({
          userId: id,
          role: roleByUserId.get(id) ?? WorkspaceRole.MEMBER,
        }));
      }

      if (nextStatus === PostStatus.PENDING_APPROVAL) {
        const requiredReviewerIds = toMemberIds(
          (workflow.requiredApprovers ?? post.approvalWorkflow?.requiredApprovers) as any,
        );
        if (!requiredReviewerIds.length) {
          throw new AppError('VALIDATION_ERROR', 'Add at least one reviewer before moving to pending approval');
        }
      }

      if (
        [PostStatus.PENDING_APPROVAL, PostStatus.REJECTED].includes(post.status as PostStatus) &&
        nextStatus === PostStatus.APPROVED
      ) {
        const requiredReviewerIds = toMemberIds(
          (workflow.requiredApprovers ?? post.approvalWorkflow?.requiredApprovers) as any,
        );
        const approvedByIds = toMemberIds((workflow.approvedBy ?? post.approvalWorkflow?.approvedBy) as any);
        const rejectedByIds = toMemberIds((workflow.rejectedBy ?? post.approvalWorkflow?.rejectedBy) as any);
        const cancelledByIds = toMemberIds((workflow.cancelledBy ?? post.approvalWorkflow?.cancelledBy) as any);

        if (!requiredReviewerIds.length) {
          throw new AppError('VALIDATION_ERROR', 'No reviewers assigned for this post');
        }
        if (rejectedByIds.length || cancelledByIds.length) {
          throw new AppError('BAD_REQUEST', 'Post cannot be approved after a rejection or cancellation decision');
        }
        const allReviewersApproved = requiredReviewerIds.every((reviewerId) => approvedByIds.includes(reviewerId));
        if (!allReviewersApproved) {
          throw new AppError('BAD_REQUEST', 'All reviewers must approve before the post can move to approved');
        }
      }

      validateTransition(post.status as PostStatus, nextStatus);
      payload.status = nextStatus;
      payload.approvalWorkflow = workflow;
    }

    const updated = await postRepository.update(id, payload);

    if (updated && newlyAddedReviewerIds.length) {
      const newReviewers = await userRepository.findByIds(newlyAddedReviewerIds);
      const postId = getPostId(updated);
      await Promise.all(
        newReviewers
          .filter((reviewer) => !!reviewer.email)
          .map((reviewer) =>
            safeNotify(() =>
              emailService.sendReviewerAssigned(
                reviewer.email,
                getDisplayName(reviewer),
                updated.title,
                updated.workspaceId,
                postId,
              ),
            ),
          ),
      );
    }

    if (
      updated &&
      payload.status &&
      [PostStatus.CANCELLED, PostStatus.ARCHIVED].includes(payload.status as PostStatus)
    ) {
      const reviewerIds = getReviewerIdsFromPost(updated);
      const recipientIds = Array.from(new Set([...reviewerIds, updated.createdBy]));
      const usersById = await getUsersByIds(recipientIds);
      const actor = await userRepository.findById(userId);
      const action =
        payload.status === PostStatus.CANCELLED ? 'cancelled the post' : 'archived the post';
      const postId = getPostId(updated);

      await Promise.all(
        recipientIds
          .map((id) => usersById.get(id))
          .filter((u): u is IUser => !!u?.email)
          .map((recipient) =>
            safeNotify(() =>
              emailService.sendPostReviewUpdate(
                recipient.email,
                updated.title,
                action,
                getDisplayName(actor),
                updated.workspaceId,
                postId,
              ),
            ),
          ),
      );
    }

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

    const requiredReviewerIds = getReviewerIdsFromPost(post);
    if (requiredReviewerIds.length === 0) {
      throw new AppError('VALIDATION_ERROR', 'Add at least one reviewer before submitting for approval');
    }

    const updated = await postRepository.update(postId, {
      status: PostStatus.PENDING_APPROVAL,
      approvalWorkflow: {
        ...post.approvalWorkflow,
        approvedBy: [],
        rejectedBy: [],
        cancelledBy: [],
      },
    } as any);
    return updated!;
  },

  /** Approve a pending post. Requires APPROVE_POST permission. */
  approvePost: async (postId: string, userId: string): Promise<IPost> => {
    const post = await postRepository.findById(postId);
    if (!post) throw new AppError('NOT_FOUND', POST.POST_NOT_FOUND);
    if (post.status !== PostStatus.PENDING_APPROVAL && post.status !== PostStatus.REJECTED) {
      throw new AppError('BAD_REQUEST', 'Approvals are only allowed during active review');
    }

    const actorRole = await requirePermission(post.workspaceId, userId, Permission.APPROVE_POST);
    const workspace = await workspaceRepository.findById(post.workspaceId);
    const roleByUserId = new Map((workspace?.members ?? []).map((member) => [member.userId, member.role]));
    const requiredReviewerIds = getReviewerIdsFromPost(post);
    if (!requiredReviewerIds.length) {
      throw new AppError('VALIDATION_ERROR', 'No reviewers assigned for this post');
    }
    if (!requiredReviewerIds.includes(userId)) {
      throw new AppError('FORBIDDEN', 'Only assigned reviewers can approve this post');
    }

    const approvedByIds = Array.from(
      new Set([...toMemberIds(post.approvalWorkflow?.approvedBy as any).filter((id) => id !== userId), userId]),
    );
    const rejectedByIds = toMemberIds(post.approvalWorkflow?.rejectedBy as any).filter((id) => id !== userId);
    const cancelledByIds = toMemberIds(post.approvalWorkflow?.cancelledBy as any).filter((id) => id !== userId);
    const archivedByIds = toMemberIds(post.approvalWorkflow?.archivedBy as any).filter((id) => id !== userId);

    const approvedBy = toWorkflowMembers(approvedByIds, roleByUserId, actorRole);
    const rejectedBy = toWorkflowMembers(rejectedByIds, roleByUserId, actorRole);
    const cancelledBy = toWorkflowMembers(cancelledByIds, roleByUserId, actorRole);
    const archivedBy = toWorkflowMembers(archivedByIds, roleByUserId, actorRole);

    const nextStatus = resolveFinalReviewStatus(
      requiredReviewerIds,
      approvedByIds,
      rejectedByIds,
      cancelledByIds,
      archivedByIds,
    );
    const allReviewersApproved = nextStatus === PostStatus.APPROVED;

    if (post.status !== nextStatus) {
      validateTransition(post.status as PostStatus, nextStatus);
    }

    const updated = await postRepository.update(postId, {
      status: nextStatus,
      approvalWorkflow: { ...post.approvalWorkflow, approvedBy, rejectedBy, cancelledBy, archivedBy },
    } as any);

    if (updated) {
      const reviewerIds = getReviewerIdsFromPost(updated);
      const recipientIds = Array.from(new Set([...reviewerIds, updated.createdBy]));
      const usersById = await getUsersByIds(recipientIds);
      const actor = await userRepository.findById(userId);
      const postIdStr = getPostId(updated);

      await Promise.all(
        recipientIds
          .map((id) => usersById.get(id))
          .filter((u): u is IUser => !!u?.email)
          .map((recipient) =>
            safeNotify(() =>
              emailService.sendPostReviewUpdate(
                recipient.email,
                updated.title,
                allReviewersApproved ? 'approved the post' : 'approved their review',
                getDisplayName(actor),
                updated.workspaceId,
                postIdStr,
              ),
            ),
          ),
      );
    }

    return updated!;
  },

  /** Reject a pending post with a reason. Requires APPROVE_POST permission. */
  rejectPost: async (postId: string, reason: string, userId: string): Promise<IPost> => {
    const { error } = validate(RejectPostSchema, { reason });
    if (error) throw new AppError('VALIDATION_ERROR', error);

    const post = await postRepository.findById(postId);
    if (!post) throw new AppError('NOT_FOUND', POST.POST_NOT_FOUND);
    if (post.status !== PostStatus.PENDING_APPROVAL && post.status !== PostStatus.REJECTED) {
      throw new AppError('BAD_REQUEST', 'Rejections are only allowed during active review');
    }

    const actorRole = await requirePermission(post.workspaceId, userId, Permission.APPROVE_POST);
    const workspace = await workspaceRepository.findById(post.workspaceId);
    const roleByUserId = new Map((workspace?.members ?? []).map((member) => [member.userId, member.role]));
    const requiredReviewerIds = getReviewerIdsFromPost(post);
    if (!requiredReviewerIds.length) {
      throw new AppError('VALIDATION_ERROR', 'No reviewers assigned for this post');
    }
    if (!requiredReviewerIds.includes(userId)) {
      throw new AppError('FORBIDDEN', 'Only assigned reviewers can reject this post');
    }

    if (post.status !== PostStatus.REJECTED) {
      validateTransition(post.status as PostStatus, PostStatus.REJECTED);
    }

    const rejectedByIds = Array.from(
      new Set([...toMemberIds(post.approvalWorkflow?.rejectedBy as any).filter((id) => id !== userId), userId]),
    );
    const approvedByIds = toMemberIds(post.approvalWorkflow?.approvedBy as any).filter((id) => id !== userId);
    const cancelledByIds = toMemberIds(post.approvalWorkflow?.cancelledBy as any).filter((id) => id !== userId);
    const archivedByIds = toMemberIds(post.approvalWorkflow?.archivedBy as any).filter((id) => id !== userId);

    const rejectedBy = toWorkflowMembers(rejectedByIds, roleByUserId, actorRole);
    const approvedBy = toWorkflowMembers(approvedByIds, roleByUserId, actorRole);
    const cancelledBy = toWorkflowMembers(cancelledByIds, roleByUserId, actorRole);
    const archivedBy = toWorkflowMembers(archivedByIds, roleByUserId, actorRole);
    const comments = [
      ...(post.approvalWorkflow?.comments ?? []),
      { userId, message: reason, createdAt: new Date() },
    ];
    const nextStatus = resolveFinalReviewStatus(
      requiredReviewerIds,
      approvedByIds,
      rejectedByIds,
      cancelledByIds,
      archivedByIds,
    );
    if (post.status !== nextStatus) {
      validateTransition(post.status as PostStatus, nextStatus);
    }

    const updated = await postRepository.update(postId, {
      status: nextStatus,
      approvalWorkflow: { ...post.approvalWorkflow, approvedBy, rejectedBy, cancelledBy, archivedBy, comments },
    } as any);

    if (updated) {
      const reviewerIds = getReviewerIdsFromPost(updated);
      const recipientIds = Array.from(new Set([...reviewerIds, updated.createdBy]));
      const usersById = await getUsersByIds(recipientIds);
      const actor = await userRepository.findById(userId);
      const postIdStr = getPostId(updated);

      await Promise.all(
        recipientIds
          .map((id) => usersById.get(id))
          .filter((u): u is IUser => !!u?.email)
          .map((recipient) =>
            safeNotify(() =>
              emailService.sendPostReviewUpdate(
                recipient.email,
                updated.title,
                'rejected the post',
                getDisplayName(actor),
                updated.workspaceId,
                postIdStr,
              ),
            ),
          ),
      );
    }

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
