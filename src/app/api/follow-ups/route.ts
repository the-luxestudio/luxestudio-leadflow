import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import { listFollowUps } from '@/lib/services/follow-ups';
import prisma from '@/lib/db/prisma';

export async function GET(request: Request) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const tab = (searchParams.get('tab') as any) || 'today';

    const followUps = await listFollowUps(session, tab);
    return NextResponse.json({ followUps });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    const { leadId, title, actionType, dueAt, plannedMessage, ownerId } = body;
    if (!leadId || !title || !dueAt) {
      return NextResponse.json({ error: 'leadId, title, and dueAt are required' }, { status: 400 });
    }

    const assignedOwnerId = session.role === 'SALES_MEMBER' ? session.user.id : (ownerId || session.user.id);

    const followUp = await prisma.followUp.create({
      data: {
        organizationId: session.organization.id,
        leadId,
        ownerId: assignedOwnerId,
        createdBy: session.user.id,
        title,
        actionType: actionType || 'CALL',
        dueAt: new Date(dueAt),
        plannedMessage: plannedMessage || null,
        timezone: session.organization.timezone,
        status: 'SCHEDULED',
      },
    });

    return NextResponse.json({ success: true, followUp }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}
