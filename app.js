// app.js — Main application logic

// ── Shared helpers ────────────────────────────────────────────
function fmtTime(d)     { return d ? new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—"; }
function todayStr()     { return new Date().toLocaleDateString("en-GB"); }
function initials(name) { return (name||"?").trim().split(" ").map(w=>w[0]).join("").substring(0,2).toUpperCase(); }

function showToast(msg, type) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className   = "toast " + type + " show";
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 3500);
}

function setLoading(id, on) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.disabled = on;
  btn.dataset.orig = btn.dataset.orig || btn.innerHTML;
  btn.innerHTML = on
    ? `<span class="spinner"></span> Saving…`
    : btn.dataset.orig;
}

// ══════════════════════════════════════════════════════════════
//  VISITOR FLOW
// ══════════════════════════════════════════════════════════════

function initVisitorForm() {
  // Auto-fill visitor name from logged-in user
  document.getElementById("visitor-first-name").textContent =
    currentUser.given || currentUser.name.split(" ")[0];
  document.getElementById("autofill-name").textContent  = currentUser.name;
  document.getElementById("autofill-email").textContent = currentUser.email;

  // Load residents for search
  loadResidents();
}

async function doAction(action) {
  if (!selectedResident) {
    showToast("Please search and select the resident you are visiting", "toast-err");
    return;
  }
  const phone = document.getElementById("v-phone").value.trim();
  const now   = new Date();

  if (action === "out") {
    // Find today's open sign-in for this visitor + resident
    const entries = await fetchAllEntries();
    const open    = entries.find(e =>
      e.visitorEmail === currentUser.email &&
      e.residentEmail === selectedResident.email &&
      e.status === "in" &&
      e.date === todayStr()
    );
    if (!open) {
      showToast("No open sign-in found for this visit", "toast-err");
      return;
    }
    open.status     = "out";
    open.timeOut    = now.toISOString();
    open.timeOutStr = fmtTime(now);
    setLoading("btn-sign-out", true);
    await updateSignOut(open);
    setLoading("btn-sign-out", false);
    showSuccess("out", currentUser.name, selectedResident.name, selectedResident.room);
    clearResident();
    return;
  }

  // Sign in
  const entry = {
    id:            Date.now().toString(),
    date:          todayStr(),
    visitorName:   currentUser.name,
    visitorEmail:  currentUser.email,
    visitorPhone:  phone,
    residentName:  selectedResident.name,
    residentEmail: selectedResident.email,
    room:          selectedResident.room,
    timeIn:        now.toISOString(),
    timeInStr:     fmtTime(now),
    timeOut:       null,
    timeOutStr:    "",
    status:        "in",
  };

  setLoading("btn-sign-in", true);
  await writeEntry(entry);
  setLoading("btn-sign-in", false);
  showSuccess("in", currentUser.name, selectedResident.name, selectedResident.room);
  clearResident();
  document.getElementById("v-phone").value = "";
}

// ── Success screen ────────────────────────────────────────────
function showSuccess(action, vName, rName, room) {
  const screen = document.getElementById("success-screen");
  const form   = document.getElementById("visitor-form");
  document.getElementById("success-title").textContent =
    action === "in" ? "✓ Signed in!" : "✓ Signed out!";
  document.getElementById("success-msg").textContent =
    action === "in"
      ? `Welcome ${vName.split(" ")[0]}! Visiting ${rName} in Room ${room}.`
      : `Goodbye ${vName.split(" ")[0]}! Safe travels.`;
  document.getElementById("success-time").textContent = "Time: " + fmtTime(new Date());

  screen.className = "success-screen " + (action === "in" ? "success-in" : "success-out");
  screen.classList.remove("hidden");
  form.classList.add("hidden");
  clearTimeout(screen._t);
  screen._t = setTimeout(hideSuccess, 6000);
}

function hideSuccess() {
  document.getElementById("success-screen").classList.add("hidden");
  document.getElementById("visitor-form").classList.remove("hidden");
}

// ══════════════════════════════════════════════════════════════
//  ADMIN DASHBOARD
// ══════════════════════════════════════════════════════════════

let allEntries    = [];
let currentFilter = "all";
let pollTimer     = null;
let notifQueue    = [];
let notifShowing  = false;

function initAdminDashboard() {
  document.getElementById("coord-date").textContent =
    new Date().toLocaleDateString("en-GB", {
      weekday: "long", day: "numeric", month: "long", year: "numeric"
    });

  if (typeof SHEET_URL === "string" && SHEET_URL.startsWith("https://")) {
    const link = document.getElementById("sheet-link");
    link.href  = SHEET_URL;
    link.classList.remove("hidden");
  }

  // Live listener — updates table in real time
  listenForEntries(entries => {
    const isFirst = allEntries.length === 0;
    allEntries = entries;
    updateStats();
    renderLogs();
    flashRefresh();
    if (!isFirst) lastKnownCount = entries.length;
    else          lastKnownCount = entries.length; // mark initial load done
  });

  // Notification listener — fires on new/changed entries
  setTimeout(() => {
    listenForNewEntries((entry, type) => {
      queueNotif(entry, type);
    });
  }, 2000); // small delay so initial load doesn't trigger notifications
}

async function fetchEntries() {
  allEntries = await fetchAllEntries();
  updateStats();
  renderLogs();
  flashRefresh();
}

// ── Stats ─────────────────────────────────────────────────────
function updateStats() {
  document.getElementById("s-in").textContent    = allEntries.filter(e => e.status === "in").length;
  document.getElementById("s-out").textContent   = allEntries.filter(e => e.status === "out").length;
  document.getElementById("s-total").textContent = allEntries.length;
}

// ── Log rendering ─────────────────────────────────────────────
function renderLogs() {
  const el   = document.getElementById("log-list");
  const list = currentFilter === "all"
    ? allEntries
    : allEntries.filter(e => e.status === currentFilter);

  if (!list.length) {
    el.innerHTML = `
      <div class="empty-state">
        <i class="ti ti-clipboard-list"></i>
        <p>${currentFilter === "all" ? "No entries today" : "No entries for this filter"}</p>
        <span>Sign-ins appear here in real time</span>
      </div>`;
    return;
  }

  el.innerHTML = list.map(e => `
    <div class="log-item">
      <div class="log-avatar ${e.status === "in" ? "av-in" : "av-out"}">${initials(e.visitorName)}</div>
      <div class="log-body">
        <div class="log-name">${e.visitorName}</div>
        <div class="log-meta">
          Visiting <strong>${e.residentName}</strong> · Room <strong>${e.room}</strong>
        </div>
        <div class="log-email"><i class="ti ti-mail"></i> ${e.visitorEmail}</div>
        ${e.visitorPhone ? `<div class="log-phone"><i class="ti ti-phone"></i> ${e.visitorPhone}</div>` : ""}
      </div>
      <div class="log-right">
        <div class="log-time">In: ${e.timeInStr || fmtTime(e.timeIn)}</div>
        ${e.timeOutStr ? `<div class="log-time">Out: ${e.timeOutStr}</div>` : ""}
        <span class="pill ${e.status === "in" ? "pill-in" : "pill-out"}">
          ${e.status === "in" ? "Inside" : "Left"}
        </span>
        ${e.status === "in"
          ? `<button class="signout-btn" onclick="adminSignOut('${e.id}')">Sign out</button>`
          : ""}
      </div>
    </div>
  `).join("");
}

async function adminSignOut(id) {
  const e = allEntries.find(x => x.id === id);
  if (!e) return;
  const now   = new Date();
  e.status     = "out";
  e.timeOut    = now.toISOString();
  e.timeOutStr = fmtTime(now);
  renderLogs();
  await updateSignOut(e);
  showToast("✓ Signed out: " + e.visitorName, "toast-out");
}

// ── Filter ────────────────────────────────────────────────────
function setFilter(f, el) {
  currentFilter = f;
  document.querySelectorAll(".fpill").forEach(b => b.classList.remove("active"));
  el.classList.add("active");
  renderLogs();
}

// ── Refresh badge ─────────────────────────────────────────────
function flashRefresh() {
  const b = document.getElementById("refresh-badge");
  if (!b) return;
  b.classList.add("flash");
  setTimeout(() => b.classList.remove("flash"), 2000);
}

// ── Pop-up notifications for admin ────────────────────────────
function queueNotif(entry, type) {
  notifQueue.push({ entry, type });
  if (!notifShowing) showNextNotif();
}

function showNextNotif() {
  if (!notifQueue.length) { notifShowing = false; return; }
  notifShowing = true;
  const { entry, type } = notifQueue.shift();
  const isIn = entry.status === "in" || type === "added";

  document.getElementById("notif-icon").className =
    "notif-icon " + (isIn ? "notif-in" : "notif-out");
  document.getElementById("notif-icon").innerHTML =
    isIn ? '<i class="ti ti-door-enter"></i>' : '<i class="ti ti-door-exit"></i>';
  document.getElementById("notif-title").textContent =
    isIn
      ? `${entry.visitorName} just signed in`
      : `${entry.visitorName} just signed out`;
  document.getElementById("notif-detail").textContent =
    `Visiting ${entry.residentName} · Room ${entry.room}`;
  document.getElementById("notif-time").textContent =
    "At " + (isIn ? entry.timeInStr : entry.timeOutStr || fmtTime(new Date()));

  const popup = document.getElementById("notif-popup");
  popup.classList.remove("hidden");
  popup.classList.add("notif-enter");

  clearTimeout(popup._t);
  popup._t = setTimeout(() => {
    closeNotif();
  }, 6000);
}

function closeNotif() {
  const popup = document.getElementById("notif-popup");
  popup.classList.add("hidden");
  popup.classList.remove("notif-enter");
  setTimeout(showNextNotif, 400);
}

// ── CSV Export ────────────────────────────────────────────────
function exportCSV() {
  const headers = ["Date","Visitor Name","Visitor Email","Visitor Phone",
                   "Resident Name","Resident Email","Room","Time In","Time Out","Status"];
  const rows = allEntries.map(e =>
    [e.date, e.visitorName, e.visitorEmail, e.visitorPhone||"",
     e.residentName, e.residentEmail||"", e.room,
     e.timeInStr||fmtTime(e.timeIn), e.timeOutStr||"", e.status]
      .map(v => `"${String(v||"").replace(/"/g,'""')}"`)
      .join(",")
  );
  const csv  = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a    = Object.assign(document.createElement("a"), {
    href:     URL.createObjectURL(blob),
    download: `hostel-register-${new Date().toISOString().slice(0,10)}.csv`,
  });
  a.click();
  URL.revokeObjectURL(a.href);
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  if (typeof HOSTEL_NAME !== "undefined") {
    document.title = HOSTEL_NAME;
    const n = document.getElementById("hostel-name");
    if (n) n.textContent = HOSTEL_NAME;
  }
});
