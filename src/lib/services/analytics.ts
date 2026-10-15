import prisma from '@/lib/db/prisma';
import { getLeadFilterForSession, UserSession } from '@/lib/auth/guard';
import { getTimezoneDayBounds } from '@/lib/utils/timezone';

export async function getDashboardMetrics(session: UserSession) {
  const baseFilter = getLeadFilterForSession(session);
  const now = new Date();
  const tz = session.organization.timezone || process.env.NEXT_PUBLIC_DEFAULT_TIMEZONE || 'Asia/Kolkata';
  const { startOfToday, endOfToday } = getTimezoneDayBounds(tz, now);
  const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const leadWhere: any = {
    organizationId: session.organization.id,
    archivedAt: null,
  };
  if (baseFilter.ownerId) {
    leadWhere.ownerId = baseFilter.ownerId;
  }

  const followUpWhere: any = {
    organizationId: session.organization.id,
    lead: { archivedAt: null },
  };
  if (baseFilter.ownerId) {
    followUpWhere.OR = [
      { ownerId: baseFilter.ownerId },
      { lead: { ownerId: baseFilter.ownerId } },
    ];
  }

  const [
    totalLeads,
    leadsCreatedThisWeek,
    followUpsDueToday,
    overdueFollowUps,
    todayFollowUps,
    stages,
    allLeadsInScope,
    recentActivities,
    leadsWithNoNextActionCount,
    allDeals,
  ] = await Promise.all([
    // Total active leads
    prisma.lead.count({ where: leadWhere }),

    // Leads created this week
    prisma.lead.count({
      where: {
        ...leadWhere,
        createdAt: { gte: startOfWeek },
      },
    }),

    // Follow-ups due today (Timezone aware)
    prisma.followUp.count({
      where: {
        ...followUpWhere,
        status: 'SCHEDULED',
        dueAt: { gte: startOfToday, lte: endOfToday },
      },
    }),

    // Overdue follow-ups (Timezone aware)
    prisma.followUp.count({
      where: {
        ...followUpWhere,
        status: 'SCHEDULED',
        dueAt: { lt: startOfToday },
      },
    }),

    // Top follow-ups due today for quick dashboard action
    prisma.followUp.findMany({
      where: {
        ...followUpWhere,
        status: 'SCHEDULED',
        dueAt: { gte: startOfToday, lte: endOfToday },
      },
      orderBy: { dueAt: 'asc' },
      take: 15,
      include: {
        lead: {
          select: {
            id: true,
            businessName: true,
            category: true,
            city: true,
            dealValue: true,
            contacts: {
              where: { isPrimary: true },
              take: 1,
              select: { name: true, phone: true, whatsappPhone: true },
            },
          },
        },
      },
    }),

    // Active stages
    prisma.pipelineStage.findMany({
      where: { organizationId: session.organization.id, active: true },
      orderBy: { position: 'asc' },
    }),

    // Leads with stage & deals
    prisma.lead.findMany({
      where: leadWhere,
      select: {
        id: true,
        businessName: true,
        stageId: true,
        dealValue: true,
        source: true,
        followUps: {
          where: { status: 'SCHEDULED' },
          select: { id: true },
        },
      },
    }),

    // Recent activity
    prisma.leadActivity.findMany({
      where: {
        organizationId: session.organization.id,
        lead: baseFilter.ownerId ? { ownerId: baseFilter.ownerId } : undefined,
      },
      take: 8,
      orderBy: { occurredAt: 'desc' },
      include: {
        actor: { select: { displayName: true } },
        lead: { select: { id: true, businessName: true } },
      },
    }),

    // Leads with NO scheduled follow-up
    prisma.lead.count({
      where: {
        ...leadWhere,
        followUps: {
          none: { status: 'SCHEDULED' },
        },
      },
    }),

    // Deals for pipeline calculations
    prisma.deal.findMany({
      where: {
        organizationId: session.organization.id,
        lead: leadWhere,
      },
    }),
  ]);

  // Aggregate Stage counts and values
  const stageBreakdown = stages.map((stage) => {
    const matchingLeads = allLeadsInScope.filter((l) => l.stageId === stage.id);
    const totalValue = matchingLeads.reduce((sum, l) => sum + (l.dealValue || 0), 0);
    return {
      id: stage.id,
      name: stage.name,
      color: stage.color || '#6B7280',
      count: matchingLeads.length,
      totalValue,
      isWon: stage.isWon,
      isLost: stage.isLost,
    };
  });

  // Calculate Pipeline Values
  const openDeals = allDeals.filter((d) => d.status === 'OPEN');
  const wonDeals = allDeals.filter((d) => d.status === 'WON');
  const lostDeals = allDeals.filter((d) => d.status === 'LOST');

  const openPipelineValue = openDeals.reduce((sum, d) => sum + (d.amount || 0), 0);
  const weightedPipelineValue = openDeals.reduce((sum, d) => sum + (d.amount * (d.probability / 100)), 0);
  const closedWonRevenue = wonDeals.reduce((sum, d) => sum + (d.amount || 0), 0);

  const totalClosedDeals = wonDeals.length + lostDeals.length;
  const winRate = totalClosedDeals > 0 ? Math.round((wonDeals.length / totalClosedDeals) * 100) : 0;

  // Leads by source breakdown
  const sourceMap: Record<string, number> = {};
  for (const lead of allLeadsInScope) {
    const s = lead.source || 'Other';
    sourceMap[s] = (sourceMap[s] || 0) + 1;
  }
  const sourceBreakdown = Object.entries(sourceMap).map(([name, count]) => ({
    name,
    count,
  }));

  return {
    overview: {
      totalLeads,
      leadsCreatedThisWeek,
      followUpsDueToday,
      overdueFollowUps,
      openPipelineValue,
      weightedPipelineValue,
      closedWonRevenue,
      winRate,
      wonDealsCount: wonDeals.length,
      leadsWithNoNextActionCount,
    },
    todayFollowUps,
    stageBreakdown,
    sourceBreakdown,
    recentActivities,
  };
}

export async function getTeamAnalytics(session: UserSession) {
  const members = await prisma.membership.findMany({
    where: { organizationId: session.organization.id },
    include: {
      user: {
        include: {
          assignedLeads: {
            where: { archivedAt: null },
            include: {
              deals: true,
              followUps: { where: { status: 'SCHEDULED' } },
            },
          },
          activities: {
            where: {
              occurredAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
            },
          },
        },
      },
    },
  });

  return members.map((m) => {
    const leads = m.user.assignedLeads;
    const totalLeads = leads.length;
    const wonDeals = leads.flatMap((l) => l.deals.filter((d) => d.status === 'WON'));
    const openDeals = leads.flatMap((l) => l.deals.filter((d) => d.status === 'OPEN'));
    const wonRevenue = wonDeals.reduce((sum, d) => sum + (d.amount || 0), 0);
    const pipelineValue = openDeals.reduce((sum, d) => sum + (d.amount || 0), 0);

    return {
      userId: m.user.id,
      name: m.user.displayName,
      email: m.user.email,
      role: m.role,
      totalLeads,
      openPipelineValue: pipelineValue,
      wonRevenue,
      wonDealsCount: wonDeals.length,
      recentActivitiesCount: m.user.activities.length,
    };
  });
}
