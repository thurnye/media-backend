# Workflow Documentation
## End-to-End Operational Flows

---

## Table of Contents
1. [Overview](#1-overview)
2. [Post Authoring Workflow](#2-post-authoring-workflow)
3. [Approval Workflow](#3-approval-workflow)
4. [Review Comment Workflow](#4-review-comment-workflow)
5. [Platform Publish Workflow](#5-platform-publish-workflow)
6. [Scheduler Workflow](#6-scheduler-workflow)
7. [Notification Workflow](#7-notification-workflow)
8. [State Tables](#8-state-tables)
9. [Failure and Retry Paths](#9-failure-and-retry-paths)

---

## 1. Overview
This document describes the runtime workflows implemented across:
- `post.service.ts`
- `platformPost.service.ts`
- `jobs/*`
- frontend publish/review UIs

It reflects current behavior (not roadmap behavior).

---

## 2. Post Authoring Workflow

### 2.1 Lifecycle (high level)
```text
Create Post -> Draft -> (Assign reviewers) -> Pending Approval
                               or
                        stay Draft (no reviewers)
```

### 2.2 Authoring sequence
1. User creates post (`createPost`) with title/content/tags/media IDs.
2. Backend saves post in `draft`.
3. User edits post fields via `updatePost` while transition rules allow.
4. Reviewer list updates are applied through `requiredApprovers`.

### 2.3 Auto-transition rule
If post is `draft` and reviewers become non-empty:
- backend auto-sets `status = pending_approval`.

If reviewers become empty:
- workflow decisions reset
- post returns to `draft`.

---

## 3. Approval Workflow

### 3.1 Actors
- Assigned reviewers (`requiredApprovers`)
- Post owner
- Admin/manager workflows around reviewer management

### 3.2 Decision inputs
Reviewer decisions represented by state lists:
- approved
- rejected
- cancelled
- archived

### 3.3 Decision process tree
```text
Reviewer submits decision
  -> validate reviewer is assigned
  -> update reviewer's decision bucket
  -> compute final post status only when all required reviewers decided
```

### 3.4 Final status priority (after all required reviewers decide)
1. `archived`
2. `cancelled`
3. `rejected` (if any required reviewer rejected)
4. `approved` (if all required reviewers approved)
5. fallback pending

### 3.5 Transition constraints
All status moves pass through transition guard (`validateTransition`).
Invalid transitions throw `BAD_REQUEST`.

---

## 4. Review Comment Workflow

### 4.1 Thread model
`PostReviewComment` supports tree replies:
```text
Post
├─ Comment A
│  ├─ Reply A1
│  │  ├─ Reply A1.1
│  │  └─ Reply A1.2
│  └─ Reply A2
├─ Comment B
│  └─ Reply B1
└─ Comment C
```

### 4.2 Comment payload
- `message`
- optional `mediaIds[]`
- optional `parentCommentId`

### 4.3 Comment notifications
- New top-level comment -> email to post owner
- Reply -> email to parent comment owner

---

## 5. Platform Publish Workflow

### 5.1 Customize per account (frontend)
For each selected platform account user can:
- edit caption/hashtags
- include inherited post media
- add/remove/reorder account-specific media
- set publish mode (`now` or `schedule`)

### 5.2 Platform post creation/update modes
| User action | Persisted status |
|---|---|
| Save draft | `draft` |
| Schedule | `scheduled` |
| Publish now | `publishing` |

### 5.3 Immediate publish flow
```text
create/update platform post with status=publishing
  -> publishNow(platformPostId, triggeredByUser)
      -> set status publishing
      -> refresh account token if needed
      -> call publisher adapter
      -> success: published + publishedAt + platformPostId
      -> failure: failed + deliveryTracking update
```

### 5.4 Scheduled publish flow
```text
status=scheduled + scheduledAt
  -> scheduler tick
  -> findScheduledReady(now)
  -> publishNow(platformPostId)
```

### 5.5 TikTok media rule (frontend guard)
- TikTok entry with media count > 1 blocks final publish progression.

---

## 6. Scheduler Workflow

### 6.1 Cron map
| Job | Cron | Purpose |
|---|---|---|
| Publish scheduled posts | `0,15,30,45 * * * *` | Dispatch due scheduled platform posts |
| Refresh tokens | `*/30 * * * *` | Refresh near-expiry platform tokens |
| Recycle evergreen | `0 */6 * * *` | Recycle eligible evergreen posts |

### 6.2 Runtime caveat
Scheduler is in-process (`node-cron`):
- runs only when API process is running
- every running instance executes scheduler independently

---

## 7. Notification Workflow

### 7.1 Review-related emails
| Trigger | Recipients |
|---|---|
| Reviewer assigned | newly assigned reviewers |
| Review decision change | all reviewers + post owner |

### 7.2 Comment-related emails
| Trigger | Recipients |
|---|---|
| New comment on post | post owner |
| Reply to comment | parent comment owner |

### 7.3 Publish-result emails
Sent for both success and failure.
Recipients are deduplicated:
- post owner
- assigned reviewers
- user who triggered publish (for user-triggered publish-now/retry)

---

## 8. State Tables

### 8.1 Post statuses
- `draft`
- `pending_approval`
- `approved`
- `rejected`
- `scheduled`
- `publishing`
- `partially_published`
- `published`
- `failed`
- `cancelled`
- `archived`

### 8.2 Platform post statuses
- `draft`
- `scheduled`
- `publishing`
- `published`
- `failed`
- `cancelled`

---

## 9. Failure and Retry Paths

### 9.1 Approval failures
- Invalid reviewer / no required reviewers / invalid transition -> operation rejected.

### 9.2 Publish failures
- Platform publish failure marks `PlatformPost` as `failed`.
- Delivery tracking is updated (`attempts`, `lastAttemptAt`, `failureReason`).
- UI exposes retry action; retry sets status back to `publishing` and re-runs publish path.

### 9.3 Notification failures
Email send failures are non-blocking in critical workflows (safe-notify pattern):
- operation result persists even if email delivery fails.
