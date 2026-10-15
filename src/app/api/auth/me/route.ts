import { NextResponse } from 'next/server';
import { clearSessionCookie, getCurrentSession } from '@/lib/auth/session';

export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ success: true });
}

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    user: session.user,
    organization: session.organization,
    role: session.role,
  });
}
