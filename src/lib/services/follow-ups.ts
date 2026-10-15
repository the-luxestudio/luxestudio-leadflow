import prisma from '@/lib/db/prisma';
import { assertLeadAccess, getLeadFilterForSession, UserSession } from '@/lib/auth/guard';

export type FollowUpTab = 'today' | 'upcoming' | 'overdue' | 'completed' | 'all';

export async function listFollowUps(
  session: UserSession,
  tab: FollowUpTab = 'today'
) {
  const baseFilter = getLeadFilterForSession(session);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const where: any = {
    organizationId: session.organization.id,
    lead: { archivedAt: null },
  };

  // If sales member, restricted to their own follow-ups or assigned leads
  if (baseFilter.ownerId) {
    where.OR = [
      { ownerId: baseFilter.ownerId },
      { lead: { ownerId: baseFilter.ownerId } },
    ];
  }

  if (tab === 'today') {
    where.status = 'SCHEDULED';
    where.dueAt = { gte: startOfToday, lte: endOfToday };
  } else if (tab === 'upcoming') {
    where.status = 'SCHEDULED';
    where.dueAt = { gt: endOfToday };
  } else if (tab === 'overdue') {
    where.status = 'SCHEDULED';
    where.dueAt = { lt: startOfToday };
  } else if (tab === 'completed') {
    where.status = { in: ['COMPLETED', 'CANCELLED'] };
  }

  const followUps = await prisma.followUp.findMany({
    where,
    orderBy: tab === 'completed' ? { completedAt: 'desc' } : { dueAt: 'asc' },
    include: {
      owner: { select: { id: true, displayName: true } },
      lead: {
        select: {
          id: true,
          businessName: true,
          category: true,
          city: true,
          prototypeUrl: true,
          proposalUrl: true,
          dealValue: true,
          contacts: {
            where: { isPrimary: true },
            take: 1,
            select: { name: true, phone: true, whatsappPhone: true, email: true },
          },
        },
      },
    },
  });

  return followUps;
}

export async function completeFollowUp(
  session: UserSession,
  input: {
    followUpId: string;
    outcome: string;
    notes?: string;
    nextFollowUp?: {
      title: string;
      actionType: string;
      dueAt: Date;
      plannedMessage?: string;
    };
  }
) {
  const followUp = await prisma.followUp.findUnique({
    where: { id: input.followUpId },
    include: { lead: true },
  });

  if (!followUp) throw new Error('Follow-up task not found');
  assertLeadAccess(followUp.lead, session);

  return prisma.$transaction(async (tx) => {
    // 1. Mark Follow-up Completed
    const completed = await tx.followUp.update({
      where: { id: followUp.id },
      data: {
        status: 'COMPLETED',
        outcome: input.outcome,
        completedAt: new Date(),
      },
    });

    // 2. Cancel any pending notification jobs so no stale reminders fire
    await tx.notificationJob.updateMany({
      where: { followUpId: followUp.id, status: 'PENDING' },
      data: { status: 'CANCELLED' },
    });

    // 3. Log lead activity
    await tx.leadActivity.create({
      data: {
        organizationId: session.organization.id,
        leadId: followUp.leadId,
        actorId: session.user.id,
        type: followUp.actionType,
        outcome: input.outcome,
        summary: `Completed ${followUp.actionType}: ${followUp.title}`,
        details: `Outcome: ${input.outcome}. ${input.notes || ''}`.trim(),
        occurredAt: new Date(),
      },
    });

    // Update lead's last contacted timestamp
    await tx.lead.update({
      where: { id: followUp.leadId },
      data: { lastContactedAt: new Date() },
    });

    // 4. Optionally schedule next follow-up
    let nextCreated = null;
    if (input.nextFollowUp) {
      nextCreated = await tx.followUp.create({
        data: {
          organizationId: session.organization.id,
          leadId: followUp.leadId,
          ownerId: followUp.ownerId,
          createdBy: session.user.id,
          title: input.nextFollowUp.title,
          actionType: input.nextFollowUp.actionType,
          dueAt: new Date(input.nextFollowUp.dueAt),
          plannedMessage: input.nextFollowUp.plannedMessage || null,
          timezone: session.organization.timezone || 'Asia/Kolkata',
          status: 'SCHEDULED',
        },
      });
    }

    return { completed, nextFollowUp: nextCreated };
  });
}

export async function snoozeFollowUp(
  session: UserSession,
  followUpId: string,
  newDueAt: Date
) {
  const followUp = await prisma.followUp.findUnique({
    where: { id: followUpId },
    include: { lead: true },
  });

  if (!followUp) throw new Error('Follow-up task not found');
  assertLeadAccess(followUp.lead, session);

  return prisma.$transaction(async (tx) => {
    // Cancel old pending notifications
    await tx.notificationJob.updateMany({
      where: { followUpId, status: 'PENDING' },
      data: { status: 'CANCELLED' },
    });

    return tx.followUp.update({
      where: { id: followUpId },
      data: {
        dueAt: new Date(newDueAt),
        status: 'SCHEDULED',
        snoozedUntil: new Date(newDueAt),
      },
    });
  });
}

export async function cancelFollowUp(
  session: UserSession,
  followUpId: string
) {
  const followUp = await prisma.followUp.findUnique({
    where: { id: followUpId },
    include: { lead: true },
  });

  if (!followUp) throw new Error('Follow-up task not found');
  assertLeadAccess(followUp.lead, session);

  return prisma.$transaction(async (tx) => {
    // Cancel pending notification jobs
    await tx.notificationJob.updateMany({
      where: { followUpId, status: 'PENDING' },
      data: { status: 'CANCELLED' },
    });

    return tx.followUp.update({
      where: { id: followUpId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    });
  });
}
