import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import { exportLeadsToCSV } from '@/lib/services/csv';

export async function GET() {
  try {
    const session = await requireAuth();
    const csvData = await exportLeadsToCSV(session);

    return new NextResponse(csvData, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="luxestudio_leads_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}
