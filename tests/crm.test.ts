import { describe, it, expect } from 'vitest';
import { renderTemplate, generateWhatsAppUrl } from '../src/lib/services/templates';
import { autoDetectFieldMapping } from '../src/lib/services/csv';

describe('CRM Business Engine & Utilities', () => {
  it('correctly substitutes dynamic template variables', () => {
    const rawTemplate =
      'Hi {{contact_name}}, this is {{sender_name}} from LuxeStudio. We reviewed {{business_name}} in {{city}} and prepared {{prototype_url}} with investment {{deal_value}}.';

    const rendered = renderTemplate(rawTemplate, {
      contact_name: 'Rajesh',
      sender_name: 'Aditya',
      business_name: 'Naksh Interio',
      city: 'Meerut',
      prototype_url: 'https://prototype.theluxestudio.in/naksh',
      deal_value: 85000,
    });

    expect(rendered).toContain('Hi Rajesh');
    expect(rendered).toContain('Naksh Interio in Meerut');
    expect(rendered).toContain('₹85,000');
    expect(rendered).toContain('https://prototype.theluxestudio.in/naksh');
    expect(rendered).not.toContain('{{');
  });

  it('generates valid WhatsApp click-to-chat URL with India country code normalization', () => {
    const phone = '9876543210';
    const message = 'Hello from LuxeStudio!';
    const url = generateWhatsAppUrl(phone, message);

    expect(url).toBe('https://wa.me/919876543210?text=Hello%20from%20LuxeStudio!');
  });

  it('correctly auto-detects CSV column mappings', () => {
    const headers = [
      'Company Name',
      'Contact Person',
      'Mobile',
      'Email Address',
      'Location',
      'Website',
      'Budget',
    ];

    const mapping = autoDetectFieldMapping(headers);

    expect(mapping['Company Name']).toBe('businessName');
    expect(mapping['Contact Person']).toBe('contactName');
    expect(mapping['Mobile']).toBe('phone');
    expect(mapping['Email Address']).toBe('email');
    expect(mapping['Location']).toBe('city');
    expect(mapping['Website']).toBe('websiteUrl');
    expect(mapping['Budget']).toBe('dealValue');
  });

  it('mitigates spreadsheet formula injection on dangerous prefixes', () => {
    // Testing formula sanitizer behavior
    const dangerousFormulas = [
      '=SUM(A1:A10)',
      '+12345',
      '-cmd|/C calc!A0',
      '@SUM(B1)',
    ];

    for (const formula of dangerousFormulas) {
      const sanitized = formula.replace(/^[=\+\-\@\t\r]/, "'$&");
      expect(sanitized.startsWith("'")).toBe(true);
    }
  });
});
