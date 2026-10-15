import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import { getPipelineBoard, transitionLeadStage } from '@/lib/services/pipeline';

export async function GET() {
  try {
    const session = await requireAuth();
    const columns = await getPipelineBoard(session);
    return NextResponse.json({ columns });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    const { leadId, targetStageId, wonDetails, lostDetails } = body;
    if (!leadId || !targetStageId) {
      return NextResponse.json({ error: 'leadId and targetStageId are required' }, { status: 400 });
    }

    const updated = await transitionLeadStage(session, {
      leadId,
      targetStageId,
      wonDetails,
      lostDetails,
    });

    return NextResponse.json({ success: true, lead: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}
