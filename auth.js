// auth.js — Role selection, Google OAuth, test accounts

let currentUser  = null;
let selectedRole = null;
let firebaseApp  = null;
let firebaseDB   = null;

// ══════════════════════════════════════════════════════════════
//  TEST ACCOUNTS (Warren's fake accounts for each role)
//  Set DEV_MODE = false in config.js to hide these
// ══════════════════════════════════════════════════════════════
const TEST_ACCOUNTS = {
  admin: {
    name:    "Warren Mensah",
    given:   "Warren",
    email:   "warren.admin@acity.edu.gh",
    picture: null,
    role:    "admin",
    isAdmin: true,
  },
  student: {
    name:    "Warren Mensah",
    given:   "Warren",
    email:   "warren.student@acity.edu.gh",
    picture: null,
    role:    "student",
    isAdmin: false,
  },
  outsider: {
    name:    "Warren Mensah",
    given:   "Warren",
    email:   "warren.test@gmail.com",
    picture: null,
    role:    "outsider",
    isAdmin: false,
  },
};

// Show/hide test account button and update it for the selected role
function updateTestAccountUI(role) {
  const wrap = document.getElementById("test-accounts");
  if (!wrap) return;

  if (typeof DEV_MODE === "undefined" || !DEV_MODE) {
    wrap.style.display = "none";
    return;
  }

  const acct = TEST_ACCOUNTS[role];
  wrap.style.display = "block";

  const avatar = document.getElementById("test-avatar");
  const name   = document.getElementById("test-account-name");
  const email  = document.getElementById("test-account-email");

  avatar.textContent = acct.name[0].toUpperCase();
  avatar.className   = "test-account-avatar test-avatar-" + role;
  name.textContent   = acct.name + " (" + { admin:"Admin", student:"Student", outsider:"Guest" }[role] + ")";
  email.textContent  = acct.email;
}

// Called when tapping the test account button
function loginAsTestAccount() {
  if (typeof DEV_MODE === "undefined" || !DEV_MODE) return;
  currentUser = { ...TEST_ACCOUNTS[selectedRole], token: "test" };
  initFirebase();
  onLoginSuccess();
}

// ══════════════════════════════════════════════════════════════
//  ROLE SELECTION
// ══════════════════════════════════════════════════════════════
function selectRole(role) {
  selectedRole = role;

  document.getElementById("role-screen").classList.add("hidden");
  document.getElementById("login-screen").classList.remove("hidden");
  document.getElementById("login-error").classList.add("hidden");

  const cfg = {
    admin:    { icon:"ti-shield-check", colorClass:"role-icon-admin",    title:"Admin Sign In",   sub:"Sign in with your ACity staff Google account",    domain:"@acity.edu.gh",  badge:"Admin",           badgeCls:"badge-admin"    },
    student:  { icon:"ti-school",       colorClass:"role-icon-student",  title:"Student Sign In", sub:"Sign in with your ACity student Google account",  domain:"@acity.edu.gh",  badge:"Student",         badgeCls:"badge-student"  },
    outsider: { icon:"ti-user",         colorClass:"role-icon-outsider", title:"Guest Sign In",   sub:"Sign in with your personal Gmail account",        domain:"@gmail.com",     badge:"Outsider / Guest", badgeCls:"badge-outsider" },
  }[role];

  // Update UI
  const logoIcon = document.getElementById("login-logo-icon");
  logoIcon.className = "logo-icon large " + cfg.colorClass;
  logoIcon.innerHTML = `<i class="ti ${cfg.icon}"></i>`;

  document.getElementById("login-title").textContent       = cfg.title;
  document.getElementById("login-sub").textContent         = cfg.sub;
  document.getElementById("login-domain-pill").textContent = cfg.domain;

  const badge = document.getElementById("login-role-badge");
  badge.textContent = cfg.badge;
  badge.className   = "role-badge " + cfg.badgeCls;

  // Show the right test account for this role
  updateTestAccountUI(role);
}

function goBackToRoles() {
  selectedRole = null;
  document.getElementById("login-screen").classList.add("hidden");
  document.getElementById("role-screen").classList.remove("hidden");
  document.getElementById("login-error").classList.add("hidden");
}

// ══════════════════════════════════════════════════════════════
//  GOOGLE OAUTH
// ══════════════════════════════════════════════════════════════
let googleSDKReady = false;

window.onGoogleLibraryLoad = function () {
  google.accounts.id.initialize({
    client_id:             GOOGLE_CLIENT_ID,
    callback:              handleGoogleCredential,
    ux_mode:               "popup",
    auto_select:           false,
    cancel_on_tap_outside: true,
  });
  googleSDKReady = true;
};

// Called by the "Continue with Google" button
function triggerGoogleLogin() {
  const btn = document.getElementById("google-signin-btn");

  if (!googleSDKReady) {
    if (btn) btn.textContent = "Loading Google…";
    setTimeout(triggerGoogleLogin, 500);
    return;
  }

  if (btn) btn.textContent = "Opening…";

  // Try One Tap first; fall back to OAuth2 token flow if blocked
  google.accounts.id.prompt((notification) => {
    if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
      // One Tap blocked — use token client popup
      const client = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope:     "openid email profile",
        callback:  (resp) => {
          if (resp.error) {
            if (btn) btn.innerHTML = svgGoogle() + " Continue with Google";
            showLoginError("Sign-in cancelled. Please try again.");
            return;
          }
          fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: { Authorization: "Bearer " + resp.access_token }
          })
          .then(r => r.json())
          .then(u => processGoogleUser(u.email, u.name, u.picture, u.given_name))
          .catch(() => showLoginError("Could not get account info. Try again."));
        },
      });
      client.requestAccessToken({ prompt: "select_account" });
    } else {
      // One Tap is showing — button can revert
      if (btn) btn.innerHTML = svgGoogle() + " Continue with Google";
    }
  });
}

// Called by One Tap credential flow
function handleGoogleCredential(response) {
  try {
    const payload = parseJwt(response.credential);
    processGoogleUser(payload.email, payload.name, payload.picture, payload.given_name);
  } catch(e) {
    showLoginError("Could not read Google account info. Try again.");
  }
}

// Common handler for both flows
function processGoogleUser(email, name, picture, givenName) {
  document.getElementById("login-error").classList.add("hidden");

  // Domain check per role
  if ((selectedRole === "admin" || selectedRole === "student") && !email.endsWith("@acity.edu.gh")) {
    showLoginError("This role requires an @acity.edu.gh account. Go back and choose 'Outsider' if you have a Gmail.");
    resetGoogleBtn();
    return;
  }
  if (selectedRole === "outsider" && email.endsWith("@acity.edu.gh")) {
    showLoginError("ACity accounts should use the Student or Admin role instead.");
    resetGoogleBtn();
    return;
  }

  // Admin check
  const isAdmin = selectedRole === "admin" && ADMIN_EMAILS.includes(email);
  if (selectedRole === "admin" && !isAdmin) {
    showLoginError("Your email is not listed as an admin. Contact the hostel manager.");
    resetGoogleBtn();
    return;
  }

  currentUser = {
    email,
    name,
    picture: picture || null,
    given:   givenName || name.split(" ")[0],
    role:    selectedRole,
    isAdmin,
    token:   "google",
  };

  initFirebase();
  onLoginSuccess();
}

function resetGoogleBtn() {
  const btn = document.getElementById("google-signin-btn");
  if (btn) btn.innerHTML = svgGoogle() + " Continue with Google";
}

function svgGoogle() {
  return `<svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>`;
}

// ══════════════════════════════════════════════════════════════
//  POST-LOGIN
// ══════════════════════════════════════════════════════════════
function onLoginSuccess() {
  document.getElementById("role-screen").classList.add("hidden");
  document.getElementById("login-screen").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");

  // Header name
  document.getElementById("user-name-short").textContent =
    currentUser.given || currentUser.name.split(" ")[0];

  // Header avatar
  const av = document.getElementById("user-avatar");
  if (currentUser.picture) {
    av.style.backgroundImage = `url(${currentUser.picture})`;
    av.style.backgroundSize  = "cover";
    av.textContent = "";
  } else {
    av.style.backgroundImage = "";
    av.textContent = (currentUser.name || "?")[0].toUpperCase();
  }

  // Role chip
  const chip = document.getElementById("user-role-chip");
  chip.textContent = { admin:"Admin", student:"Student", outsider:"Guest" }[currentUser.role];
  chip.className   = "user-role-chip chip-" + currentUser.role;

  // Route
  if (currentUser.isAdmin) {
    document.getElementById("header-sub").textContent = "Admin Dashboard";
    document.getElementById("visitor-app").classList.add("hidden");
    document.getElementById("admin-app").classList.remove("hidden");
    initAdminDashboard();
  } else {
    document.getElementById("header-sub").textContent =
      currentUser.role === "outsider" ? "Guest Register" : "Visitor Register";
    document.getElementById("visitor-app").classList.remove("hidden");
    document.getElementById("admin-app").classList.add("hidden");
    initVisitorForm();
  }
}

// Sign out
function signOut() {
  if (typeof google !== "undefined" && google.accounts) {
    google.accounts.id.disableAutoSelect();
  }
  currentUser  = null;
  selectedRole = null;
  document.getElementById("app").classList.add("hidden");
  document.getElementById("role-screen").classList.remove("hidden");
  document.getElementById("login-screen").classList.add("hidden");
  if (firebaseDB) firebaseDB.ref("entries").off();
}

// Firebase
function initFirebase() {
  if (firebaseApp) return;
  try {
    firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);
    firebaseDB  = firebase.database();
  } catch(e) { console.warn("Firebase:", e); }
}

// Helpers
function parseJwt(token) {
  const b64 = token.split(".")[1].replace(/-/g,"+").replace(/_/g,"/");
  return JSON.parse(atob(b64));
}
function showLoginError(msg) {
  const el = document.getElementById("login-error");
  el.textContent = msg;
  el.classList.remove("hidden");
}
