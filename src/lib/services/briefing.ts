import prisma from '@/lib/db/prisma';
import { sendEmailNotification, isEmailConfigured, getDefaultNotificationRecipients } from './email';

export interface DailyBriefingData {
  orgName: string;
  dateFormatted: string;
  appUrl: string;
  stats: {
    reachOutsCount: number;
    activePipelineValue: number;
    activeLeadsCount: number;
    prototypesCount: number;
  };
  todaysFollowUps: Array<{
    id: string;
    leadId: string;
    businessName: string;
    category: string;
    contactName: string;
    phone: string;
    actionType: string;
    scheduledTime: string;
    title: string;
    notes?: string;
    dealValue?: number;
    prototypeUrl?: string;
    proposalUrl?: string;
  }>;
  stages: Array<{
    name: string;
    count: number;
    dealValue: number;
  }>;
  upcomingFollowUps: Array<{
    businessName: string;
    actionType: string;
    dueDateFormatted: string;
    title: string;
  }>;
}

export async function getDailyBriefingData(organizationId?: string): Promise<DailyBriefingData | null> {
  const org = organizationId
    ? await prisma.organization.findUnique({ where: { id: organizationId } })
    : await prisma.organization.findFirst();

  if (!org) return null;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://leads.theluxestudio.in';

  // Calculate IST bounds for "today"
  const now = new Date();
  const istDateString = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
  const endOfTodayIST = new Date(`${istDateString}T23:59:59.999+05:30`);

  const dateFormatted = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(now);

  // 1. Follow-ups due today (or overdue and still scheduled)
  const dueFollowUps = await prisma.followUp.findMany({
    where: {
      organizationId: org.id,
      status: 'SCHEDULED',
      dueAt: { lte: endOfTodayIST },
    },
    include: {
      lead: {
        include: {
          contacts: { where: { isPrimary: true }, take: 1 },
        },
      },
    },
    orderBy: { dueAt: 'asc' },
  });

  const todaysFollowUps = dueFollowUps.map((f) => {
    const contact = f.lead.contacts[0];
    const scheduledTime = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(f.dueAt);

    return {
      id: f.id,
      leadId: f.lead.id,
      businessName: f.lead.businessName,
      category: f.lead.category || 'Lead',
      contactName: contact?.name || 'Primary Contact',
      phone: contact?.phone || '',
      actionType: f.actionType,
      scheduledTime,
      title: f.title,
      notes: f.plannedMessage || undefined,
      dealValue: f.lead.dealValue || undefined,
      prototypeUrl: f.lead.prototypeUrl || undefined,
      proposalUrl: f.lead.proposalUrl || undefined,
    };
  });

  // 2. Upcoming follow-ups after today
  const upcomingRaw = await prisma.followUp.findMany({
    where: {
      organizationId: org.id,
      status: 'SCHEDULED',
      dueAt: { gt: endOfTodayIST },
    },
    include: {
      lead: true,
    },
    orderBy: { dueAt: 'asc' },
    take: 6,
  });

  const upcomingFollowUps = upcomingRaw.map((u) => {
    const dueDateFormatted = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
    }).format(u.dueAt);

    return {
      businessName: u.lead.businessName,
      actionType: u.actionType,
      dueDateFormatted,
      title: u.title,
    };
  });

  // 3. Pipeline Stages and Lead breakdown
  const stagesRaw = await prisma.pipelineStage.findMany({
    where: { organizationId: org.id },
    orderBy: { position: 'asc' },
    include: {
      leads: {
        where: { archivedAt: null },
        select: { id: true, dealValue: true, prototypeUrl: true },
      },
    },
  });

  let activePipelineValue = 0;
  let activeLeadsCount = 0;
  let prototypesCount = 0;

  const stages = stagesRaw.map((s) => {
    const count = s.leads.length;
    const dealValue = s.leads.reduce((sum, l) => sum + (l.dealValue || 0), 0);
    activeLeadsCount += count;
    activePipelineValue += dealValue;
    prototypesCount += s.leads.filter((l) => Boolean(l.prototypeUrl)).length;

    return {
      name: s.name,
      count,
      dealValue,
    };
  });

  return {
    orgName: org.name,
    dateFormatted,
    appUrl,
    stats: {
      reachOutsCount: todaysFollowUps.length,
      activePipelineValue,
      activeLeadsCount,
      prototypesCount,
    },
    todaysFollowUps,
    stages,
    upcomingFollowUps,
  };
}

export function buildDailyBriefingHtml(data: DailyBriefingData): string {
  const { dateFormatted, stats, todaysFollowUps, stages, upcomingFollowUps, appUrl } = data;

  const cleanPhone = (phone: string) => phone.replace(/[^0-9]/g, '');

  const reachOutRowsHtml = todaysFollowUps.length > 0
    ? todaysFollowUps.map((f, i) => {
        const rawPhone = cleanPhone(f.phone);
        const waLink = rawPhone ? `https://wa.me/${rawPhone}` : null;
        const callLink = rawPhone ? `tel:+${rawPhone}` : null;
        const leadLink = `${appUrl}/leads/${f.leadId}`;

        const actionBadgeBg = f.actionType === 'CALL' ? '#EFF6FF' : f.actionType === 'WHATSAPP' ? '#ECFDF5' : '#FDF4FF';
        const actionBadgeColor = f.actionType === 'CALL' ? '#1D4ED8' : f.actionType === 'WHATSAPP' ? '#047857' : '#9333EA';

        return `
          <tr style="border-bottom: 1px solid #23283A; ${i % 2 === 1 ? 'background-color: #121520;' : 'background-color: #161A26;'}">
            <td style="padding: 12px 14px; font-weight: 600; color: #C5A84D; font-size: 13px; white-space: nowrap; vertical-align: top;">
              ⏰ ${f.scheduledTime}
            </td>
            <td style="padding: 12px 14px; vertical-align: top;">
              <div style="font-weight: 700; color: #FFFFFF; font-size: 14px; margin-bottom: 2px;">
                <a href="${leadLink}" style="color: #FFFFFF; text-decoration: none;">${f.businessName}</a>
              </div>
              <div style="font-size: 12px; color: #94A3B8; margin-bottom: 4px;">
                👤 ${f.contactName} ${f.phone ? `• <a href="${callLink}" style="color: #38BDF8; text-decoration: none;">${f.phone}</a>` : ''}
              </div>
              ${f.notes ? `<div style="font-size: 11px; color: #E2E8F0; background: #1E2333; padding: 4px 8px; border-radius: 4px; display: inline-block; margin-top: 2px; border-left: 2px solid #C5A84D;">📝 ${f.notes}</div>` : ''}
            </td>
            <td style="padding: 12px 14px; vertical-align: top; white-space: nowrap;">
              <span style="display: inline-block; padding: 3px 8px; font-size: 11px; font-weight: 700; border-radius: 4px; background: ${actionBadgeBg}; color: ${actionBadgeColor};">
                ${f.actionType}
              </span>
              ${f.dealValue ? `<div style="font-size: 11px; color: #C5A84D; font-weight: 600; margin-top: 4px;">₹${f.dealValue.toLocaleString('en-IN')}</div>` : ''}
            </td>
            <td style="padding: 12px 14px; text-align: right; vertical-align: middle; white-space: nowrap;">
              ${waLink ? `<a href="${waLink}" style="display: inline-block; padding: 6px 10px; background: #10B981; color: #FFFFFF; text-decoration: none; border-radius: 6px; font-size: 11px; font-weight: 700; margin-right: 4px;">WhatsApp</a>` : ''}
              ${callLink ? `<a href="${callLink}" style="display: inline-block; padding: 6px 10px; background: #3B82F6; color: #FFFFFF; text-decoration: none; border-radius: 6px; font-size: 11px; font-weight: 700; margin-right: 4px;">Call</a>` : ''}
              <a href="${leadLink}" style="display: inline-block; padding: 6px 10px; background: #2A3042; color: #E2E8F0; text-decoration: none; border-radius: 6px; font-size: 11px; font-weight: 600;">View</a>
            </td>
          </tr>
        `;
      }).join('')
    : `
      <tr>
        <td colspan="4" style="padding: 24px; text-align: center; color: #94A3B8; font-size: 13px;">
          🎉 No scheduled reach-outs due for today. All follow-ups are clear!
        </td>
      </tr>
    `;

  const stagesHtml = stages.map((s) => `
    <div style="flex: 1; min-width: 100px; background: #161A26; border: 1px solid #23283A; border-radius: 8px; padding: 10px 12px; margin: 4px;">
      <div style="font-size: 11px; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">${s.name}</div>
      <div style="font-size: 18px; font-weight: 800; color: #FFFFFF;">${s.count}</div>
      ${s.dealValue > 0 ? `<div style="font-size: 11px; color: #C5A84D; font-weight: 600;">₹${s.dealValue.toLocaleString('en-IN')}</div>` : ''}
    </div>
  `).join('');

  const upcomingListHtml = upcomingFollowUps.map((u) => `
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #161A26; border-radius: 6px; margin-bottom: 6px; border: 1px solid #23283A; font-size: 12px;">
      <div>
        <span style="color: #FFFFFF; font-weight: 600;">${u.businessName}</span>
        <span style="color: #64748B; margin-left: 6px;">(${u.actionType})</span>
      </div>
      <span style="color: #C5A84D; font-weight: 700; font-size: 11px;">📅 ${u.dueDateFormatted}</span>
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>LuxeStudio LeadFlow 9:00 AM Daily Briefing</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #0B0D12; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E2E8F0; line-height: 1.5;">
      
      <div style="max-width: 680px; margin: 0 auto; padding: 24px 16px;">
        
        <!-- Header -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
          <tr>
            <td>
              <div style="display: inline-block; padding: 4px 10px; background: rgba(197, 168, 77, 0.15); border: 1px solid rgba(197, 168, 77, 0.4); border-radius: 20px; font-size: 11px; font-weight: 800; color: #C5A84D; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px;">
                ✦ LUXESTUDIO LEADFLOW
              </div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px;">
                Daily 9:00 AM Sales Briefing
              </h1>
              <div style="font-size: 13px; color: #94A3B8; margin-top: 4px;">
                ${dateFormatted} • Asia/Kolkata
              </div>
            </td>
            <td align="right" style="vertical-align: top;">
              <a href="${appUrl}" style="display: inline-block; padding: 8px 14px; background: #C5A84D; color: #0B0D12; text-decoration: none; border-radius: 8px; font-size: 12px; font-weight: 700;">
                Open CRM →
              </a>
            </td>
          </tr>
        </table>

        <!-- Metric KPI Banner -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px; border-collapse: separate; border-spacing: 8px 0;">
          <tr>
            <td width="25%" style="background: #161A26; border: 1px solid #23283A; border-radius: 10px; padding: 14px; text-align: center;">
              <div style="font-size: 11px; color: #94A3B8; text-transform: uppercase; font-weight: 600;">Reach-Outs Today</div>
              <div style="font-size: 24px; font-weight: 800; color: #F59E0B; margin-top: 4px;">${stats.reachOutsCount}</div>
            </td>
            <td width="25%" style="background: #161A26; border: 1px solid #23283A; border-radius: 10px; padding: 14px; text-align: center;">
              <div style="font-size: 11px; color: #94A3B8; text-transform: uppercase; font-weight: 600;">Active Pipeline</div>
              <div style="font-size: 20px; font-weight: 800; color: #10B981; margin-top: 4px;">₹${(stats.activePipelineValue / 1000).toFixed(1)}k</div>
            </td>
            <td width="25%" style="background: #161A26; border: 1px solid #23283A; border-radius: 10px; padding: 14px; text-align: center;">
              <div style="font-size: 11px; color: #94A3B8; text-transform: uppercase; font-weight: 600;">Active Leads</div>
              <div style="font-size: 24px; font-weight: 800; color: #38BDF8; margin-top: 4px;">${stats.activeLeadsCount}</div>
            </td>
            <td width="25%" style="background: #161A26; border: 1px solid #23283A; border-radius: 10px; padding: 14px; text-align: center;">
              <div style="font-size: 11px; color: #94A3B8; text-transform: uppercase; font-weight: 600;">Prototypes Sent</div>
              <div style="font-size: 24px; font-weight: 800; color: #A855F7; margin-top: 4px;">${stats.prototypesCount}</div>
            </td>
          </tr>
        </table>

        <!-- Section: Whom to Reach Out Today -->
        <div style="background: #161A26; border: 1px solid #23283A; border-radius: 12px; overflow: hidden; margin-bottom: 24px;">
          <div style="padding: 14px 16px; background: #1A1F2E; border-bottom: 1px solid #23283A; display: flex; justify-content: space-between; align-items: center;">
            <div style="font-weight: 700; color: #FFFFFF; font-size: 14px; display: flex; align-items: center; gap: 6px;">
              🎯 Whom to Reach Out Today (${todaysFollowUps.length})
            </div>
            <a href="${appUrl}/follow-ups" style="font-size: 11px; color: #C5A84D; text-decoration: none; font-weight: 600;">
              View Follow-Up Centre →
            </a>
          </div>

          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
            <thead>
              <tr style="background: #141722; border-bottom: 1px solid #23283A; font-size: 11px; color: #94A3B8; text-transform: uppercase;">
                <th style="padding: 10px 14px; text-align: left;">Scheduled</th>
                <th style="padding: 10px 14px; text-align: left;">Prospect & Contact</th>
                <th style="padding: 10px 14px; text-align: left;">Action / Deal</th>
                <th style="padding: 10px 14px; text-align: right;">Quick Action</th>
              </tr>
            </thead>
            <tbody>
              ${reachOutRowsHtml}
            </tbody>
          </table>
        </div>

        <!-- Section: Pipeline Breakdown -->
        <div style="background: #161A26; border: 1px solid #23283A; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
          <div style="font-weight: 700; color: #FFFFFF; font-size: 14px; margin-bottom: 12px; display: flex; justify-content: space-between;">
            <span>📊 Pipeline Stage Overview</span>
            <a href="${appUrl}/pipeline" style="font-size: 11px; color: #C5A84D; text-decoration: none; font-weight: 600;">
              Open Kanban Board →
            </a>
          </div>
          <div style="display: flex; flex-wrap: wrap; margin: -4px;">
            ${stagesHtml}
          </div>
        </div>

        <!-- Section: Upcoming This Week & Month -->
        ${upcomingFollowUps.length > 0 ? `
          <div style="background: #161A26; border: 1px solid #23283A; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
            <div style="font-weight: 700; color: #FFFFFF; font-size: 14px; margin-bottom: 10px;">
              📅 Upcoming Follow-ups (Later This Week & Month)
            </div>
            <div>
              ${upcomingListHtml}
            </div>
          </div>
        ` : ''}

        <!-- Quick Access Navigation -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
          <tr>
            <td align="center">
              <a href="${appUrl}/leads" style="display: inline-block; padding: 10px 18px; margin: 0 4px; background: #222736; border: 1px solid #2D3448; color: #FFFFFF; text-decoration: none; border-radius: 8px; font-size: 12px; font-weight: 600;">
                📁 All Leads (${stats.activeLeadsCount})
              </a>
              <a href="${appUrl}/pipeline" style="display: inline-block; padding: 10px 18px; margin: 0 4px; background: #222736; border: 1px solid #2D3448; color: #FFFFFF; text-decoration: none; border-radius: 8px; font-size: 12px; font-weight: 600;">
                📊 Pipeline Board
              </a>
              <a href="${appUrl}/follow-ups" style="display: inline-block; padding: 10px 18px; margin: 0 4px; background: #222736; border: 1px solid #2D3448; color: #FFFFFF; text-decoration: none; border-radius: 8px; font-size: 12px; font-weight: 600;">
                ⚡ Follow-Up Centre
              </a>
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <div style="text-align: center; border-top: 1px solid #1E2333; padding-top: 16px; font-size: 11px; color: #64748B;">
          <p style="margin: 0 0 4px 0;">
            LuxeStudio LeadFlow • Automated 9:00 AM IST Executive Daily Briefing
          </p>
          <p style="margin: 0; color: #475569;">
            Configured for <strong>hello@theluxestudio.in</strong> (CC: <strong>rahulk19022@gmail.com</strong>)
          </p>
        </div>

      </div>

    </body>
    </html>
  `;
}

export async function sendDailyBriefingEmail(options: { force?: boolean } = {}): Promise<{
  success: boolean;
  skipped?: boolean;
  reason?: string;
  reachOutsCount?: number;
  recipient?: string;
  error?: string;
}> {
  if (!isEmailConfigured()) {
    return {
      success: false,
      error: 'Email provider is not configured. Please verify SMTP credentials in environment settings.',
    };
  }

  const org = await prisma.organization.findFirst();
  if (!org) {
    return { success: false, error: 'No organization found for briefing.' };
  }

  const now = new Date();
  const istDateString = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);

  // Idempotency check: don't send multiple briefings on the same day unless forced
  if (!options.force) {
    const existingLog = await prisma.auditLog.findFirst({
      where: {
        organizationId: org.id,
        entityType: 'BRIEFING',
        entityId: istDateString,
        action: 'DAILY_9AM_EMAIL_SENT',
      },
    });

    if (existingLog) {
      return {
        success: true,
        skipped: true,
        reason: `Briefing already sent today (${istDateString})`,
      };
    }
  }

  const data = await getDailyBriefingData(org.id);
  if (!data) {
    return { success: false, error: 'Could not generate briefing data.' };
  }

  const html = buildDailyBriefingHtml(data);
  const recipients = getDefaultNotificationRecipients();

  const totalValueFormatted = data.stats.activePipelineValue > 0
    ? ` | ₹${(data.stats.activePipelineValue / 1000).toFixed(0)}k Pipeline`
    : '';

  const subject = `[LeadFlow 9 AM Briefing] ${data.stats.reachOutsCount} Reach-Outs Due Today${totalValueFormatted}`;

  const emailRes = await sendEmailNotification({
    to: recipients.to,
    cc: recipients.cc,
    subject,
    html,
  });

  if (!emailRes.success) {
    return {
      success: false,
      error: emailRes.error,
    };
  }

  // Record audit log for history & idempotency
  await prisma.auditLog.create({
    data: {
      organizationId: org.id,
      entityType: 'BRIEFING',
      entityId: istDateString,
      action: 'DAILY_9AM_EMAIL_SENT',
      metadata: JSON.stringify({
        reachOutsCount: data.stats.reachOutsCount,
        pipelineValue: data.stats.activePipelineValue,
        sentAt: new Date().toISOString(),
        recipients,
      }),
    },
  });

  return {
    success: true,
    reachOutsCount: data.stats.reachOutsCount,
    recipient: `${recipients.to}${recipients.cc ? ` (CC: ${recipients.cc})` : ''}`,
  };
}
