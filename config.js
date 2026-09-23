// ============================================================
//  HOSTEL REGISTER — Configuration
//  Fill in ALL values below after following the README setup
// ============================================================

// Google OAuth Client ID
// (from Google Cloud Console → APIs & Services → Credentials)
const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";

// Firebase config
// (from Firebase Console → Project Settings → Your apps → SDK setup)
const FIREBASE_CONFIG = {
  apiKey:            "YOUR_FIREBASE_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  databaseURL:       "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID",
};

// Google Apps Script Web App URL
// (for writing to Google Sheets)
const SHEET_WEBAPP_URL = "YOUR_GOOGLE_APPS_SCRIPT_URL_HERE";

// Your Google Sheet URL (for the "Open sheet" link)
const SHEET_URL = "YOUR_GOOGLE_SHEET_URL_HERE";

// Hostel name shown in the header
const HOSTEL_NAME = "Academic City Hostel";

// Admin emails — these accounts see the coordinator dashboard
// Everyone else with @acity.edu.gh sees the visitor form
const ADMIN_EMAILS = [
  "admin@acity.edu.gh",
  // add more admin emails here
];

// PIN to access coordinator dashboard (as a backup if needed)
const COORDINATOR_PIN = "1234";
