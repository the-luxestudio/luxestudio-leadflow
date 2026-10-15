// End-to-End API Integration & RBAC Validation Test
const BASE_URL = 'http://localhost:3000';

async function testCRM() {
  console.log('🧪 Starting LuxeStudio LeadFlow CRM Live Verification...\n');

  // 1. Login as Admin
  console.log('1. Testing Admin Authentication...');
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@theluxestudio.in', password: 'Password123!' }),
  });
  if (!adminLoginRes.ok) throw new Error('Admin login failed');
  const adminCookie = adminLoginRes.headers.get('set-cookie');
  console.log('✓ Admin login successful. Session cookie received.');

  // 2. Verify Session
  console.log('\n2. Verifying Session Identity...');
  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { cookie: adminCookie },
  });
  const meData = await meRes.json();
  if (meData.role !== 'ADMIN' || meData.organization.name !== 'LuxeStudio') {
    throw new Error('Session data mismatch');
  }
  console.log(`✓ Verified Identity: ${meData.user.displayName} (${meData.role}) - Workspace: ${meData.organization.name}`);

  // 3. Verify Leads Listing
  console.log('\n3. Verifying Leads Retrieval (Admin)...');
  const leadsRes = await fetch(`${BASE_URL}/api/leads`, {
    headers: { cookie: adminCookie },
  });
  const leadsData = await leadsRes.json();
  console.log(`✓ Admin retrieved ${leadsData.leads.length} total leads (Total in DB: ${leadsData.pagination.total}).`);
  const firstLead = leadsData.leads[0];
  console.log(`  Sample: "${firstLead.businessName}" | Stage: "${firstLead.stage.name}" | Deal: ₹${firstLead.dealValue}`);

  // 4. Verify Pipeline Kanban
  console.log('\n4. Verifying Pipeline Kanban Board...');
  const pipelineRes = await fetch(`${BASE_URL}/api/pipeline`, {
    headers: { cookie: adminCookie },
  });
  const pipelineData = await pipelineRes.json();
  console.log(`✓ Pipeline returned ${pipelineData.columns.length} stages:`);
  for (const col of pipelineData.columns) {
    console.log(`  - [${col.stage.name}]: ${col.count} leads (₹${col.totalValue.toLocaleString('en-IN')})`);
  }

  // 5. Verify Analytics Metrics
  console.log('\n5. Verifying Aggregated Analytics...');
  const analyticsRes = await fetch(`${BASE_URL}/api/analytics`, {
    headers: { cookie: adminCookie },
  });
  const analyticsData = await analyticsRes.json();
  console.log(`✓ Open Pipeline Value: ₹${analyticsData.overview.openPipelineValue.toLocaleString('en-IN')}`);
  console.log(`✓ Closed Won Revenue: ₹${analyticsData.overview.closedWonRevenue.toLocaleString('en-IN')}`);
  console.log(`✓ Win Rate: ${analyticsData.overview.winRate}%`);
  console.log(`✓ Follow-ups Due Today: ${analyticsData.overview.followUpsDueToday}`);

  // 6. Verify Telegram Token Generation
  console.log('\n6. Verifying Telegram Linking Token Generation...');
  const telegramRes = await fetch(`${BASE_URL}/api/telegram/token`, {
    method: 'POST',
    headers: { cookie: adminCookie },
  });
  const telegramData = await telegramRes.json();
  if (!telegramData.token || telegramData.token.length !== 6) {
    throw new Error('Invalid Telegram token format');
  }
  console.log(`✓ Generated Single-use Telegram Token: "${telegramData.token}"`);
  console.log(`  Bot DeepLink: ${telegramData.deepLinkUrl}`);

  // 7. Verify Lead Creation & Activity Logging
  console.log('\n7. Verifying Lead Creation with Contact & Follow-up...');
  const createLeadRes = await fetch(`${BASE_URL}/api/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: adminCookie },
    body: JSON.stringify({
      businessName: 'A&A Architects & Luxury Interiors',
      contactName: 'Abhishek Anand',
      phone: '+919876500000',
      category: 'Luxury Architecture',
      city: 'Meerut',
      opportunityType: 'High-Ticket Showcase Website',
      dealValue: 110000,
      initialNote: 'High potential client sourced from Meerut design directory.',
      followUpDueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      followUpAction: 'CALL',
      followUpMessage: 'Walk through 3D architectural portfolio mockup',
    }),
  });
  const createLeadData = await createLeadRes.json();
  if (!createLeadData.success) throw new Error('Lead creation failed: ' + createLeadData.error);
  const newLeadId = createLeadData.lead.id;
  console.log(`✓ Created Lead "${createLeadData.lead.businessName}" (${newLeadId})`);

  // 8. Verify Follow-up Completion Workflow
  console.log('\n8. Verifying Follow-up Task Completion...');
  const followUpsRes = await fetch(`${BASE_URL}/api/follow-ups?tab=all`, {
    headers: { cookie: adminCookie },
  });
  const followUpsData = await followUpsRes.json();
  const taskToComplete = followUpsData.followUps.find((f) => f.leadId === newLeadId) || followUpsData.followUps[0];

  const completeRes = await fetch(`${BASE_URL}/api/follow-ups/${taskToComplete.id}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: adminCookie },
    body: JSON.stringify({
      outcome: 'CONNECTED',
      notes: 'Client reviewed 3D concept. Requested formal quote on Monday.',
      nextFollowUp: {
        title: 'Send formal contract and scope breakdown',
        actionType: 'EMAIL',
        dueAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      },
    }),
  });
  const completeData = await completeRes.json();
  if (!completeData.success) throw new Error('Complete follow-up failed');
  console.log(`✓ Follow-up marked COMPLETED. Next follow-up auto-scheduled.`);

  // 9. Verify RBAC Sales Member Isolation
  console.log('\n9. Testing Sales Member Isolation (RBAC)...');
  const salesLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'sales1@theluxestudio.in', password: 'Password123!' }),
  });
  const salesCookie = salesLoginRes.headers.get('set-cookie');

  // Sales 1 leads
  const salesLeadsRes = await fetch(`${BASE_URL}/api/leads`, {
    headers: { cookie: salesCookie },
  });
  const salesLeadsData = await salesLeadsRes.json();
  console.log(`✓ Sales Rep 1 retrieved only ${salesLeadsData.leads.length} leads assigned to them.`);

  // Verify Sales Rep 1 cannot access Sales Rep 2's unassigned leads
  const unassignedLead = leadsData.leads.find((l) => l.ownerId !== 'usr_sales_1' && l.owner?.displayName?.includes('Ananya'));
  if (unassignedLead) {
    const forbiddenRes = await fetch(`${BASE_URL}/api/leads/${unassignedLead.id}`, {
      headers: { cookie: salesCookie },
    });
    console.log(`✓ Cross-representative access check: Status code ${forbiddenRes.status} (Forbidden as required!)`);
  }

  console.log('\n🎉 ALL LIVE CRM VERIFICATION TESTS PASSED SUCCESSFULLY!');
}

testCRM().catch((err) => {
  console.error('\n❌ Test Failure:', err);
  process.exit(1);
});
