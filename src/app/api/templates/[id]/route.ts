import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import prisma from '@/lib/db/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();

    const template = await prisma.messageTemplate.findFirst({
      where: {
        id: params.id,
        organizationId: session.organization.id,
        active: true,
      },
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    const existing = await prisma.messageTemplate.findFirst({
      where: {
        id: params.id,
        organizationId: session.organization.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const { name, category, channel, subject, body: templateBody } = body;

    const updated = await prisma.messageTemplate.update({
      where: { id: params.id },
      data: {
        name: name !== undefined ? name : existing.name,
        category: category !== undefined ? category : existing.category,
        channel: channel !== undefined ? channel : existing.channel,
        subject: channel === 'EMAIL' ? (subject ?? null) : null,
        body: templateBody !== undefined ? templateBody : existing.body,
      },
    });

    return NextResponse.json({ success: true, template: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();

    const existing = await prisma.messageTemplate.findFirst({
      where: {
        id: params.id,
        organizationId: session.organization.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Soft delete to maintain consistency and sequence history
    await prisma.messageTemplate.update({
      where: { id: params.id },
      data: { active: false },
    });

    return NextResponse.json({ success: true, message: 'Template deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}
