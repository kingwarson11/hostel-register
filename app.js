// app.js — Hostel Visitor Register

// ── State ─────────────────────────────────────────────────────
let logs          = [];
let currentFilter = "all";
let pollTimer     = null;
let pinUnlocked   = false;
let pinBuffer     = "";

// ── Helpers ───────────────────────────────────────────────────
function fmtTime(d)     { return d ? new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—"; }
function todayStr()     { return new Date().toLocaleDateString("en-GB"); }
function initials(name) { return (name || "?").trim().split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase(); }

function showToast(msg, type) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className = "toast " + type + " show";
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 3500);
}

function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  if (loading) {
    btn.dataset.orig = btn.innerHTML;
    btn.innerHTML = `<span class="spinner"></span> Saving…`;
  } else if (btn.dataset.orig) {
    btn.innerHTML = btn.dataset.orig;
  }
}

// ── PIN Lock ──────────────────────────────────────────────────
function pinPress(digit) {
  if (pinBuffer.length >= 4) return;
  pinBuffer += digit;
  updatePinDots();
  if (pinBuffer.length === 4) {
    setTimeout(checkPin, 150);
  }
}

function pinDel() {
  pinBuffer = pinBuffer.slice(0, -1);
  updatePinDots();
  document.getElementById("pin-error").classList.add("hidden");
}

function updatePinDots() {
  const dots = document.querySelectorAll("#pin-dots span");
  dots.forEach((d, i) => {
    d.classList.toggle("filled", i < pinBuffer.length);
  });
}

function checkPin() {
  const correct = typeof COORDINATOR_PIN !== "undefined" ? String(COORDINATOR_PIN) : "1234";
  if (pinBuffer === correct) {
    pinUnlocked = true;
    document.getElementById("pin-screen").classList.add("hidden");
    document.getElementById("dashboard").classList.remove("hidden");
    // Set date label
    const coordDate = document.getElementById("coord-date");
    if (coordDate) coordDate.textContent = new Date().toLocaleDateString("en-GB", {
      weekday: "long", day: "numeric", month: "long", year: "numeric"
    });
    fetchFromSheet();
    startPolling();
  } else {
    document.getElementById("pin-error").classList.remove("hidden");
    document.querySelectorAll("#pin-dots span").forEach(d => d.classList.add("shake"));
    setTimeout(() => {
      pinBuffer = "";
      updatePinDots();
      document.querySelectorAll("#pin-dots span").forEach(d => d.classList.remove("shake"));
    }, 600);
  }
}



// ── Coordinator access via URL (?coord or #coord) ─────────────
function checkCoordURL() {
  const url    = window.location.href;
  const isCoord = url.includes("?coord") || url.includes("#coord");
  if (isCoord) {
    document.getElementById("coordinator-overlay").classList.remove("hidden");
    document.getElementById("visitor-view").classList.add("hidden");
    document.querySelector(".site-header").classList.add("hidden");
  }
}

function lockDashboard() {
  pinUnlocked = false;
  pinBuffer   = "";
  updatePinDots();
  stopPolling();
  document.getElementById("pin-screen").classList.remove("hidden");
  document.getElementById("dashboard").classList.add("hidden");
  document.getElementById("pin-error").classList.add("hidden");
}

// ── Polling ───────────────────────────────────────────────────
function startPolling() {
  stopPolling();
  pollTimer = setInterval(fetchFromSheet, 30000);
}
function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

// ── Fetch all rows from Google Sheet ─────────────────────────
async function fetchFromSheet() {
  if (!Sheets.isConfigured()) return;
  try {
    const data = await Sheets.getRows();
    if (!data) return;
    logs = data;
    updateStats();
    renderLogs();
    flashRefresh();
  } catch (e) {
    console.warn("Fetch failed:", e);
  }
}

function flashRefresh() {
  const badge = document.getElementById("refresh-badge");
  if (!badge) return;
  badge.classList.add("flash");
  setTimeout(() => badge.classList.remove("flash"), 2000);
}

// ── Success screen ────────────────────────────────────────────
function showSuccess(action, vName, rName, rRoom) {
  const screen = document.getElementById("success-screen");
  const form   = document.getElementById("visitor-form");
  const title  = document.getElementById("success-title");
  const msg    = document.getElementById("success-msg");
  const time   = document.getElementById("success-time");

  title.textContent = action === "in" ? "✓ Signed in!" : "✓ Signed out!";
  msg.textContent   = action === "in"
    ? `Welcome ${vName}. Visiting ${rName} in Room ${rRoom}.`
    : `Goodbye ${vName}. Safe travels!`;
  time.textContent  = "Time: " + fmtTime(new Date());

  screen.classList.remove("hidden");
  screen.className = "success-screen " + (action === "in" ? "success-in" : "success-out");
  form.classList.add("hidden");

  // Auto-hide after 6 seconds
  clearTimeout(screen._t);
  screen._t = setTimeout(hideSuccess, 6000);
}

function hideSuccess() {
  document.getElementById("success-screen").classList.add("hidden");
  document.getElementById("visitor-form").classList.remove("hidden");
}

// ── Core: add entry ───────────────────────────────────────────
async function addEntry(vName, vPhone, rName, rRoom, rPhone, action) {
  const now     = new Date();
  const today   = todayStr();
  const timeStr = fmtTime(now);

  if (action === "out") {
    const existing = logs.find(
      l => l.vName === vName && l.rRoom === rRoom && l.status === "in" && l.date === today
    );
    if (!existing) {
      showToast("No open sign-in found for " + vName + " · Room " + rRoom, "toast-err");
      return false;
    }
    existing.status     = "out";
    existing.timeOut    = now.toISOString();
    existing.timeOutStr = timeStr;

    const ok = await Sheets.updateSignOut(existing);
    if (ok) {
      updateStats();
      renderLogs();
      return true;
    } else {
      showToast("Could not reach Google Sheets — check your connection", "toast-err");
      return false;
    }
  }

  // Sign in
  const entry = {
    id:         Date.now().toString(),
    date:       today,
    vName,
    vPhone:     vPhone || "",
    rName,
    rRoom,
    rPhone:     rPhone || "",
    timeIn:     now.toISOString(),
    timeInStr:  timeStr,
    timeOut:    null,
    timeOutStr: "",
    status:     "in",
  };

  const ok = await Sheets.appendRow(entry);
  if (ok) {
    logs.unshift(entry);
    updateStats();
    renderLogs();
    return true;
  } else {
    showToast("Could not save — check your connection", "toast-err");
    return false;
  }
}

// ── Stats ─────────────────────────────────────────────────────
function updateStats() {
  const today  = todayStr();
  const todayL = logs.filter(l => l.date === today);
  document.getElementById("s-in").textContent    = todayL.filter(l => l.status === "in").length;
  document.getElementById("s-out").textContent   = todayL.filter(l => l.status === "out").length;
  document.getElementById("s-total").textContent = todayL.length;
}

// ── Log rendering ─────────────────────────────────────────────
function renderLogs() {
  const el     = document.getElementById("log-list");
  const today  = todayStr();
  const source = logs.filter(l => l.date === today);
  const list   = currentFilter === "all"
    ? source
    : source.filter(l => l.status === currentFilter);

  if (!list.length) {
    el.innerHTML = `
      <div class="empty-state">
        <i class="ti ti-clipboard-list" aria-hidden="true"></i>
        <p>${currentFilter === "all" ? "No entries today" : "No entries for this filter"}</p>
        <span>Visitors appear here as they sign in</span>
      </div>`;
    return;
  }

  el.innerHTML = list.map(l => `
    <div class="log-item">
      <div class="log-avatar ${l.status === "in" ? "av-in" : "av-out"}">${initials(l.vName)}</div>
      <div class="log-body">
        <div class="log-name">${l.vName}</div>
        <div class="log-meta">Visiting <strong>${l.rName}</strong> · Room <strong>${l.rRoom}</strong></div>
        ${l.vPhone ? `<div class="log-phone"><i class="ti ti-phone" aria-hidden="true"></i> ${l.vPhone}</div>` : ""}
      </div>
      <div class="log-right">
        <div class="log-time">In: ${l.timeInStr || fmtTime(l.timeIn)}</div>
        ${l.timeOutStr || l.timeOut ? `<div class="log-time">Out: ${l.timeOutStr || fmtTime(l.timeOut)}</div>` : ""}
        <span class="pill ${l.status === "in" ? "pill-in" : "pill-out"}">
          ${l.status === "in" ? "Inside" : "Left"}
        </span>
        ${l.status === "in"
          ? `<button class="signout-btn" onclick="quickOut('${l.id}')">Sign out</button>`
          : ""}
      </div>
    </div>
  `).join("");
}

// ── Quick sign-out from dashboard ────────────────────────────
async function quickOut(id) {
  const l = logs.find(e => String(e.id) === String(id));
  if (!l) return;
  const now    = new Date();
  l.status     = "out";
  l.timeOut    = now.toISOString();
  l.timeOutStr = fmtTime(now);
  updateStats();
  renderLogs();
  showToast("Saving…", "toast-saving");
  const ok = await Sheets.updateSignOut(l);
  showToast(
    ok ? "✓ Signed out: " + l.vName : "Saved locally — sheet sync failed",
    ok ? "toast-out" : "toast-err"
  );
}

// ── Filter ────────────────────────────────────────────────────
function setFilter(f, el) {
  currentFilter = f;
  document.querySelectorAll(".fpill").forEach(b => b.classList.remove("active"));
  el.classList.add("active");
  renderLogs();
}

// ── Visitor form ──────────────────────────────────────────────
async function doAction(action) {
  const vName  = document.getElementById("v-name").value.trim();
  const vPhone = document.getElementById("v-phone").value.trim();
  const rName  = document.getElementById("r-name").value.trim();
  const rRoom  = document.getElementById("r-room").value.trim();
  const rPhone = document.getElementById("r-phone").value.trim();

  if (!vName || !rName || !rRoom) {
    showToast("Please fill in visitor name, resident name & room", "toast-err");
    return;
  }

  const btnId = action === "in" ? "btn-sign-in" : "btn-sign-out";
  setLoading(btnId, true);
  const ok = await addEntry(vName, vPhone, rName, rRoom, rPhone, action);
  setLoading(btnId, false);

  if (ok) {
    ["v-name","v-phone","r-name","r-room","r-phone"].forEach(id =>
      document.getElementById(id).value = ""
    );
    showSuccess(action, vName, rName, rRoom);
  }
}

// ── QR Modal ──────────────────────────────────────────────────
function openModal() {
  document.getElementById("qr-modal").classList.add("show");
  setTimeout(() => document.getElementById("m-vname").focus(), 300);
}
function closeModal() {
  document.getElementById("qr-modal").classList.remove("show");
  ["m-vname","m-vphone","m-rname","m-room"].forEach(id =>
    document.getElementById(id).value = ""
  );
}
function backdropClose(e) {
  if (e.target === e.currentTarget) closeModal();
}
async function modalAction(action) {
  const vName  = document.getElementById("m-vname").value.trim();
  const vPhone = document.getElementById("m-vphone").value.trim();
  const rName  = document.getElementById("m-rname").value.trim();
  const rRoom  = document.getElementById("m-room").value.trim();

  if (!vName || !rName || !rRoom) {
    showToast("Please fill in all fields", "toast-err");
    return;
  }
  const btnId = action === "in" ? "modal-btn-in" : "modal-btn-out";
  setLoading(btnId, true);
  const ok = await addEntry(vName, vPhone, rName, rRoom, "", action);
  setLoading(btnId, false);
  if (ok) {
    closeModal();
    showSuccess(action, vName, rName, rRoom);
  }
}

// ── CSV Export ────────────────────────────────────────────────
function exportCSV() {
  const headers = ["Date","Visitor Name","Visitor Phone","Resident Name","Resident Phone","Room","Time In","Time Out","Status"];
  const rows = logs.map(l =>
    [l.date, l.vName, l.vPhone, l.rName, l.rPhone||"", l.rRoom,
     l.timeInStr||fmtTime(l.timeIn), l.timeOutStr||fmtTime(l.timeOut)||"", l.status]
      .map(v => `"${String(v||"").replace(/"/g,'""')}"`)
      .join(",")
  );
  const csv  = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `hostel-register-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  // Check if coordinator URL — must run first
  checkCoordURL();

  // Hostel name
  if (typeof HOSTEL_NAME !== "undefined" && HOSTEL_NAME) {
    const el = document.getElementById("hostel-name");
    if (el) el.textContent = HOSTEL_NAME;
    document.title = HOSTEL_NAME;
  }

  // Today's date on visitor form
  const dateEl = document.getElementById("v-date");
  if (dateEl) dateEl.value = new Date().toISOString().split("T")[0];

  // Connect to Google Sheets
  await Sheets.init();
});
