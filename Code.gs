// ═══════════════════════════════════════════════════════════════════════════════
//  ANG EXIT QUESTIONNAIRE — Google Apps Script Backend
//  File: Code.gs
//  Deploy as: Web App → Anyone (or Anyone with Google Account)
// ═══════════════════════════════════════════════════════════════════════════════

// ── CONFIGURATION ─────────────────────────────────────────────────────────────
const SPREADSHEET_ID = 'YOUR_GOOGLE_SHEET_ID_HERE'; // ← Replace after creating your sheet
const RESPONSES_SHEET_NAME = 'Responses';
const DASHBOARD_SHEET_NAME = 'Dashboard';
const LEADS_SHEET_NAME = 'Recruiter Leads';

// ── LEAD SCORING ──────────────────────────────────────────────────────────────
function calculateLeadScore(data) {
  let score = 0;
  const reasons = [];

  if (data.angInterest === 'Very Interested') {
    score += 25; reasons.push('+25 Very Interested');
  } else if (data.angInterest === 'Somewhat Interested') {
    score += 10; reasons.push('+10 Somewhat Interested');
  }

  if (data.controlRoster === 'No') {
    score += 10; reasons.push('+10 No UIF/Control Roster');
  }

  if (data.medicalProfile === 'No') {
    score += 10; reasons.push('+10 No Medical Profile');
  }

  if (data.joiningOtherService === 'No') {
    score += 15; reasons.push('+15 Not joining another service');
  }

  // Prior service AFSC check — non-empty AFSC adds value
  if (data.afsc && data.afsc.trim().length >= 4) {
    score += 10; reasons.push('+10 Prior service AFSC');
  }

  // Bonus: wants benefits briefing
  if (data.benefitsBriefing === 'Yes') {
    score += 5; reasons.push('+5 Requested benefits briefing');
  }

  // Bonus: interested in full-time
  if (data.fulltimeInfo === 'Yes') {
    score += 5; reasons.push('+5 Interested in full-time opportunities');
  }

  let priority;
  if (score >= 55)      priority = '🔴 High Priority';
  else if (score >= 30) priority = '🟡 Medium Priority';
  else                  priority = '🟢 Low Priority';

  return { score, priority, reasons: reasons.join(' | ') };
}

// ── CORS HEADERS ──────────────────────────────────────────────────────────────
function setCorsHeaders(output) {
  return output
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// ── OPTIONS (preflight) ───────────────────────────────────────────────────────
function doOptions(e) {
  return setCorsHeaders(ContentService.createTextOutput(''));
}

// ── GET (health check) ────────────────────────────────────────────────────────
function doGet(e) {
  return setCorsHeaders(
    ContentService.createTextOutput(JSON.stringify({ status: 'ANG Questionnaire API online' }))
      .setMimeType(ContentService.MimeType.JSON)
  );
}

// ── POST (form submission) ────────────────────────────────────────────────────
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // 1. Append to Responses sheet
    appendResponse(ss, data);

    // 2. Update Recruiter Leads sheet
    appendLead(ss, data);

    // 3. Refresh Dashboard
    refreshDashboard(ss);

    return setCorsHeaders(
      ContentService.createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON)
    );
  } catch (err) {
    return setCorsHeaders(
      ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message }))
        .setMimeType(ContentService.MimeType.JSON)
    );
  }
}

// ── APPEND RESPONSE ───────────────────────────────────────────────────────────
function appendResponse(ss, data) {
  let sheet = ss.getSheetByName(RESPONSES_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(RESPONSES_SHEET_NAME);
    setupResponsesSheet(sheet);
  }

  const { score, priority, reasons } = calculateLeadScore(data);
  const timestamp = new Date();

  const row = [
    timestamp,
    data.rank || '',
    data.fullName || '',
    data.email || '',
    data.phone || '',
    data.afsc || '',
    data.separationDate || '',
    data.terminalLeaveDate || '',
    data.baseAssigned || '',
    data.postSepLocation || '',
    data.civilianJob || '',
    data.civilianJobDesc || '',
    data.schoolPlans || '',
    data.insuranceResearched || '',
    data.positives || '',
    data.positivesOther || '',
    data.negatives || '',
    data.negativesExplain || '',
    data.separationReason || '',
    data.separationDetails || '',
    data.fitnessDate || '',
    data.fitnessScore || '',
    data.fitnessRating || '',
    data.fitnessExemptions || '',
    data.medicalProfile || '',
    data.medicalProfileExplain || '',
    data.controlRoster || '',
    data.controlRosterExplain || '',
    data.joiningOtherService || '',
    data.otherServiceBranch || '',
    data.angInterest || '',
    data.preferredState || '',
    data.desiredUnit || '',
    data.bestContactTime || '',
    data.benefitsBriefing || '',
    data.fulltimeInfo || '',
    data.additionalComments || '',
    score,
    priority,
    reasons,
    'New Lead',  // Recruiter status (default)
    '',          // Recruiter notes
  ];

  sheet.appendRow(row);
}

// ── SETUP RESPONSES SHEET HEADERS ─────────────────────────────────────────────
function setupResponsesSheet(sheet) {
  const headers = [
    'Timestamp', 'Rank', 'Full Name', 'Email', 'Cell Phone', 'AFSC',
    'Separation Date', 'Terminal Leave Date', 'Base Assigned',
    'Post-Sep Location', 'Civilian Job?', 'Civilian Job Description',
    'School Plans', 'Insurance Researched?',
    'AF Positives', 'Other Positives',
    'AF Negatives', 'Negatives Explanation',
    'Separation Reason', 'Separation Details',
    'Fitness Test Date', 'Fitness Score', 'Fitness Rating', 'Fitness Exemptions',
    'Medical Profile?', 'Medical Profile Details',
    'Control Roster/UIF?', 'CR/UIF Details',
    'Joining Other Service?', 'Other Service Branch',
    'ANG Interest', 'Preferred ANG State', 'Desired ANG Unit',
    'Best Contact Time', 'Benefits Briefing?', 'Full-Time Info?',
    'Additional Comments',
    'Lead Score', 'Priority', 'Score Breakdown',
    'Recruiter Status', 'Recruiter Notes'
  ];

  sheet.appendRow(headers);
  sheet.setFrozenRows(1);

  // Style header row
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground('#1A2744');
  headerRange.setFontColor('#FFFFFF');
  headerRange.setFontWeight('bold');
  headerRange.setFontSize(10);

  // Auto-resize columns
  sheet.setColumnWidth(1, 160);   // Timestamp
  sheet.setColumnWidth(3, 160);   // Full Name
  sheet.setColumnWidth(4, 200);   // Email
  sheet.setColumnWidth(15, 300);  // AF Positives
  sheet.setColumnWidth(17, 300);  // AF Negatives
  sheet.setColumnWidth(37, 300);  // Additional Comments
}

// ── APPEND LEAD ───────────────────────────────────────────────────────────────
function appendLead(ss, data) {
  let sheet = ss.getSheetByName(LEADS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(LEADS_SHEET_NAME);
    setupLeadsSheet(sheet);
  }

  const { score, priority } = calculateLeadScore(data);

  const row = [
    new Date(),
    priority,
    score,
    data.rank || '',
    data.fullName || '',
    data.email || '',
    data.phone || '',
    data.afsc || '',
    data.separationDate || '',
    data.postSepLocation || '',
    data.preferredState || '',
    data.angInterest || '',
    data.benefitsBriefing || '',
    data.fulltimeInfo || '',
    data.joiningOtherService || '',
    data.medicalProfile || '',
    data.controlRoster || '',
    data.bestContactTime || '',
    'New Lead',  // Status
    '',          // Notes
    '',          // Follow-up date
  ];

  const lastRow = sheet.appendRow(row);

  // Color-code by priority
  const rowNum = sheet.getLastRow();
  const rowRange = sheet.getRange(rowNum, 1, 1, row.length);
  if (score >= 55) {
    rowRange.setBackground('#FECACA'); // Red – high priority
  } else if (score >= 30) {
    rowRange.setBackground('#FEF08A'); // Yellow – medium
  } else {
    rowRange.setBackground('#D1FAE5'); // Green – low
  }
}

// ── SETUP LEADS SHEET HEADERS ─────────────────────────────────────────────────
function setupLeadsSheet(sheet) {
  const headers = [
    'Received', 'Priority', 'Lead Score',
    'Rank', 'Full Name', 'Email', 'Cell Phone', 'AFSC',
    'Separation Date', 'Post-Sep Location', 'Preferred ANG State',
    'ANG Interest', 'Benefits Briefing?', 'Full-Time Info?',
    'Joining Other Service?', 'Medical Profile?', 'Control Roster?',
    'Best Contact Time',
    'Recruiter Status', 'Recruiter Notes', 'Follow-up Date'
  ];

  sheet.appendRow(headers);
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(5);

  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground('#1A2744');
  headerRange.setFontColor('#FFFFFF');
  headerRange.setFontWeight('bold');

  // Add data validation for Recruiter Status column (col 19)
  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList([
      'New Lead', 'Contacted', 'Appointment Scheduled',
      'Qualified', 'Not Interested', 'Joined ANG'
    ], true)
    .build();
  sheet.getRange(2, 19, 1000, 1).setDataValidation(statusRule);
}

// ── REFRESH DASHBOARD ─────────────────────────────────────────────────────────
function refreshDashboard(ss) {
  let dash = ss.getSheetByName(DASHBOARD_SHEET_NAME);
  if (!dash) {
    dash = ss.insertSheet(DASHBOARD_SHEET_NAME);
  }
  dash.clearContents();
  dash.clearFormats();

  const respSheet = ss.getSheetByName(RESPONSES_SHEET_NAME);
  if (!respSheet || respSheet.getLastRow() < 2) {
    dash.getRange('A1').setValue('No submissions yet.');
    return;
  }

  const data = respSheet.getRange(2, 1, respSheet.getLastRow() - 1, 40).getValues();

  // ── Header ──
  dash.getRange('A1').setValue('ANG Exit Questionnaire — Recruiter Dashboard');
  dash.getRange('A1').setFontSize(16).setFontWeight('bold').setFontColor('#1A2744');
  dash.getRange('A2').setValue('Auto-refreshed on each submission  |  ' + new Date().toLocaleString());
  dash.getRange('A2').setFontColor('#6B7280').setFontSize(10);

  // ── Summary block ──
  let row = 4;
  const totalSubmissions = data.length;
  const highPriority   = data.filter(r => String(r[38]).includes('High')).length;
  const medPriority    = data.filter(r => String(r[38]).includes('Medium')).length;
  const lowPriority    = data.filter(r => String(r[38]).includes('Low')).length;
  const veryInterested = data.filter(r => r[30] === 'Very Interested').length;
  const notJoining     = data.filter(r => r[28] === 'No').length;
  const noMedical      = data.filter(r => r[24] === 'No').length;
  const noUIF          = data.filter(r => r[26] === 'No').length;

  const summaryData = [
    ['Total Submissions', totalSubmissions],
    ['🔴 High Priority Leads', highPriority],
    ['🟡 Medium Priority Leads', medPriority],
    ['🟢 Low Priority Leads', lowPriority],
    ['Very Interested in ANG', veryInterested],
    ['Not Joining Another Service', notJoining],
    ['No Medical Profile', noMedical],
    ['No UIF/Control Roster', noUIF],
  ];

  dash.getRange(row, 1).setValue('SUMMARY').setFontWeight('bold').setFontColor('#C9A84C').setFontSize(12);
  row++;
  summaryData.forEach(([label, value]) => {
    dash.getRange(row, 1).setValue(label);
    dash.getRange(row, 2).setValue(value).setFontWeight('bold');
    row++;
  });

  // ── ANG Interest breakdown ──
  row += 2;
  dash.getRange(row, 1).setValue('ANG INTEREST').setFontWeight('bold').setFontColor('#C9A84C').setFontSize(12);
  row++;
  const interestCount = countValues(data, 30);
  Object.entries(interestCount).forEach(([k, v]) => {
    dash.getRange(row, 1).setValue(k);
    dash.getRange(row, 2).setValue(v);
    row++;
  });

  // ── Separation Reasons ──
  row += 2;
  dash.getRange(row, 1).setValue('SEPARATION REASONS').setFontWeight('bold').setFontColor('#C9A84C').setFontSize(12);
  row++;
  const sepReasons = countValues(data, 18);
  Object.entries(sepReasons).sort((a,b) => b[1]-a[1]).forEach(([k, v]) => {
    dash.getRange(row, 1).setValue(k);
    dash.getRange(row, 2).setValue(v);
    row++;
  });

  // ── Top Separation Locations ──
  row += 2;
  dash.getRange(row, 1).setValue('TOP POST-SEP LOCATIONS').setFontWeight('bold').setFontColor('#C9A84C').setFontSize(12);
  row++;
  const locations = countValues(data, 9);
  Object.entries(locations).sort((a,b) => b[1]-a[1]).slice(0, 10).forEach(([k, v]) => {
    dash.getRange(row, 1).setValue(k);
    dash.getRange(row, 2).setValue(v);
    row++;
  });

  // ── Top Positives ──
  row += 2;
  dash.getRange(row, 1).setValue('MOST ENJOYED (Positives)').setFontWeight('bold').setFontColor('#C9A84C').setFontSize(12);
  row++;
  const positiveCounts = countMultiSelect(data, 14);
  Object.entries(positiveCounts).sort((a,b) => b[1]-a[1]).slice(0, 10).forEach(([k, v]) => {
    dash.getRange(row, 1).setValue(k);
    dash.getRange(row, 2).setValue(v);
    row++;
  });

  // ── Top Negatives ──
  row += 2;
  dash.getRange(row, 1).setValue('LEAST ENJOYED (Negatives)').setFontWeight('bold').setFontColor('#C9A84C').setFontSize(12);
  row++;
  const negativeCounts = countMultiSelect(data, 16);
  Object.entries(negativeCounts).sort((a,b) => b[1]-a[1]).slice(0, 10).forEach(([k, v]) => {
    dash.getRange(row, 1).setValue(k);
    dash.getRange(row, 2).setValue(v);
    row++;
  });

  // ── Other service branches ──
  row += 2;
  dash.getRange(row, 1).setValue('JOINING ANOTHER SERVICE').setFontWeight('bold').setFontColor('#C9A84C').setFontSize(12);
  row++;
  const joiningCount = countValues(data, 28);
  Object.entries(joiningCount).forEach(([k, v]) => {
    dash.getRange(row, 1).setValue(k);
    dash.getRange(row, 2).setValue(v);
    row++;
  });

  // ── Recruiter Status ──
  row += 2;
  dash.getRange(row, 1).setValue('RECRUITER PIPELINE').setFontWeight('bold').setFontColor('#C9A84C').setFontSize(12);
  row++;
  const statusCount = countValues(data, 40);
  Object.entries(statusCount).forEach(([k, v]) => {
    dash.getRange(row, 1).setValue(k);
    dash.getRange(row, 2).setValue(v);
    row++;
  });

  // Column widths
  dash.setColumnWidth(1, 280);
  dash.setColumnWidth(2, 80);
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function countValues(data, colIndex) {
  const counts = {};
  data.forEach(row => {
    const v = String(row[colIndex] || '').trim();
    if (v) counts[v] = (counts[v] || 0) + 1;
  });
  return counts;
}

function countMultiSelect(data, colIndex) {
  const counts = {};
  data.forEach(row => {
    const cell = String(row[colIndex] || '');
    cell.split(',').map(v => v.trim()).filter(Boolean).forEach(v => {
      counts[v] = (counts[v] || 0) + 1;
    });
  });
  return counts;
}

// ── MANUAL TRIGGER: Initialize Sheet Structure ────────────────────────────────
function initializeSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // Responses
  let respSheet = ss.getSheetByName(RESPONSES_SHEET_NAME);
  if (!respSheet) {
    respSheet = ss.insertSheet(RESPONSES_SHEET_NAME);
    setupResponsesSheet(respSheet);
    Logger.log('Created Responses sheet.');
  }

  // Leads
  let leadsSheet = ss.getSheetByName(LEADS_SHEET_NAME);
  if (!leadsSheet) {
    leadsSheet = ss.insertSheet(LEADS_SHEET_NAME);
    setupLeadsSheet(leadsSheet);
    Logger.log('Created Recruiter Leads sheet.');
  }

  // Dashboard
  refreshDashboard(ss);
  Logger.log('All sheets initialized.');
  SpreadsheetApp.getUi().alert('✅ ANG Questionnaire sheets initialized successfully!');
}
