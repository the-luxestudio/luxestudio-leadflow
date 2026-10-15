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

    // 1. Handle /help command
    if (text === '/help') {
      await sendTelegramMessage(
        chatId,
        `🤖 <b>LuxeStudio LeadFlow Bot Commands</b>\n\n` +
        `• <code>/start &lt;TOKEN&gt;</code> - Link your LeadFlow account\n` +
        `• <code>/digest</code> or <code>/today</code> - View today's follow-ups and overdue tasks\n` +
        `• <code>/status</code> - Check linked account status\n` +
        `• <code>/help</code> - Show this menu\n\n` +
        `<i>Your Telegram Chat ID:</i> <code>${chatId}</code>\n` +
        `<i>Real-time alarms and overdue alerts are sent here automatically.</i>`
      );
      return NextResponse.json({ ok: true });
    }

    // 2. Handle /status command
    if (text === '/status') {
      const linkedUser = await prisma.user.findFirst({
        where: { telegramChatId: chatId },
      });

      if (linkedUser) {
        await sendTelegramMessage(
          chatId,
          `✅ <b>Connected Account</b>\n\n` +
          `• <b>User:</b> ${linkedUser.displayName}\n` +
          `• <b>Email:</b> ${linkedUser.email}\n` +
          `• <b>Chat ID:</b> <code>${chatId}</code>\n` +
          `• <b>Status:</b> Active & receiving follow-up alerts\n\n` +
          `Type <code>/digest</code> to see today's agenda.`
        );
      } else {
        await sendTelegramMessage(
          chatId,
          `⚠️ <b>Not Connected</b>\n\n` +
          `No LeadFlow account is currently linked to this chat.\n` +
          `• <b>Your Chat ID:</b> <code>${chatId}</code>\n\n` +
          `To connect, send your 6-character linking code from <a href="https://leads.theluxestudio.in/settings">LeadFlow Settings</a>, or paste your Chat ID directly in LeadFlow Settings.`
        );
      }
      return NextResponse.json({ ok: true });
    }

    // 3. Handle /digest, /today, or /summary command
    if (text === '/digest' || text === '/today' || text === '/summary') {
      const linkedUser = await prisma.user.findFirst({
        where: { telegramChatId: chatId },
      });

      if (!linkedUser) {
        await sendTelegramMessage(
          chatId,
          `⚠️ <b>Not Connected</b>\n\n` +
          `Please link your LeadFlow account first.\n` +
          `• <b>Your Chat ID:</b> <code>${chatId}</code>\n\n` +
          `Send your 6-character code from Settings or paste your Chat ID in Settings.`
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

      msg += `\n🔗 <a href="${appUrl}/follow-ups">Open Follow-up Centre</a>`;

      await sendTelegramMessage(chatId, msg);
      return NextResponse.json({ ok: true });
    }

    // 4. Extract potential linking token:
    // Handles:
    //   - "/start 70F968"
    //   - "/link 70F968"
    //   - "70F968" (plain code)
    //   - "code 70F968"
    //   - Any 6-char alphanumeric string
    let candidateToken: string | null = null;

    if (text.startsWith('/start') || text.startsWith('/link') || text.startsWith('/connect')) {
      const parts = text.split(/\s+/);
      if (parts.length > 1 && parts[1]?.trim()) {
        candidateToken = parts[1].trim();
      }
    } else {
      const clean = text.replace(/[^a-zA-Z0-9]/g, '');
      if (clean.length === 6) {
        candidateToken = clean;
      } else {
        const hexMatch = text.match(/\b([a-zA-Z0-9]{6})\b/);
        if (hexMatch) {
          candidateToken = hexMatch[1];
        }
      }
    }

    if (candidateToken) {
      const linkResult = await linkTelegramAccount(candidateToken, chatId, username);
      if (linkResult.success) {
        await sendTelegramMessage(
          chatId,
          `🎉 <b>Account Linked Successfully!</b>\n\n` +
          `Welcome, <b>${linkResult.user?.displayName}</b>.\n` +
          `Your Telegram is now securely connected to <b>LuxeStudio LeadFlow CRM</b>.\n\n` +
          `⚡ <b>What happens now:</b>\n` +
          `• You will receive real-time alerts whenever a follow-up is due\n` +
          `• Overdue warnings & lead assignments\n` +
          `• Type <code>/digest</code> anytime to view today's tasks\n\n` +
          `Type <code>/help</code> for all commands.`
        );
      } else {
        await sendTelegramMessage(
          chatId,
          `⚠️ <b>Linking Token Expired or Invalid</b>\n\n` +
          `${linkResult.error}\n\n` +
          `• <b>Your Telegram Chat ID:</b> <code>${chatId}</code>\n\n` +
          `<i>Tip:</i> You can also paste your Chat ID <code>${chatId}</code> directly into <a href="https://leads.theluxestudio.in/settings">LeadFlow Settings</a> to connect instantly without a token!`
        );
      }
      return NextResponse.json({ ok: true });
    }

    // 5. If user sent bare "/start" with no token
    if (text === '/start') {
      const linkedUser = await prisma.user.findFirst({
        where: { telegramChatId: chatId },
      });

      if (linkedUser) {
        await sendTelegramMessage(
          chatId,
          `👋 <b>Welcome back, ${linkedUser.displayName}!</b>\n\n` +
          `Your Telegram account is connected to LuxeStudio LeadFlow CRM.\n` +
          `Type <code>/digest</code> to see your schedule or <code>/help</code> for commands.`
        );
      } else {
        await sendTelegramMessage(
          chatId,
          `👋 <b>Welcome to LuxeStudio LeadFlow Bot</b>\n\n` +
          `To connect your CRM account, you have two simple options:\n\n` +
          `1️⃣ <b>Send Code:</b> Generate a 6-character code in <a href="https://leads.theluxestudio.in/settings">LeadFlow Settings</a> and reply with it here.\n\n` +
          `2️⃣ <b>Direct Chat ID:</b> Copy your Chat ID below and paste it into LeadFlow Settings:\n` +
          `👉 <code>${chatId}</code>`
        );
      }
      return NextResponse.json({ ok: true });
    }

    // 6. Any other message from an unlinked user
    const existingUser = await prisma.user.findFirst({
      where: { telegramChatId: chatId },
    });

    if (!existingUser) {
      await sendTelegramMessage(
        chatId,
        `👋 <b>LuxeStudio LeadFlow Bot</b>\n\n` +
        `Your Telegram account is not linked to LeadFlow yet.\n\n` +
        `• <b>Your Chat ID:</b> <code>${chatId}</code>\n\n` +
        `Reply with your 6-character linking code, or paste your Chat ID into <a href="https://leads.theluxestudio.in/settings">LeadFlow Settings</a> to connect.`
      );
    } else {
      await sendTelegramMessage(
        chatId,
        `🤖 Hi <b>${existingUser.displayName}</b>! Type <code>/digest</code> to view today's tasks or <code>/help</code> for available commands.`
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Telegram webhook error:', err);
    return NextResponse.json({ ok: true });
  }
}
