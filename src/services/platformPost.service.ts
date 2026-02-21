import platformPostRepository from '../repositories/platformPost.repository';
import postRepository from '../repositories/post.repository';
import { IPlatformPost, ICreatePlatformPostData, IUpdatePlatformPostData } from '../interfaces/platform.interface';
import { PlatformType, PublishingStatus } from '../config/enums/platform.enums';
import { Permission } from '../config/enums/permission.enums';
import { requirePermission, requireMembership } from '../utils/rbac';
import { AppError } from '../errors/AppError';
import { GLOBAL_CONSTANTS } from '../config/constants/globalConstants';
import { CreatePlatformPostSchema, UpdatePlatformPostSchema, CreatePlatformPostBatchSchema, validate } from '../validation/schemas';

const { POST, PLATFORM_POST } = GLOBAL_CONSTANTS.ERROR_MESSAGE;

/** Returns the workspaceId for a post, throwing if the post doesn't exist. */
async function getWorkspaceIdForPost(postId: string): Promise<string> {
  const post = await postRepository.findById(postId);
  if (!post) throw new AppError('NOT_FOUND', POST.POST_NOT_FOUND);
  return post.workspaceId;
}

interface ICreatePlatformPostInput {
  postId: string;
  platform: string;
  accountId: string;
  caption: string;
  hashtags?: string[];
  firstComment?: string;
  scheduledAt?: string;
  timezone?: string;
}

interface IUpdatePlatformPostInput {
  id: string;
  caption?: string;
  hashtags?: string[];
  scheduledAt?: string;
  status?: string;
}

const platformPostService = {
  /** Any workspace member can list per-platform posts for a given post. */
  getPlatformPostsByPost: async (postId: string, userId: string): Promise<IPlatformPost[]> => {
    const workspaceId = await getWorkspaceIdForPost(postId);
    await requireMembership(workspaceId, userId);
    return platformPostRepository.findByPostId(postId);
  },

  /** Any workspace member can view a single platform post. */
  getPlatformPost: async (id: string, userId: string): Promise<IPlatformPost> => {
    const platformPost = await platformPostRepository.findById(id);
    if (!platformPost) throw new AppError('NOT_FOUND', PLATFORM_POST.NOT_FOUND);

    const workspaceId = await getWorkspaceIdForPost(platformPost.postId);
    await requireMembership(workspaceId, userId);
    return platformPost;
  },

  /** ADMIN and MANAGER can create per-platform posts (schedule/publish). */
  createPlatformPost: async (input: ICreatePlatformPostInput, userId: string): Promise<IPlatformPost> => {
    const { error } = validate(CreatePlatformPostSchema, input);
    if (error) throw new AppError('VALIDATION_ERROR', error);

    const workspaceId = await getWorkspaceIdForPost(input.postId);
    await requirePermission(workspaceId, userId, Permission.PUBLISH_POST);

    const data: ICreatePlatformPostData = {
      postId:    input.postId,
      platform:  input.platform as PlatformType,
      accountId: input.accountId,
      content: {
        caption:      input.caption,
        hashtags:     input.hashtags,
        firstComment: input.firstComment,
        media:        [],
      },
      publishing: {
        status:      PublishingStatus.DRAFT,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
        timezone:    input.timezone,
      },
      isActive: true,
    };

    return platformPostRepository.create(data);
  },

  /** ADMIN and MANAGER can update a per-platform post (reschedule, edit caption, etc.). */
  updatePlatformPost: async (input: IUpdatePlatformPostInput, userId: string): Promise<IPlatformPost> => {
    const { error } = validate(UpdatePlatformPostSchema, input);
    if (error) throw new AppError('VALIDATION_ERROR', error);

    const platformPost = await platformPostRepository.findById(input.id);
    if (!platformPost) throw new AppError('NOT_FOUND', PLATFORM_POST.NOT_FOUND);

    const workspaceId = await getWorkspaceIdForPost(platformPost.postId);
    await requirePermission(workspaceId, userId, Permission.PUBLISH_POST);

    const data: IUpdatePlatformPostData = {};

    if (input.caption !== undefined || input.hashtags !== undefined) {
      data.content = {
        ...platformPost.content,
        ...(input.caption  !== undefined ? { caption:  input.caption }  : {}),
        ...(input.hashtags !== undefined ? { hashtags: input.hashtags } : {}),
      };
    }

    if (input.scheduledAt !== undefined || input.status !== undefined) {
      data.publishing = {
        ...platformPost.publishing,
        ...(input.status      !== undefined ? { status:      input.status as PublishingStatus }  : {}),
        ...(input.scheduledAt !== undefined ? { scheduledAt: new Date(input.scheduledAt) }        : {}),
      };
    }

    const updated = await platformPostRepository.update(input.id, data);
    return updated!;
  },

  /** Batch create platform posts for multiple accounts at once. */
  createPlatformPostsBatch: async (
    input: {
      postId: string;
      entries: Array<{
        platform: string;
        accountId: string;
        caption: string;
        hashtags?: string[];
        firstComment?: string;
      }>;
      scheduledAt?: string;
      timezone?: string;
    },
    userId: string,
  ): Promise<IPlatformPost[]> => {
    const { error } = validate(CreatePlatformPostBatchSchema, input);
    if (error) throw new AppError('VALIDATION_ERROR', error);

    const workspaceId = await getWorkspaceIdForPost(input.postId);
    await requirePermission(workspaceId, userId, Permission.PUBLISH_POST);

    const results: IPlatformPost[] = [];
    for (const entry of input.entries) {
      const data: ICreatePlatformPostData = {
        postId:    input.postId,
        platform:  entry.platform as PlatformType,
        accountId: entry.accountId,
        content: {
          caption:      entry.caption,
          hashtags:     entry.hashtags,
          firstComment: entry.firstComment,
          media:        [],
        },
        publishing: {
          status:      input.scheduledAt ? PublishingStatus.SCHEDULED : PublishingStatus.DRAFT,
          scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
          timezone:    input.timezone,
        },
        isActive: true,
      };
      const created = await platformPostRepository.create(data);
      results.push(created);
    }

    // Link platform post IDs to the parent post
    const postIds = results.map(r => r._id!);
    await postRepository.update(input.postId, {
      platformPostIds: postIds,
    } as any);

    return results;
  },

  /** Publish a platform post immediately using the mock publisher. Internal use. */
  publishNow: async (platformPostId: string): Promise<IPlatformPost> => {
    const platformPost = await platformPostRepository.findById(platformPostId);
    if (!platformPost) throw new AppError('NOT_FOUND', PLATFORM_POST.NOT_FOUND);

    // Mark as publishing
    await platformPostRepository.update(platformPostId, {
      publishing: { ...platformPost.publishing, status: PublishingStatus.PUBLISHING },
    });

    // Get account with decrypted tokens
    const platformAccountService = (await import('./platformAccount.service')).default;
    const account = await platformAccountService.refreshTokenIfNeeded(platformPost.accountId);

    // Publish via mock publisher
    const mockPublisher = (await import('./publishers/mock.publisher')).default;
    const result = await mockPublisher.publish(account, platformPost.content);

    if (result.success) {
      const updated = await platformPostRepository.update(platformPostId, {
        publishing: {
          ...platformPost.publishing,
          status: PublishingStatus.PUBLISHED,
          publishedAt: new Date(),
          platformPostId: result.platformPostId,
        },
      });
      return updated!;
    }

    // Failed
    const updated = await platformPostRepository.update(platformPostId, {
      publishing: { ...platformPost.publishing, status: PublishingStatus.FAILED },
      deliveryTracking: {
        attempts: (platformPost.deliveryTracking?.attempts ?? 0) + 1,
        lastAttemptAt: new Date(),
        success: false,
        failureReason: result.error,
      },
    } as any);
    return updated!;
  },

  /** Only ADMIN can delete a per-platform post. */
  deletePlatformPost: async (id: string, userId: string): Promise<IPlatformPost> => {
    const platformPost = await platformPostRepository.findById(id);
    if (!platformPost) throw new AppError('NOT_FOUND', PLATFORM_POST.NOT_FOUND);

    const workspaceId = await getWorkspaceIdForPost(platformPost.postId);
    await requirePermission(workspaceId, userId, Permission.DELETE_POST);

    const deleted = await platformPostRepository.softDelete(id);
    return deleted!;
  },
};

export default platformPostService;
