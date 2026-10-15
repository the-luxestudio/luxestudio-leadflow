import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/guard';
import { setSessionCookie } from '@/lib/auth/session';

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ error: 'Incorrect current password' }, { status: 400 });
    }

    const newHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    // Rotate session token
    await setSessionCookie({
      userId: user.id,
      organizationId: session.organization.id,
      role: session.role,
    });

    // Record audit log
    prisma.auditLog.create({
      data: {
        organizationId: session.organization.id,
        actorId: user.id,
        entityType: 'USER',
        entityId: user.id,
        action: 'PASSWORD_CHANGE',
        metadata: JSON.stringify({ timestamp: new Date().toISOString() }),
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'Password successfully updated',
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Password change error:', err);
    return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
  }
}
