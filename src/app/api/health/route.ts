import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();
  let dbStatus = 'disconnected';
  let dbLatencyMs = -1;

  try {
    // Perform simple fast database ping query
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
    dbLatencyMs = Date.now() - startTime;
  } catch (error: any) {
    dbStatus = 'error';
    console.error('Health check database error:', error?.message);
  }

  const isHealthy = dbStatus === 'connected';

  return NextResponse.json(
    {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
      environment: process.env.NODE_ENV || 'production',
      version: '1.0.0',
    },
    { status: isHealthy ? 200 : 503 }
  );
}
