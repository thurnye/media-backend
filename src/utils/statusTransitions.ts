import { PostStatus } from '../config/enums/post.enums';
import { AppError } from '../errors/AppError';

/**
 * Allowed post status transitions.
 * Key = current status, Value = array of statuses it can transition to.
 */
const ALLOWED_TRANSITIONS: Record<PostStatus, PostStatus[]> = {
  [PostStatus.DRAFT]:                [PostStatus.PENDING_APPROVAL, PostStatus.APPROVED, PostStatus.SCHEDULED, PostStatus.ARCHIVED],
  [PostStatus.PENDING_APPROVAL]:     [PostStatus.APPROVED, PostStatus.REJECTED, PostStatus.CANCELLED, PostStatus.ARCHIVED, PostStatus.DRAFT],
  [PostStatus.APPROVED]:             [PostStatus.DRAFT, PostStatus.SCHEDULED, PostStatus.PUBLISHED, PostStatus.ARCHIVED],
  [PostStatus.REJECTED]:             [PostStatus.DRAFT, PostStatus.PENDING_APPROVAL, PostStatus.APPROVED, PostStatus.CANCELLED, PostStatus.ARCHIVED],
  [PostStatus.SCHEDULED]:            [PostStatus.PUBLISHING, PostStatus.CANCELLED, PostStatus.DRAFT],
  [PostStatus.PUBLISHING]:           [PostStatus.PUBLISHED, PostStatus.PARTIALLY_PUBLISHED, PostStatus.FAILED],
  [PostStatus.PARTIALLY_PUBLISHED]:  [PostStatus.PUBLISHED, PostStatus.FAILED, PostStatus.ARCHIVED],
  [PostStatus.PUBLISHED]:            [PostStatus.ARCHIVED],
  [PostStatus.FAILED]:               [PostStatus.DRAFT, PostStatus.SCHEDULED, PostStatus.ARCHIVED],
  [PostStatus.ARCHIVED]:             [PostStatus.DRAFT, PostStatus.PENDING_APPROVAL, PostStatus.APPROVED, PostStatus.REJECTED, PostStatus.CANCELLED],
  [PostStatus.CANCELLED]:            [PostStatus.DRAFT, PostStatus.PENDING_APPROVAL, PostStatus.APPROVED, PostStatus.REJECTED, PostStatus.ARCHIVED],
};

export function validateTransition(from: PostStatus, to: PostStatus): void {
  const allowed = ALLOWED_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    throw new AppError('BAD_REQUEST', `Cannot transition post from "${from}" to "${to}"`);
  }
}
