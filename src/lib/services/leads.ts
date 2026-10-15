import prisma from '@/lib/db/prisma';
import { assertLeadAccess, getLeadFilterForSession, UserSession } from '@/lib/auth/guard';

export interface LeadFilterOptions {
  search?: string;
  stageId?: string;
  priority?: string;
  ownerId?: string;
  city?: string;
  category?: string;
  source?: string;
  followUpStatus?: 'due_today' | 'overdue' | 'upcoming' | 'none';
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'businessName' | 'dealValue' | 'priority';
  sortOrder?: 'asc' | 'desc';
}

export async function listLeads(
  session: UserSession,
  options: LeadFilterOptions = {}
) {
  const {
    search,
    stageId,
    priority,
    ownerId,
    city,
    category,
    source,
    followUpStatus,
    page = 1,
    limit = 20,
    sortBy = 'updatedAt',
    sortOrder = 'desc',
  } = options;

  const baseFilter = getLeadFilterForSession(session);
  const where: any = {
    organizationId: baseFilter.organizationId,
    archivedAt: null,
  };

  // If sales member, restricted to assigned leads
  if (baseFilter.ownerId) {
    where.ownerId = baseFilter.ownerId;
  } else if (ownerId) {
    where.ownerId = ownerId;
  }

  if (stageId) where.stageId = stageId;
  if (priority) where.priority = priority;
  if (city) where.city = { contains: city };
  if (category) where.category = { contains: category };
  if (source) where.source = { contains: source };

  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { businessName: { contains: q } },
      { city: { contains: q } },
      { category: { contains: q } },
      {
        contacts: {
          some: {
            OR: [
              { name: { contains: q } },
              { phone: { contains: q } },
              { email: { contains: q } },
            ],
          },
        },
      },
    ];
  }

  // Follow-up status filtering
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  if (followUpStatus === 'due_today') {
    where.followUps = {
      some: {
        status: 'SCHEDULED',
        dueAt: { gte: startOfToday, lte: endOfToday },
      },
    };
  } else if (followUpStatus === 'overdue') {
    where.followUps = {
      some: {
        status: 'SCHEDULED',
        dueAt: { lt: startOfToday },
      },
    };
  } else if (followUpStatus === 'upcoming') {
    where.followUps = {
      some: {
        status: 'SCHEDULED',
        dueAt: { gt: endOfToday },
      },
    };
  } else if (followUpStatus === 'none') {
    where.followUps = {
      none: {
        status: 'SCHEDULED',
      },
    };
  }

  const skip = (page - 1) * limit;

  const [total, leads] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        stage: true,
        owner: { select: { id: true, displayName: true, email: true } },
        contacts: {
          orderBy: { isPrimary: 'desc' },
          take: 1,
        },
        followUps: {
          where: { status: 'SCHEDULED' },
          orderBy: { dueAt: 'asc' },
          take: 1,
        },
        deals: {
          where: { status: 'OPEN' },
          take: 1,
        },
      },
    }),
  ]);

  return {
    leads,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getLeadById(
  leadId: string,
  session: UserSession
) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      stage: true,
      owner: { select: { id: true, displayName: true, email: true } },
      creator: { select: { id: true, displayName: true, email: true } },
      contacts: { orderBy: { createdAt: 'asc' } },
      notes: {
        orderBy: { createdAt: 'desc' },
        include: { author: { select: { id: true, displayName: true } } },
      },
      activities: {
        orderBy: { occurredAt: 'desc' },
        include: { actor: { select: { id: true, displayName: true } } },
      },
      deals: { orderBy: { createdAt: 'desc' } },
      followUps: {
        orderBy: { dueAt: 'asc' },
        include: { owner: { select: { id: true, displayName: true } } },
      },
      enrollments: {
        include: { sequence: true },
      },
    },
  });

  if (!lead) return null;
  assertLeadAccess(lead, session);

  return lead;
}

export async function checkDuplicates(
  organizationId: string,
  data: { phone?: string; email?: string; businessName?: string }
) {
  const normalizedPhone = data.phone ? data.phone.replace(/[^0-9]/g, '') : null;
  const conditions: any[] = [];

  if (normalizedPhone && normalizedPhone.length >= 7) {
    conditions.push({
      contacts: {
        some: {
          normalizedPhone: { contains: normalizedPhone.slice(-10) },
        },
      },
    });
  }

  if (data.email && data.email.trim()) {
    conditions.push({
      contacts: {
        some: {
          email: { equals: data.email.trim().toLowerCase() },
        },
      },
    });
  }

  if (data.businessName && data.businessName.trim().length >= 3) {
    conditions.push({
      businessName: { equals: data.businessName.trim() },
    });
  }

  if (conditions.length === 0) return [];

  return prisma.lead.findMany({
    where: {
      organizationId,
      archivedAt: null,
      OR: conditions,
    },
    include: {
      stage: true,
      owner: { select: { id: true, displayName: true } },
      contacts: { take: 1 },
    },
    take: 5,
  });
}

export async function createLead(
  session: UserSession,
  input: {
    businessName: string;
    category?: string;
    websiteUrl?: string;
    socialUrl?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    mapsUrl?: string;
    source?: string;
    sourceUrl?: string;
    origin?: string;
    stageId?: string;
    ownerId?: string;
    priority?: string;
    opportunityType?: string;
    prototypeUrl?: string;
    proposalUrl?: string;
    dealValue?: number;
    // Primary Contact
    contactName: string;
    phone?: string;
    whatsappPhone?: string;
    email?: string;
    // Initial activity / note
    initialNote?: string;
    // Initial follow up
    followUpDueAt?: Date;
    followUpAction?: string;
    followUpMessage?: string;
  }
) {
  // If role is SALES_MEMBER, lead owner MUST be the user themselves
  const assignedOwnerId =
    session.role === 'SALES_MEMBER' ? session.user.id : input.ownerId || session.user.id;

  // Resolve initial stage if not provided
  let initialStageId = input.stageId;
  if (!initialStageId) {
    const firstStage = await prisma.pipelineStage.findFirst({
      where: { organizationId: session.organization.id, active: true },
      orderBy: { position: 'asc' },
    });
    initialStageId = firstStage?.id || '';
  }

  const normalizedPhone = input.phone ? input.phone.replace(/[^0-9]/g, '') : null;

  return prisma.$transaction(async (tx) => {
    // 1. Create Lead
    const lead = await tx.lead.create({
      data: {
        organizationId: session.organization.id,
        businessName: input.businessName.trim(),
        category: input.category || null,
        websiteUrl: input.websiteUrl || null,
        socialUrl: input.socialUrl || null,
        address: input.address || null,
        city: input.city || null,
        state: input.state || null,
        country: input.country || 'India',
        mapsUrl: input.mapsUrl || null,
        source: input.source || null,
        sourceUrl: input.sourceUrl || null,
        origin: input.origin || 'MANUAL',
        stageId: initialStageId,
        ownerId: assignedOwnerId,
        priority: input.priority || 'MEDIUM',
        opportunityType: input.opportunityType || null,
        prototypeUrl: input.prototypeUrl || null,
        proposalUrl: input.proposalUrl || null,
        dealValue: input.dealValue || 0,
        createdBy: session.user.id,
        lastContactedAt: new Date(),
      },
    });

    // 2. Primary Contact
    await tx.leadContact.create({
      data: {
        organizationId: session.organization.id,
        leadId: lead.id,
        name: input.contactName.trim(),
        phone: input.phone || null,
        normalizedPhone,
        whatsappPhone: input.whatsappPhone || input.phone || null,
        email: input.email ? input.email.trim().toLowerCase() : null,
        isPrimary: true,
      },
    });

    // 3. Initial Note
    if (input.initialNote && input.initialNote.trim()) {
      await tx.leadNote.create({
        data: {
          organizationId: session.organization.id,
          leadId: lead.id,
          authorId: session.user.id,
          content: input.initialNote.trim(),
        },
      });
    }

    // 4. Initial Activity
    await tx.leadActivity.create({
      data: {
        organizationId: session.organization.id,
        leadId: lead.id,
        actorId: session.user.id,
        type: 'SYSTEM',
        summary: 'Lead added to CRM',
        details: `Created by ${session.user.displayName}. Initial stage assigned.`,
      },
    });

    // 5. Initial Deal if dealValue provided
    if (input.dealValue && input.dealValue > 0) {
      await tx.deal.create({
        data: {
          organizationId: session.organization.id,
          leadId: lead.id,
          title: `${input.businessName} - ${input.opportunityType || 'Digital Project'}`,
          amount: input.dealValue,
          currency: 'INR',
          probability: 40,
          status: 'OPEN',
        },
      });
    }

    // 6. Optional Initial Follow-up
    if (input.followUpDueAt) {
      await tx.followUp.create({
        data: {
          organizationId: session.organization.id,
          leadId: lead.id,
          ownerId: assignedOwnerId,
          createdBy: session.user.id,
          title: `Initial Follow-up with ${input.contactName}`,
          actionType: input.followUpAction || 'CALL',
          plannedMessage: input.followUpMessage || null,
          dueAt: new Date(input.followUpDueAt),
          timezone: session.organization.timezone || 'Asia/Kolkata',
          status: 'SCHEDULED',
        },
      });
    }

    // 7. Audit Log
    await tx.auditLog.create({
      data: {
        organizationId: session.organization.id,
        actorId: session.user.id,
        entityType: 'LEAD',
        entityId: lead.id,
        action: 'CREATE',
        metadata: JSON.stringify({ businessName: lead.businessName, ownerId: assignedOwnerId }),
      },
    });

    return lead;
  });
}

export async function updateLead(
  leadId: string,
  session: UserSession,
  updates: Partial<{
    businessName: string;
    category: string;
    websiteUrl: string;
    socialUrl: string;
    address: string;
    city: string;
    state: string;
    country: string;
    mapsUrl: string;
    source: string;
    sourceUrl: string;
    priority: string;
    opportunityType: string;
    prototypeUrl: string;
    proposalUrl: string;
    dealValue: number;
    ownerId: string;
    stageId: string;
  }>
) {
  const existing = await prisma.lead.findUnique({
    where: { id: leadId },
  });

  if (!existing) throw new Error('Lead not found');
  assertLeadAccess(existing, session);

  // Reassignment restrictions: only Admin or Manager can reassign owner
  if (updates.ownerId && updates.ownerId !== existing.ownerId) {
    if (session.role === 'SALES_MEMBER') {
      throw new Error('Sales representatives cannot reassign lead ownership');
    }
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.lead.update({
      where: { id: leadId },
      data: updates,
    });

    // Record activity if owner changed
    if (updates.ownerId && updates.ownerId !== existing.ownerId) {
      const newOwner = await tx.user.findUnique({ where: { id: updates.ownerId } });
      await tx.leadActivity.create({
        data: {
          organizationId: session.organization.id,
          leadId,
          actorId: session.user.id,
          type: 'SYSTEM',
          summary: `Lead reassigned to ${newOwner?.displayName || 'new owner'}`,
        },
      });
    }

    // Record activity if stage changed
    if (updates.stageId && updates.stageId !== existing.stageId) {
      const newStage = await tx.pipelineStage.findUnique({ where: { id: updates.stageId } });
      await tx.leadActivity.create({
        data: {
          organizationId: session.organization.id,
          leadId,
          actorId: session.user.id,
          type: 'STAGE_CHANGE',
          summary: `Pipeline stage moved to "${newStage?.name || 'New Stage'}"`,
        },
      });
    }

    return updated;
  });
}

export async function archiveLead(
  leadId: string,
  session: UserSession
) {
  const existing = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!existing) throw new Error('Lead not found');
  assertLeadAccess(existing, session);

  return prisma.lead.update({
    where: { id: leadId },
    data: { archivedAt: new Date() },
  });
}

export async function restoreLead(
  leadId: string,
  session: UserSession
) {
  const existing = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!existing) throw new Error('Lead not found');
  assertLeadAccess(existing, session);

  return prisma.lead.update({
    where: { id: leadId },
    data: { archivedAt: null },
  });
}
