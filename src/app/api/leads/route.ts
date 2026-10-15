import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/guard';
import { listLeads, createLead, checkDuplicates } from '@/lib/services/leads';

const CreateLeadSchema = z.object({
  businessName: z.string().min(1, 'Business name is required'),
  category: z.string().optional(),
  websiteUrl: z.string().optional(),
  socialUrl: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  mapsUrl: z.string().optional(),
  source: z.string().optional(),
  sourceUrl: z.string().optional(),
  stageId: z.string().optional(),
  ownerId: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  opportunityType: z.string().optional(),
  prototypeUrl: z.string().optional(),
  proposalUrl: z.string().optional(),
  dealValue: z.number().nonnegative().optional(),
  // Contact
  contactName: z.string().min(1, 'Contact person name is required'),
  phone: z.string().optional(),
  whatsappPhone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  // Note & Follow-up
  initialNote: z.string().optional(),
  followUpDueAt: z.string().optional(),
  followUpAction: z.string().optional(),
  followUpMessage: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);

    // Duplicate check query support
    if (searchParams.get('checkDuplicate') === 'true') {
      const phone = searchParams.get('phone') || undefined;
      const email = searchParams.get('email') || undefined;
      const businessName = searchParams.get('businessName') || undefined;
      const duplicates = await checkDuplicates(session.organization.id, { phone, email, businessName });
      return NextResponse.json({ duplicates });
    }

    const result = await listLeads(session, {
      search: searchParams.get('search') || undefined,
      stageId: searchParams.get('stageId') || undefined,
      priority: searchParams.get('priority') || undefined,
      ownerId: searchParams.get('ownerId') || undefined,
      city: searchParams.get('city') || undefined,
      category: searchParams.get('category') || undefined,
      source: searchParams.get('source') || undefined,
      followUpStatus: (searchParams.get('followUpStatus') as any) || undefined,
      page: parseInt(searchParams.get('page') || '1', 10),
      limit: parseInt(searchParams.get('limit') || '20', 10),
      sortBy: (searchParams.get('sortBy') as any) || 'updatedAt',
      sortOrder: (searchParams.get('sortOrder') as any) || 'desc',
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unauthorized' }, { status: err.status || 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const validated = CreateLeadSchema.parse(body);

    const lead = await createLead(session, {
      ...validated,
      followUpDueAt: validated.followUpDueAt ? new Date(validated.followUpDueAt) : undefined,
    });

    return NextResponse.json({ success: true, lead }, { status: 201 });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0]?.message || 'Validation error' }, { status: 400 });
    }
    return NextResponse.json({ error: err.message || 'Failed to create lead' }, { status: err.status || 500 });
  }
}
