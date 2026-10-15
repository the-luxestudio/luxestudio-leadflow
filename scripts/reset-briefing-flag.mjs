import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Inspecting and Resetting Daily Briefing Flags ---');

  // Find all BRIEFING audit logs
  const briefingLogs = await prisma.auditLog.findMany({
    where: {
      entityType: 'BRIEFING',
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`Found ${briefingLogs.length} briefing audit log(s):`);
  for (const log of briefingLogs) {
    console.log(`- ID: ${log.id} | Date: ${log.entityId} | Action: ${log.action} | CreatedAt: ${log.createdAt.toISOString()}`);
  }

  // Delete all DAILY_9AM_EMAIL_SENT logs for today and previous tests
  const deleteResult = await prisma.auditLog.deleteMany({
    where: {
      entityType: 'BRIEFING',
      action: 'DAILY_9AM_EMAIL_SENT',
    },
  });

  console.log(`\nSuccessfully deleted ${deleteResult.count} briefing log(s).`);
  console.log('The 9 AM briefing flag has been completely reset to 0.');
}

main()
  .catch((e) => {
    console.error('Error resetting briefing flag:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
