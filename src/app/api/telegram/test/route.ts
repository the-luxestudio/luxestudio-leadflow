import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import { sendTelegramMessage } from '@/lib/services/telegram';
import prisma from '@/lib/db/prisma';

export async function POST() {
  try {
    const session = await requireAuth();
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || !user.telegramChatId) {
      return NextResponse.json(
        { error: 'No Telegram account linked yet. Please connect your Telegram account first.' },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://leads.theluxestudio.in';
    const message =
      `🔔 <b>LuxeStudio LeadFlow Test Notification</b>\n\n` +
      `Great news, <b>${user.displayName}</b>! Your Telegram integration is active and working perfectly.\n\n` +
      `• <b>Bot:</b> @luxestudio_leadflow_bot\n` +
      `• <b>Chat ID:</b> <code>${user.telegramChatId}</code>\n` +
      `• <b>Time:</b> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\n\n` +
      `⚡ Follow-up alerts, reminders, and daily digests will be delivered directly here.\n` +
      `🔗 <a href="${appUrl}/settings">LeadFlow CRM Settings</a>`;

    const result = await sendTelegramMessage(user.telegramChatId, message);

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to dispatch Telegram message' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Test notification sent successfully to Telegram chat (${user.telegramChatId})!`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}
