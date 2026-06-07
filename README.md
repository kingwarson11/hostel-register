# Hostel Visitor Register (Supabase edition)

A digital sign-in/sign-out system for hostel visitors.
- Visitor scans QR code → fills in form → data goes **straight to Supabase**
- Coordinator opens the dashboard → sees every entry live, refreshing every 30 seconds
- No Google Apps Script needed — works directly from the browser

---

## How the data flows

```
Visitor scans QR code
        ↓
Opens the app on their phone
        ↓
Fills in: name, phone, resident name, room
        ↓
Taps Sign In / Sign Out
        ↓
Data goes straight to Supabase ← Coordinator sees this live
```

---

## Files

```
hostel-register/
├── index.html      ← The whole app (visitor form + coordinator dashboard)
├── style.css       ← Styling
├── app.js          ← App logic
├── sheets.js       ← Supabase sync (read + write)
├── config.js       ← ⚙️  YOUR SETTINGS (fill this in)
└── vercel.json     ← Vercel deployment config
```

---

## Setup — step by step

### 1. Create a free Supabase project

1. Go to [supabase.com](https://supabase.com) → **Start for free**
2. Sign up (GitHub login works great)
3. Click **New project**
4. Give it a name (e.g. "hostel-register"), set a password, choose a region close to you
5. Wait ~1 minute for it to spin up

---

### 2. Create the database table

1. In your Supabase project, click **SQL Editor** (left sidebar)
2. Click **New query**
3. Paste this SQL and click **Run**:

```sql
create table visitors (
  id            text primary key,
  date          text,
  visitor_name  text,
  visitor_phone text,
  resident_name text,
  resident_phone text,
  room          text,
  time_in       text,
  time_out      text default '',
  status        text default 'in',
  created_at    timestamptz default now()
);

-- Allow the app to read and write without login
alter table visitors enable row level security;

create policy "Allow all" on visitors
  for all using (true) with check (true);
```

---

### 3. Get your API keys

1. In Supabase → **Settings** (gear icon) → **API**
2. Copy:
   - **Project URL** (looks like `https://xxxx.supabase.co`)
   - **anon / public** key (long string starting with `eyJ...`)

---

### 4. Fill in config.js

Open `config.js` and paste your values:

```js
const SUPABASE_URL      = "https://xxxx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6...";
const HOSTEL_NAME       = "Your Hostel Name";
const COORDINATOR_PIN   = "1234";
```

---

### 5. Deploy to Vercel

```bash
vercel --prod
```

Your site is live at: `https://hostel-register.vercel.app`

---

### 6. Create the QR code (Canva)

1. Go to [canva.com](https://canva.com) → New design → Custom size (148×148mm)
2. Elements → search **QR code**
3. Paste your Vercel URL: `https://hostel-register.vercel.app`
4. Add text: **"Scan to sign in / out"**
5. Download as PDF Print → print → laminate → stick at entrance

---

### 7. View your data

- In Supabase → **Table Editor** → click **visitors**
- You'll see every sign-in/sign-out entry in real time
- You can filter, sort, and export to CSV directly from there

---

## What the coordinator sees

| Feature | How it works |
|---------|-------------|
| Live visitor list | Fetches from Supabase every 30 seconds |
| Manual refresh | Tap the refresh button (↻) any time |
| Sign out a visitor | Tap "Sign out" on any active entry |
| Stats | Inside now / Left today / Total today |
| Filter | All / Still inside / Signed out |
| Export | Download full log as CSV |

---

## Troubleshooting

**"Cannot reach Supabase" banner?**
→ Double-check your `SUPABASE_URL` and `SUPABASE_ANON_KEY` in config.js
→ Make sure the Row Level Security policy was created (step 2 SQL)

**Entries not appearing in dashboard?**
→ Click the ↻ refresh button manually
→ Check Supabase → Table Editor → visitors to confirm data arrived

**QR code opens wrong page?**
→ Make sure the QR code URL matches your exact Vercel URL
# hostel-register
