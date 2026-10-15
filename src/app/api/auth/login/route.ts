import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db/prisma';
import { setSessionCookie } from '@/lib/auth/session';

// In-memory rate limiting map: ip -> { count, resetTime }
const loginAttempts = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);

  if (!entry || now > entry.resetTime) {
    loginAttempts.set(ip, { count: 1, resetTime: now + 60 * 1000 });
    return true;
  }

  if (entry.count >= 8) {
    return false;
  }

  entry.count += 1;
  return true;
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please wait 1 minute before trying again.' },
        { status: 429 }
      );
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        memberships: {
          include: { organization: true },
          take: 1,
        },
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const membership = user.memberships[0];
    if (!membership) {
      return NextResponse.json({ error: 'User does not belong to any active organization' }, { status: 403 });
    }

    await setSessionCookie({
      userId: user.id,
      organizationId: membership.organizationId,
      role: membership.role as 'ADMIN' | 'MANAGER' | 'SALES_MEMBER',
    });

    // Record login audit log asynchronously
    prisma.auditLog.create({
      data: {
        organizationId: membership.organizationId,
        actorId: user.id,
        entityType: 'USER',
        entityId: user.id,
        action: 'LOGIN',
        metadata: JSON.stringify({ ip, userAgent: request.headers.get('user-agent') || 'unknown' }),
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: membership.role,
        organization: {
          id: membership.organization.id,
          name: membership.organization.name,
        },
      },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'An unexpected authentication error occurred' }, { status: 500 });
  }
}

