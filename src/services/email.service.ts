import nodemailer from 'nodemailer';
import { logger } from '../config/logger';

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
const EMAIL_RETRY_MAX_ATTEMPTS = Number(process.env.EMAIL_RETRY_MAX_ATTEMPTS ?? 5);
const EMAIL_RETRY_BASE_DELAY_MS = Number(process.env.EMAIL_RETRY_BASE_DELAY_MS ?? 5000);
const EMAIL_QUEUE_POLL_MS = Number(process.env.EMAIL_QUEUE_POLL_MS ?? 2000);

type EmailJob = {
  id: string;
  attempts: number;
  nextRunAt: number;
  mail: nodemailer.SendMailOptions;
};

const emailQueue: EmailJob[] = [];
let queueWorkerStarted = false;
let isProcessingQueue = false;
const processingJobIds = new Set<string>();

const enqueueEmail = async (mail: nodemailer.SendMailOptions): Promise<void> => {
  const job: EmailJob = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    attempts: 0,
    nextRunAt: Date.now(),
    mail,
  };
  emailQueue.push(job);
  console.log('[email][queued]', {
    jobId: job.id,
    to: mail.to,
    subject: mail.subject,
    queueSize: emailQueue.length,
  });
};

const processEmailQueue = async (): Promise<void> => {
  if (isProcessingQueue) return;
  isProcessingQueue = true;
  const now = Date.now();
  try {
    const due = emailQueue.filter((job) => job.nextRunAt <= now && !processingJobIds.has(job.id));
    for (const job of due) {
      const idx = emailQueue.findIndex((entry) => entry.id === job.id);
      if (idx === -1) continue;
      processingJobIds.add(job.id);

      try {
        console.log('[email][sending]', {
          jobId: job.id,
          attempt: job.attempts + 1,
          to: job.mail.to,
          subject: job.mail.subject,
        });
        await transporter.sendMail(job.mail);
        console.log('[email][sent]', {
          jobId: job.id,
          to: job.mail.to,
          subject: job.mail.subject,
        });
        emailQueue.splice(idx, 1);
      } catch (error) {
        job.attempts += 1;
        console.error('[email][send-error]', {
          jobId: job.id,
          attempt: job.attempts,
          to: job.mail.to,
          subject: job.mail.subject,
          error: error instanceof Error ? error.message : 'unknown',
        });
        if (job.attempts >= EMAIL_RETRY_MAX_ATTEMPTS) {
          logger.error(
            {
              event: 'email_delivery_failed',
              to: job.mail.to,
              subject: job.mail.subject,
              attempts: job.attempts,
              error: error instanceof Error ? error.message : 'unknown',
            },
            'Dropping email after max retry attempts',
          );
          emailQueue.splice(idx, 1);
        } else {
          const delay = EMAIL_RETRY_BASE_DELAY_MS * 2 ** (job.attempts - 1);
          job.nextRunAt = Date.now() + delay;
          console.log('[email][retry-scheduled]', {
            jobId: job.id,
            nextAttemptInMs: delay,
            nextRunAt: new Date(job.nextRunAt).toISOString(),
          });
        }
      } finally {
        processingJobIds.delete(job.id);
      }
    }
  } finally {
    isProcessingQueue = false;
  }
};

const ensureQueueWorker = (): void => {
  if (queueWorkerStarted) return;
  queueWorkerStarted = true;
  transporter.verify((error) => {
    if (error) {
      console.error('[email][smtp-verify-failed]', error.message);
      logger.error({ event: 'smtp_verify_failed', error: error.message }, 'SMTP verify failed');
      return;
    }
    console.log('[email][smtp-ready] SMTP connection verified');
    logger.info({ event: 'smtp_ready' }, 'SMTP connection verified');
  });
  const interval = setInterval(() => {
    processEmailQueue().catch((error) => {
      console.error('[email][queue-worker-error]', error instanceof Error ? error.message : error);
      logger.error(
        { event: 'email_queue_worker_error', error: error instanceof Error ? error.message : 'unknown' },
        'Email queue worker failed',
      );
    });
  }, EMAIL_QUEUE_POLL_MS);
  interval.unref();
};

ensureQueueWorker();

const emailService = {
  sendWorkspaceInvitation: async (
    to: string,
    inviterName: string,
    workspaceName: string,
    acceptUrl: string,
  ): Promise<void> => {
    await enqueueEmail({
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
    await enqueueEmail({
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
    await enqueueEmail({
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
    await enqueueEmail({
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
    await enqueueEmail({
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

    await enqueueEmail({
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

  sendPlatformPublishReminder: async (
    to: string,
    params: {
      postTitle: string;
      platform: string;
      workspaceId: string;
      postId: string;
      scheduledAt: Date;
      timezone?: string;
    },
  ): Promise<void> => {
    const postUrl = `${CLIENT_URL}/dashboard/workspace/${params.workspaceId}/post/${params.postId}`;
    await enqueueEmail({
      from: FROM,
      to,
      subject: `Scheduled publish reminder: "${params.postTitle}" on ${params.platform}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
          <h2 style="color: #1a1a2e; margin: 0 0 16px;">Scheduled Publish Reminder</h2>
          <p style="color: #344054; font-size: 15px; line-height: 1.6; margin: 0 0 12px;">
            Your platform post for <strong>"${params.postTitle}"</strong> on <strong>${params.platform}</strong> is due in about 30 minutes.
          </p>
          <p style="color:#475467; margin:0 0 20px;">
            Scheduled time: <strong>${params.scheduledAt.toISOString()}</strong>
            ${params.timezone ? ` (${params.timezone})` : ''}
          </p>
          <a href="${postUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">
            Open Post
          </a>
        </div>
      `,
    });
  },

  sendEmailVerification: async (
    to: string,
    firstName: string | undefined,
    verificationUrl: string,
  ): Promise<void> => {
    await enqueueEmail({
      from: FROM,
      to,
      subject: 'Verify your email',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
          <h2 style="color: #1a1a2e; margin: 0 0 16px;">Verify Your Email</h2>
          <p style="color: #344054; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
            Hi ${firstName || 'there'}, please verify your email address to activate your account.
          </p>
          <a href="${verificationUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">
            Verify Email
          </a>
          <p style="color: #6c757d; font-size: 13px; margin: 24px 0 0;">
            This link expires in 24 hours.
          </p>
        </div>
      `,
    });
  },

  sendPasswordReset: async (
    to: string,
    firstName: string | undefined,
    resetUrl: string,
  ): Promise<void> => {
    await enqueueEmail({
      from: FROM,
      to,
      subject: 'Reset your password',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
          <h2 style="color: #1a1a2e; margin: 0 0 16px;">Password Reset Request</h2>
          <p style="color: #344054; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
            Hi ${firstName || 'there'}, use the link below to reset your password.
          </p>
          <a href="${resetUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">
            Reset Password
          </a>
          <p style="color: #6c757d; font-size: 13px; margin: 24px 0 0;">
            This link expires in 1 hour.
          </p>
        </div>
      `,
    });
  },
};

export default emailService;
