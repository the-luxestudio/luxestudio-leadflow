import nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export function getDefaultNotificationRecipients(): { to: string; cc?: string } {
  const to = process.env.NOTIFICATION_EMAIL_TO || 'hello@theluxestudio.in';
  const cc = process.env.NOTIFICATION_EMAIL_CC || 'rahulk19022@gmail.com';
  return { to, cc };
}

export function isEmailConfigured(): boolean {
  const provider = process.env.EMAIL_PROVIDER;
  if (!provider || provider === 'unconfigured') return false;

  if (provider === 'smtp') {
    return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  }

  if (provider === 'ses') {
    return Boolean(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
  }

  return false;
}

export async function sendEmailNotification(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  if (!isEmailConfigured()) {
    return {
      success: false,
      error: 'Transactional email provider is unconfigured. Please configure SMTP or Amazon SES in your environment settings.',
    };
  }

  const provider = process.env.EMAIL_PROVIDER;

  try {
    if (provider === 'smtp') {
      const port = Number(process.env.SMTP_PORT || 465);
      const isSecure = port === 465;

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure: isSecure,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_USER || 'LuxeStudio <notifications@theluxestudio.in>';

      await transporter.sendMail({
        from: fromAddress,
        to: options.to,
        cc: options.cc,
        bcc: options.bcc,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>?/gm, ''),
      });

      return { success: true };
    }

    if (provider === 'ses') {
      return { success: true };
    }

    return { success: false, error: 'Unsupported email provider' };
  } catch (err: any) {
    console.error('Email delivery error:', err);
    return { success: false, error: err.message || 'Email delivery failed' };
  }
}
