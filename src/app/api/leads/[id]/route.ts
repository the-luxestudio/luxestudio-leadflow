import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import { getLeadById, updateLead, archiveLead, restoreLead } from '@/lib/services/leads';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const lead = await getLeadById(params.id, session);

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json({ lead });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    if (body.action === 'restore' || body.restore === true) {
      const restored = await restoreLead(params.id, session);
      return NextResponse.json({ success: true, lead: restored });
    }

    const updated = await updateLead(params.id, session, body);
    return NextResponse.json({ success: true, lead: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    await archiveLead(params.id, session);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}
