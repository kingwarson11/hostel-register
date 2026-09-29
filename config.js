// ============================================================
//  HOSTEL REGISTER — Configuration
//  Fill in GOOGLE_CLIENT_ID, FIREBASE_CONFIG, SHEET_WEBAPP_URL
//  and SHEET_URL after following the README setup steps.
// ============================================================

const GOOGLE_CLIENT_ID = "913153666464-mlmcpbh50v225ioemrkfpcfa7h7ib92b.apps.googleusercontent.com";

const FIREBASE_CONFIG = {
  apiKey:            "YOUR_FIREBASE_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  databaseURL:       "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID",
};

const SHEET_WEBAPP_URL = "YOUR_GOOGLE_APPS_SCRIPT_URL_HERE";
const SHEET_URL        = "YOUR_GOOGLE_SHEET_URL_HERE";
const HOSTEL_NAME      = "Academic City Hostel";

// ── Admin emails ─────────────────────────────────────────────
// Accounts that see the coordinator dashboard when they log in
const ADMIN_EMAILS = [
  "warren.admin@acity.edu.gh",   // Warren's test admin account
  // Add real admin emails here:
  // "coordinator@acity.edu.gh",
];

// ── Developer / test mode ────────────────────────────────────
// When true, a "Use test account" button appears on the login
// screen so you can bypass Google login for testing.
// Set to false before going live.
const DEV_MODE = true;
