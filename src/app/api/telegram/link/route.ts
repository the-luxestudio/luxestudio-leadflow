import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import { linkTelegramAccount, directLinkTelegramAccount, unlinkTelegramAccount, sendTelegramMessage } from '@/lib/services/telegram';

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { token, chatId, username } = body;

    // Direct linking by chatId
    if (chatId && !token) {
      const cleanChatId = chatId.toString().trim();
      const result = await directLinkTelegramAccount(session.user.id, cleanChatId, username);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      // Send confirmation to Telegram chat
      await sendTelegramMessage(
        cleanChatId,
        `🎉 <b>Account Linked Successfully!</b>\n\n` +
        `Welcome, <b>${session.user.displayName}</b>.\n` +
        `Your Telegram account is now connected to <b>LuxeStudio LeadFlow CRM</b>.\n\n` +
        `You will receive all scheduled follow-up alerts and reminders directly here.`
      );

      return NextResponse.json({ success: true, message: 'Telegram account successfully connected!' });
    }

    if (token) {
      const result = await linkTelegramAccount(token, chatId || 'DIRECT', username);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, message: 'Telegram account successfully linked' });
    }

    return NextResponse.json({ error: 'Either token or chatId is required' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}

export async function DELETE() {
  try {
    const session = await requireAuth();
    await unlinkTelegramAccount(session.user.id);
    return NextResponse.json({ success: true, message: 'Telegram account unlinked' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}
