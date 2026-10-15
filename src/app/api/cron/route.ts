import { NextResponse } from 'next/server';
import { processDueNotificationJobs } from '@/lib/services/worker';
import { sendDailyBriefingEmail } from '@/lib/services/briefing';
import { getCurrentSession } from '@/lib/auth/session';

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cronKey = request.headers.get('x-cron-key') || searchParams.get('key');
    const expectedSecret = process.env.CRON_SECRET || 'luxestudio-cron-key-leadflow-2026';

    const session = await getCurrentSession();
    const isAuthorizedAdmin = session && (session.role === 'ADMIN' || session.role === 'MANAGER');

    if (cronKey !== expectedSecret && !isAuthorizedAdmin) {
      return NextResponse.json({ error: 'Unauthorized cron invocation' }, { status: 401 });
    }

    const forceBriefing = searchParams.get('forceBriefing') === 'true';

    // 1. Process due follow-up reminders
    const followUpResults = await processDueNotificationJobs();

    // 2. Process 9 AM Daily Briefing email (idempotent: sends once per day unless forced)
    const briefingResult = await sendDailyBriefingEmail({ force: forceBriefing });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      followUps: followUpResults,
      dailyBriefing: briefingResult,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
