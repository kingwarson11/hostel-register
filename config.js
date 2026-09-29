// ============================================================
//  HOSTEL REGISTER — Configuration
//  Fill in GOOGLE_CLIENT_ID, FIREBASE_CONFIG, SHEET_WEBAPP_URL
//  and SHEET_URL after following the README setup steps.
// ============================================================
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";


const GOOGLE_CLIENT_ID = "913153666464-mlmcpbh50v225ioemrkfpcfa7h7ib92b.apps.googleusercontent.com";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDV4NitiX5jlRblymjkmg3i1iiIXFQSb2I",
  authDomain: "hostel-register-77a28.firebaseapp.com",
  databaseURL: "https://hostel-register-77a28-default-rtdb.firebaseio.com",
  projectId: "hostel-register-77a28",
  storageBucket: "hostel-register-77a28.firebasestorage.app",
  messagingSenderId: "575123455194",
  appId: "1:575123455194:web:3e0bb391df54090437b9e3",
  measurementId: "G-TS1Q533JL5"
};

const SHEET_WEBAPP_URL = "YOUR_GOOGLE_APPS_SCRIPT_URL_HERE";
const SHEET_URL        = "YOUR_GOOGLE_SHEET_URL_HERE";
const HOSTEL_NAME      = "Academic City Hostel";

// ── Admin emails ─────────────────────────────────────────────
// Accounts that see the coordinator dashboard when they log in
const ADMIN_EMAILS = [
  "warren.admin@acity.edu.gh",   // Warren's test admin account
  // Add real admin emails here:
  "esonwarr@gmail.com"
  "esonuwarren11@gmail.com"
  // "coordinator@acity.edu.gh",
];

// ── Developer / test mode ────────────────────────────────────
// When true, a "Use test account" button appears on the login
// screen so you can bypass Google login for testing.
// Set to false before going live.
const DEV_MODE = true;
