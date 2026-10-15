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

    // Handle /digest, /today, or /summary command
    if (text === '/digest' || text === '/today' || text === '/summary') {
      const linkedUser = await prisma.user.findFirst({
        where: { telegramChatId: chatId },
      });

      if (!linkedUser) {
        await sendTelegramMessage(
          chatId,
          `⚠️ No LeadFlow account is currently linked. Use <code>/start &lt;TOKEN&gt;</code> to link your account.`
        );
        return NextResponse.json({ ok: true });
      }

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      const [dueToday, overdue] = await Promise.all([
        prisma.followUp.findMany({
          where: {
            ownerId: linkedUser.id,
            status: 'SCHEDULED',
            dueAt: { gte: startOfToday, lte: endOfToday },
          },
          include: { lead: true },
          orderBy: { dueAt: 'asc' },
        }),
        prisma.followUp.findMany({
          where: {
            ownerId: linkedUser.id,
            status: 'SCHEDULED',
            dueAt: { lt: startOfToday },
          },
          include: { lead: true },
          orderBy: { dueAt: 'asc' },
        }),
      ]);

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://leads.theluxestudio.in';

      let msg = `📅 <b>LuxeStudio LeadFlow Daily Digest</b>\n`;
      msg += `👤 Member: <b>${linkedUser.displayName}</b>\n\n`;

      if (dueToday.length === 0 && overdue.length === 0) {
        msg += `✨ <b>All caught up!</b> No pending follow-ups due today or overdue.\n`;
      } else {
        if (overdue.length > 0) {
          msg += `🚨 <b>Overdue Tasks (${overdue.length}):</b>\n`;
          for (const item of overdue.slice(0, 5)) {
            msg += `• <b>${item.lead.businessName}</b>: ${item.actionType} - ${item.title}\n`;
          }
          if (overdue.length > 5) msg += `  <i>...and ${overdue.length - 5} more</i>\n`;
          msg += `\n`;
        }

        if (dueToday.length > 0) {
          msg += `📌 <b>Due Today (${dueToday.length}):</b>\n`;
          for (const item of dueToday.slice(0, 5)) {
            msg += `• <b>${item.lead.businessName}</b>: ${item.actionType} - ${item.title}\n`;
          }
          if (dueToday.length > 5) msg += `  <i>...and ${dueToday.length - 5} more</i>\n`;
          msg += `\n`;
        }
      }

      msg += `🔗 <a href="${appUrl}/follow-ups">Open Follow-up Centre</a>`;

      await sendTelegramMessage(chatId, msg);
      return NextResponse.json({ ok: true });
    }

    // Handle /help command
    if (text === '/help') {
      await sendTelegramMessage(
        chatId,
        `🤖 <b>LuxeStudio LeadFlow Bot Commands</b>\n\n` +
        `• <code>/start &lt;TOKEN&gt;</code> - Link your personal Telegram account\n` +
        `• <code>/digest</code> or <code>/today</code> - View today's follow-ups and overdue tasks\n` +
        `• <code>/status</code> - Check linked account details\n` +
        `• <code>/help</code> - Show this command list\n\n` +
        `<i>Real-time alerts for newly assigned leads and scheduled follow-ups are automatically sent here.</i>`
      );
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Telegram webhook error:', err);
    return NextResponse.json({ ok: true }); // Always return 200 OK to Telegram to avoid retries
  }
}
