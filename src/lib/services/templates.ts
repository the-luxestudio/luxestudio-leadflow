import prisma from '@/lib/db/prisma';

export async function listTemplates(organizationId: string) {
  return prisma.messageTemplate.findMany({
    where: { organizationId, active: true },
    orderBy: { createdAt: 'desc' },
  });
}

export function renderTemplate(
  templateBody: string,
  variables: {
    business_name?: string;
    contact_name?: string;
    city?: string;
    prototype_url?: string;
    proposal_url?: string;
    deal_value?: number | string;
    sender_name?: string;
  }
): string {
  let output = templateBody;

  const replaceMap: Record<string, string> = {
    '{{business_name}}': variables.business_name || '',
    '{{contact_name}}': variables.contact_name || 'there',
    '{{city}}': variables.city || 'your area',
    '{{prototype_url}}': variables.prototype_url || '[Prototype Link]',
    '{{proposal_url}}': variables.proposal_url || '[Proposal Link]',
    '{{deal_value}}':
      typeof variables.deal_value === 'number'
        ? `₹${variables.deal_value.toLocaleString('en-IN')}`
        : variables.deal_value || '₹0',
    '{{sender_name}}': variables.sender_name || 'LuxeStudio',
  };

  for (const [tag, val] of Object.entries(replaceMap)) {
    output = output.replaceAll(tag, val);
  }

  return output;
}

export function generateWhatsAppUrl(phone: string, text: string): string {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  // Default to India country code 91 if 10 digits provided
  const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
}
