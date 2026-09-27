// auth.js — Role picker + Google OAuth + Developer backdoor

let currentUser  = null;
let selectedRole = null;
let firebaseApp  = null;
let firebaseDB   = null;

// ══════════════════════════════════════════════════════════════
//  DEVELOPER BACKDOOR
//  One button (bottom-right) → PIN 0000 → role picker
// ══════════════════════════════════════════════════════════════
const DEV_BACKDOOR_PIN = "0000";
let devPinBuffer = "";

function openDevPanel() {
  if (typeof DEV_MODE === "undefined" || !DEV_MODE) return;

  devPinBuffer = "";
  updateDevPinDots();
  document.getElementById("dev-pin-step").classList.remove("hidden");
  document.getElementById("dev-role-step").classList.add("hidden");
  document.getElementById("dev-pin-error").classList.add("hidden");

  const sub = document.getElementById("dev-sub");
  if (sub && typeof DEV_DEVELOPER_NAME !== "undefined") {
    sub.textContent = `Hi ${DEV_DEVELOPER_NAME} 👋 — enter your developer PIN`;
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
    if (dot) dot.classList.toggle("filled", i < devPinBuffer.length);
  }
}

function checkDevPin() {
  if (devPinBuffer === DEV_BACKDOOR_PIN) {
    document.getElementById("dev-pin-error").classList.add("hidden");
    document.getElementById("dev-pin-step").classList.add("hidden");
    document.getElementById("dev-role-step").classList.remove("hidden");
    const sub = document.getElementById("dev-sub");
    if (sub) sub.textContent = "Choose which role to enter as";

    if (typeof DEV_ACCOUNTS !== "undefined") {
      const ea = document.getElementById("dev-email-admin");
      const es = document.getElementById("dev-email-student");
      const eo = document.getElementById("dev-email-outsider");
      if (ea) ea.textContent = DEV_ACCOUNTS.admin.email;
      if (es) es.textContent = DEV_ACCOUNTS.student.email;
      if (eo) eo.textContent = DEV_ACCOUNTS.outsider.email;
    }
  } else {
    document.getElementById("dev-pin-error").classList.remove("hidden");
    document.querySelectorAll(".dev-pin-dots span").forEach(d => d.classList.add("shake"));
    setTimeout(() => {
      devPinBuffer = "";
      updateDevPinDots();
      document.querySelectorAll(".dev-pin-dots span").forEach(d => d.classList.remove("shake"));
    }, 600);
  }
}

function devLogin(role) {
  if (typeof DEV_MODE === "undefined" || !DEV_MODE) return;
  if (typeof DEV_ACCOUNTS === "undefined") return;

  closeDevPanel();
  selectedRole = role;
  currentUser  = { ...DEV_ACCOUNTS[role], token: "dev" };
  initFirebase();
  setTimeout(onLoginSuccess, 400);
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
    admin:    { icon:"ti-shield-check", color:"role-icon-admin",    title:"Admin Sign In",   sub:"Use your ACity staff Google account",    domain:"@acity.edu.gh", badge:"Admin",          badgeCls:"badge-admin"    },
    student:  { icon:"ti-school",       color:"role-icon-student",  title:"Student Sign In", sub:"Use your ACity student Google account",  domain:"@acity.edu.gh", badge:"Student",        badgeCls:"badge-student"  },
    outsider: { icon:"ti-user",         color:"role-icon-outsider", title:"Guest Sign In",   sub:"Use your personal Gmail account",        domain:"@gmail.com",    badge:"Outsider / Guest",badgeCls:"badge-outsider" },
  }[role];

  const logoIcon = document.getElementById("login-logo-icon");
  logoIcon.className = "logo-icon large " + cfg.color;
  logoIcon.innerHTML = `<i class="ti ${cfg.icon}"></i>`;

  document.getElementById("login-title").textContent       = cfg.title;
  document.getElementById("login-sub").textContent         = cfg.sub;
  document.getElementById("login-domain-pill").textContent = cfg.domain;

  const badge = document.getElementById("login-role-badge");
  badge.textContent = cfg.badge;
  badge.className   = "role-badge " + cfg.badgeCls;

  // Render Google button now that the login screen is visible
  renderGoogleButton();
}

function goBackToRoles() {
  selectedRole = null;
  document.getElementById("login-screen").classList.add("hidden");
  document.getElementById("role-screen").classList.remove("hidden");
  document.getElementById("login-error").classList.add("hidden");
}

// ══════════════════════════════════════════════════════════════
//  GOOGLE OAUTH — fixed single-tap approach
// ══════════════════════════════════════════════════════════════
let googleSDKReady = false;

// Google calls this automatically when its script finishes loading
window.onGoogleLibraryLoad = function () {
  google.accounts.id.initialize({
    client_id:   GOOGLE_CLIENT_ID,
    callback:    handleGoogleLogin,
    ux_mode:     "popup",
    auto_select: false,
    cancel_on_tap_outside: true,
  });
  googleSDKReady = true;
  // If login screen is already showing, render the button
  if (!document.getElementById("login-screen").classList.contains("hidden")) {
    renderGoogleButton();
  }
};

function renderGoogleButton() {
  // Wait for SDK if it hasn't loaded yet (rare race condition)
  if (!googleSDKReady) {
    setTimeout(renderGoogleButton, 200);
    return;
  }
  const container = document.getElementById("google-btn");
  if (!container) return;
  // Clear any previously rendered button
  container.innerHTML = "";
  google.accounts.id.renderButton(container, {
    type:  "standard",
    theme: "filled_blue",
    size:  "large",
    text:  "continue_with",
    shape: "rectangular",
    width: Math.min(container.offsetWidth || 300, 400),
    logo_alignment: "left",
  });
}

// ── Handle Google credential response ─────────────────────────
function handleGoogleLogin(response) {
  const payload = parseJwt(response.credential);
  const email   = payload.email;

  document.getElementById("login-error").classList.add("hidden");

  // Domain enforcement
  if ((selectedRole === "admin" || selectedRole === "student") && !email.endsWith("@acity.edu.gh")) {
    showLoginError("This role requires an @acity.edu.gh account. Go back and choose 'Outsider' if you have a Gmail.");
    return;
  }
  if (selectedRole === "outsider" && email.endsWith("@acity.edu.gh")) {
    showLoginError("ACity accounts should use the Student or Admin role.");
    return;
  }

  const isAdmin = selectedRole === "admin" && ADMIN_EMAILS.includes(email);
  if (selectedRole === "admin" && !isAdmin) {
    showLoginError("Your email is not listed as an admin. Contact the hostel manager.");
    return;
  }

  currentUser = {
    email,
    name:    payload.name,
    picture: payload.picture,
    given:   payload.given_name || payload.name.split(" ")[0],
    role:    selectedRole,
    isAdmin,
    token:   response.credential,
  };

  initFirebase();
  onLoginSuccess();
}

// ══════════════════════════════════════════════════════════════
//  POST-LOGIN ROUTING
// ══════════════════════════════════════════════════════════════
function onLoginSuccess() {
  // Hide all auth screens
  document.getElementById("role-screen").classList.add("hidden");
  document.getElementById("login-screen").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");

  // Header — name
  document.getElementById("user-name-short").textContent =
    currentUser.given || currentUser.name.split(" ")[0];

  // Header — avatar
  const av = document.getElementById("user-avatar");
  if (currentUser.picture) {
    av.style.backgroundImage = `url(${currentUser.picture})`;
    av.style.backgroundSize  = "cover";
    av.textContent = "";
  } else {
    av.textContent = (currentUser.name || "?")[0].toUpperCase();
  }

  // Header — role chip
  const chip = document.getElementById("user-role-chip");
  chip.textContent = { admin:"Admin", student:"Student", outsider:"Guest" }[currentUser.role];
  chip.className   = "user-role-chip " + { admin:"chip-admin", student:"chip-student", outsider:"chip-outsider" }[currentUser.role];

  // Route to correct view
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

// ── Firebase init ─────────────────────────────────────────────
function initFirebase() {
  if (firebaseApp) return;
  try {
    firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);
    firebaseDB  = firebase.database();
  } catch(e) {
    console.warn("Firebase init failed:", e);
  }
}

// ── Helpers ───────────────────────────────────────────────────
function parseJwt(token) {
  const base64 = token.split(".")[1].replace(/-/g,"+").replace(/_/g,"/");
  return JSON.parse(atob(base64));
}
function showLoginError(msg) {
  const el = document.getElementById("login-error");
  el.textContent = msg;
  el.classList.remove("hidden");
}
