import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import { cancelFollowUp } from '@/lib/services/follow-ups';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const updated = await cancelFollowUp(session, params.id);
    return NextResponse.json({ success: true, followUp: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}
