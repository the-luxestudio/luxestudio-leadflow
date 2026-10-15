import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import { listTemplates } from '@/lib/services/templates';
import prisma from '@/lib/db/prisma';

export async function GET() {
  try {
    const session = await requireAuth();
    const templates = await listTemplates(session.organization.id);
    return NextResponse.json({ templates });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    const { name, category, channel, subject, body: templateBody } = body;
    if (!name || !templateBody) {
      return NextResponse.json({ error: 'Name and body are required' }, { status: 400 });
    }

    const template = await prisma.messageTemplate.create({
      data: {
        organizationId: session.organization.id,
        name,
        category: category || 'OUTREACH',
        channel: channel || 'WHATSAPP',
        subject: subject || null,
        body: templateBody,
        createdBy: session.user.id,
      },
    });

    return NextResponse.json({ success: true, template }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}
