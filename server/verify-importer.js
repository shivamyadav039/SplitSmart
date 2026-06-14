import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runVerification() {
  console.log('=== CSV Importer Verification Script (Native Fetch) ===');
  
  try {
    const serverUrl = 'http://localhost:5001/api';
    
    // 1. Login as Aisha to get an auth token
    console.log('Logging in as Aisha...');
    const authRes = await fetch(`${serverUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'aisha@demo.com',
        password: 'demo123'
      })
    });
    
    if (!authRes.ok) {
      throw new Error(`Login failed with status ${authRes.status}`);
    }
    
    const authData = await authRes.json();
    const token = authData.token;
    console.log(`Logged in successfully! Token: ${token.substring(0, 15)}...`);
    
    const headers = {
      Authorization: `Bearer ${token}`
    };
    
    // Fetch active groups
    const groupsRes = await fetch(`${serverUrl}/groups`, { headers });
    const groupsData = await groupsRes.json();
    const groups = groupsData.groups;
    if (groups.length === 0) {
      throw new Error('No groups found. Please run seed script first.');
    }
    const groupId = groups[0].id;
    console.log(`Targeting group: ${groups[0].name} (ID: ${groupId})`);
    
    // Fetch members to get IDs
    const membersRes = await fetch(`${serverUrl}/groups/${groupId}/members`, { headers });
    const membersData = await membersRes.json();
    const members = membersData.members;
    console.log('\nGroup Members:');
    members.forEach(m => console.log(`- ${m.name}: ${m.user_id} (${m.joined_at} to ${m.left_at || 'Present'})`));
    
    const aisha = members.find(m => m.name === 'Aisha');
    const rohan = members.find(m => m.name === 'Rohan');
    const priya = members.find(m => m.name === 'Priya');
    const dev = members.find(m => m.name === 'Dev');
    const sam = members.find(m => m.name === 'Sam');
    const meera = members.find(m => m.name === 'Meera');
    
    // 2. Read CSV File and Prepare Multipart Form Data using standard FormData
    const csvPath = path.join(__dirname, '../expenses_export.csv');
    const csvContent = fs.readFileSync(csvPath);
    
    // Create Blob and Form Data
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const formData = new FormData();
    formData.append('groupId', groupId);
    formData.append('file', blob, 'expenses_export.csv');
    
    console.log('\nUploading CSV file to /api/import/parse...');
    const parseRes = await fetch(`${serverUrl}/import/parse`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });
    
    if (!parseRes.ok) {
      const errText = await parseRes.text();
      throw new Error(`Parse request failed: ${parseRes.status} - ${errText}`);
    }
    
    const parseData = await parseRes.json();
    const { importSessionId, anomalies } = parseData;
    console.log(`Upload parsed successfully! Session ID: ${importSessionId}`);
    console.log(`Detected ${anomalies.length} rows with anomalies needing manual resolution.`);
    
    // 3. Map resolutions for each row anomaly
    const resolutions = [];
    
    anomalies.forEach(row => {
      const rowNum = row.rowNumber;
      const mainAnomaly = row.anomalies[0].type;
      
      console.log(`\nRow ${rowNum}: "${row.description}"`);
      row.anomalies.forEach(a => console.log(`  - [${a.severity.toUpperCase()}] ${a.type}: ${a.description}`));
      
      // Let's decide resolution based on row number or anomaly type
      if (mainAnomaly === 'duplicate') {
        // Row 6 (dinner - marina bites): skip
        console.log(`  => Resolution: SKIP this duplicate row`);
        resolutions.push({
          rowNumber: rowNum,
          issueType: 'duplicate',
          action: 'skip'
        });
      } else if (mainAnomaly === 'alternate_name') {
        // Row 11 (Groceries DMart by Priya S): map to Priya
        console.log(`  => Resolution: Map Priya S to Priya`);
        resolutions.push({
          rowNumber: rowNum,
          issueType: 'alternate_name',
          action: 'map_member',
          targetUserId: priya.user_id
        });
      } else if (mainAnomaly === 'missing_payer') {
        // Row 13 (House cleaning supplies - missing paid_by): assign to Rohan
        console.log(`  => Resolution: Assign payer to Rohan`);
        resolutions.push({
          rowNumber: rowNum,
          issueType: 'missing_payer',
          action: 'assign_payer',
          selectedUserId: rohan.user_id
        });
      } else if (mainAnomaly === 'settlement_entry') {
        // Row 14 (Rohan paid Aisha back): import as payment settlement
        console.log(`  => Resolution: Import as Settlement Payment`);
        resolutions.push({
          rowNumber: rowNum,
          issueType: 'settlement_entry',
          action: 'import_as_settlement'
        });
      } else if (mainAnomaly === 'invalid_percentage') {
        // Row 15 (Pizza Friday percentage sums to 110%): normalize to 100%
        console.log(`  => Resolution: Normalize percentages to 100%`);
        resolutions.push({
          rowNumber: rowNum,
          issueType: 'invalid_percentage',
          action: 'normalize_percentages'
        });
      } else if (mainAnomaly === 'non_group_member') {
        // Row 23 (Parasailing - has Kabir): add Kabir to group
        console.log(`  => Resolution: Create temporary group member 'Kabir'`);
        resolutions.push({
          rowNumber: rowNum,
          issueType: 'non_group_member',
          action: 'add_member',
          memberName: 'Kabir'
        });
      } else if (mainAnomaly === 'conflicting_duplicate') {
        // Row 25 (Thalassa dinner by Rohan): keep original in DB (Aisha's row wins)
        console.log(`  => Resolution: Keep original DB row (skip this one)`);
        resolutions.push({
          rowNumber: rowNum,
          issueType: 'conflicting_duplicate',
          action: 'keep_original'
        });
      } else if (mainAnomaly === 'zero_amount') {
        // Row 31 (Swiggy order 0 INR): skip
        console.log(`  => Resolution: Skip zero amount row`);
        resolutions.push({
          rowNumber: rowNum,
          issueType: 'zero_amount',
          action: 'skip'
        });
      } else if (mainAnomaly === 'ambiguous_date') {
        // Row 34 (Deep cleaning - 04-05-2026): select correct date '2026-05-04'
        console.log(`  => Resolution: Select May 4th, 2026`);
        resolutions.push({
          rowNumber: rowNum,
          issueType: 'ambiguous_date',
          action: 'select_date',
          selectedDate: '2026-05-04'
        });
      } else if (mainAnomaly === 'inactive_member') {
        // Row 36 (Groceries BigBasket - Meera in split after leaving): exclude Meera
        console.log(`  => Resolution: Exclude inactive member Meera`);
        resolutions.push({
          rowNumber: rowNum,
          issueType: 'inactive_member',
          action: 'exclude_member',
          memberId: meera.user_id
        });
      } else {
        // Default action
        console.log(`  => Resolution: Default Action`);
        resolutions.push({
          rowNumber: rowNum,
          issueType: mainAnomaly,
          action: 'auto_fix'
        });
      }
    });
    
    // 4. Submit resolutions to /api/import/confirm
    console.log('\nSubmitting resolutions to /api/import/confirm...');
    const confirmRes = await fetch(`${serverUrl}/import/confirm`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        importSessionId,
        resolutions
      })
    });
    
    if (!confirmRes.ok) {
      const errText = await confirmRes.text();
      throw new Error(`Confirm resolutions failed: ${confirmRes.status} - ${errText}`);
    }
    
    const confirmData = await confirmRes.json();
    
    console.log('\n=== IMPORT SUMMARY REPORT ===');
    console.log(`Success: ${confirmData.success}`);
    console.log(`Imported Rows: ${confirmData.imported_count}`);
    console.log(`Skipped Rows: ${confirmData.skipped_count}`);
    console.log('\nImport logs / actions applied:');
    confirmData.report.logs.forEach(log => console.log(`- ${log}`));
    
    // 5. Query updated group balances
    console.log('\nFetching updated balances...');
    const balancesRes = await fetch(`${serverUrl}/groups/${groupId}/balances`, { headers });
    const balancesData = await balancesRes.json();
    
    console.log('\nSimplified debts (Who owes whom):');
    balancesData.debts.forEach(d => {
      console.log(`- ${d.debtor_name} owes ${d.creditor_name}: ₹${d.amount}`);
    });
    
    console.log('\nOverall User Net Balances:');
    balancesData.summaries.forEach(s => {
      console.log(`- ${s.name}: ${s.net_balance >= 0 ? '+' : ''}₹${s.net_balance}`);
    });
    
    console.log('\nVerification completed successfully!');
    
  } catch (err) {
    console.error('Verification failed with error:', err.message);
  }
}

runVerification();
