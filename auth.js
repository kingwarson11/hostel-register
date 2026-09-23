// auth.js — Google OAuth + Firebase Auth

let currentUser   = null;   // { email, name, picture, isAdmin }
let firebaseApp   = null;
let firebaseDB    = null;

// ── Bootstrap Firebase ────────────────────────────────────────
function initFirebase() {
  if (firebaseApp) return;
  firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);
  firebaseDB  = firebase.database();
}

// ── Trigger Google sign-in popup ──────────────────────────────
function triggerGoogleLogin() {
  const client = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: "email profile openid",
    callback: () => {},
  });

  // Use the One Tap / Sign In With Google button approach instead
  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleGoogleLogin,
    ux_mode: "popup",
    context: "signin",
  });
  google.accounts.id.prompt((notification) => {
    if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
      // Fallback: render button manually
      google.accounts.id.renderButton(
        document.querySelector(".google-btn"),
        { theme: "outline", size: "large", width: 280 }
      );
    }
  });
}

// ── Handle credential response from Google ────────────────────
function handleGoogleLogin(response) {
  const payload = parseJwt(response.credential);

  // Enforce @acity.edu.gh domain
  if (!payload.email.endsWith("@acity.edu.gh")) {
    showLoginError("Only @acity.edu.gh accounts are allowed.");
    google.accounts.id.revoke(payload.email, () => {});
    return;
  }

  const isAdmin = ADMIN_EMAILS.includes(payload.email);

  currentUser = {
    email:   payload.email,
    name:    payload.name,
    picture: payload.picture,
    given:   payload.given_name,
    isAdmin,
    token:   response.credential,
  };

  initFirebase();
  onLoginSuccess();
}

// ── After successful login ────────────────────────────────────
function onLoginSuccess() {
  document.getElementById("login-screen").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");

  // Update header
  document.getElementById("user-name-short").textContent =
    currentUser.given || currentUser.name.split(" ")[0];
  const av = document.getElementById("user-avatar");
  if (currentUser.picture) {
    av.style.backgroundImage = `url(${currentUser.picture})`;
    av.style.backgroundSize  = "cover";
  } else {
    av.textContent = (currentUser.name || "?")[0].toUpperCase();
  }

  if (currentUser.isAdmin) {
    document.getElementById("header-sub").textContent = "Admin Dashboard";
    document.getElementById("visitor-app").classList.add("hidden");
    document.getElementById("admin-app").classList.remove("hidden");
    initAdminDashboard();
  } else {
    document.getElementById("header-sub").textContent = "Visitor Register";
    document.getElementById("visitor-app").classList.remove("hidden");
    document.getElementById("admin-app").classList.add("hidden");
    initVisitorForm();
  }
}

// ── Sign out ──────────────────────────────────────────────────
function signOut() {
  google.accounts.id.disableAutoSelect();
  currentUser = null;
  document.getElementById("app").classList.add("hidden");
  document.getElementById("login-screen").classList.remove("hidden");
  document.getElementById("login-error").classList.add("hidden");
  // Stop any listeners
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
