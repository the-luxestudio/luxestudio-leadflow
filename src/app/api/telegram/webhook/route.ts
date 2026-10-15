import { NextResponse } from 'next/server';
import { linkTelegramAccount, sendTelegramMessage } from '@/lib/services/telegram';
import prisma from '@/lib/db/prisma';

export async function POST(request: Request) {
  try {
    const update = await request.json();

    if (!update.message || !update.message.text) {
      return NextResponse.json({ ok: true });
    }

    const chatId = update.message.chat.id.toString();
    const text = update.message.text.trim();
    const username = update.message.from?.username || update.message.from?.first_name || '';

    // Handle /start command with potential linking token
    if (text.startsWith('/start')) {
      const parts = text.split(' ');
      const token = parts[1]?.trim();

      if (token) {
        // Attempt linking with token
        const linkResult = await linkTelegramAccount(token, chatId, username);
        if (linkResult.success) {
          await sendTelegramMessage(
            chatId,
            `🎉 <b>Account Linked Successfully!</b>\n\n` +
            `Welcome, <b>${linkResult.user?.displayName}</b>.\n` +
            `Your Telegram account is now connected to <b>LuxeStudio LeadFlow CRM</b>.\n\n` +
            `You will now receive high-priority follow-up reminders, overdue alerts, and daily sales summaries directly here.`
          );
        } else {
          await sendTelegramMessage(
            chatId,
            `⚠️ <b>Linking Failed</b>\n\n` +
            `${linkResult.error}\n\n` +
            `Please visit your LeadFlow CRM Settings page to generate a new linking code.`
          );
        }
      } else {
        await sendTelegramMessage(
          chatId,
          `👋 <b>Welcome to LuxeStudio LeadFlow Bot</b>\n\n` +
          `To link your CRM account, open LeadFlow Settings, click <b>"Link Telegram Account"</b>, and follow the link or copy the single-use token.`
        );
      }
      return NextResponse.json({ ok: true });
    }

    // Handle /status command
    if (text === '/status') {
      const linkedUser = await prisma.user.findFirst({
        where: { telegramChatId: chatId },
      });

      if (linkedUser) {
        await sendTelegramMessage(
          chatId,
          `✅ <b>Connected Account</b>\n\n` +
          `User: <b>${linkedUser.displayName}</b>\n` +
          `Email: ${linkedUser.email}\n` +
          `Status: Active`
        );
      } else {
        await sendTelegramMessage(
          chatId,
          `⚠️ No LeadFlow account is currently linked to this chat. Use /start <token> to link.`
        );
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Telegram webhook error:', err);
    return NextResponse.json({ ok: true }); // Always return 200 OK to Telegram to avoid retries
  }
}
