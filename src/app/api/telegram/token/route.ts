import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import { generateTelegramLinkingToken, isTelegramConfigured } from '@/lib/services/telegram';

export async function POST() {
  try {
    const session = await requireAuth();
    const token = await generateTelegramLinkingToken(session.user.id);
    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'LuxeStudioLeadFlowBot';

    return NextResponse.json({
      success: true,
      token,
      botUsername,
      isConfigured: isTelegramConfigured(),
      deepLinkUrl: `https://t.me/${botUsername}?start=${token}`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}
