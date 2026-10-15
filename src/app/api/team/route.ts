import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db/prisma';
import { requireAuth, requireRole } from '@/lib/auth/guard';

export async function GET() {
  try {
    const session = await requireAuth();

    const memberships = await prisma.membership.findMany({
      where: { organizationId: session.organization.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
            status: true,
            telegramChatId: true,
            telegramUsername: true,
            createdAt: true,
            _count: {
              select: {
                assignedLeads: { where: { archivedAt: null } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const members = memberships.map((m) => ({
      membershipId: m.id,
      userId: m.user.id,
      email: m.user.email,
      displayName: m.user.displayName,
      status: m.user.status,
      role: m.role,
      telegramLinked: Boolean(m.user.telegramChatId),
      telegramUsername: m.user.telegramUsername,
      assignedLeadsCount: m.user._count.assignedLeads,
      joinedAt: m.createdAt,
    }));

    return NextResponse.json({ members });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}

export async function POST(request: Request) {
  try {
    // Only Admin can invite new members or reassign in bulk
    const session = await requireRole(['ADMIN', 'MANAGER']);
    const body = await request.json();

    // Check action type: 'reassign_all' or 'invite'
    if (body.action === 'reassign_all') {
      const { fromUserId, toUserId } = body;
      if (!fromUserId || !toUserId) {
        return NextResponse.json({ error: 'fromUserId and toUserId are required' }, { status: 400 });
      }

      const updateResult = await prisma.lead.updateMany({
        where: {
          organizationId: session.organization.id,
          ownerId: fromUserId,
          archivedAt: null,
        },
        data: { ownerId: toUserId },
      });

      return NextResponse.json({ success: true, reassignedCount: updateResult.count });
    }

    // Default: Invite/Create Member
    const { email, displayName, role, password } = body;
    if (!email || !displayName) {
      return NextResponse.json({ error: 'Email and full name are required' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'A user with this email address already exists' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password || 'LuxeStudio2026!', 10);

    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: email.toLowerCase().trim(),
          displayName: displayName.trim(),
          passwordHash,
          status: 'ACTIVE',
        },
      });

      await tx.membership.create({
        data: {
          organizationId: session.organization.id,
          userId: user.id,
          role: role || 'SALES_MEMBER',
        },
      });

      return user;
    });

    return NextResponse.json({ success: true, user: newUser }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}
