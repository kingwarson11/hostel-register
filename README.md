# Academic City Hostel Register

Sign-in/out system using ACity Google accounts. Data saves to Firebase (real-time) + Google Sheets (permanent record).

---

## How it works

- Students log in with **@acity.edu.gh** Google account
- Their name auto-fills — they search for the resident they're visiting
- Sign In / Sign Out → **goes straight to Firebase + Google Sheets**
- Admins log in with their **@acity.edu.gh** email (listed in config.js) → see live dashboard with instant pop-up notifications

---

## Setup (do this once)

### 1. Google Cloud — OAuth Client ID
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (or use existing)
3. **APIs & Services → OAuth consent screen**
   - User type: External
   - App name: Hostel Register
   - Authorized domains: add your Vercel domain e.g. `hostel-register.vercel.app`
4. **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
   - Application type: Web application
   - Authorized JavaScript origins: `https://hostel-register.vercel.app`
5. Copy the **Client ID** → paste into `config.js` as `GOOGLE_CLIENT_ID`

### 2. Firebase
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create a new project → disable Google Analytics (optional)
3. **Build → Realtime Database → Create database**
   - Start in **test mode** (you can add rules later)
4. **Project Settings (gear icon) → Your apps → Web app (</>)**
   - Register app, copy the `firebaseConfig` object
   - Paste into `config.js` as `FIREBASE_CONFIG`
5. **Add residents to Firebase:**
   - In Realtime Database, add a `residents` node manually or use the seeding script below
   ```json
   {
     "residents": {
       "student1": { "name": "Efua Asante",  "email": "efua.asante@acity.edu.gh",  "room": "A25" },
       "student2": { "name": "Kofi Mensah",  "email": "kofi.mensah@acity.edu.gh",  "room": "B14" }
     }
   }
   ```

### 3. Google Sheets (permanent record)
1. Create a Google Sheet named **Hostel Register**
2. **Extensions → Apps Script** → delete default code → paste `google-apps-script.js`
3. **Deploy → New deployment → Web app**
   - Execute as: Me | Who has access: Anyone
4. Copy the Web App URL + Sheet URL → paste into `config.js`

### 4. config.js — fill everything in
```js
const GOOGLE_CLIENT_ID  = "XXXX.apps.googleusercontent.com";
const FIREBASE_CONFIG   = { apiKey: "...", ... };
const SHEET_WEBAPP_URL  = "https://script.google.com/macros/s/XXXX/exec";
const SHEET_URL         = "https://docs.google.com/spreadsheets/d/XXXX/edit";
const HOSTEL_NAME       = "Academic City Hostel";
const ADMIN_EMAILS      = ["yourname@acity.edu.gh"];
```

### 5. Deploy on Vercel
```bash
vercel --prod
```

### 6. QR Code (Canva)
1. Go to canva.com → New design → A5
2. Elements → search "QR code"
3. Paste your Vercel URL: `https://hostel-register.vercel.app`
4. Add "Scan to sign in / out" → print → laminate → stick at entrance

---

## Every future update
```bash
git add . && git commit -m "update" && git push
```
Vercel redeploys automatically.

---

## Firebase Security Rules (add after testing)
```json
{
  "rules": {
    "residents": { ".read": "auth != null", ".write": false },
    "entries":   { ".read": "auth != null", ".write": "auth != null" }
  }
}
```
