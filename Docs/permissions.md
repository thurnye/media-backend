# Permissions Documentation
## Roles, RBAC, and Effective Access Matrix

---

## Table of Contents
1. [Overview](#1-overview)
2. [Permission Model](#2-permission-model)
3. [Role Matrix](#3-role-matrix)
4. [RBAC Enforcement Flow](#4-rbac-enforcement-flow)
5. [Feature-Level Access](#5-feature-level-access)
6. [Decision Trees](#6-decision-trees)
7. [Notes and Edge Cases](#7-notes-and-edge-cases)

---

## 1. Overview
Permissions are enforced on the backend in `src/utils/rbac.ts` and consumed by services.

Core concepts:
- Roles: `admin`, `manager`, `member`
- Owner override: workspace owner is treated as full-access (`'owner'`) regardless of role map
- Two guard types:
  - Membership guard (`requireMembership`)
  - Permission guard (`requirePermission`)

Source of truth:
- `src/config/enums/permission.enums.ts`
- `src/config/enums/workspace.enums.ts`
- `src/utils/rbac.ts`

---

## 2. Permission Model

### 2.1 Permission keys
| Domain | Permission | Meaning |
|---|---|---|
| Posts | `create_post` | Create post records |
| Posts | `update_post` | Edit post fields/workflow |
| Posts | `delete_post` | Delete posts |
| Posts | `approve_post` | Submit review decisions |
| Posts | `publish_post` | Create/update/publish platform posts |
| Platform Accounts | `manage_accounts` | Connect/link/unlink/disconnect accounts |
| Platform Accounts | `delete_account` | Reserved/delete-account permission key |
| Workspace Users | `manage_users` | Add/remove members, role updates, invites |
| Workspace | `manage_workspace` | Edit workspace settings |
| Workspace | `delete_workspace` | Remove workspace |
| Analytics | `view_analytics` | View analytics features |

### 2.2 Roles
| Role | Description |
|---|---|
| `admin` | Full role-based permission set |
| `manager` | Operational role for posts/publishing/accounts/workspace settings |
| `member` | Limited role, mainly review + analytics |
| `owner` | Not enum role; implicit superuser in RBAC checks |

---

## 3. Role Matrix

### 3.1 Role-to-permission matrix (current implementation)
| Permission | Owner | Admin | Manager | Member |
|---|---:|---:|---:|---:|
| `create_post` | ✅ | ✅ | ✅ | ❌ |
| `update_post` | ✅ | ✅ | ✅ | ❌ |
| `delete_post` | ✅ | ✅ | ❌ | ❌ |
| `approve_post` | ✅ | ✅ | ✅ | ✅ |
| `publish_post` | ✅ | ✅ | ✅ | ❌ |
| `manage_accounts` | ✅ | ✅ | ✅ | ❌ |
| `delete_account` | ✅ | ✅ | ❌ | ❌ |
| `manage_users` | ✅ | ✅ | ❌ | ❌ |
| `manage_workspace` | ✅ | ✅ | ✅ | ❌ |
| `delete_workspace` | ✅ | ✅ | ❌ | ❌ |
| `view_analytics` | ✅ | ✅ | ✅ | ✅ |

### 3.2 Practical interpretation
- `admin`: operationally unrestricted
- `manager`: can run post and publishing workflows, but cannot manage members or hard delete posts/workspaces
- `member`: can participate in approval workflow but not post/publish creation

---

## 4. RBAC Enforcement Flow

### 4.1 Guard call chain
```text
Resolver
  -> Service
      -> requireMembership(...) or requirePermission(...)
          -> workspaceRepository.findById(...)
          -> owner check
          -> member lookup
          -> role permission map check
```

### 4.2 Guard behavior table
| Guard | Owner | Member with role | Non-member |
|---|---|---|---|
| `requireMembership` | allow | allow | deny |
| `requirePermission` | allow | allow/deny by role map | deny |

### 4.3 Return value details
`requirePermission(...)` returns `WorkspaceRole | 'owner'`, which services use for extra business rules (example: manager-specific restrictions).

---

## 5. Feature-Level Access

### 5.1 Posts
| Operation | Guard | Allowed roles |
|---|---|---|
| List posts / get post | membership | owner/admin/manager/member |
| Create post | `create_post` | owner/admin/manager |
| Update post | `update_post` (or `approve_post` for reviewer decision statuses) | owner/admin/manager (+ reviewer flow path) |
| Delete post | `delete_post` | owner/admin |

### 5.2 Approval operations
| Operation | Required permission | Extra constraints |
|---|---|---|
| Approve | `approve_post` | must be assigned reviewer when workflow requires |
| Reject | `approve_post` | must be assigned reviewer |
| Cancel/Archive decision | `approve_post` via update flow | must be assigned reviewer in active review states |

### 5.3 Workspace operations
| Operation | Required permission |
|---|---|
| Update workspace settings | `manage_workspace` |
| Delete workspace | `delete_workspace` |
| Add/remove/update member role | `manage_users` |
| Invite/revoke/list invitations | `manage_users` |

### 5.4 Platform account operations
| Operation | Required permission |
|---|---|
| Connect/link/unlink/update/disconnect account | `manage_accounts` |
| Read accounts in workspace | membership |

### 5.5 Platform post operations
| Operation | Required permission |
|---|---|
| Read platform post(s) | membership |
| Create/update platform post | `publish_post` |
| Delete platform post | `delete_post` |

---

## 6. Decision Trees

### 6.1 Permission decision tree
```text
Need to perform action in workspace W as user U:

1) Load workspace W
2) Is U == ownerId?
   - Yes -> ALLOW
   - No -> continue
3) Is U in workspace.members?
   - No -> FORBIDDEN (not member)
   - Yes -> continue
4) Does member.role include required permission?
   - Yes -> ALLOW
   - No -> FORBIDDEN (insufficient permission)
```

### 6.2 Membership decision tree
```text
Need read access in workspace W as user U:

1) Load workspace W
2) Is U owner OR member?
   - Yes -> ALLOW
   - No -> FORBIDDEN
```

---

## 7. Notes and Edge Cases

1. Backend is authoritative: UI visibility can differ, but backend checks always decide.
2. `owner` is a special-case principal; it bypasses role matrix restrictions.
3. Some operations have rule layers beyond RBAC (reviewer assignment, status transition validation).
4. Platform-post delete currently checks `delete_post` permission.
5. Manager capabilities are broad for publishing workflow but intentionally exclude user/admin-level membership management.
