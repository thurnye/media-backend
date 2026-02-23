# Workspace Documentation
## Workspace Domain, Membership, and Invitation Flows

---

## Table of Contents
1. [Overview](#1-overview)
2. [Workspace Data Model](#2-workspace-data-model)
3. [Workspace Lifecycle](#3-workspace-lifecycle)
4. [Membership Lifecycle](#4-membership-lifecycle)
5. [Invitation Lifecycle](#5-invitation-lifecycle)
6. [Workspace Settings and Plan](#6-workspace-settings-and-plan)
7. [Access Control in Workspace Context](#7-access-control-in-workspace-context)
8. [Workspace API Surface](#8-workspace-api-surface)
9. [Frontend Workspace Flow](#9-frontend-workspace-flow)
10. [Operational Notes](#10-operational-notes)

---

## 1. Overview
The workspace domain is the tenancy boundary of the application.

A workspace defines:
- ownership
- member list and roles
- settings for approval/evergreen/publishing policies
- access scope for posts, platform accounts, and review workflows

Core implementation files:
- `src/models/workspace.model.ts`
- `src/services/workspace.service.ts`
- `src/services/workspaceInvitation.service.ts`
- `src/repositories/workspace.repository.ts`

---

## 2. Workspace Data Model

### 2.1 Key fields
| Field | Type | Notes |
|---|---|---|
| `name` | string | Workspace display name |
| `slug` | string | Unique slug (indexed, unique) |
| `description` | string | Optional description |
| `ownerId` | string | Workspace owner principal |
| `members[]` | array | Member entries with role + joinedAt |
| `settings` | object | approval, evergreen, auto-publish toggles |
| `plan` | enum | `free`, `pro`, `enterprise` |
| `defaultTimezone` | string | Default scheduler/display timezone |
| `isActive` | boolean | Soft-delete flag |
| `deletedAt` | date/null | Soft-delete timestamp |

### 2.2 Member record
```text
members[]
└─ {
   userId: string,
   role: admin|manager|member,
   joinedAt: Date
}
```

### 2.3 Important indexes
- `slug` unique index
- `ownerId` index
- `members.userId` index

---

## 3. Workspace Lifecycle

### 3.1 Create
- Any authenticated user can create workspace.
- Creator becomes:
  - `ownerId`
  - member with `admin` role
- User document is synchronized with new workspace reference.

### 3.2 Read
- Any owner/member can read workspace (`requireMembership`).

### 3.3 Update
- Requires `manage_workspace` permission (owner/admin/manager).

### 3.4 Delete
- Soft delete only (`isActive=false`, `deletedAt` set).
- Requires `delete_workspace` (owner/admin).

### 3.5 Lifecycle tree
```text
Create -> Active
          ├─ Update settings/metadata
          ├─ Manage members/invitations
          └─ Soft delete -> Inactive
```

---

## 4. Membership Lifecycle

### 4.1 Add member
- Requires `manage_users` (owner/admin).
- Validates target is not already member.
- Adds member record with role and `joinedAt`.

### 4.2 Remove member
- Requires `manage_users`.
- Owner cannot be removed.
- Validates member exists before removal.

### 4.3 Update member role
- Requires `manage_users`.
- Owner role cannot be changed.
- Validates member exists.

### 4.4 Suggest members
- Caller must be workspace member.
- Suggestion source: users from caller’s other workspaces, excluding current members and caller.
- Query matched against email/first/last name.

### 4.5 Membership operations table
| Operation | Guard | Allowed principals |
|---|---|---|
| Add member | `manage_users` | owner/admin |
| Remove member | `manage_users` | owner/admin |
| Update role | `manage_users` | owner/admin |
| Suggest members | membership | owner/admin/manager/member |

---

## 5. Invitation Lifecycle

### 5.1 Invite
- Requires `manage_users`.
- Validations:
  - workspace exists
  - target email is not already active member
  - no existing pending invite for same workspace+email
- Creates invitation token with expiry (7 days).
- Sends invite email with accept link.

### 5.2 Accept invitation
- Token must exist and be pending + unexpired.
- If user not already member:
  - add member to workspace
  - sync user workspace reference
- invitation marked as `accepted`.

### 5.3 Revoke invitation
- Requires `manage_users`.
- Deletes pending invitation by workspace+email.

### 5.4 Invitation state flow
```text
pending
  ├─ accept -> accepted
  ├─ revoke -> removed
  └─ expire -> invalid for acceptance
```

---

## 6. Workspace Settings and Plan

### 6.1 Settings object
| Setting | Type | Default | Purpose |
|---|---|---|---|
| `approvalRequired` | boolean | false | Approval policy toggle |
| `evergreenEnabled` | boolean | false | Evergreen automation toggle |
| `autoPublishEnabled` | boolean | false | Auto-publish policy toggle |

### 6.2 Plan and timezone
| Field | Default | Notes |
|---|---|---|
| `plan` | `free` | Billing/feature tier marker |
| `defaultTimezone` | `America/New_York` | Scheduling fallback/time semantics |

---

## 7. Access Control in Workspace Context

### 7.1 Workspace owner override
Owner bypasses role matrix checks (`requirePermission` owner path).

### 7.2 Role summary (effective)
| Capability | Owner | Admin | Manager | Member |
|---|---:|---:|---:|---:|
| Manage workspace settings | ✅ | ✅ | ✅ | ❌ |
| Delete workspace | ✅ | ✅ | ❌ | ❌ |
| Manage users/invitations | ✅ | ✅ | ❌ | ❌ |
| Read workspace resources | ✅ | ✅ | ✅ | ✅ |

---

## 8. Workspace API Surface

### 8.1 GraphQL Queries
- `workspaces`
- `workspace(id)`
- `suggestMembers(workspaceId, query)`
- `workspaceInvitations(workspaceId)`

### 8.2 GraphQL Mutations
- `createWorkspace`
- `updateWorkspace`
- `deleteWorkspace`
- `addWorkspaceMember`
- `removeWorkspaceMember`
- `updateMemberRole`
- `inviteToWorkspace`
- `acceptInvitation`
- `revokeInvitation`

---

## 9. Frontend Workspace Flow

### 9.1 Route map
Under dashboard workspace routes:
- workspace home
- posts
- members
- analytics
- settings

### 9.2 State slices
Workspace-related state handled in NgRx:
- `workspace` slice for workspace detail/list/member/invitation operations
- auth effects hydrate initial workspaces from user payload on login/session restore

### 9.3 Invitation UX
- Invite sent from members UI
- Invite acceptance handled via `/invite/accept?token=...`
- On acceptance success, user is navigated to target workspace

---

## 10. Operational Notes

1. Workspace soft-delete keeps records for audit continuity.
2. Membership checks are mandatory for read operations to prevent cross-workspace leakage.
3. Invitations are token-based and time-bound.
4. User and workspace membership references are synchronized in both directions during create/accept flows.
5. Frontend role-based visibility should be treated as convenience only; backend checks are authoritative.
