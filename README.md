# 🏨 Hostel Visitor Register

A digital sign-in/sign-out system for hostel visitors — no paper, no hassle.

---

## 🔗 Important Links

| Role | Link |
|------|------|
| 👤 **Visitor Sign In/Out** | `https://your-site.vercel.app` |
| 🛡️ **Coordinator Dashboard** | `https://your-site.vercel.app?coord` |

> ⚠️ Replace `your-site` with your actual Vercel project name.
> The coordinator dashboard is PIN protected.

---

## 📋 How It Works

```
Visitor scans QR code
        ↓
Fills in name, phone, resident & room
        ↓
Taps Sign In / Sign Out
        ↓
Row saved to Google Sheets instantly
        ↓
Coordinator sees it live on dashboard
```

---

## ⚙️ Setup Checklist

- [ ] Create Google Sheet with `visitors` tab and correct headers
- [ ] Paste `google-apps-script.js` into Extensions → Apps Script
- [ ] Deploy as Web App (Execute as: Me, Access: Anyone)
- [ ] Copy Web App URL into `config.js`
- [ ] Set your `HOSTEL_NAME` and `COORDINATOR_PIN` in `config.js`
- [ ] Push to GitHub → Vercel auto-deploys
- [ ] Create QR code on Canva pointing to your Vercel URL
- [ ] Test sign-in → confirm row appears in Google Sheet

---

## 📁 File Structure

```
hostel-register/
├── index.html              ← Visitor form + coordinator dashboard
├── style.css               ← All styling
├── app.js                  ← App logic
├── sheets.js               ← Google Sheets sync
├── config.js               ← ⚙️ Your settings (fill this in!)
├── google-apps-script.js   ← Paste into Google Apps Script
└── vercel.json             ← Vercel deployment config
```

---

## 🗂️ Google Sheet Headers

The sheet tab must be named **`visitors`** with these exact headers in Row 1:

| A | B | C | D | E | F | G | H | I |
|---|---|---|---|---|---|---|---|---|
| id | date | visitor_name | visitor_phone | resident_name | room | time_in | time_out | status |

Status column is colour coded:
- 🟢 **Green** = visitor is inside
- 🔴 **Red** = visitor has signed out

---

## 🛡️ Coordinator Dashboard

Access the dashboard by adding `?coord` to your site URL:

```
https://your-site.vercel.app?coord
```

**Features:**
- 🔒 PIN protected
- 👁️ Live visitor list (refreshes every 30 seconds)
- 📊 Stats — inside now / left today / total today
- 🔍 Filter by status (all / inside / signed out)
- ✍️ Sign out visitors directly from the dashboard
- 📥 Export full log as CSV

---

## 🖨️ QR Code (Canva)

1. Go to [canva.com](https://canva.com) → New design → A4
2. Apps → search **QR Code** → paste your Vercel URL
3. Add text: **"Scan to sign in / out"**
4. Download as **PDF Print** → print → laminate → place at entrance

---

## 🔧 config.js Reference

```js
const APPS_SCRIPT_URL  = "https://script.google.com/macros/s/.../exec";
const HOSTEL_NAME      = "Your Hostel Name";
const COORDINATOR_PIN  = "1234";
```
