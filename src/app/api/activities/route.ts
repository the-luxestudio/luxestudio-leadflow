import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import { logActivity } from '@/lib/services/activities';

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    const { leadId, type, outcome, summary, details, occurredAt } = body;
    if (!leadId || !type || !summary) {
      return NextResponse.json({ error: 'leadId, type, and summary are required' }, { status: 400 });
    }

    const activity = await logActivity(session, {
      leadId,
      type,
      outcome,
      summary,
      details,
      occurredAt,
    });

    return NextResponse.json({ success: true, activity }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}
