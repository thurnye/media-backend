import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = process.env.EMAIL_FROM || 'noreply@example.com';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:4200';

const emailService = {
  sendWorkspaceInvitation: async (
    to: string,
    inviterName: string,
    workspaceName: string,
    acceptUrl: string,
  ): Promise<void> => {
    await transporter.sendMail({
      from: FROM,
      to,
      subject: `You've been invited to join "${workspaceName}"`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
          <h2 style="color: #1a1a2e; margin: 0 0 16px;">Workspace Invitation</h2>
          <p style="color: #344054; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
            <strong>${inviterName}</strong> has invited you to join the workspace
            <strong>"${workspaceName}"</strong>.
          </p>
          <a href="${acceptUrl}"
             style="display: inline-block; background: #6366f1; color: #fff; text-decoration: none;
                    padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px;">
            Accept Invitation
          </a>
          <p style="color: #6c757d; font-size: 13px; margin: 32px 0 0;">
            This invitation expires in 7 days. If you didn't expect this email, you can safely ignore it.
          </p>
        </div>
      `,
    });
  },

  sendReviewerAssigned: async (
    to: string,
    reviewerName: string,
    postTitle: string,
    workspaceId: string,
    postId: string,
  ): Promise<void> => {
    const postUrl = `${CLIENT_URL}/dashboard/workspace/${workspaceId}/post/${postId}`;
    await transporter.sendMail({
      from: FROM,
      to,
      subject: `You were added as a reviewer: "${postTitle}"`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
          <h2 style="color: #1a1a2e; margin: 0 0 16px;">New Reviewer Assignment</h2>
          <p style="color: #344054; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
            Hi ${reviewerName || 'there'}, you were added as a reviewer for <strong>"${postTitle}"</strong>.
          </p>
          <a href="${postUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">
            Open Post
          </a>
        </div>
      `,
    });
  },

  sendPostReviewUpdate: async (
    to: string,
    postTitle: string,
    action: string,
    actorName: string,
    workspaceId: string,
    postId: string,
  ): Promise<void> => {
    const postUrl = `${CLIENT_URL}/dashboard/workspace/${workspaceId}/post/${postId}`;
    await transporter.sendMail({
      from: FROM,
      to,
      subject: `Post review update: "${postTitle}"`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
          <h2 style="color: #1a1a2e; margin: 0 0 16px;">Review Update</h2>
          <p style="color: #344054; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
            <strong>${actorName}</strong> ${action} for <strong>"${postTitle}"</strong>.
          </p>
          <a href="${postUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">
            View Post
          </a>
        </div>
      `,
    });
  },

  sendPostCommentToOwner: async (
    to: string,
    postTitle: string,
    commenterName: string,
    message: string,
    workspaceId: string,
    postId: string,
  ): Promise<void> => {
    const postUrl = `${CLIENT_URL}/dashboard/workspace/${workspaceId}/post/${postId}`;
    await transporter.sendMail({
      from: FROM,
      to,
      subject: `New comment on "${postTitle}"`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
          <h2 style="color: #1a1a2e; margin: 0 0 16px;">New Comment</h2>
          <p style="color: #344054; font-size: 15px; line-height: 1.6; margin: 0 0 12px;">
            <strong>${commenterName}</strong> commented on your post <strong>"${postTitle}"</strong>.
          </p>
          <p style="color:#475467; background:#f8fafc; border:1px solid #e2e8f0; padding:12px; border-radius:8px; margin: 0 0 24px;">
            ${message}
          </p>
          <a href="${postUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">
            Open Discussion
          </a>
        </div>
      `,
    });
  },

  sendCommentReplyToOwner: async (
    to: string,
    postTitle: string,
    replierName: string,
    message: string,
    workspaceId: string,
    postId: string,
  ): Promise<void> => {
    const postUrl = `${CLIENT_URL}/dashboard/workspace/${workspaceId}/post/${postId}`;
    await transporter.sendMail({
      from: FROM,
      to,
      subject: `New reply on "${postTitle}"`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
          <h2 style="color: #1a1a2e; margin: 0 0 16px;">New Reply</h2>
          <p style="color: #344054; font-size: 15px; line-height: 1.6; margin: 0 0 12px;">
            <strong>${replierName}</strong> replied to your comment on <strong>"${postTitle}"</strong>.
          </p>
          <p style="color:#475467; background:#f8fafc; border:1px solid #e2e8f0; padding:12px; border-radius:8px; margin: 0 0 24px;">
            ${message}
          </p>
          <a href="${postUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">
            View Reply
          </a>
        </div>
      `,
    });
  },

  sendPlatformPublishResult: async (
    to: string,
    params: {
      postTitle: string;
      platform: string;
      status: 'published' | 'failed';
      workspaceId: string;
      postId: string;
      error?: string;
      publishedAt?: Date;
    },
  ): Promise<void> => {
    const postUrl = `${CLIENT_URL}/dashboard/workspace/${params.workspaceId}/post/${params.postId}`;
    const isSuccess = params.status === 'published';
    const subject = isSuccess
      ? `Published successfully: "${params.postTitle}" on ${params.platform}`
      : `Publish failed: "${params.postTitle}" on ${params.platform}`;
    const title = isSuccess ? 'Platform Publish Succeeded' : 'Platform Publish Failed';
    const summary = isSuccess
      ? `Your post <strong>"${params.postTitle}"</strong> was published successfully on <strong>${params.platform}</strong>.`
      : `Your post <strong>"${params.postTitle}"</strong> failed to publish on <strong>${params.platform}</strong>.`;

    await transporter.sendMail({
      from: FROM,
      to,
      subject,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
          <h2 style="color: #1a1a2e; margin: 0 0 16px;">${title}</h2>
          <p style="color: #344054; font-size: 15px; line-height: 1.6; margin: 0 0 12px;">
            ${summary}
          </p>
          ${
            isSuccess
              ? `<p style="color:#475467; margin:0 0 20px;">Published at: <strong>${(params.publishedAt ?? new Date()).toISOString()}</strong></p>`
              : params.error
                ? `<p style="color:#991b1b; background:#fef2f2; border:1px solid #fecaca; padding:12px; border-radius:8px; margin: 0 0 20px;">Reason: ${params.error}</p>`
                : ''
          }
          <a href="${postUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">
            Open Post
          </a>
        </div>
      `,
    });
  },
};

export default emailService;
