import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import { addLeadNote } from '@/lib/services/activities';

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const { leadId, content } = await request.json();

    if (!leadId || !content) {
      return NextResponse.json({ error: 'leadId and content are required' }, { status: 400 });
    }

    const note = await addLeadNote(session, { leadId, content });
    return NextResponse.json({ success: true, note }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}
