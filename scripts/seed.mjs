import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding LuxeStudio LeadFlow CRM database...');

  // 1. Clean existing records safely
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
  await prisma.messageTemplate.deleteMany();
  await prisma.pipelineStage.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  // 2. Organization
  const org = await prisma.organization.create({
    data: {
      name: 'LuxeStudio',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
    },
  });
  console.log(`✓ Created Organization: ${org.name} (${org.id})`);

  // 3. Password hash
  const defaultPassword = await bcrypt.hash('Password123!', 10);

  // 4. Users
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@theluxestudio.in',
      displayName: 'Aditya Sharma (Admin)',
      passwordHash: defaultPassword,
      status: 'ACTIVE',
    },
  });

  const managerUser = await prisma.user.create({
    data: {
      email: 'manager@theluxestudio.in',
      displayName: 'Pooja Verma (Manager)',
      passwordHash: defaultPassword,
      status: 'ACTIVE',
    },
  });

  const sales1 = await prisma.user.create({
    data: {
      email: 'sales1@theluxestudio.in',
      displayName: 'Rohan Mehta (Sales Rep)',
      passwordHash: defaultPassword,
      status: 'ACTIVE',
    },
  });

  const sales2 = await prisma.user.create({
    data: {
      email: 'sales2@theluxestudio.in',
      displayName: 'Ananya Gupta (Sales Rep)',
      passwordHash: defaultPassword,
      status: 'ACTIVE',
    },
  });

  // 5. Memberships
  await prisma.membership.createMany({
    data: [
      { organizationId: org.id, userId: adminUser.id, role: 'ADMIN' },
      { organizationId: org.id, userId: managerUser.id, role: 'MANAGER' },
      { organizationId: org.id, userId: sales1.id, role: 'SALES_MEMBER' },
      { organizationId: org.id, userId: sales2.id, role: 'SALES_MEMBER' },
    ],
  });
  console.log('✓ Created 4 Team Members & Memberships');

  // 6. Pipeline Stages
  const stageDefs = [
    { name: 'New', position: 1, isWon: false, isLost: false, color: '#3B82F6' },
    { name: 'Contacted', position: 2, isWon: false, isLost: false, color: '#0EA5E9' },
    { name: 'Interested', position: 3, isWon: false, isLost: false, color: '#F59E0B' },
    { name: 'Prototype Shared', position: 4, isWon: false, isLost: false, color: '#8B5CF6' },
    { name: 'Proposal Sent', position: 5, isWon: false, isLost: false, color: '#EC4899' },
    { name: 'Negotiation', position: 6, isWon: false, isLost: false, color: '#F97316' },
    { name: 'Won', position: 7, isWon: true, isLost: false, color: '#10B981' },
    { name: 'Lost', position: 8, isWon: false, isLost: true, color: '#64748B' },
  ];

  const stages = [];
  for (const s of stageDefs) {
    const stage = await prisma.pipelineStage.create({
      data: {
        organizationId: org.id,
        name: s.name,
        position: s.position,
        isWon: s.isWon,
        isLost: s.isLost,
        color: s.color,
      },
    });
    stages.push(stage);
  }
  console.log(`✓ Created ${stages.length} Pipeline Stages`);

  // Map for easy access
  const stageMap = Object.fromEntries(stages.map((s) => [s.name, s.id]));

  // 7. Message Templates
  await prisma.messageTemplate.createMany({
    data: [
      {
        organizationId: org.id,
        name: 'Initial Outreach - Website Revamp',
        category: 'OUTREACH',
        channel: 'WHATSAPP',
        body: 'Hi {{contact_name}}, this is {{sender_name}} from LuxeStudio. We recently noticed {{business_name}} and love your work in {{city}}. We designed a quick digital concept to help you attract more high-ticket clients online: {{prototype_url}}. Would you have 5 minutes this week for a brief walkthrough?',
        createdBy: adminUser.id,
      },
      {
        organizationId: org.id,
        name: 'Prototype Shared Follow-up',
        category: 'PROTOTYPE',
        channel: 'WHATSAPP',
        body: 'Hi {{contact_name}}, just checking if you had a moment to explore the interactive website prototype we prepared for {{business_name}}: {{prototype_url}}! Our design team is eager to incorporate any feedback or ideas you have.',
        createdBy: adminUser.id,
      },
      {
        organizationId: org.id,
        name: 'Formal Proposal & Scope',
        category: 'PROPOSAL',
        channel: 'EMAIL',
        subject: 'LuxeStudio Proposal for {{business_name}} Website & Growth Automation',
        body: 'Dear {{contact_name}},\n\nIt was a pleasure discussing the digital vision for {{business_name}}. You can access the detailed project proposal and scope breakdown here: {{proposal_url}}.\n\nTotal Investment: {{deal_value}}\n\nPlease let us know if you would like to adjust the project milestones or launch date.\n\nWarm regards,\n{{sender_name}}\nLuxeStudio Team',
        createdBy: adminUser.id,
      },
      {
        organizationId: org.id,
        name: 'Closing & Welcome Onboard',
        category: 'CLOSING',
        channel: 'WHATSAPP',
        body: 'Wonderful news, {{contact_name}}! We are thrilled to welcome {{business_name}} to LuxeStudio. Our engineering and design team is initiating your sprint kickoff. Looking forward to creating something extraordinary together!',
        createdBy: adminUser.id,
      },
    ],
  });
  console.log('✓ Created 4 Message Templates');

  // 8. Follow-up Sequences
  await prisma.followUpSequence.createMany({
    data: [
      {
        organizationId: org.id,
        name: 'Prototype Review Sequence',
        triggerStage: 'Prototype Shared',
        steps: JSON.stringify([
          { dayOffset: 1, actionType: 'WHATSAPP', title: 'Check prototype feedback', message: 'Hi {{contact_name}}, did you get a chance to open the preview link?' },
          { dayOffset: 3, actionType: 'CALL', title: 'Follow-up call to review revisions', message: 'Call client to address questions regarding layout and responsive speed.' },
          { dayOffset: 7, actionType: 'EMAIL', title: 'Final prototype check-in', message: 'Summary email with client feedback and next steps toward proposal.' },
        ]),
        active: true,
      },
      {
        organizationId: org.id,
        name: 'Proposal Closing Sequence',
        triggerStage: 'Proposal Sent',
        steps: JSON.stringify([
          { dayOffset: 2, actionType: 'WHATSAPP', title: 'Verify proposal receipt', message: 'Check if {{contact_name}} had any questions on the proposal terms.' },
          { dayOffset: 5, actionType: 'CALL', title: 'Pricing & timeline negotiation', message: 'Clarify deliverables, payment schedule and launch dates.' },
          { dayOffset: 10, actionType: 'CALL', title: 'Final closing call', message: 'Confirm agreement and send onboarding kickoff links.' },
        ]),
        active: true,
      },
    ],
  });
  console.log('✓ Created 2 Follow-Up Automation Sequences');

  // 9. Realistic Sample Leads for LuxeStudio
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const todayDue = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 15, 0);
  const overdueDue = new Date(now.getTime() - 36 * 60 * 60 * 1000);
  const tomorrowDue = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const sampleLeads = [
    {
      businessName: 'Naksh Interio & Architecture',
      category: 'Interior Design & Architecture',
      websiteUrl: 'https://nakshinterio.com',
      socialUrl: 'https://instagram.com/nakshinterio',
      address: '24 Delhi Road, Near Sports Complex',
      city: 'Meerut',
      state: 'Uttar Pradesh',
      country: 'India',
      mapsUrl: 'https://maps.google.com/?q=Naksh+Interio+Meerut',
      source: 'Google Maps Research',
      origin: 'MANUAL',
      stageName: 'Prototype Shared',
      ownerId: sales1.id,
      priority: 'HIGH',
      opportunityType: 'Redesign & 3D Showcase',
      prototypeUrl: 'https://prototype.theluxestudio.in/naksh-interio',
      proposalUrl: '',
      dealValue: 85000,
      contact: {
        name: 'Ar. Rajesh Sharma',
        phone: '+919876543210',
        whatsappPhone: '+919876543210',
        email: 'rajesh@nakshinterio.com',
      },
      followUp: {
        title: 'Review prototype feedback with Ar. Rajesh',
        actionType: 'CALL',
        dueAt: todayDue,
        status: 'SCHEDULED',
        plannedMessage: 'Discuss portfolio grid transitions and client enquiry form integration.',
      },
      deal: {
        title: 'Complete Studio Redesign + SEO',
        amount: 85000,
        probability: 70,
        status: 'OPEN',
      },
    },
    {
      businessName: 'SmileCraft Luxury Dental Lounge',
      category: 'Healthcare & Aesthetics',
      websiteUrl: '',
      socialUrl: 'https://instagram.com/smilecraftmeerut',
      address: 'Suite 102, Metro Plaza, Civil Lines',
      city: 'Meerut',
      state: 'Uttar Pradesh',
      country: 'India',
      mapsUrl: 'https://maps.google.com/?q=SmileCraft+Dental+Civil+Lines',
      source: 'Directory',
      origin: 'MANUAL',
      stageName: 'Proposal Sent',
      ownerId: sales1.id,
      priority: 'URGENT',
      opportunityType: 'New Website & Patient Booking Engine',
      prototypeUrl: 'https://prototype.theluxestudio.in/smilecraft',
      proposalUrl: 'https://proposals.theluxestudio.in/smilecraft-v2.pdf',
      dealValue: 120000,
      contact: {
        name: 'Dr. Neha Kapoor',
        phone: '+919811223344',
        whatsappPhone: '+919811223344',
        email: 'drneha@smilecraftdental.in',
      },
      followUp: {
        title: 'Follow-up on proposal approval and contract signing',
        actionType: 'WHATSAPP',
        dueAt: overdueDue,
        status: 'SCHEDULED',
        plannedMessage: 'Ask if Dr. Neha needs any adjustments to the phased payment schedule.',
      },
      deal: {
        title: 'Patient Portal & Booking Automation',
        amount: 120000,
        probability: 80,
        status: 'OPEN',
      },
    },
    {
      businessName: 'The Olive Grove Mediterranean Bistro',
      category: 'Hospitality & Dining',
      websiteUrl: 'https://theolivegrove.in',
      socialUrl: 'https://instagram.com/theolivegrove',
      address: 'Plot 15, Sector 29',
      city: 'Gurugram',
      state: 'Haryana',
      country: 'India',
      mapsUrl: 'https://maps.google.com/?q=The+Olive+Grove+Gurugram',
      source: 'Referral',
      origin: 'MANUAL',
      stageName: 'Won',
      ownerId: sales2.id,
      priority: 'MEDIUM',
      opportunityType: 'Digital Menu & Table Reservation System',
      prototypeUrl: 'https://prototype.theluxestudio.in/olivegrove',
      proposalUrl: 'https://proposals.theluxestudio.in/olivegrove-final.pdf',
      dealValue: 150000,
      contact: {
        name: 'Karan Singhal',
        phone: '+919899001122',
        whatsappPhone: '+919899001122',
        email: 'karan@theolivegrove.in',
      },
      deal: {
        title: 'Multi-location Web Presence & Reservation Engine',
        amount: 150000,
        probability: 100,
        status: 'WON',
      },
    },
    {
      businessName: 'Imperial Heights Real Estate',
      category: 'Real Estate & Construction',
      websiteUrl: '',
      socialUrl: 'https://facebook.com/imperialheights',
      address: 'Expressway Tower, Sector 128',
      city: 'Noida',
      state: 'Uttar Pradesh',
      country: 'India',
      mapsUrl: 'https://maps.google.com/?q=Imperial+Heights+Noida',
      source: 'Outreach',
      origin: 'MANUAL',
      stageName: 'Negotiation',
      ownerId: sales2.id,
      priority: 'URGENT',
      opportunityType: 'Luxury Property Landing Pages & Lead Funnel',
      prototypeUrl: 'https://prototype.theluxestudio.in/imperial',
      proposalUrl: 'https://proposals.theluxestudio.in/imperial-revised.pdf',
      dealValue: 240000,
      contact: {
        name: 'Vikram Choudhary',
        phone: '+919711554433',
        whatsappPhone: '+919711554433',
        email: 'vikram@imperialheights.co.in',
      },
      followUp: {
        title: 'Commercial pricing negotiation meeting',
        actionType: 'MEETING',
        dueAt: tomorrowDue,
        status: 'SCHEDULED',
        plannedMessage: 'Present revised milestone options and CRM webhook integration guarantees.',
      },
      deal: {
        title: 'High-Conversion Real Estate Funnel',
        amount: 240000,
        probability: 75,
        status: 'OPEN',
      },
    },
    {
      businessName: 'Aura Ayurveda Wellness Retreat',
      category: 'Health, Wellness & Spa',
      websiteUrl: 'https://auraayurveda.co',
      socialUrl: 'https://instagram.com/auraayurveda',
      address: 'Mall Road',
      city: 'Dehradun',
      state: 'Uttarakhand',
      country: 'India',
      mapsUrl: 'https://maps.google.com/?q=Aura+Ayurveda+Dehradun',
      source: 'Google Maps Research',
      origin: 'MANUAL',
      stageName: 'Contacted',
      ownerId: sales1.id,
      priority: 'MEDIUM',
      opportunityType: 'Full Website Redesign',
      dealValue: 60000,
      contact: {
        name: 'Sunita Rawat',
        phone: '+919650112233',
        whatsappPhone: '+919650112233',
        email: 'sunita@auraayurveda.co',
      },
      followUp: {
        title: 'Call to share custom wellness website mockups',
        actionType: 'CALL',
        dueAt: todayDue,
        status: 'SCHEDULED',
        plannedMessage: 'Showcase quick prototype of retreat booking & package selection.',
      },
    },
    {
      businessName: 'Vanguard Legal Chambers',
      category: 'Legal & Corporate Advisory',
      websiteUrl: 'https://vanguardlegal.in',
      address: 'Barakhamba Road, Connaught Place',
      city: 'New Delhi',
      state: 'Delhi',
      country: 'India',
      mapsUrl: 'https://maps.google.com/?q=Vanguard+Legal+CP+Delhi',
      source: 'Referral',
      origin: 'MANUAL',
      stageName: 'New',
      ownerId: sales2.id,
      priority: 'LOW',
      opportunityType: 'Professional Corporate Portal',
      dealValue: 50000,
      contact: {
        name: 'Pradeep Malhotra',
        phone: '+919810334455',
        whatsappPhone: '+919810334455',
        email: 'pmalhotra@vanguardlegal.in',
      },
    },
    {
      businessName: 'Svelte Couture Bridal Studio',
      category: 'Fashion & Luxury Retail',
      websiteUrl: '',
      socialUrl: 'https://instagram.com/sveltecouture',
      address: 'Kalyan Nagar',
      city: 'Meerut',
      state: 'Uttar Pradesh',
      country: 'India',
      mapsUrl: 'https://maps.google.com/?q=Svelte+Couture+Meerut',
      source: 'Instagram Research',
      origin: 'MANUAL',
      stageName: 'Interested',
      ownerId: sales1.id,
      priority: 'HIGH',
      opportunityType: 'E-commerce Catalog & Bridal Appointment System',
      dealValue: 95000,
      contact: {
        name: 'Simran Bajaj',
        phone: '+919927001122',
        whatsappPhone: '+919927001122',
        email: 'simran@sveltecouture.com',
      },
      followUp: {
        title: 'Send bridal appointment system preview link',
        actionType: 'WHATSAPP',
        dueAt: overdueDue,
        status: 'SCHEDULED',
        plannedMessage: 'Share prototype showing the bride lookbook and virtual try-on enquiry.',
      },
      deal: {
        title: 'Bridal E-commerce & Appointment System',
        amount: 95000,
        probability: 60,
        status: 'OPEN',
      },
    },
    {
      businessName: 'Nexus Cloud Infotech',
      category: 'IT Services & B2B',
      websiteUrl: 'https://nexuscloud.io',
      address: 'Sector 62',
      city: 'Noida',
      state: 'Uttar Pradesh',
      country: 'India',
      source: 'Outreach',
      origin: 'MANUAL',
      stageName: 'Lost',
      ownerId: sales2.id,
      priority: 'LOW',
      opportunityType: 'B2B Redesign',
      dealValue: 70000,
      contact: {
        name: 'Amitabh Sen',
        phone: '+919818998877',
        whatsappPhone: '+919818998877',
        email: 'amitabh@nexuscloud.io',
      },
      deal: {
        title: 'Corporate Web Redesign',
        amount: 70000,
        probability: 0,
        status: 'LOST',
        lostReason: 'Decided to use internal developer team instead.',
      },
    },
  ];

  for (const item of sampleLeads) {
    const lead = await prisma.lead.create({
      data: {
        organizationId: org.id,
        businessName: item.businessName,
        category: item.category,
        websiteUrl: item.websiteUrl || null,
        socialUrl: item.socialUrl || null,
        address: item.address || null,
        city: item.city || null,
        state: item.state || null,
        country: item.country || 'India',
        mapsUrl: item.mapsUrl || null,
        source: item.source || null,
        origin: item.origin || 'MANUAL',
        stageId: stageMap[item.stageName] || stages[0].id,
        ownerId: item.ownerId || null,
        priority: item.priority || 'MEDIUM',
        opportunityType: item.opportunityType || null,
        prototypeUrl: item.prototypeUrl || null,
        proposalUrl: item.proposalUrl || null,
        dealValue: item.dealValue || 0,
        createdBy: adminUser.id,
        lastContactedAt: yesterday,
      },
    });

    // Contact
    if (item.contact) {
      await prisma.leadContact.create({
        data: {
          organizationId: org.id,
          leadId: lead.id,
          name: item.contact.name,
          phone: item.contact.phone,
          normalizedPhone: item.contact.phone ? item.contact.phone.replace(/[^0-9]/g, '') : null,
          whatsappPhone: item.contact.whatsappPhone,
          email: item.contact.email,
          isPrimary: true,
        },
      });
    }

    // Initial note
    await prisma.leadNote.create({
      data: {
        organizationId: org.id,
        leadId: lead.id,
        authorId: item.ownerId || adminUser.id,
        content: `Prospect identified via ${item.source}. High potential for LuxeStudio digital solutions.`,
      },
    });

    // Initial activity
    await prisma.leadActivity.create({
      data: {
        organizationId: org.id,
        leadId: lead.id,
        actorId: item.ownerId || adminUser.id,
        type: 'SYSTEM',
        summary: `Lead created and entered "${item.stageName}" stage.`,
        details: 'Initial qualification performed.',
      },
    });

    // Deal
    if (item.deal) {
      await prisma.deal.create({
        data: {
          organizationId: org.id,
          leadId: lead.id,
          title: item.deal.title,
          amount: item.deal.amount,
          currency: 'INR',
          probability: item.deal.probability,
          status: item.deal.status,
          lostReason: item.deal.lostReason || null,
        },
      });
    }

    // Follow-up
    if (item.followUp) {
      await prisma.followUp.create({
        data: {
          organizationId: org.id,
          leadId: lead.id,
          ownerId: item.ownerId || adminUser.id,
          createdBy: adminUser.id,
          title: item.followUp.title,
          actionType: item.followUp.actionType,
          dueAt: item.followUp.dueAt,
          plannedMessage: item.followUp.plannedMessage,
          status: item.followUp.status,
          timezone: 'Asia/Kolkata',
        },
      });
    }
  }

  console.log(`✓ Seeded ${sampleLeads.length} rich prospects with contacts, deals, notes, and follow-ups!`);
  console.log('\n✨ Database seeding completed successfully.');
  console.log('----------------------------------------------------');
  console.log('Login credentials:');
  console.log('  Admin:        admin@theluxestudio.in   / Password123!');
  console.log('  Manager:      manager@theluxestudio.in / Password123!');
  console.log('  Sales Rep 1:  sales1@theluxestudio.in  / Password123!');
  console.log('  Sales Rep 2:  sales2@theluxestudio.in  / Password123!');
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
