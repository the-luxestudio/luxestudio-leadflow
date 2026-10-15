import { NextResponse } from 'next/server';
import { processDueNotificationJobs } from '@/lib/services/worker';
import { getCurrentSession } from '@/lib/auth/session';

export async function POST(request: Request) {
  try {
    const cronKey = request.headers.get('x-cron-key');
    const expectedSecret = process.env.CRON_SECRET || 'luxestudio-cron-key-leadflow-2026';

    const session = await getCurrentSession();
    const isAuthorizedAdmin = session && (session.role === 'ADMIN' || session.role === 'MANAGER');

    if (cronKey !== expectedSecret && !isAuthorizedAdmin) {
      return NextResponse.json({ error: 'Unauthorized cron invocation' }, { status: 401 });
    }

    const results = await processDueNotificationJobs();
    return NextResponse.json({ success: true, timestamp: new Date().toISOString(), ...results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
