import prisma from '@/lib/db/prisma';
import { sendTelegramMessage } from './telegram';
import { sendEmailNotification, isEmailConfigured } from './email';

export async function processDueNotificationJobs() {
  const now = new Date();

  // Find scheduled follow-ups that are due now or within the last 2 hours and still scheduled
  const dueFollowUps = await prisma.followUp.findMany({
    where: {
      status: 'SCHEDULED',
      dueAt: { lte: now },
    },
    include: {
      owner: true,
      lead: {
        include: {
          contacts: { where: { isPrimary: true }, take: 1 },
        },
      },
    },
    take: 50,
  });

  const results = {
    processed: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
  };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  for (const followUp of dueFollowUps) {
    results.processed++;
    // Construct unique idempotency key based on follow-up ID and scheduled time bucket
    const dateBucket = new Date(followUp.dueAt).toISOString().slice(0, 13); // hourly bucket
    const idempotencyKey = `remind_${followUp.id}_${dateBucket}`;

    // Check if notification job already completed or currently processing
    const existingJob = await prisma.notificationJob.findUnique({
      where: { idempotencyKey },
    });

    if (existingJob && (existingJob.status === 'SENT' || existingJob.status === 'PROCESSING')) {
      results.skipped++;
      continue;
    }

    // Claim or create job transactionally
    const job = await prisma.notificationJob.upsert({
      where: { idempotencyKey },
      update: {
        attempts: { increment: 1 },
        status: 'PROCESSING',
      },
      create: {
        organizationId: followUp.organizationId,
        followUpId: followUp.id,
        recipientUserId: followUp.ownerId,
        channel: 'TELEGRAM',
        scheduledAt: followUp.dueAt,
        idempotencyKey,
        attempts: 1,
        status: 'PROCESSING',
      },
    });

    const contact = followUp.lead.contacts[0];
    const leadUrl = `${appUrl}/leads/${followUp.lead.id}`;

    let deliverySuccess = false;
    let errorMessage = '';

    // 1. Telegram delivery if owner linked account
    if (followUp.owner.telegramChatId) {
      const messageText = `⚡ <b>LuxeStudio LeadFlow Reminder</b>\n\n` +
        `Follow-up due now for <b>${followUp.lead.businessName}</b>\n` +
        `👤 Contact: ${contact?.name || 'N/A'} (${contact?.phone || 'No phone'})\n` +
        `🎯 Action: ${followUp.actionType} - ${followUp.title}\n` +
        (followUp.plannedMessage ? `📝 Note: ${followUp.plannedMessage}\n` : '') +
        `\n🔗 <a href="${leadUrl}">Open Lead in CRM</a>`;

      const telegramRes = await sendTelegramMessage(followUp.owner.telegramChatId, messageText);
      if (telegramRes.success) {
        deliverySuccess = true;
      } else {
        errorMessage += `Telegram: ${telegramRes.error}. `;
      }
    }

    // 2. Email delivery if email configured and telegram not available
    if (!deliverySuccess && isEmailConfigured()) {
      const emailRes = await sendEmailNotification({
        to: followUp.owner.email,
        subject: `[LeadFlow Reminder] Follow-up due: ${followUp.lead.businessName}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #111827;">
            <h2 style="color: #c5a84d;">LuxeStudio LeadFlow Reminder</h2>
            <p><strong>Follow-up due now:</strong> ${followUp.title}</p>
            <p><strong>Business:</strong> ${followUp.lead.businessName}</p>
            <p><strong>Contact:</strong> ${contact?.name || 'N/A'} (${contact?.phone || ''})</p>
            ${followUp.plannedMessage ? `<p><strong>Note:</strong> ${followUp.plannedMessage}</p>` : ''}
            <p><a href="${leadUrl}" style="display:inline-block; padding: 10px 18px; background: #c5a84d; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600;">Open Lead in CRM</a></p>
          </div>
        `,
      });

      if (emailRes.success) {
        deliverySuccess = true;
      } else {
        errorMessage += `Email: ${emailRes.error}. `;
      }
    }

    // Update job status
    if (deliverySuccess) {
      await prisma.notificationJob.update({
        where: { id: job.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          lastError: null,
        },
      });
      results.sent++;
    } else {
      const maxAttemptsReached = job.attempts >= 4;
      await prisma.notificationJob.update({
        where: { id: job.id },
        data: {
          status: maxAttemptsReached ? 'FAILED' : 'PENDING',
          lastError: errorMessage || 'No notification channels linked or configured for user.',
          nextAttemptAt: maxAttemptsReached
            ? null
            : new Date(Date.now() + Math.pow(2, job.attempts) * 60 * 1000), // exponential backoff
        },
      });
      results.failed++;
    }
  }

  return results;
}
