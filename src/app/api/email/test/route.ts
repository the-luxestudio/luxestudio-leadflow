import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import { sendEmailNotification, isEmailConfigured, getDefaultNotificationRecipients } from '@/lib/services/email';

export async function POST(request: Request) {
  try {
    const session = await requireAuth();

    if (!isEmailConfigured()) {
      return NextResponse.json(
        { error: 'Email provider is not configured. Please check your SMTP settings.' },
        { status: 400 }
      );
    }

    let customTo: string | undefined;
    let customCc: string | undefined;

    try {
      const body = await request.json();
      customTo = body.to;
      customCc = body.cc;
    } catch {}

    const defaults = getDefaultNotificationRecipients();
    const to = customTo || defaults.to;
    const cc = customCc !== undefined ? customCc : defaults.cc;

    const subject = '⚜️ LuxeStudio LeadFlow — Email Verification & CC Routing Test';
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #0B0D12; color: #FFFFFF; border-radius: 16px; border: 1px solid #232838; overflow: hidden;">
        <div style="padding: 32px 28px; background: linear-gradient(135deg, #141824 0%, #0B0D12 100%); border-bottom: 1px solid #232838;">
          <div style="display: inline-block; padding: 4px 10px; background: rgba(197, 168, 77, 0.15); border: 1px solid rgba(197, 168, 77, 0.3); border-radius: 6px; font-size: 11px; font-weight: bold; color: #E5C365; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 12px;">
            Production Mail Delivery
          </div>
          <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #FFFFFF; letter-spacing: -0.02em;">
            LuxeStudio LeadFlow CRM
          </h1>
          <p style="margin: 6px 0 0; font-size: 13px; color: #9CA3AF;">
            Automated Notification Routing & CC Verification
          </p>
        </div>

        <div style="padding: 28px;">
          <p style="font-size: 14px; line-height: 1.6; color: #E5E7EB; margin-top: 0;">
            Hello Team,
          </p>
          <p style="font-size: 14px; line-height: 1.6; color: #D1D5DB;">
            This test confirmation email verifies that the transactional email pipeline for <strong>LuxeStudio LeadFlow CRM</strong> is properly configured and operational.
          </p>

          <div style="background: #12151F; border: 1px solid #232838; border-radius: 10px; padding: 18px; margin: 24px 0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tr>
                <td style="padding: 6px 0; color: #9CA3AF; width: 160px;">Primary Recipient (To):</td>
                <td style="padding: 6px 0; color: #FFFFFF; font-weight: 600;">${to}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #9CA3AF;">Carbon Copy (CC):</td>
                <td style="padding: 6px 0; color: #E5C365; font-weight: 600;">${cc || 'None'}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #9CA3AF;">Sender (From):</td>
                <td style="padding: 6px 0; color: #9CA3AF;">${process.env.EMAIL_FROM || 'LuxeStudio LeadFlow'}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #9CA3AF;">Dispatched By:</td>
                <td style="padding: 6px 0; color: #9CA3AF;">${session.user.displayName} (${session.role})</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #9CA3AF;">CRM Portal:</td>
                <td style="padding: 6px 0;"><a href="https://leads.theluxestudio.in" style="color: #E5C365; text-decoration: none;">leads.theluxestudio.in</a></td>
              </tr>
            </table>
          </div>

          <p style="font-size: 12px; color: #6B7280; margin-bottom: 0; border-top: 1px solid #1F2430; padding-top: 18px;">
            This is an automated operational test dispatched from LuxeStudio LeadFlow CRM. All rights reserved &copy; 2026 The LuxeStudio.
          </p>
        </div>
      </div>
    `;

    const res = await sendEmailNotification({
      to,
      cc: cc || undefined,
      subject,
      html,
    });

    if (!res.success) {
      return NextResponse.json({ error: res.error || 'Failed to send test email' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      deliveredTo: to,
      cc,
      message: `Test email successfully dispatched to ${to}${cc ? ' (CC: ' + cc + ')' : ''}`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unauthorized or server error' }, { status: err.status || 500 });
  }
}
