// auth.js — Role picker + Google OAuth

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

// ── Trigger Google login ──────────────────────────────────────
function triggerGoogleLogin() {
  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback:  handleGoogleLogin,
    ux_mode:   "popup",
    context:   "signin",
  });
  google.accounts.id.prompt(notification => {
    if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
      google.accounts.id.renderButton(
        document.getElementById("google-btn"),
        { theme: "outline", size: "large", width: 300 }
      );
    }
  });
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
