import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import { snoozeFollowUp } from '@/lib/services/follow-ups';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const { newDueAt } = await request.json();

    if (!newDueAt) {
      return NextResponse.json({ error: 'newDueAt is required' }, { status: 400 });
    }

    const updated = await snoozeFollowUp(session, params.id, new Date(newDueAt));
    return NextResponse.json({ success: true, followUp: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}
