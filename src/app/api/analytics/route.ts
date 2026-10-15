import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import { getDashboardMetrics, getTeamAnalytics } from '@/lib/services/analytics';

export async function GET(request: Request) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view');

    if (view === 'team') {
      const team = await getTeamAnalytics(session);
      return NextResponse.json({ team });
    }

    const metrics = await getDashboardMetrics(session);
    return NextResponse.json(metrics);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}
