import platformPostRepository from '../repositories/platformPost.repository';
import postRepository from '../repositories/post.repository';
import { IPlatformPost, ICreatePlatformPostData, IUpdatePlatformPostData } from '../interfaces/platform.interface';
import { PlatformType, PublishingStatus, ContentType } from '../config/enums/platform.enums';
import { Permission } from '../config/enums/permission.enums';
import { requirePermission, requireMembership } from '../utils/rbac';
import { AppError } from '../errors/AppError';
import { GLOBAL_CONSTANTS } from '../config/constants/globalConstants';
import { CreatePlatformPostSchema, UpdatePlatformPostSchema, CreatePlatformPostBatchSchema, validate } from '../validation/schemas';
import userRepository from '../repositories/user.repository';
import emailService from './email.service';
import { logger } from '../config/logger';

const { POST, PLATFORM_POST } = GLOBAL_CONSTANTS.ERROR_MESSAGE;

const safeNotify = async (operation: () => Promise<void>) => {
  try {
    await operation();
  } catch (error) {
    logger.warn({ error }, 'Publish result email notification failed');
  }
};

const toMemberIds = (members: Array<{ userId?: string } | string> = []): string[] => {
  const ids = members
    .map((member) => (typeof member === 'string' ? member : member?.userId))
    .filter((id): id is string => !!id);
  return Array.from(new Set(ids));
};

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
  media?: Array<{
    type: 'image' | 'video' | 'carousel';
    url: string;
    altText?: string;
    thumbnailUrl?: string;
  }>;
  status?: string;
  scheduledAt?: string;
  timezone?: string;
}

interface IUpdatePlatformPostInput {
  id: string;
  caption?: string;
  hashtags?: string[];
  media?: Array<{
    type: 'image' | 'video' | 'carousel';
    url: string;
    altText?: string;
    thumbnailUrl?: string;
  }>;
  scheduledAt?: string;
  status?: string;
}

type NullableUpdatePlatformPostInput = {
  id: string | null;
  caption?: string | null;
  hashtags?: Array<string | null> | null;
  media?: Array<{
    type: 'image' | 'video' | 'carousel' | null;
    url: string | null;
    altText?: string | null;
    thumbnailUrl?: string | null;
  } | null> | null;
  scheduledAt?: string | null;
  status?: string | null;
};

const nullToUndefined = <T>(value: T | null | undefined): T | undefined =>
  value === null ? undefined : value;

function sanitizeUpdateInput(input: NullableUpdatePlatformPostInput): IUpdatePlatformPostInput {
  const sanitizedMedia = nullToUndefined(input.media)?.filter((item): item is NonNullable<typeof item> => item !== null)
    .flatMap((item) => {
      const type = nullToUndefined(item.type);
      const url = nullToUndefined(item.url);
      if (!type || !url) return [];
      return [{
        type,
        url,
        altText: nullToUndefined(item.altText),
        thumbnailUrl: nullToUndefined(item.thumbnailUrl),
      }];
    });

  const sanitizedHashtags = nullToUndefined(input.hashtags)
    ?.map((tag) => nullToUndefined(tag))
    .filter((tag): tag is string => tag !== undefined);

  return {
    id: input.id ?? '',
    caption: nullToUndefined(input.caption),
    hashtags: sanitizedHashtags,
    media: sanitizedMedia,
    scheduledAt: nullToUndefined(input.scheduledAt),
    status: nullToUndefined(input.status),
  };
}

function normalizeMediaItems(
  media?: Array<{
    type: 'image' | 'video' | 'carousel';
    url: string;
    altText?: string;
    thumbnailUrl?: string;
  }>,
) {
  if (!media?.length) return [];
  return media.map((item) => ({
    ...item,
    type:
      item.type === 'video'
        ? ContentType.VIDEO
        : item.type === 'carousel'
          ? ContentType.CAROUSEL
          : ContentType.IMAGE,
  }));
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

    const targetStatus =
      (input.status as PublishingStatus) ??
      (input.scheduledAt ? PublishingStatus.SCHEDULED : PublishingStatus.PUBLISHING);

    const data: ICreatePlatformPostData = {
      postId:    input.postId,
      platform:  input.platform as PlatformType,
      accountId: input.accountId,
      content: {
        caption:      input.caption,
        hashtags:     input.hashtags,
        firstComment: input.firstComment,
        media:        normalizeMediaItems(input.media),
      },
      publishing: {
        status:      targetStatus,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
        timezone:    input.timezone,
      },
      isActive: true,
    };

    const created = await platformPostRepository.create(data);

    // Immediate publish path for "publish now"; scheduled/draft remain queued.
    if (targetStatus === PublishingStatus.PUBLISHING && created._id) {
      return platformPostService.publishNow(created._id, userId);
    }

    return created;
  },

  /** ADMIN and MANAGER can update a per-platform post (reschedule, edit caption, etc.). */
  updatePlatformPost: async (input: IUpdatePlatformPostInput, userId: string): Promise<IPlatformPost> => {
    const normalizedInput = sanitizeUpdateInput(input as unknown as NullableUpdatePlatformPostInput);

    const { error } = validate(UpdatePlatformPostSchema, normalizedInput);
    if (error) throw new AppError('VALIDATION_ERROR', error);

    const platformPost = await platformPostRepository.findById(normalizedInput.id);
    if (!platformPost) throw new AppError('NOT_FOUND', PLATFORM_POST.NOT_FOUND);

    const workspaceId = await getWorkspaceIdForPost(platformPost.postId);
    await requirePermission(workspaceId, userId, Permission.PUBLISH_POST);

    const data: IUpdatePlatformPostData = {};

    if (normalizedInput.caption !== undefined || normalizedInput.hashtags !== undefined || normalizedInput.media !== undefined) {
      data.content = {
        ...platformPost.content,
        ...(normalizedInput.caption  !== undefined ? { caption:  normalizedInput.caption }  : {}),
        ...(normalizedInput.hashtags !== undefined ? { hashtags: normalizedInput.hashtags } : {}),
        ...(normalizedInput.media !== undefined ? { media: normalizeMediaItems(normalizedInput.media) } : {}),
      };
    }

    if (normalizedInput.scheduledAt !== undefined || normalizedInput.status !== undefined) {
      data.publishing = {
        ...platformPost.publishing,
        ...(normalizedInput.status      !== undefined ? { status:      normalizedInput.status as PublishingStatus }  : {}),
        ...(normalizedInput.scheduledAt !== undefined ? { scheduledAt: new Date(normalizedInput.scheduledAt) }        : {}),
      };
    }

    const updated = await platformPostRepository.update(normalizedInput.id, data);
    if (!updated) throw new AppError('NOT_FOUND', PLATFORM_POST.NOT_FOUND);

    // If caller explicitly moved this post to "publishing", execute immediate publish.
    if (normalizedInput.status === PublishingStatus.PUBLISHING) {
      return platformPostService.publishNow(normalizedInput.id, userId);
    }

    return updated;
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
        media?: Array<{
          type: 'image' | 'video' | 'carousel';
          url: string;
          altText?: string;
          thumbnailUrl?: string;
        }>;
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
          media:        normalizeMediaItems(entry.media),
        },
        publishing: {
          status:      input.scheduledAt ? PublishingStatus.SCHEDULED : PublishingStatus.PUBLISHING,
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
  publishNow: async (platformPostId: string, triggeredByUserId?: string): Promise<IPlatformPost> => {
    const platformPost = await platformPostRepository.findById(platformPostId);
    if (!platformPost) throw new AppError('NOT_FOUND', PLATFORM_POST.NOT_FOUND);
    const post = await postRepository.findById(platformPost.postId);
    if (!post) throw new AppError('NOT_FOUND', POST.POST_NOT_FOUND);
    const postId = String(post._id ?? platformPost.postId);
    const reviewerIds = toMemberIds((post.approvalWorkflow?.requiredApprovers as any) ?? []);
    const recipientIds = Array.from(
      new Set([
        post.createdBy,
        ...reviewerIds,
        ...(triggeredByUserId ? [triggeredByUserId] : []),
      ]),
    );
    const recipients = await userRepository.findByIds(recipientIds);
    const recipientEmails = Array.from(
      new Set(
        recipients
          .map((user) => user.email)
          .filter((email): email is string => !!email),
      ),
    );

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
      const publishedAt = new Date();
      const updated = await platformPostRepository.update(platformPostId, {
        publishing: {
          ...platformPost.publishing,
          status: PublishingStatus.PUBLISHED,
          publishedAt,
          platformPostId: result.platformPostId,
        },
      });

      await Promise.all(
        recipientEmails.map((email) =>
          safeNotify(() =>
            emailService.sendPlatformPublishResult(email, {
              postTitle: post.title,
              platform: platformPost.platform,
              status: 'published',
              workspaceId: post.workspaceId,
              postId,
              publishedAt,
            }),
          ),
        ),
      );
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

    await Promise.all(
      recipientEmails.map((email) =>
        safeNotify(() =>
          emailService.sendPlatformPublishResult(email, {
            postTitle: post.title,
            platform: platformPost.platform,
            status: 'failed',
            workspaceId: post.workspaceId,
            postId,
            error: result.error,
          }),
        ),
      ),
    );
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
