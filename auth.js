// auth.js — Role picker + Google OAuth

// ══════════════════════════════════════════════════════════════
//  DEVELOPER BACKDOOR
//  Tap any role icon 3 times → PIN prompt → enter 0000 → role picker
// ══════════════════════════════════════════════════════════════

const DEV_BACKDOOR_PIN = "0000";

// Per-icon tap counters
const devIconTaps  = { admin: 0, student: 0, outsider: 0 };
const devIconTimers = {};

function devIconTap(event, role) {
  if (typeof DEV_MODE === "undefined" || !DEV_MODE) return;

  // Stop the event from also triggering selectRole on the card
  event.stopPropagation();

  devIconTaps[role]++;
  clearTimeout(devIconTimers[role]);

  // Flash the icon slightly so Warren knows taps are registering
  const icon = document.getElementById("dev-icon-" + role);
  icon.classList.add("dev-icon-tapped");
  setTimeout(() => icon.classList.remove("dev-icon-tapped"), 180);

  // Reset after 1.5s of inactivity
  devIconTimers[role] = setTimeout(() => {
    devIconTaps[role] = 0;
  }, 1500);

  if (devIconTaps[role] >= 3) {
    devIconTaps[role] = 0;
    openDevPanel();
  }
}

// ── Dev panel open/close ──────────────────────────────────────
function openDevPanel() {
  // Reset to PIN step
  devPinBuffer = "";
  updateDevPinDots();
  document.getElementById("dev-pin-step").classList.remove("hidden");
  document.getElementById("dev-role-step").classList.add("hidden");
  document.getElementById("dev-pin-error").classList.add("hidden");

  if (typeof DEV_DEVELOPER_NAME !== "undefined") {
    document.getElementById("dev-sub").textContent =
      `Hi ${DEV_DEVELOPER_NAME} 👋 — enter your 4-digit developer PIN`;
  }

  document.getElementById("dev-backdrop").classList.remove("hidden");
  const panel = document.getElementById("dev-panel");
  panel.classList.remove("hidden");
  requestAnimationFrame(() => panel.classList.add("dev-panel-open"));
}

function closeDevPanel() {
  const panel = document.getElementById("dev-panel");
  panel.classList.remove("dev-panel-open");
  setTimeout(() => {
    panel.classList.add("hidden");
    document.getElementById("dev-backdrop").classList.add("hidden");
  }, 350);
  devPinBuffer = "";
  updateDevPinDots();
}

// ── PIN entry ─────────────────────────────────────────────────
let devPinBuffer = "";

function devPinPress(digit) {
  if (devPinBuffer.length >= 4) return;
  devPinBuffer += digit;
  updateDevPinDots();
  if (devPinBuffer.length === 4) setTimeout(checkDevPin, 150);
}

function devPinDel() {
  devPinBuffer = devPinBuffer.slice(0, -1);
  updateDevPinDots();
  document.getElementById("dev-pin-error").classList.add("hidden");
}

function updateDevPinDots() {
  for (let i = 0; i < 4; i++) {
    const dot = document.getElementById("dp" + i);
    if (!dot) continue;
    dot.classList.toggle("filled", i < devPinBuffer.length);
  }
}

function checkDevPin() {
  if (devPinBuffer === DEV_BACKDOOR_PIN) {
    // Correct — show role selector
    document.getElementById("dev-pin-error").classList.add("hidden");
    document.getElementById("dev-pin-step").classList.add("hidden");
    document.getElementById("dev-role-step").classList.remove("hidden");
    document.getElementById("dev-sub").textContent = "Choose which role to enter as";

    // Populate emails
    if (typeof DEV_ACCOUNTS !== "undefined") {
      document.getElementById("dev-email-admin").textContent    = DEV_ACCOUNTS.admin.email;
      document.getElementById("dev-email-student").textContent  = DEV_ACCOUNTS.student.email;
      document.getElementById("dev-email-outsider").textContent = DEV_ACCOUNTS.outsider.email;
    }
  } else {
    // Wrong PIN — shake and reset
    document.getElementById("dev-pin-error").classList.remove("hidden");
    document.querySelectorAll(".dev-pin-dots span").forEach(d => d.classList.add("shake"));
    setTimeout(() => {
      devPinBuffer = "";
      updateDevPinDots();
      document.querySelectorAll(".dev-pin-dots span").forEach(d => d.classList.remove("shake"));
    }, 600);
  }
}

// ── Enter as a role ───────────────────────────────────────────
function devLogin(role) {
  if (typeof DEV_MODE === "undefined" || !DEV_MODE) return;
  if (typeof DEV_ACCOUNTS === "undefined") return;

  closeDevPanel();
  selectedRole = role;
  currentUser  = { ...DEV_ACCOUNTS[role], token: "dev" };
  initFirebase();
  setTimeout(onLoginSuccess, 400);
}

let currentUser    = null;
let selectedRole   = null;   // 'admin' | 'student' | 'outsider'
let firebaseApp    = null;
let firebaseDB     = null;

// ── Role selection ────────────────────────────────────────────
function selectRole(role) {
  selectedRole = role;

  // Hide role picker, show login
  document.getElementById("role-screen").classList.add("hidden");
  document.getElementById("login-screen").classList.remove("hidden");
  document.getElementById("login-error").classList.add("hidden");

  const cfg = {
    admin: {
      icon:   "ti-shield-check",
      color:  "role-icon-admin",
      title:  "Admin Sign In",
      sub:    "Sign in with your ACity staff account",
      domain: "@acity.edu.gh",
      badge:  "Admin",
      badgeCls: "badge-admin",
    },
    student: {
      icon:   "ti-school",
      color:  "role-icon-student",
      title:  "Student Sign In",
      sub:    "Sign in with your ACity student account",
      domain: "@acity.edu.gh",
      badge:  "Student",
      badgeCls: "badge-student",
    },
    outsider: {
      icon:   "ti-user",
      color:  "role-icon-outsider",
      title:  "Guest Sign In",
      sub:    "Sign in with your personal Google account",
      domain: "@gmail.com",
      badge:  "Outsider / Guest",
      badgeCls: "badge-outsider",
    },
  }[role];

  // Update login screen UI to match role
  const logoIcon = document.getElementById("login-logo-icon");
  logoIcon.className = "logo-icon large " + cfg.color;
  logoIcon.innerHTML = `<i class="ti ${cfg.icon}"></i>`;

  document.getElementById("login-title").textContent        = cfg.title;
  document.getElementById("login-sub").textContent          = cfg.sub;
  document.getElementById("login-domain-pill").textContent  = cfg.domain;

  const badge = document.getElementById("login-role-badge");
  badge.textContent  = cfg.badge;
  badge.className    = "role-badge " + cfg.badgeCls;
}

function goBackToRoles() {
  selectedRole = null;
  document.getElementById("login-screen").classList.add("hidden");
  document.getElementById("role-screen").classList.remove("hidden");
  document.getElementById("login-error").classList.add("hidden");
}

// ── Firebase init ─────────────────────────────────────────────
function initFirebase() {
  if (firebaseApp) return;
  firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);
  firebaseDB  = firebase.database();
}

// ── Init Google SDK once when script loads ───────────────────
// We initialise immediately so it's ready the first time the
// button is tapped — no double-tap needed.
let googleReady = false;

function initGoogleSDK() {
  if (googleReady || typeof google === "undefined") return;
  google.accounts.id.initialize({
    client_id:  GOOGLE_CLIENT_ID,
    callback:   handleGoogleLogin,
    ux_mode:    "popup",
    context:    "signin",
    auto_select: false,
  });
  googleReady = true;
}

// Called as soon as Google's script finishes loading
window.onGoogleLibraryLoad = function() {
  initGoogleSDK();
};

// ── Trigger Google login ──────────────────────────────────────
function triggerGoogleLogin() {
  // Ensure SDK is ready (catches edge cases where onload fired late)
  initGoogleSDK();

  // Use renderButton on our custom button element so one tap suffices
  const btnEl = document.getElementById("google-btn");
  google.accounts.id.renderButton(btnEl, {
    type:  "standard",
    theme: "outline",
    size:  "large",
    text:  "continue_with",
    shape: "rectangular",
    width: btnEl.offsetWidth || 300,
  });

  // Also trigger the One Tap prompt (catches already-signed-in users)
  google.accounts.id.prompt();
}

// ── Handle Google credential ──────────────────────────────────
function handleGoogleLogin(response) {
  const payload = parseJwt(response.credential);
  const email   = payload.email;

  // Enforce domain rules per role
  if (selectedRole === "admin" || selectedRole === "student") {
    if (!email.endsWith("@acity.edu.gh")) {
      showLoginError("This role requires an @acity.edu.gh account. Please go back and choose Outsider if you have a Gmail account.");
      return;
    }
  }
  if (selectedRole === "outsider") {
    if (email.endsWith("@acity.edu.gh")) {
      showLoginError("ACity students and staff should use the Student or Admin role instead.");
      return;
    }
  }

  // For admin role: verify email is in admin list
  const isAdmin = selectedRole === "admin" && ADMIN_EMAILS.includes(email);
  if (selectedRole === "admin" && !isAdmin) {
    showLoginError("Your account is not listed as an admin. Contact the hostel manager.");
    return;
  }

  currentUser = {
    email,
    name:    payload.name,
    picture: payload.picture,
    given:   payload.given_name,
    role:    selectedRole,   // 'admin' | 'student' | 'outsider'
    isAdmin,
    token:   response.credential,
  };

  initFirebase();
  onLoginSuccess();
}

// ── Post-login routing ────────────────────────────────────────
function onLoginSuccess() {
  document.getElementById("login-screen").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");

  // Header user info
  document.getElementById("user-name-short").textContent =
    currentUser.given || currentUser.name.split(" ")[0];

  const av = document.getElementById("user-avatar");
  if (currentUser.picture) {
    av.style.backgroundImage = `url(${currentUser.picture})`;
    av.style.backgroundSize  = "cover";
    av.textContent = "";
  } else {
    av.textContent = (currentUser.name || "?")[0].toUpperCase();
  }

  // Role chip in header
  const chip = document.getElementById("user-role-chip");
  const roleLabels = { admin: "Admin", student: "Student", outsider: "Guest" };
  const roleClasses = { admin: "chip-admin", student: "chip-student", outsider: "chip-outsider" };
  chip.textContent  = roleLabels[currentUser.role];
  chip.className    = "user-role-chip " + roleClasses[currentUser.role];

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

// ── Sign out ──────────────────────────────────────────────────
function signOut() {
  google.accounts.id.disableAutoSelect();
  currentUser  = null;
  selectedRole = null;
  document.getElementById("app").classList.add("hidden");
  document.getElementById("role-screen").classList.remove("hidden");
  document.getElementById("login-screen").classList.add("hidden");
  if (firebaseDB) firebaseDB.ref("entries").off();
}

// ── Helpers ───────────────────────────────────────────────────
function parseJwt(token) {
  const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(atob(base64));
}

function showLoginError(msg) {
  const el = document.getElementById("login-error");
  el.textContent = msg;
  el.classList.remove("hidden");
}
