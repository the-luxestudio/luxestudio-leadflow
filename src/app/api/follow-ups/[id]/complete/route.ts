import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import { completeFollowUp } from '@/lib/services/follow-ups';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    const result = await completeFollowUp(session, {
      followUpId: params.id,
      outcome: body.outcome || 'CONNECTED',
      notes: body.notes,
      nextFollowUp: body.nextFollowUp,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}
