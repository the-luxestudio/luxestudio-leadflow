import prisma from '@/lib/db/prisma';
import crypto from 'crypto';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export function isTelegramConfigured(): boolean {
  return Boolean(TELEGRAM_BOT_TOKEN && TELEGRAM_BOT_TOKEN.trim().length > 10);
}

/**
 * Generates a short-lived, cryptographically secure 6-character linking code.
 */
export async function generateTelegramLinkingToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(3).toString('hex').toUpperCase(); // e.g. '8F2B1A'
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await prisma.user.update({
    where: { id: userId },
    data: {
      linkingToken: token,
      linkingTokenExpiresAt: expiresAt,
    },
  });

  return token;
}

/**
 * Links a Telegram chatId to a user account using the single-use token.
 */
export async function linkTelegramAccount(token: string, chatId: string, username?: string) {
  const now = new Date();
  const user = await prisma.user.findFirst({
    where: {
      linkingToken: token.trim().toUpperCase(),
      linkingTokenExpiresAt: { gt: now },
    },
    include: { memberships: true },
  });

  if (!user) {
    return { success: false, error: 'Invalid or expired linking token. Please generate a new one from LeadFlow settings.' };
  }

  // Bind chatId and clear linking token
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        telegramChatId: chatId.toString().trim(),
        telegramUsername: username || null,
        linkingToken: null,
        linkingTokenExpiresAt: null,
      },
    });

    // Also update user_integrations record
    const orgId = user.memberships[0]?.organizationId;
    if (orgId) {
      await tx.userIntegration.upsert({
        where: {
          organizationId_userId_provider: {
            organizationId: orgId,
            userId: user.id,
            provider: 'TELEGRAM',
          },
        },
        update: {
          externalAccountId: chatId.toString().trim(),
          status: 'ACTIVE',
          linkedAt: new Date(),
        },
        create: {
          organizationId: orgId,
          userId: user.id,
          provider: 'TELEGRAM',
          externalAccountId: chatId.toString().trim(),
          status: 'ACTIVE',
        },
      });
    }
  });

  return { success: true, user };
}

/**
 * Directly links a Telegram chatId to an authenticated user
 */
export async function directLinkTelegramAccount(userId: string, chatId: string, username?: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { memberships: true },
  });

  if (!user) {
    return { success: false, error: 'User not found' };
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        telegramChatId: chatId.toString().trim(),
        telegramUsername: username?.trim() || null,
        linkingToken: null,
        linkingTokenExpiresAt: null,
      },
    });

    const orgId = user.memberships[0]?.organizationId;
    if (orgId) {
      await tx.userIntegration.upsert({
        where: {
          organizationId_userId_provider: {
            organizationId: orgId,
            userId: user.id,
            provider: 'TELEGRAM',
          },
        },
        update: {
          externalAccountId: chatId.toString().trim(),
          status: 'ACTIVE',
          linkedAt: new Date(),
        },
        create: {
          organizationId: orgId,
          userId: user.id,
          provider: 'TELEGRAM',
          externalAccountId: chatId.toString().trim(),
          status: 'ACTIVE',
        },
      });
    }
  });

  return { success: true, user };
}

/**
 * Unlink Telegram account from user
 */
export async function unlinkTelegramAccount(userId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        telegramChatId: null,
        telegramUsername: null,
      },
    });

    await tx.userIntegration.updateMany({
      where: { userId, provider: 'TELEGRAM' },
      data: { status: 'DISCONNECTED' },
    });
  });
}

/**
 * Send raw Telegram message with error handling and status verification
 */
export async function sendTelegramMessage(chatId: string, text: string, replyMarkup?: any): Promise<{ success: boolean; error?: string }> {
  if (!isTelegramConfigured()) {
    return { success: false, error: 'Telegram Bot is not configured in environment variables (TELEGRAM_BOT_TOKEN missing).' };
  }

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const payload: any = {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    };

    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!data.ok) {
      return { success: false, error: data.description || 'Telegram API request failed' };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error communicating with Telegram API' };
  }
}

/**
 * Formats and sends a structured follow-up reminder
 */
export async function sendFollowUpTelegramReminder(followUpId: string): Promise<{ success: boolean; error?: string }> {
  const followUp = await prisma.followUp.findUnique({
    where: { id: followUpId },
    include: {
      owner: true,
      lead: {
        include: {
          contacts: { where: { isPrimary: true }, take: 1 },
        },
      },
    },
  });

  if (!followUp) return { success: false, error: 'Follow-up not found' };
  if (followUp.status !== 'SCHEDULED') return { success: false, error: 'Follow-up is no longer scheduled' };
  if (!followUp.owner.telegramChatId) return { success: false, error: 'Owner has not linked Telegram' };

  const contact = followUp.lead.contacts[0];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const leadUrl = `${appUrl}/leads/${followUp.lead.id}`;

  const messageText = `✨ <b>LUXESTUDIO LEADFLOW</b>\n\n` +
    `⚡ <b>Follow-up Due Now</b>\n\n` +
    `🏢 <b>Business:</b> ${followUp.lead.businessName}\n` +
    `👤 <b>Contact:</b> ${contact?.name || 'N/A'} (${contact?.phone || 'No phone'})\n` +
    `🎯 <b>Action:</b> ${followUp.actionType} — ${followUp.title}\n` +
    `⏰ <b>Scheduled:</b> ${new Date(followUp.dueAt).toLocaleString('en-IN', { timeZone: followUp.timezone || 'Asia/Kolkata' })}\n` +
    (followUp.plannedMessage ? `📝 <b>Instructions:</b> <i>${followUp.plannedMessage}</i>\n` : '') +
    `\n🔗 <a href="${leadUrl}">Open Lead in LeadFlow CRM</a>`;

  return sendTelegramMessage(followUp.owner.telegramChatId, messageText);
}
