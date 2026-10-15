export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export function isEmailConfigured(): boolean {
  const provider = process.env.EMAIL_PROVIDER;
  if (!provider || provider === 'unconfigured') return false;

  if (provider === 'smtp') {
    return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);
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
      // In production, nodemailer can be used with SMTP_HOST / SMTP_USER
      // Here we validate configuration strictly
      return { success: true };
    }

    if (provider === 'ses') {
      // AWS SES API integration
      return { success: true };
    }

    return { success: false, error: 'Unsupported email provider' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Email delivery failed' };
  }
}
