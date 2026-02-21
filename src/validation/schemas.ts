import { z } from 'zod';

// ─── User schemas ────────────────────────────────────────────────────────────

export const CreateUserSchema = z.object({
  firstName:   z.string().min(1, { message: 'First name is required' }),
  lastName:    z.string().min(1, { message: 'Last name is required' }),
  email:       z.string().email(),
  password:    z.string().min(6, { message: 'Password must be at least 6 characters' }),
  dateOfBirth: z.string().min(1, { message: 'Date of birth is required' }),
});

export const LoginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1, { message: 'Password is required' }),
});

export const UpdateUserSchema = z
  .object({
    firstName:   z.string().min(1, { message: 'First name cannot be empty' }).optional(),
    lastName:    z.string().min(1, { message: 'Last name cannot be empty' }).optional(),
    email:       z.string().email().optional(),
    dateOfBirth: z.string().min(1, { message: 'Date of birth cannot be empty' }).optional(),
  })
  .refine(data => Object.keys(data).length > 0, { message: 'No fields provided to update' });

// ─── Post schemas ─────────────────────────────────────────────────────────────

export const CreatePostSchema = z.object({
  workspaceId: z.string().min(1, { message: 'Workspace ID is required' }),
  title:       z.string().min(1, { message: 'Post title is required' }).max(200, { message: 'Title must be 200 characters or fewer' }),
  description: z.string().max(5000, { message: 'Description must be 5000 characters or fewer' }).optional(),
  category:    z.string().max(100).optional(),
  tags:        z.array(z.string()).optional(),
  priority:    z.enum(['low', 'medium', 'high']).optional(),
  isEvergreen: z.boolean().optional(),
});

export const UpdatePostSchema = z
  .object({
    title:       z.string().min(1, { message: 'Title cannot be empty' }).max(200).optional(),
    description: z.string().max(5000).optional(),
    category:    z.string().max(100).optional(),
    tags:        z.array(z.string()).optional(),
    priority:    z.enum(['low', 'medium', 'high']).optional(),
    status:      z.enum(['draft', 'pending_approval', 'approved', 'rejected', 'scheduled', 'publishing', 'partially_published', 'published', 'failed', 'cancelled', 'archived']).optional(),
    isEvergreen: z.boolean().optional(),
  })
  .refine(data => Object.keys(data).length > 0, { message: 'No fields provided to update' });

// ─── Workspace schemas ────────────────────────────────────────────────────────

const WorkspaceSettingsSchema = z.object({
  approvalRequired:   z.boolean().optional(),
  evergreenEnabled:   z.boolean().optional(),
  autoPublishEnabled: z.boolean().optional(),
});

export const CreateWorkspaceSchema = z.object({
  name:            z.string().min(1, { message: 'Workspace name is required' }).max(100),
  slug:            z.string().min(1, { message: 'Slug is required' }).max(100)
                     .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'Slug must be lowercase alphanumeric with hyphens' }),
  description:     z.string().max(500).optional(),
  defaultTimezone: z.string().optional(),
  plan:            z.enum(['free', 'pro', 'enterprise']).optional(),
  settings:        WorkspaceSettingsSchema.optional(),
});

export const UpdateWorkspaceSchema = z
  .object({
    name:            z.string().min(1, { message: 'Name cannot be empty' }).max(100).optional(),
    slug:            z.string().min(1).max(100)
                       .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'Slug must be lowercase alphanumeric with hyphens' }).optional(),
    description:     z.string().max(500).optional(),
    defaultTimezone: z.string().optional(),
    plan:            z.enum(['free', 'pro', 'enterprise']).optional(),
    settings:        WorkspaceSettingsSchema.optional(),
  })
  .refine(data => Object.keys(data).length > 0, { message: 'No fields provided to update' });

// ─── PlatformAccount schemas ──────────────────────────────────────────────────

export const ConnectPlatformAccountSchema = z.object({
  userId:            z.string().min(1, { message: 'User ID is required' }),
  workspaceIds:      z.array(z.string().min(1)).min(1, { message: 'At least one workspace ID is required' }),
  platform:          z.enum(['instagram', 'facebook', 'twitter', 'linkedin', 'tiktok', 'youtube']),
  accountId:         z.string().min(1, { message: 'Account ID is required' }),
  displayName:       z.string().min(1, { message: 'Display name is required' }),
  accessToken:       z.string().min(1, { message: 'Access token is required' }),
  refreshToken:      z.string().optional(),
  profilePictureUrl: z.string().optional(),
});

export const LinkPlatformAccountSchema = z.object({
  accountId:   z.string().min(1, { message: 'Platform account ID is required' }),
  workspaceId: z.string().min(1, { message: 'Workspace ID is required' }),
});

export const UnlinkPlatformAccountSchema = z.object({
  accountId:   z.string().min(1, { message: 'Platform account ID is required' }),
  workspaceId: z.string().min(1, { message: 'Workspace ID is required' }),
});

// ─── PlatformPost schemas ─────────────────────────────────────────────────────

export const CreatePlatformPostSchema = z.object({
  postId:       z.string().min(1, { message: 'Post ID is required' }),
  platform:     z.enum(['instagram', 'facebook', 'twitter', 'linkedin', 'tiktok', 'youtube']),
  accountId:    z.string().min(1, { message: 'Account ID is required' }),
  caption:      z.string().min(1, { message: 'Caption is required' }).max(5000),
  hashtags:     z.array(z.string()).optional(),
  firstComment: z.string().optional(),
  scheduledAt:  z.string().optional(),
  timezone:     z.string().optional(),
});

export const UpdatePlatformPostSchema = z
  .object({
    id:          z.string().min(1, { message: 'Platform post ID is required' }),
    caption:     z.string().min(1).max(5000).optional(),
    hashtags:    z.array(z.string()).optional(),
    scheduledAt: z.string().optional(),
    status:      z.enum(['draft', 'scheduled', 'publishing', 'published', 'failed', 'cancelled']).optional(),
  })
  .refine(data => Object.keys(data).length > 1, { message: 'No fields provided to update' });

// ─── Approval schemas ────────────────────────────────────────────────────────

export const RejectPostSchema = z.object({
  reason: z.string().min(1, { message: 'Rejection reason is required' }).max(1000),
});

// ─── Batch PlatformPost schema ──────────────────────────────────────────────

export const CreatePlatformPostBatchSchema = z.object({
  postId:      z.string().min(1, { message: 'Post ID is required' }),
  entries:     z.array(z.object({
    platform:     z.enum(['instagram', 'facebook', 'twitter', 'linkedin', 'tiktok', 'youtube']),
    accountId:    z.string().min(1),
    caption:      z.string().min(1).max(5000),
    hashtags:     z.array(z.string()).optional(),
    firstComment: z.string().optional(),
  })).min(1, { message: 'At least one platform entry is required' }),
  scheduledAt: z.string().optional(),
  timezone:    z.string().optional(),
});

// ─── Helper ───────────────────────────────────────────────────────────────────

export function validate<T>(schema: z.ZodType<T>, data: unknown): { data: T; error: null } | { data: null; error: string } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const message = result.error.issues[0]?.message ?? 'Validation failed';
    return { data: null, error: message };
  }
  return { data: result.data, error: null };
}
