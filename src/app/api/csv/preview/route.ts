import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import { parseCSVString, autoDetectFieldMapping } from '@/lib/services/csv';

export async function POST(request: Request) {
  try {
    await requireAuth();
    const { csvText } = await request.json();

    if (!csvText || !csvText.trim()) {
      return NextResponse.json({ error: 'CSV content cannot be empty' }, { status: 400 });
    }

    const { headers, rows } = parseCSVString(csvText);
    const detectedMapping = autoDetectFieldMapping(headers);

    return NextResponse.json({
      headers,
      totalRows: rows.length,
      sampleRows: rows.slice(0, 5),
      detectedMapping,
      fullRows: rows,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}
