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
      category: f.lead.category || 'Client',
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
    const isProtoStage = s.name.toLowerCase().includes('prototype');
    prototypesCount += s.leads.filter((l) => Boolean(l.prototypeUrl) || isProtoStage).length;

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

  // Render each lead as an independent, fully-responsive Card (No columns to squish!)
  const reachOutCardsHtml = todaysFollowUps.length > 0
    ? todaysFollowUps.map((f) => {
        const rawPhone = cleanPhone(f.phone);
        const waLink = rawPhone ? `https://wa.me/${rawPhone}` : null;
        const callLink = rawPhone ? `tel:+${rawPhone}` : null;
        const leadLink = `${appUrl}/leads/${f.leadId}`;

        const isCall = f.actionType === 'CALL';
        const isWhatsApp = f.actionType === 'WHATSAPP';

        const actionBadgeBg = isCall ? '#1E3A8A' : isWhatsApp ? '#065F46' : '#581C87';
        const actionBadgeColor = isCall ? '#93C5FD' : isWhatsApp ? '#6EE7B7' : '#E9D5FF';
        const actionIcon = isCall ? '📞 Phone Call' : isWhatsApp ? '💬 WhatsApp' : `📌 ${f.actionType}`;

        return `
          <div style="background-color: #141724; border: 1px solid #23283D; border-radius: 12px; padding: 16px; margin-bottom: 14px;">
            
            <!-- Card Header: Time Badge + Action Badge + Deal Value -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 10px;">
              <tr>
                <td align="left" style="vertical-align: middle;">
                  <span style="display: inline-block; padding: 4px 10px; background-color: rgba(197, 168, 77, 0.15); border: 1px solid rgba(197, 168, 77, 0.35); border-radius: 6px; font-size: 12px; font-weight: 700; color: #C5A84D;">
                    ⏰ ${f.scheduledTime}
                  </span>
                </td>
                <td align="right" style="vertical-align: middle;">
                  <span style="display: inline-block; padding: 4px 10px; font-size: 11px; font-weight: 700; border-radius: 6px; background-color: ${actionBadgeBg}; color: ${actionBadgeColor}; margin-left: 6px;">
                    ${actionIcon}
                  </span>
                  ${f.dealValue ? `
                    <span style="display: inline-block; padding: 4px 9px; font-size: 11px; font-weight: 700; border-radius: 6px; background-color: rgba(16, 185, 129, 0.15); color: #10B981; border: 1px solid rgba(16, 185, 129, 0.3); margin-left: 6px;">
                      ₹${f.dealValue.toLocaleString('en-IN')}
                    </span>
                  ` : ''}
                </td>
              </tr>
            </table>

            <!-- Prospect Title -->
            <div style="font-size: 16px; font-weight: 800; color: #FFFFFF; line-height: 1.3; margin-bottom: 4px;">
              <a href="${leadLink}" style="color: #FFFFFF; text-decoration: none;">${f.businessName}</a>
            </div>

            <!-- Contact & Phone line -->
            <div style="font-size: 13px; color: #94A3B8; margin-bottom: 12px; line-height: 1.4;">
              👤 <strong style="color: #E2E8F0;">${f.contactName}</strong> 
              ${f.phone ? ` • <a href="${callLink}" style="color: #38BDF8; text-decoration: none; font-weight: 600;">${f.phone}</a>` : ''}
              ${f.category ? ` <span style="color: #64748B;">(${f.category})</span>` : ''}
            </div>

            <!-- Notes / Strategy context box (Full-width, highly readable on mobile) -->
            ${f.notes ? `
              <div style="background-color: #1B2030; border-left: 3px solid #C5A84D; border-radius: 6px; padding: 10px 14px; margin-bottom: 14px; font-size: 12px; color: #E2E8F0; line-height: 1.5;">
                <span style="color: #C5A84D; font-weight: 700;">Note:</span> ${f.notes}
              </div>
            ` : ''}

            <!-- Action Buttons: Large touch-friendly buttons spanning the card -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                ${waLink ? `
                  <td width="${callLink ? '35%' : '50%'}" style="padding-right: 6px;">
                    <a href="${waLink}" style="display: block; text-align: center; padding: 10px 0; background-color: #10B981; color: #FFFFFF; text-decoration: none; border-radius: 8px; font-size: 12px; font-weight: 700;">
                      WhatsApp
                    </a>
                  </td>
                ` : ''}
                ${callLink ? `
                  <td width="${waLink ? '35%' : '50%'}" style="padding-right: 6px;">
                    <a href="${callLink}" style="display: block; text-align: center; padding: 10px 0; background-color: #2563EB; color: #FFFFFF; text-decoration: none; border-radius: 8px; font-size: 12px; font-weight: 700;">
                      Call Client
                    </a>
                  </td>
                ` : ''}
                <td width="${(waLink && callLink) ? '30%' : '50%'}">
                  <a href="${leadLink}" style="display: block; text-align: center; padding: 10px 0; background-color: #242A3D; border: 1px solid #353D57; color: #F1F5F9; text-decoration: none; border-radius: 8px; font-size: 12px; font-weight: 600;">
                    Open Lead →
                  </a>
                </td>
              </tr>
            </table>

          </div>
        `;
      }).join('')
    : `
      <div style="background-color: #141724; border: 1px solid #23283D; border-radius: 12px; padding: 24px; text-align: center; color: #94A3B8; font-size: 13px;">
        🎉 No scheduled reach-outs due for today. All follow-ups are clear!
      </div>
    `;

  // Pipeline stage cards (2 columns on mobile for spacious layout)
  const stageCardsHtml = `
    <table width="100%" cellpadding="0" cellspacing="0">
      ${stages.map((s, idx) => {
        if (idx % 2 === 0) {
          const next = stages[idx + 1];
          return `
            <tr>
              <td width="50%" style="padding: 0 4px 8px 0; vertical-align: top;">
                <div style="background-color: #141724; border: 1px solid #23283D; border-radius: 8px; padding: 10px 12px;">
                  <div style="font-size: 11px; color: #94A3B8; text-transform: uppercase; font-weight: 600; margin-bottom: 2px;">${s.name}</div>
                  <div style="font-size: 18px; font-weight: 800; color: #FFFFFF;">${s.count}</div>
                  ${s.dealValue > 0 ? `<div style="font-size: 11px; color: #C5A84D; font-weight: 600;">₹${s.dealValue.toLocaleString('en-IN')}</div>` : ''}
                </div>
              </td>
              ${next ? `
                <td width="50%" style="padding: 0 0 8px 4px; vertical-align: top;">
                  <div style="background-color: #141724; border: 1px solid #23283D; border-radius: 8px; padding: 10px 12px;">
                    <div style="font-size: 11px; color: #94A3B8; text-transform: uppercase; font-weight: 600; margin-bottom: 2px;">${next.name}</div>
                    <div style="font-size: 18px; font-weight: 800; color: #FFFFFF;">${next.count}</div>
                    ${next.dealValue > 0 ? `<div style="font-size: 11px; color: #C5A84D; font-weight: 600;">₹${next.dealValue.toLocaleString('en-IN')}</div>` : ''}
                  </div>
                </td>
              ` : '<td width="50%"></td>'}
            </tr>
          `;
        }
        return '';
      }).join('')}
    </table>
  `;

  const upcomingListHtml = upcomingFollowUps.map((u) => `
    <div style="padding: 10px 12px; background-color: #141724; border-radius: 8px; margin-bottom: 8px; border: 1px solid #23283D;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="left" style="font-size: 13px; font-weight: 600; color: #FFFFFF;">
            ${u.businessName} <span style="font-size: 11px; color: #94A3B8; font-weight: normal;">(${u.actionType})</span>
          </td>
          <td align="right" style="font-size: 11px; font-weight: 700; color: #C5A84D; white-space: nowrap;">
            📅 ${u.dueDateFormatted}
          </td>
        </tr>
      </table>
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>LuxeStudio LeadFlow 9:00 AM Daily Briefing</title>
      <style>
        body { margin: 0; padding: 0; background-color: #0B0D12; -webkit-font-smoothing: antialiased; }
        @media only screen and (max-width: 600px) {
          .wrapper { padding: 12px 8px !important; }
          .header-title { font-size: 20px !important; }
        }
      </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #0B0D12; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E2E8F0; line-height: 1.5;">
      
      <div class="wrapper" style="max-width: 600px; width: 100%; margin: 0 auto; padding: 20px 12px; box-sizing: border-box;">
        
        <!-- Luxury Brand Header -->
        <div style="text-align: center; margin-bottom: 20px; padding: 16px 0 8px 0;">
          <div style="display: inline-block; padding: 4px 12px; background-color: rgba(197, 168, 77, 0.15); border: 1px solid rgba(197, 168, 77, 0.4); border-radius: 20px; font-size: 11px; font-weight: 800; color: #C5A84D; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 10px;">
            ✦ LUXESTUDIO LEADFLOW
          </div>
          <h1 class="header-title" style="margin: 0 0 4px 0; font-size: 24px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px;">
            Daily 9:00 AM Sales Briefing
          </h1>
          <div style="font-size: 13px; color: #94A3B8; margin-bottom: 16px;">
            📅 ${dateFormatted}
          </div>
          <a href="${appUrl}" style="display: inline-block; padding: 10px 22px; background-color: #C5A84D; color: #0B0D12; text-decoration: none; border-radius: 8px; font-size: 13px; font-weight: 800; letter-spacing: 0.3px;">
            Open LeadFlow CRM →
          </a>
        </div>

        <!-- 2x2 Mobile-Optimized KPI Metric Cards -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 22px;">
          <tr>
            <td width="50%" style="padding: 0 4px 8px 0;">
              <div style="background-color: #141724; border: 1px solid #23283D; border-radius: 10px; padding: 14px 10px; text-align: center;">
                <div style="font-size: 11px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px;">Reach-Outs Today</div>
                <div style="font-size: 26px; font-weight: 800; color: #F59E0B; margin-top: 3px;">${stats.reachOutsCount}</div>
                <div style="font-size: 10px; color: #64748B;">Scheduled Calls & Chats</div>
              </div>
            </td>
            <td width="50%" style="padding: 0 0 8px 4px;">
              <div style="background-color: #141724; border: 1px solid #23283D; border-radius: 10px; padding: 14px 10px; text-align: center;">
                <div style="font-size: 11px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px;">Active Pipeline</div>
                <div style="font-size: 26px; font-weight: 800; color: #10B981; margin-top: 3px;">₹${(stats.activePipelineValue / 1000).toFixed(1)}k</div>
                <div style="font-size: 10px; color: #64748B;">Total Pipeline Valuation</div>
              </div>
            </td>
          </tr>
          <tr>
            <td width="50%" style="padding: 0 4px 0 0;">
              <div style="background-color: #141724; border: 1px solid #23283D; border-radius: 10px; padding: 14px 10px; text-align: center;">
                <div style="font-size: 11px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px;">Active Leads</div>
                <div style="font-size: 26px; font-weight: 800; color: #38BDF8; margin-top: 3px;">${stats.activeLeadsCount}</div>
                <div style="font-size: 10px; color: #64748B;">In Sales Funnel</div>
              </div>
            </td>
            <td width="50%" style="padding: 0 0 0 4px;">
              <div style="background-color: #141724; border: 1px solid #23283D; border-radius: 10px; padding: 14px 10px; text-align: center;">
                <div style="font-size: 11px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px;">Prototypes in Play</div>
                <div style="font-size: 26px; font-weight: 800; color: #A855F7; margin-top: 3px;">${stats.prototypesCount}</div>
                <div style="font-size: 10px; color: #64748B;">Interactive Demos Shared</div>
              </div>
            </td>
          </tr>
        </table>

        <!-- Section: Whom to Reach Out Today Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 0 2px;">
          <h2 style="margin: 0; font-size: 16px; font-weight: 800; color: #FFFFFF;">
            🎯 Whom to Reach Out Today (${todaysFollowUps.length})
          </h2>
          <a href="${appUrl}/follow-ups" style="font-size: 12px; color: #C5A84D; font-weight: 700; text-decoration: none;">
            Follow-Up Centre →
          </a>
        </div>

        <!-- Rendered Mobile-Friendly Cards List -->
        <div style="margin-bottom: 24px;">
          ${reachOutCardsHtml}
        </div>

        <!-- Section: Pipeline Breakdown -->
        <div style="margin-bottom: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding: 0 2px;">
            <h2 style="margin: 0; font-size: 15px; font-weight: 800; color: #FFFFFF;">
              📊 Pipeline Stage Overview
            </h2>
            <a href="${appUrl}/pipeline" style="font-size: 12px; color: #C5A84D; font-weight: 700; text-decoration: none;">
              Kanban Board →
            </a>
          </div>
          ${stageCardsHtml}
        </div>

        <!-- Section: Upcoming This Week & Month -->
        ${upcomingFollowUps.length > 0 ? `
          <div style="margin-bottom: 24px;">
            <h2 style="margin: 0 0 10px 0; font-size: 15px; font-weight: 800; color: #FFFFFF; padding: 0 2px;">
              📅 Upcoming Follow-ups (Later This Week & Month)
            </h2>
            ${upcomingListHtml}
          </div>
        ` : ''}

        <!-- Quick Access Navigation Buttons -->
        <div style="background-color: #141724; border: 1px solid #23283D; border-radius: 12px; padding: 14px; margin-bottom: 24px; text-align: center;">
          <div style="font-size: 12px; color: #94A3B8; margin-bottom: 10px; font-weight: 600;">
            ⚡ Quick Workspace Access
          </div>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="33%" style="padding-right: 4px;">
                <a href="${appUrl}/leads" style="display: block; text-align: center; padding: 9px 0; background-color: #1E2333; border: 1px solid #2E364F; color: #FFFFFF; text-decoration: none; border-radius: 6px; font-size: 11px; font-weight: 700;">
                  📁 All Leads
                </a>
              </td>
              <td width="33%" style="padding: 0 2px;">
                <a href="${appUrl}/pipeline" style="display: block; text-align: center; padding: 9px 0; background-color: #1E2333; border: 1px solid #2E364F; color: #FFFFFF; text-decoration: none; border-radius: 6px; font-size: 11px; font-weight: 700;">
                  📊 Pipeline
                </a>
              </td>
              <td width="33%" style="padding-left: 4px;">
                <a href="${appUrl}/follow-ups" style="display: block; text-align: center; padding: 9px 0; background-color: #1E2333; border: 1px solid #2E364F; color: #FFFFFF; text-decoration: none; border-radius: 6px; font-size: 11px; font-weight: 700;">
                  ⏰ Follow-Ups
                </a>
              </td>
            </tr>
          </table>
        </div>

        <!-- Footer -->
        <div style="text-align: center; border-top: 1px solid #1E2333; padding-top: 16px; font-size: 11px; color: #64748B; line-height: 1.5;">
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
  const istHour = parseInt(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false }).format(now),
    10
  );
  const istTimeFormatted = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(now);

  // Time guard: only dispatch automatically at or after 9:00 AM IST (unless forced for testing)
  if (!options.force && istHour < 9) {
    return {
      success: true,
      skipped: true,
      reason: `Briefing scheduled for 9:00 AM IST (current time: ${istTimeFormatted} IST)`,
    };
  }

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
