import Papa from 'papaparse';
import prisma from '@/lib/db/prisma';
import { assertLeadAccess, getLeadFilterForSession, UserSession } from '@/lib/auth/guard';

export interface CSVPreviewResult {
  headers: string[];
  totalRows: number;
  sampleRows: Record<string, string>[];
  detectedMapping: Record<string, string>;
}

const KNOWN_FIELD_SYNONYMS: Record<string, string[]> = {
  businessName: ['business name', 'company', 'company name', 'business', 'firm', 'organization', 'name'],
  contactName: ['contact', 'contact person', 'person', 'owner name', 'contact name', 'decision maker'],
  phone: ['phone', 'mobile', 'cell', 'telephone', 'contact number', 'phone number'],
  email: ['email', 'email address', 'mail'],
  city: ['city', 'location', 'town'],
  category: ['category', 'industry', 'business category', 'type'],
  websiteUrl: ['website', 'site', 'web', 'url', 'domain'],
  source: ['source', 'lead source', 'channel'],
  dealValue: ['deal value', 'value', 'amount', 'budget', 'expected value'],
  address: ['address', 'street', 'office address'],
};

export function autoDetectFieldMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};

  for (const header of headers) {
    const clean = header.trim().toLowerCase();
    for (const [field, synonyms] of Object.entries(KNOWN_FIELD_SYNONYMS)) {
      if (synonyms.includes(clean) && !Object.values(mapping).includes(field)) {
        mapping[header] = field;
        break;
      }
    }
  }

  return mapping;
}

export function parseCSVString(csvContent: string): { headers: string[]; rows: Record<string, string>[] } {
  const parsed = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
  });

  const headers = parsed.meta.fields || [];
  const rows = (parsed.data as Record<string, string>[]).filter((r) => Object.keys(r).length > 0);

  return { headers, rows };
}

export async function processCSVImport(
  session: UserSession,
  rows: Record<string, string>[],
  columnMapping: Record<string, string>, // CSV Header -> LeadFlow Field
  duplicateStrategy: 'skip' | 'update' | 'import_anyway' = 'skip'
) {
  // First pipeline stage for initial import
  const defaultStage = await prisma.pipelineStage.findFirst({
    where: { organizationId: session.organization.id, active: true },
    orderBy: { position: 'asc' },
  });

  const stageId = defaultStage?.id || '';
  const now = new Date();

  let successCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  const errors: { row: number; businessName: string; reason: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const rawRow = rows[i];
    const mapped: Record<string, any> = {};

    for (const [csvHeader, field] of Object.entries(columnMapping)) {
      if (field && rawRow[csvHeader] !== undefined) {
        mapped[field] = String(rawRow[csvHeader]).trim();
      }
    }

    const businessName = mapped.businessName;
    if (!businessName) {
      errorCount++;
      errors.push({ row: i + 1, businessName: 'Missing Name', reason: 'Business Name is required' });
      continue;
    }

    const phone = mapped.phone || null;
    const normalizedPhone = phone ? phone.replace(/[^0-9]/g, '') : null;
    const email = mapped.email ? mapped.email.toLowerCase() : null;

    // Check for duplicates
    const duplicateConditions: any[] = [];
    if (businessName) {
      duplicateConditions.push({ businessName: { equals: businessName } });
    }
    if (normalizedPhone && normalizedPhone.length >= 7) {
      duplicateConditions.push({
        contacts: { some: { normalizedPhone: { contains: normalizedPhone.slice(-10) } } },
      });
    }
    if (email) {
      duplicateConditions.push({
        contacts: { some: { email: { equals: email } } },
      });
    }

    const existingLead = await prisma.lead.findFirst({
      where: {
        organizationId: session.organization.id,
        archivedAt: null,
        OR: duplicateConditions,
      },
      include: { contacts: true },
    });

    if (existingLead) {
      if (duplicateStrategy === 'skip') {
        skippedCount++;
        continue;
      } else if (duplicateStrategy === 'update') {
        // Update existing lead details
        await prisma.lead.update({
          where: { id: existingLead.id },
          data: {
            category: mapped.category || existingLead.category,
            city: mapped.city || existingLead.city,
            websiteUrl: mapped.websiteUrl || existingLead.websiteUrl,
          },
        });
        successCount++;
        continue;
      }
    }

    // Insert new lead
    try {
      const dealValue = mapped.dealValue ? parseInt(mapped.dealValue.replace(/[^0-9]/g, ''), 10) || 0 : 0;

      await prisma.$transaction(async (tx) => {
        const lead = await tx.lead.create({
          data: {
            organizationId: session.organization.id,
            businessName,
            category: mapped.category || null,
            city: mapped.city || null,
            address: mapped.address || null,
            websiteUrl: mapped.websiteUrl || null,
            source: mapped.source || 'CSV Import',
            origin: 'IMPORTED',
            stageId,
            ownerId: session.user.id,
            dealValue,
            createdBy: session.user.id,
            lastContactedAt: now,
          },
        });

        await tx.leadContact.create({
          data: {
            organizationId: session.organization.id,
            leadId: lead.id,
            name: mapped.contactName || businessName,
            phone,
            normalizedPhone,
            whatsappPhone: phone,
            email,
            isPrimary: true,
          },
        });

        await tx.leadActivity.create({
          data: {
            organizationId: session.organization.id,
            leadId: lead.id,
            actorId: session.user.id,
            type: 'SYSTEM',
            summary: 'Imported via CSV',
          },
        });
      });

      successCount++;
    } catch (err: any) {
      errorCount++;
      errors.push({ row: i + 1, businessName, reason: err.message || 'Database error' });
    }
  }

  // Create lead import job record
  const job = await prisma.leadImportJob.create({
    data: {
      organizationId: session.organization.id,
      createdBy: session.user.id,
      status: 'COMPLETED',
      totalRows: rows.length,
      successCount,
      skippedCount,
      errorCount,
      errorReport: errors.length > 0 ? JSON.stringify(errors) : null,
      completedAt: new Date(),
    },
  });

  return {
    jobId: job.id,
    totalRows: rows.length,
    successCount,
    skippedCount,
    errorCount,
    errors,
  };
}

/**
 * Mitigates spreadsheet formula injection by prepending quote to values starting with =, +, -, @
 */
function sanitizeCSVValue(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  if (/^[=\+\-\@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

export async function exportLeadsToCSV(session: UserSession) {
  const baseFilter = getLeadFilterForSession(session);

  const leads = await prisma.lead.findMany({
    where: {
      organizationId: session.organization.id,
      ownerId: baseFilter.ownerId,
      archivedAt: null,
    },
    include: {
      stage: true,
      owner: { select: { displayName: true } },
      contacts: { where: { isPrimary: true }, take: 1 },
      deals: { where: { status: 'OPEN' }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
  });

  const exportData = leads.map((l) => {
    const contact = l.contacts[0];
    return {
      'Business Name': sanitizeCSVValue(l.businessName),
      'Contact Name': sanitizeCSVValue(contact?.name || ''),
      'Phone Number': sanitizeCSVValue(contact?.phone || ''),
      'WhatsApp Number': sanitizeCSVValue(contact?.whatsappPhone || ''),
      'Email': sanitizeCSVValue(contact?.email || ''),
      'City': sanitizeCSVValue(l.city || ''),
      'State': sanitizeCSVValue(l.state || ''),
      'Category': sanitizeCSVValue(l.category || ''),
      'Stage': sanitizeCSVValue(l.stage.name),
      'Priority': sanitizeCSVValue(l.priority),
      'Lead Source': sanitizeCSVValue(l.source || ''),
      'Opportunity Type': sanitizeCSVValue(l.opportunityType || ''),
      'Deal Value (INR)': sanitizeCSVValue(l.dealValue || 0),
      'Website URL': sanitizeCSVValue(l.websiteUrl || ''),
      'Prototype URL': sanitizeCSVValue(l.prototypeUrl || ''),
      'Proposal URL': sanitizeCSVValue(l.proposalUrl || ''),
      'Assigned Owner': sanitizeCSVValue(l.owner?.displayName || 'Unassigned'),
      'Created Date': sanitizeCSVValue(new Date(l.createdAt).toLocaleDateString('en-IN')),
    };
  });

  return Papa.unparse(exportData);
}
