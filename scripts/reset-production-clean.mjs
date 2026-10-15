import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Purging all dummy data and resetting database to clean production state...');

  // 1. Delete all lead data, activities, deals, notes, follow-ups, and jobs
  await prisma.auditLog.deleteMany();
  await prisma.notificationJob.deleteMany();
  await prisma.userIntegration.deleteMany();
  await prisma.sequenceEnrollment.deleteMany();
  await prisma.followUpSequence.deleteMany();
  await prisma.followUp.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.leadActivity.deleteMany();
  await prisma.leadNote.deleteMany();
  await prisma.leadContact.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.leadImportJob.deleteMany();
  await prisma.messageTemplate.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.user.deleteMany();

  console.log('✓ Cleared all leads, deals, contacts, notes, activities, follow-ups, and demo users.');

  // 2. Ensure Organization exists
  let org = await prisma.organization.findFirst({
    where: { name: 'LuxeStudio' },
  });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: 'LuxeStudio',
        timezone: 'Asia/Kolkata',
        currency: 'INR',
      },
    });
    console.log(`✓ Created Organization: ${org.name} (${org.id})`);
  } else {
    console.log(`✓ Organization verified: ${org.name} (${org.id})`);
  }

  // 3. Ensure 8 Pipeline Stages exist
  const stageDefs = [
    { name: 'New', position: 0, isWon: false, isLost: false },
    { name: 'Contacted', position: 1, isWon: false, isLost: false },
    { name: 'Interested', position: 2, isWon: false, isLost: false },
    { name: 'Prototype Shared', position: 3, isWon: false, isLost: false },
    { name: 'Proposal Sent', position: 4, isWon: false, isLost: false },
    { name: 'Negotiation', position: 5, isWon: false, isLost: false },
    { name: 'Won', position: 6, isWon: true, isLost: false },
    { name: 'Lost', position: 7, isWon: false, isLost: true },
  ];

  for (const s of stageDefs) {
    const existing = await prisma.pipelineStage.findFirst({
      where: { organizationId: org.id, name: s.name },
    });
    if (!existing) {
      await prisma.pipelineStage.create({
        data: {
          organizationId: org.id,
          name: s.name,
          position: s.position,
          isWon: s.isWon,
          isLost: s.isLost,
          active: true,
        },
      });
    }
  }
  console.log('✓ Verified 8 pipeline stages.');

  // 4. Create single fresh Admin user
  const adminEmail = 'nuvobyluxestudio@gmail.com';
  const rawPassword = 'Password123!';
  const passwordHash = await bcrypt.hash(rawPassword, 12);

  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      displayName: 'LuxeStudio Admin',
      passwordHash,
      status: 'ACTIVE',
      memberships: {
        create: {
          organizationId: org.id,
          role: 'ADMIN',
        },
      },
    },
  });

  console.log('✨ Clean production state established!');
  console.log('----------------------------------------------------');
  console.log('Single Admin Account:');
  console.log(`  Email:    ${admin.email}`);
  console.log(`  Password: ${rawPassword}`);
  console.log(`  Role:     ADMIN`);
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('Error during cleanup:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
