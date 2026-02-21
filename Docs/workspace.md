A Workspace in your system is the top-level container for:

Users

Roles

Connected social accounts

Posts

Analytics

Billing

Settings

Think of it as a company/team environment.

🏢 What You Can Do Inside a Workspace

I’ll break this into functional modules.

1️⃣ Workspace Management
Core Actions

Create workspace

Update workspace name/logo

Set timezone

Set default language

Delete workspace (Admin only)

Archive workspace

Settings

Approval workflow toggle

Default post category

Auto-publishing rules

Evergreen rotation rules

Branding settings (white-label if enterprise)

2️⃣ User & Role Management

Inside a workspace, you can:

Invite users via email

Remove users

Assign roles (Admin / Manager / Member)

View activity logs

Set role-based permissions

Transfer ownership

Advanced:

Custom roles

Role-based post approval chain

3️⃣ Social Platform Management

Each workspace manages its own connected accounts.

Connect Instagram

Connect Facebook

Connect LinkedIn

Connect TikTok

Disconnect accounts

Refresh tokens

Assign account access to certain roles

Advanced:

Set default posting accounts

Assign account managers per platform

4️⃣ Post Management

Within workspace:

Create post (draft)

Edit post

Add media

Categorize post

Tag campaign

Set evergreen flag

Schedule post

Submit for approval

Approve post

Publish post

Duplicate post

Archive post

Advanced:

Bulk scheduling

Bulk category editing

Cross-platform content override

Post version history

5️⃣ Content Calendar

Workspace-level calendar:

View by month/week/day

Filter by platform

Filter by category

Filter by campaign

Drag-and-drop rescheduling

Identify schedule gaps

Auto-fill with evergreen posts

6️⃣ Analytics & Reporting

Workspace analytics includes:

Engagement rate

Platform performance comparison

Post category performance

Campaign ROI tracking

Top-performing evergreen posts

Export reports (CSV / PDF)

AI performance insights

Advanced:

Cross-workspace analytics (agency feature)

7️⃣ Approval Workflow (Enterprise)

If enabled:

Require approval before publish

Multi-level approval chain

Comment on posts internally

Reject with feedback

Audit trail

8️⃣ Automation & Smart Features

Advanced workspace features:

Auto-repost evergreen posts

Smart posting time suggestions

AI caption suggestions

Auto hashtag generator

Content performance scoring

Engagement heatmap

9️⃣ Billing & Subscription (Owner/Admin Only)

View subscription plan

Upgrade/downgrade

View usage limits

Add payment method

View invoices

🔟 Security

2FA enforcement

IP restrictions (enterprise)

Activity logs

Token audit

API key management

🧠 Conceptually

Workspace = Tenant Boundary

Everything must be scoped by:

workspaceId: string;

Every query should include:

WHERE workspace_id = currentUser.workspaceId
🔥 If You Want to Be Advanced

You can define Workspace as:

export interface Workspace {
  id: string;
  name: string;
  slug: string;

  ownerId: string;

  timezone: string;
  defaultPostCategory?: PostCategory;

  settings: {
    approvalRequired: boolean;
    evergreenEnabled: boolean;
    autoPublishEnabled: boolean;
  };

  plan: "free" | "pro" | "enterprise";

  createdAt: Date;
  updatedAt: Date;
}