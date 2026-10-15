import { NextResponse } from 'next/server';
import { sendDailyBriefingEmail } from '@/lib/services/briefing';
import { getCurrentSession } from '@/lib/auth/session';

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cronKey = request.headers.get('x-cron-key') || searchParams.get('key');
    const expectedSecret = process.env.CRON_SECRET || '3fb3d2512d28fa2ae7c1ad94a56dd2e4f473b6bc5a6b3c48';

    const session = await getCurrentSession();
    const isAuthorizedAdmin = session && (session.role === 'ADMIN' || session.role === 'MANAGER');

    if (cronKey !== expectedSecret && !isAuthorizedAdmin) {
      return NextResponse.json({ error: 'Unauthorized invocation' }, { status: 401 });
    }

    const force = searchParams.get('force') === 'true';

    const result = await sendDailyBriefingEmail({ force });
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (err: any) {
    console.error('Daily briefing cron error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
