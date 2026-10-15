import prisma from '@/lib/db/prisma';
import { assertLeadAccess, getLeadFilterForSession, UserSession } from '@/lib/auth/guard';

export async function getPipelineBoard(session: UserSession) {
  const baseFilter = getLeadFilterForSession(session);

  // Fetch stages in order
  const stages = await prisma.pipelineStage.findMany({
    where: {
      organizationId: session.organization.id,
      active: true,
    },
    orderBy: { position: 'asc' },
  });

  const leadWhere: any = {
    organizationId: session.organization.id,
    archivedAt: null,
  };
  if (baseFilter.ownerId) {
    leadWhere.ownerId = baseFilter.ownerId;
  }

  // Fetch all active leads with details
  const leads = await prisma.lead.findMany({
    where: leadWhere,
    include: {
      owner: { select: { id: true, displayName: true } },
      contacts: { take: 1, orderBy: { isPrimary: 'desc' } },
      deals: { where: { status: 'OPEN' }, take: 1 },
      followUps: {
        where: { status: 'SCHEDULED' },
        orderBy: { dueAt: 'asc' },
        take: 1,
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const now = new Date();

  // Group leads by stageId
  const columns = stages.map((stage) => {
    const stageLeads = leads
      .filter((l) => l.stageId === stage.id)
      .map((lead) => {
        const nextFollowUp = lead.followUps[0] || null;
        const isOverdue = nextFollowUp ? new Date(nextFollowUp.dueAt) < now : false;
        const primaryContact = lead.contacts[0] || null;
        const openDeal = lead.deals[0] || null;

        return {
          id: lead.id,
          businessName: lead.businessName,
          category: lead.category,
          priority: lead.priority,
          dealValue: lead.dealValue || (openDeal ? openDeal.amount : 0),
          owner: lead.owner,
          primaryContact: primaryContact
            ? { name: primaryContact.name, phone: primaryContact.phone, whatsappPhone: primaryContact.whatsappPhone }
            : null,
          nextFollowUp: nextFollowUp
            ? {
                id: nextFollowUp.id,
                title: nextFollowUp.title,
                dueAt: nextFollowUp.dueAt,
                actionType: nextFollowUp.actionType,
                isOverdue,
              }
            : null,
          updatedAt: lead.updatedAt,
        };
      });

    const totalValue = stageLeads.reduce((acc, l) => acc + (l.dealValue || 0), 0);

    return {
      stage,
      leads: stageLeads,
      count: stageLeads.length,
      totalValue,
    };
  });

  return columns;
}

export async function transitionLeadStage(
  session: UserSession,
  input: {
    leadId: string;
    targetStageId: string;
    wonDetails?: {
      agreedAmount: number;
      closeDate?: Date;
      notes?: string;
    };
    lostDetails?: {
      reason: string;
      notes?: string;
    };
  }
) {
  const lead = await prisma.lead.findUnique({
    where: { id: input.leadId },
    include: { stage: true, deals: { where: { status: 'OPEN' } } },
  });

  if (!lead) throw new Error('Lead not found');
  assertLeadAccess(lead, session);

  const targetStage = await prisma.pipelineStage.findUnique({
    where: { id: input.targetStageId },
  });

  if (!targetStage || targetStage.organizationId !== session.organization.id) {
    throw new Error('Invalid target pipeline stage');
  }

  return prisma.$transaction(async (tx) => {
    // 1. Update Lead Stage
    const updateData: any = {
      stageId: targetStage.id,
      lastContactedAt: new Date(),
    };

    if (targetStage.isWon && input.wonDetails) {
      updateData.dealValue = input.wonDetails.agreedAmount;
    }

    const updatedLead = await tx.lead.update({
      where: { id: lead.id },
      data: updateData,
    });

    // 2. Handle Won Stage Transition
    if (targetStage.isWon) {
      const agreedAmount = input.wonDetails?.agreedAmount ?? (lead.dealValue || 0);
      const closeDate = input.wonDetails?.closeDate ? new Date(input.wonDetails.closeDate) : new Date();

      // Update existing open deal or create won deal
      const openDeal = lead.deals[0];
      if (openDeal) {
        await tx.deal.update({
          where: { id: openDeal.id },
          data: {
            status: 'WON',
            amount: agreedAmount,
            closedAt: closeDate,
            probability: 100,
          },
        });
      } else {
        await tx.deal.create({
          data: {
            organizationId: session.organization.id,
            leadId: lead.id,
            title: `${lead.businessName} - Closed Deal`,
            amount: agreedAmount,
            currency: lead.currency || 'INR',
            status: 'WON',
            probability: 100,
            closedAt: closeDate,
          },
        });
      }

      // Record Won Activity
      await tx.leadActivity.create({
        data: {
          organizationId: session.organization.id,
          leadId: lead.id,
          actorId: session.user.id,
          type: 'STAGE_CHANGE',
          outcome: 'WON',
          summary: `🏆 Deal Won for ${lead.businessName}!`,
          details: `Agreed investment: ₹${agreedAmount.toLocaleString('en-IN')}. ${input.wonDetails?.notes || ''}`,
        },
      });

      // Pause or complete active sequence enrollments
      await tx.sequenceEnrollment.updateMany({
        where: { leadId: lead.id, status: 'ACTIVE' },
        data: { status: 'COMPLETED' },
      });
    }

    // 3. Handle Lost Stage Transition
    else if (targetStage.isLost) {
      const lostReason = input.lostDetails?.reason || 'Not specified';

      // Update open deals to LOST
      for (const deal of lead.deals) {
        await tx.deal.update({
          where: { id: deal.id },
          data: {
            status: 'LOST',
            lostReason,
            closedAt: new Date(),
            probability: 0,
          },
        });
      }

      // Record Lost Activity
      await tx.leadActivity.create({
        data: {
          organizationId: session.organization.id,
          leadId: lead.id,
          actorId: session.user.id,
          type: 'STAGE_CHANGE',
          outcome: 'LOST',
          summary: `Lead marked as Lost`,
          details: `Reason: ${lostReason}. ${input.lostDetails?.notes || ''}`,
        },
      });

      // Cancel sequence enrollments & pending follow-ups
      await tx.sequenceEnrollment.updateMany({
        where: { leadId: lead.id, status: 'ACTIVE' },
        data: { status: 'CANCELLED' },
      });
    }

    // 4. Normal Stage Transition
    else {
      await tx.leadActivity.create({
        data: {
          organizationId: session.organization.id,
          leadId: lead.id,
          actorId: session.user.id,
          type: 'STAGE_CHANGE',
          summary: `Moved to "${targetStage.name}" stage`,
          details: `Stage updated from "${lead.stage.name}" to "${targetStage.name}".`,
        },
      });

      // Check if targetStage triggers an automated sequence!
      const matchingSequence = await tx.followUpSequence.findFirst({
        where: {
          organizationId: session.organization.id,
          triggerStage: targetStage.name,
          active: true,
        },
      });

      if (matchingSequence) {
        try {
          const steps = JSON.parse(matchingSequence.steps);
          if (Array.isArray(steps) && steps.length > 0) {
            const firstStep = steps[0];
            const nextStepAt = new Date(Date.now() + (firstStep.dayOffset || 1) * 24 * 60 * 60 * 1000);

            // Create enrollment
            await tx.sequenceEnrollment.create({
              data: {
                organizationId: session.organization.id,
                leadId: lead.id,
                sequenceId: matchingSequence.id,
                currentStep: 0,
                nextStepAt,
                status: 'ACTIVE',
              },
            });

            // Schedule first follow-up task
            await tx.followUp.create({
              data: {
                organizationId: session.organization.id,
                leadId: lead.id,
                ownerId: lead.ownerId || session.user.id,
                createdBy: session.user.id,
                title: firstStep.title || `${matchingSequence.name} Step 1`,
                actionType: firstStep.actionType || 'WHATSAPP',
                plannedMessage: firstStep.message || null,
                dueAt: nextStepAt,
                timezone: session.organization.timezone || 'Asia/Kolkata',
                status: 'SCHEDULED',
              },
            });
          }
        } catch (e) {
          console.error('Error auto-enrolling sequence:', e);
        }
      }
    }

    return updatedLead;
  });
}
