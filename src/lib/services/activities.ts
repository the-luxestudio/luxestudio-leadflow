import prisma from '@/lib/db/prisma';
import { assertLeadAccess, UserSession } from '@/lib/auth/guard';

export async function logActivity(
  session: UserSession,
  input: {
    leadId: string;
    type: 'CALL' | 'WHATSAPP' | 'EMAIL' | 'MEETING' | 'NOTE' | 'PROPOSAL' | 'OTHER';
    outcome?: string;
    summary: string;
    details?: string;
    occurredAt?: Date;
  }
) {
  const lead = await prisma.lead.findUnique({
    where: { id: input.leadId },
  });

  if (!lead) throw new Error('Lead not found');
  assertLeadAccess(lead, session);

  return prisma.$transaction(async (tx) => {
    const activity = await tx.leadActivity.create({
      data: {
        organizationId: session.organization.id,
        leadId: lead.id,
        actorId: session.user.id,
        type: input.type,
        outcome: input.outcome || null,
        summary: input.summary.trim(),
        details: input.details ? input.details.trim() : null,
        occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date(),
      },
    });

    // Update lead lastContactedAt if it was an outreach activity
    if (['CALL', 'WHATSAPP', 'EMAIL', 'MEETING'].includes(input.type)) {
      await tx.lead.update({
        where: { id: lead.id },
        data: { lastContactedAt: new Date() },
      });
    }

    return activity;
  });
}

export async function addLeadNote(
  session: UserSession,
  input: {
    leadId: string;
    content: string;
  }
) {
  const lead = await prisma.lead.findUnique({
    where: { id: input.leadId },
  });

  if (!lead) throw new Error('Lead not found');
  assertLeadAccess(lead, session);

  if (!input.content || !input.content.trim()) {
    throw new Error('Note content cannot be empty');
  }

  return prisma.leadNote.create({
    data: {
      organizationId: session.organization.id,
      leadId: lead.id,
      authorId: session.user.id,
      content: input.content.trim(),
    },
  });
}
