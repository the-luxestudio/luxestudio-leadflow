import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import { processCSVImport } from '@/lib/services/csv';

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const { rows, columnMapping, duplicateStrategy } = await request.json();

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No rows provided for import' }, { status: 400 });
    }

    if (!columnMapping) {
      return NextResponse.json({ error: 'Column mapping is required' }, { status: 400 });
    }

    const result = await processCSVImport(session, rows, columnMapping, duplicateStrategy || 'skip');
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}
