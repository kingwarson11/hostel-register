# Hostel Visitor Register

A digital replacement for the paper sign-in book. Visitors scan a QR code at the entrance, fill in their details, and sign in or out. The coordinator dashboard updates in real time, and every entry is saved automatically to Google Sheets.

---

## Files in this project

```
hostel-register/
├── index.html            ← Main page (visitor form + coordinator dashboard)
├── style.css             ← All styling
├── app.js                ← App logic (sign in/out, stats, CSV export)
├── sheets.js             ← Google Sheets sync
├── config.js             ← ⚙️  YOUR SETTINGS GO HERE
└── google-apps-script.js ← Paste this into Google Apps Script
```

---

## STEP 1 — Deploy to GitHub Pages

1. Go to [github.com](https://github.com) and create a **new repository** (e.g. `hostel-register`). Set it to **Public**.
2. Upload all files in this folder to the repository.
3. Go to **Settings → Pages**.
4. Under **Source**, select **Deploy from a branch** → choose `main` → folder `/root (/)` → click **Save**.
5. After ~60 seconds your site will be live at:
   ```
   https://YOUR-USERNAME.github.io/hostel-register/
   ```
   **Copy this URL** — you will need it for the QR code.

---

## STEP 2 — Set up Google Sheets

### 2a. Create the spreadsheet
1. Go to [sheets.google.com](https://sheets.google.com) and create a new spreadsheet.
2. Name it **Hostel Register**.
3. Copy the URL from your browser — it looks like:
   ```
   https://docs.google.com/spreadsheets/d/XXXXXXXXXX/edit
   ```

### 2b. Create the Apps Script
1. In your spreadsheet, click **Extensions → Apps Script**.
2. Delete all the default code in the editor.
3. Open the file `google-apps-script.js` from this project, copy everything, and paste it in.
4. Click **Save** (💾 icon).
5. Click **Deploy → New deployment**.
6. Click the gear icon ⚙️ next to "Select type" and choose **Web app**.
7. Fill in:
   - **Description:** Hostel Register
   - **Execute as:** Me
   - **Who has access:** Anyone
8. Click **Deploy**.
9. Click **Authorize access** and follow the prompts.
10. Copy the **Web app URL** — it looks like:
    ```
    https://script.google.com/macros/s/XXXXXXXXXX/exec
    ```

---

## STEP 3 — Connect everything in config.js

Open `config.js` and replace the placeholder values:

```js
const SHEET_WEBAPP_URL = "https://script.google.com/macros/s/XXXXXXXXXX/exec";
const SHEET_URL        = "https://docs.google.com/spreadsheets/d/XXXXXXXXXX/edit";
const HOSTEL_NAME      = "Your Hostel Name";  // shown in the header
```

Then **push the updated config.js to GitHub**. The site will automatically update.

---

## STEP 4 — Generate the QR code (using Canva)

1. Go to [canva.com](https://www.canva.com) and sign in (free account works).
2. Click **Create a design → Custom size** → e.g. **148 × 148 mm** (A5) or **210 × 297 mm** (A4).
3. In the left panel search for **QR code** and click the QR Code element.
4. Paste your GitHub Pages URL:
   ```
   https://YOUR-USERNAME.github.io/hostel-register/
   ```
5. Customise the colours to match your hostel branding.
6. Add a text label like **"Scan to sign in / out"**.
7. Download as **PDF Print** or **PNG (high quality)**.
8. Print it out and laminate it — stick it at the hostel entrance.

---

## How it works day-to-day

| Who | What they do |
|-----|-------------|
| **Visitor arriving** | Scans QR code → fills in name, phone, resident name & room → taps **Sign In** |
| **Visitor leaving** | Scans QR code again → fills in same details → taps **Sign Out** |
| **Coordinator** | Opens the site → taps **Coordinator** tab → sees live dashboard. Can also open Google Sheet directly for full history. |

---

## Features

- ✅ Sign in and sign out with timestamps
- ✅ Saves to Google Sheets automatically
- ✅ Works on phone, tablet, and desktop
- ✅ Coordinator can sign out visitors directly from the dashboard
- ✅ Filter by "still inside" or "signed out"
- ✅ Export full log as CSV
- ✅ Data also saved locally in the browser (works if internet is slow)

---

## Troubleshooting

**Entries not appearing in Google Sheets?**
- Make sure you deployed the Apps Script as "Anyone can access".
- Check that the URL in `config.js` matches exactly what Google gave you.
- Re-deploy the Apps Script (Deploy → Manage deployments → edit → save new version).

**Site not loading after GitHub Pages setup?**
- Wait 2–3 minutes after enabling Pages.
- Make sure the repository is **Public**, not Private.

**QR code not working?**
- Test the GitHub Pages URL in your browser first.
- Re-generate the QR code if you changed the URL.
# hostel-register
