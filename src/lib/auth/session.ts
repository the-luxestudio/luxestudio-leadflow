import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import prisma from '@/lib/db/prisma';

const SESSION_COOKIE_NAME = 'leadflow_session';
const SESSION_SECRET = process.env.SESSION_SECRET || 'luxestudio-super-secret-leadflow-2026';

export interface SessionPayload {
  userId: string;
  organizationId: string;
  role: 'ADMIN' | 'MANAGER' | 'SALES_MEMBER';
}

export function signSessionToken(payload: SessionPayload): string {
  return jwt.sign(payload, SESSION_SECRET, { expiresIn: '7d' });
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, SESSION_SECRET) as SessionPayload;
  } catch {
    return null;
  }
}

export async function setSessionCookie(payload: SessionPayload) {
  const token = signSessionToken(payload);
  const cookieStore = cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

export async function clearSessionCookie() {
  const cookieStore = cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentSession(): Promise<{
  user: {
    id: string;
    email: string;
    username: string | null;
    displayName: string;
    status: string;
    telegramChatId: string | null;
    telegramUsername: string | null;
  };
  organization: {
    id: string;
    name: string;
    timezone: string;
    currency: string;
  };
  role: 'ADMIN' | 'MANAGER' | 'SALES_MEMBER';
} | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) return null;

  const payload = verifySessionToken(token);
  if (!payload) return null;

  // Verify against active database records (never trust stale tokens)
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
  });

  if (!user || user.status !== 'ACTIVE') {
    return null;
  }

  const membership = await prisma.membership.findUnique({
    where: {
      organizationId_userId: {
        organizationId: payload.organizationId,
        userId: user.id,
      },
    },
    include: {
      organization: true,
    },
  });

  if (!membership) {
    return null;
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      status: user.status,
      telegramChatId: user.telegramChatId,
      telegramUsername: user.telegramUsername,
    },
    organization: {
      id: membership.organization.id,
      name: membership.organization.name,
      timezone: membership.organization.timezone,
      currency: membership.organization.currency,
    },
    role: membership.role as 'ADMIN' | 'MANAGER' | 'SALES_MEMBER',
  };
}
