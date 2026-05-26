// app.js — Hostel Visitor Register

// ── State ────────────────────────────────────────────────────
let logs   = JSON.parse(localStorage.getItem("hostel_logs") || "[]").map(l => ({
  ...l,
  timeIn:  l.timeIn  ? new Date(l.timeIn)  : null,
  timeOut: l.timeOut ? new Date(l.timeOut) : null,
}));
let currentFilter = "all";

// ── Helpers ──────────────────────────────────────────────────
function saveLogs()       { localStorage.setItem("hostel_logs", JSON.stringify(logs)); }
function fmtTime(d)       { return d ? d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—"; }
function todayStr()       { return new Date().toLocaleDateString("en-GB"); }
function initials(name)   { return name.trim().split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase(); }

function showToast(msg, type) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className = "toast " + type + " show";
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 3500);
}

// ── Tab switching ─────────────────────────────────────────────
function switchTab(tab) {
  document.querySelectorAll(".tab").forEach((el, i) =>
    el.classList.toggle("active", (i === 0 && tab === "visitor") || (i === 1 && tab === "coordinator"))
  );
  document.getElementById("visitor-view").classList.toggle("active", tab === "visitor");
  document.getElementById("coordinator-view").classList.toggle("active", tab === "coordinator");
}

// ── Core record logic ─────────────────────────────────────────
function addEntry(vName, vPhone, rName, rRoom, rPhone, action) {
  const now     = new Date();
  const today   = todayStr();
  const timeStr = fmtTime(now);

  // If signing out, find existing sign-in row and update it
  if (action === "out") {
    const existing = logs.find(
      l => l.vName === vName && l.rRoom === rRoom && l.status === "in" && l.date === today
    );
    if (existing) {
      existing.status     = "out";
      existing.timeOut    = now;
      existing.timeOutStr = timeStr;
      saveLogs();
      updateStats();
      renderLogs();
      showToast("✓ Signed out: " + vName, "toast-out");
      Sheets.updateSignOut(existing);
      return;
    } else {
      showToast("No sign-in found for " + vName + " in room " + rRoom, "toast-err");
      return;
    }
  }

  // Sign in
  const entry = {
    id:         Date.now(),
    date:       today,
    vName,
    vPhone:     vPhone  || "",
    rName,
    rRoom,
    rPhone:     rPhone  || "",
    timeIn:     now,
    timeInStr:  timeStr,
    timeOut:    null,
    timeOutStr: "",
    status:     "in",
  };
  logs.unshift(entry);
  saveLogs();
  updateStats();
  renderLogs();
  showToast("✓ Signed in: " + vName, "toast-in");
  Sheets.appendRow(entry);
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
    el.innerHTML = '<p class="empty">No entries for this filter.</p>';
    return;
  }

  el.innerHTML = list.map(l => `
    <div class="log-item">
      <div class="log-avatar ${l.status === "in" ? "av-in" : "av-out"}">${initials(l.vName)}</div>
      <div class="log-main">
        <div class="log-visitor">${l.vName}</div>
        <div class="log-meta">Visiting <strong>${l.rName}</strong> · Room <strong>${l.rRoom}</strong></div>
        ${l.vPhone ? `<div class="log-phone"><i class="ti ti-phone"></i> ${l.vPhone}</div>` : ""}
      </div>
      <div class="log-right">
        <div class="log-time">In: ${l.timeInStr}</div>
        ${l.timeOutStr ? `<div class="log-time">Out: ${l.timeOutStr}</div>` : ""}
        <span class="pill ${l.status === "in" ? "pill-in" : "pill-out"}">
          ${l.status === "in" ? "Inside" : "Left"}
        </span>
        ${l.status === "in"
          ? `<br><button class="signout-btn" onclick="quickOut(${l.id})">Sign out</button>`
          : ""}
      </div>
    </div>
  `).join("");
}

// ── Quick sign-out from dashboard ─────────────────────────────
function quickOut(id) {
  const l = logs.find(e => e.id === id);
  if (!l) return;
  const now = new Date();
  l.status     = "out";
  l.timeOut    = now;
  l.timeOutStr = fmtTime(now);
  saveLogs();
  updateStats();
  renderLogs();
  showToast("✓ Signed out: " + l.vName, "toast-out");
  Sheets.updateSignOut(l);
}

// ── Filter ────────────────────────────────────────────────────
function setFilter(f, el) {
  currentFilter = f;
  document.querySelectorAll(".fpill").forEach(b => b.classList.remove("active"));
  el.classList.add("active");
  renderLogs();
}

// ── Form actions ──────────────────────────────────────────────
function doAction(action) {
  const vName  = document.getElementById("v-name").value.trim();
  const vPhone = document.getElementById("v-phone").value.trim();
  const rName  = document.getElementById("r-name").value.trim();
  const rRoom  = document.getElementById("r-room").value.trim();
  const rPhone = document.getElementById("r-phone").value.trim();

  if (!vName || !rName || !rRoom) {
    showToast("Please fill in visitor name, resident name & room number", "toast-err");
    return;
  }
  addEntry(vName, vPhone, rName, rRoom, rPhone, action);
  ["v-name","v-phone","r-name","r-room","r-phone"].forEach(id =>
    document.getElementById(id).value = ""
  );
}

// ── QR Modal ──────────────────────────────────────────────────
function openModal() {
  document.getElementById("qr-modal").classList.add("show");
  document.getElementById("m-vname").focus();
}
function closeModal() {
  document.getElementById("qr-modal").classList.remove("show");
  ["m-vname","m-vphone","m-rname","m-room"].forEach(id =>
    document.getElementById(id).value = ""
  );
}
function modalAction(action) {
  const vName  = document.getElementById("m-vname").value.trim();
  const vPhone = document.getElementById("m-vphone").value.trim();
  const rName  = document.getElementById("m-rname").value.trim();
  const rRoom  = document.getElementById("m-room").value.trim();

  if (!vName || !rName || !rRoom) {
    showToast("Please fill in all fields", "toast-err");
    return;
  }
  addEntry(vName, vPhone, rName, rRoom, "", action);
  closeModal();
}

// Close modal on backdrop click
document.getElementById("qr-modal").addEventListener("click", function(e) {
  if (e.target === this) closeModal();
});

// ── CSV Export ────────────────────────────────────────────────
function exportCSV() {
  const headers = ["Date","Visitor Name","Visitor Phone","Resident Name","Resident Phone","Room","Time In","Time Out","Status"];
  const rows = logs.map(l =>
    [l.date, l.vName, l.vPhone, l.rName, l.rPhone, l.rRoom, l.timeInStr, l.timeOutStr || "", l.status]
      .map(v => `"${String(v).replace(/"/g,'""')}"`)
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
document.addEventListener("DOMContentLoaded", () => {
  // Set hostel name
  if (typeof HOSTEL_NAME !== "undefined") {
    document.querySelector(".header-logo span").textContent = HOSTEL_NAME;
    document.title = HOSTEL_NAME;
  }

  // Set today's date on the form
  document.getElementById("v-date").value = new Date().toISOString().split("T")[0];

  // Init Sheets
  Sheets.init();

  // Render existing data
  updateStats();
  renderLogs();
});
