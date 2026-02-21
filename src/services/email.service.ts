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
};

export default emailService;
