# ANG Exit Questionnaire — Setup Guide

## What you're deploying

| File | Purpose |
|---|---|
| `ang_exit_questionnaire.html` | Mobile-first web form (what separatees see) |
| `Code.gs` | Google Apps Script backend (receives submissions, writes to Sheet) |

---

## Step 1 — Create the Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com) and create a **new blank spreadsheet**.
2. Name it: **ANG Exit Questionnaire**
3. Copy the **Spreadsheet ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/  <<<THIS PART>>>  /edit
   ```

---

## Step 2 — Set Up Google Apps Script

1. In your new Google Sheet, click **Extensions → Apps Script**.
2. Delete all default code in `Code.gs`.
3. Paste the entire contents of `Code.gs` from this package.
4. On **line 8**, replace the placeholder:
   ```javascript
   const SPREADSHEET_ID = 'YOUR_GOOGLE_SHEET_ID_HERE';
   ```
   with your actual Spreadsheet ID from Step 1.
5. Click **Save** (Ctrl+S / Cmd+S).

---

## Step 3 — Initialize the Sheet Structure

1. In the Apps Script editor, select the function `initializeSheets` from the function dropdown.
2. Click **Run**.
3. Grant the requested permissions (you'll need to authorize your Google Account).
4. You should see an alert: **"✅ ANG Questionnaire sheets initialized successfully!"**

This creates three tabs in your sheet:
- **Responses** — every form submission, timestamped
- **Recruiter Leads** — color-coded priority view with dropdown pipeline status
- **Dashboard** — auto-updating summary statistics

---

## Step 4 — Deploy as a Web App

1. In the Apps Script editor, click **Deploy → New Deployment**.
2. Click the gear icon next to "Type" and select **Web App**.
3. Configure:
   - **Description:** ANG Exit Questionnaire v1
   - **Execute as:** Me (your Google account)
   - **Who has access:** Anyone *(or "Anyone with Google Account" if you want auth)*
4. Click **Deploy**.
5. **Copy the Web App URL** — it looks like:
   ```
   https://script.google.com/macros/s/AKfycb.../exec
   ```

---

## Step 5 — Connect the Frontend

1. Open `ang_exit_questionnaire.html` in a text editor.
2. Find line ~14:
   ```javascript
   const SCRIPT_URL = 'YOUR_APPS_SCRIPT_WEB_APP_URL_HERE';
   ```
3. Replace with your Web App URL from Step 4.
4. Save the file.

---

## Step 6 — Host the Frontend

Choose one hosting option:

### Option A — Google Drive (simplest)
1. Upload `ang_exit_questionnaire.html` to Google Drive.
2. Right-click → **Share** → set to "Anyone with the link."
3. Use the shareable link (note: Google Drive preview isn't ideal for forms — see Option B).

### Option B — GitHub Pages (recommended, free)
1. Create a free GitHub account at [github.com](https://github.com).
2. Create a new repository named `ang-questionnaire`.
3. Upload `ang_exit_questionnaire.html` as `index.html`.
4. Go to **Settings → Pages → Source: main branch**.
5. Your form is live at: `https://yourusername.github.io/ang-questionnaire/`

### Option C — Netlify Drop (easiest)
1. Go to [netlify.com/drop](https://app.netlify.com/drop).
2. Drag and drop `ang_exit_questionnaire.html`.
3. Netlify gives you a free URL instantly. You can set a custom subdomain like `ang-exit.netlify.app`.

### Option D — Serve from within Apps Script (all-in-one)
- You can serve the HTML directly from Apps Script by adding an `index.html` file and returning it from `doGet()`. See Google's [HtmlService documentation](https://developers.google.com/apps-script/guides/html).

---

## Google Sheet Schema

### Tab 1: Responses

| Col | Field | Type | Notes |
|---|---|---|---|
| A | Timestamp | DateTime | Auto-generated |
| B | Rank | Text | E.g. SSgt |
| C | Full Name | Text | Last, First MI |
| D | Email | Email | Personal (non .mil) |
| E | Cell Phone | Text | |
| F | AFSC | Text | E.g. 3D0X2 |
| G | Separation Date | Date | |
| H | Terminal Leave Date | Date | Optional |
| I | Base Assigned | Text | |
| J | Post-Sep Location | Text | City, State |
| K | Civilian Job? | Text | Yes/No/Pending |
| L | Civilian Job Description | Text | Conditional |
| M | School Plans | Text | |
| N | Insurance Researched? | Text | |
| O | AF Positives | Text | Comma-separated |
| P | Other Positives | Text | Free text |
| Q | AF Negatives | Text | Comma-separated |
| R | Negatives Explanation | Text | Free text |
| S | Separation Reason | Text | |
| T | Separation Details | Text | Free text |
| U | Fitness Test Date | Date | |
| V | Fitness Score | Number | 0–100 |
| W | Fitness Rating | Text | Excellent/Sat/Unsat |
| X | Fitness Exemptions | Text | |
| Y | Medical Profile? | Text | Yes/No |
| Z | Medical Profile Details | Text | Conditional |
| AA | Control Roster/UIF? | Text | Yes/No |
| AB | CR/UIF Details | Text | Conditional |
| AC | Joining Other Service? | Text | Yes/No/Considering |
| AD | Other Service Branch | Text | Conditional |
| AE | ANG Interest | Text | Very/Somewhat/Not |
| AF | Preferred ANG State | Text | |
| AG | Desired ANG Unit | Text | |
| AH | Best Contact Time | Text | Comma-separated |
| AI | Benefits Briefing? | Text | |
| AJ | Full-Time Info? | Text | |
| AK | Additional Comments | Text | Free text |
| AL | Lead Score | Number | 0–75 |
| AM | Priority | Text | 🔴/🟡/🟢 |
| AN | Score Breakdown | Text | Explanation |
| AO | Recruiter Status | Dropdown | See pipeline below |
| AP | Recruiter Notes | Text | Manual entry |

### Tab 2: Recruiter Leads

Color-coded rows (red/yellow/green by priority). Contains key fields for quick recruiter review plus:

- **Recruiter Status** dropdown (validated):
  - New Lead
  - Contacted
  - Appointment Scheduled
  - Qualified
  - Not Interested
  - Joined ANG
- **Recruiter Notes** (free text)
- **Follow-up Date** (manual)

### Tab 3: Dashboard

Auto-refreshes on every submission. Includes:
- Total submissions
- Priority breakdown (High/Medium/Low)
- ANG interest levels
- Separation reason distribution
- Top post-separation locations
- Most common positive AF experiences
- Most common negative AF experiences
- Joining another service breakdown
- Recruiter pipeline status counts

---

## Lead Scoring Logic

| Condition | Points |
|---|---|
| ANG Interest = Very Interested | +25 |
| Not joining another service | +15 |
| No UIF/Control Roster | +10 |
| No Medical Profile | +10 |
| Has prior service AFSC | +10 |
| Requested benefits briefing | +5 |
| Interested in full-time ANG | +5 |
| **Maximum possible** | **80** |

| Score | Priority |
|---|---|
| 55+ | 🔴 High Priority |
| 30–54 | 🟡 Medium Priority |
| 0–29 | 🟢 Low Priority |

---

## Privacy & PII Notes

- **No SSN is collected** at any point.
- Email and phone are collected on personal (non-.mil) accounts for post-separation contact.
- Data is stored in your Google Sheet, accessible only to people with Sheet access.
- Consider restricting Sheet access to the recruiter and their chain of command.
- If distributing the form on a government network, confirm compliance with your unit's data handling policies.

---

## Troubleshooting

| Issue | Fix |
|---|---|
| Form submits but data doesn't appear | Check `SPREADSHEET_ID` in Code.gs; re-run `initializeSheets()` |
| CORS error in browser console | Re-deploy the Apps Script (Deploy → Manage Deployments → New version) |
| "You do not have permission" error | Make sure Web App is set to "Execute as: Me" and "Anyone" has access |
| Recruiter Status dropdown missing | Run `initializeSheets()` again |
| Dashboard not updating | Each submission triggers a refresh; manually run `refreshDashboard()` if needed |

---

## Recruiter Contact (Default)

**TSgt Richard Huerta**  
Air National Guard In-Service Recruiter  
📞 (575) 572-1406  
✉️ richard.huerta.7@us.af.mil

*Update the contact block in `ang_exit_questionnaire.html` (bottom of the file) to change the displayed recruiter info.*
