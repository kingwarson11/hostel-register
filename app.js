// app.js

// ── Helpers ───────────────────────────────────────────────────
function fmtTime(d)     { return d ? new Date(d).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"}) : "—"; }
function todayStr()     { return new Date().toLocaleDateString("en-GB"); }
function initials(name) { return (name||"?").trim().split(" ").map(w=>w[0]).join("").substring(0,2).toUpperCase(); }

function showToast(msg, type) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className   = "toast " + type + " show";
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 3500);
}

// Show a full-screen "already done today" message
function showAlreadyDone(state) {
  const screen = document.getElementById("success-screen");
  const form   = document.getElementById("visitor-form");

  if (state === "in") {
    document.getElementById("success-title").textContent = "Already signed in";
    document.getElementById("success-msg").textContent   =
      "You have already signed in today. Use the sign-out card below when you leave.";
    screen.className = "success-screen success-in";
  } else {
    document.getElementById("success-title").textContent = "Already signed out";
    document.getElementById("success-msg").textContent   =
      "You have already signed in and out today. You cannot sign in again until tomorrow.";
    screen.className = "success-screen success-out";
  }

  document.getElementById("success-time").textContent = "";
  // Change success icon to info
  const icon = screen.querySelector(".success-icon i");
  if (icon) icon.className = state === "in" ? "ti ti-info-circle" : "ti ti-calendar-off";

  screen.classList.remove("hidden");
  form.classList.add("hidden");
  // Don't auto-hide — user must tap Done
  clearTimeout(screen._t);
}

function setLoading(id, on) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.disabled = on;
  btn.dataset.orig = btn.dataset.orig || btn.innerHTML;
  btn.innerHTML = on ? `<span class="spinner"></span> Saving…` : btn.dataset.orig;
}

// ══════════════════════════════════════════════════════════════
//  VISITOR FORM
// ══════════════════════════════════════════════════════════════

// Track selected ID type and photo
let selectedIdType  = null;
let idPhotoBase64   = null;

function initVisitorForm() {
  const isOutsider = currentUser.role === "outsider";

  document.getElementById("visitor-first-name").textContent =
    currentUser.given || currentUser.name.split(" ")[0];

  if (isOutsider) {
    document.getElementById("autofill-banner").classList.add("hidden");
    document.getElementById("outsider-name-section").style.display = "block";
    document.getElementById("o-name").value = currentUser.name;
    document.getElementById("visitor-hero-icon").style.background =
      "linear-gradient(135deg,#fef3c7,#fde68a)";
  } else {
    document.getElementById("autofill-name").textContent  = currentUser.name;
    document.getElementById("autofill-email").textContent = currentUser.email;
    document.getElementById("outsider-name-section").style.display = "none";
  }

  // Reset new fields
  selectedIdType = null;
  idPhotoBase64  = null;
  document.querySelectorAll(".id-type-btn").forEach(b => b.classList.remove("selected"));
  document.getElementById("id-upload-field").classList.add("hidden");
  document.getElementById("id-preview").classList.add("hidden");
  document.getElementById("id-upload-placeholder").classList.remove("hidden");
  document.getElementById("id-retake-btn").classList.add("hidden");

  loadResidents();
  resetSignOutCard();
  loadStoredVisitInfo();
}

// ── Hostel radio toggle ───────────────────────────────────────
function onHostelChange() {
  const val = document.querySelector('input[name="hostel"]:checked')?.value;
  document.getElementById("hostel-a-label").classList.toggle("radio-selected", val === "Hostel A");
  document.getElementById("hostel-b-label").classList.toggle("radio-selected", val === "Hostel B");
}

// ── ID type selection ─────────────────────────────────────────
function selectIdType(btn) {
  document.querySelectorAll(".id-type-btn").forEach(b => b.classList.remove("selected"));
  btn.classList.add("selected");
  selectedIdType = btn.dataset.id;
  document.getElementById("id-upload-label").textContent =
    `Upload photo of your ${selectedIdType} *`;
  document.getElementById("id-upload-field").classList.remove("hidden");
  // Reset photo
  idPhotoBase64 = null;
  document.getElementById("id-preview").classList.add("hidden");
  document.getElementById("id-preview").src = "";
  document.getElementById("id-upload-placeholder").classList.remove("hidden");
  document.getElementById("id-retake-btn").classList.add("hidden");
}

// ── ID photo upload ───────────────────────────────────────────
function onIdPhotoSelected(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    idPhotoBase64 = e.target.result;  // base64 string
    const preview = document.getElementById("id-preview");
    preview.src = idPhotoBase64;
    preview.classList.remove("hidden");
    document.getElementById("id-upload-placeholder").classList.add("hidden");
    document.getElementById("id-retake-btn").classList.remove("hidden");
  };
  reader.readAsDataURL(file);
}

function retakeIdPhoto() {
  idPhotoBase64 = null;
  document.getElementById("id-file-input").value = "";
  document.getElementById("id-preview").classList.add("hidden");
  document.getElementById("id-preview").src = "";
  document.getElementById("id-upload-placeholder").classList.remove("hidden");
  document.getElementById("id-retake-btn").classList.add("hidden");
}

// ── Load stored visit info for sign-out card ──────────────────
async function loadStoredVisitInfo() {
  const entries = await fetchAllEntries();
  const today   = todayStr();
  const open    = entries.find(e =>
    e.visitorEmail === currentUser.email && e.date === today && e.status === "in"
  );
  if (open) {
    document.getElementById("svi-name").textContent     = open.visitorName;
    document.getElementById("svi-resident").textContent =
      `${open.residentName} · Room ${open.room} · ${open.hostel || ""}`;
    document.getElementById("svi-timein").textContent   = `Signed in at ${open.timeInStr}`;
    document.getElementById("stored-visit-info").classList.remove("hidden");
    // Store for sign-out use
    activeEntry = open;
  }
}

// ── SIGN IN ───────────────────────────────────────────────────
async function doSignIn() {
  const isOutsider = currentUser.role === "outsider";
  let vName;

  if (isOutsider) {
    vName = document.getElementById("o-name").value.trim();
    if (!vName) { showToast("Please enter your full name", "toast-err"); return; }
  } else {
    vName = currentUser.name;
  }

  // Validate all required fields
  const phone  = document.getElementById("v-phone").value.trim();
  const hostel = document.querySelector('input[name="hostel"]:checked')?.value;
  const room   = document.getElementById("room-input").value.trim();

  if (!phone)  { showToast("Please enter your phone number", "toast-err"); return; }
  if (!hostel) { showToast("Please select Hostel A or Hostel B", "toast-err"); return; }
  if (!selectedResident) {
    showToast("Please search and select the resident you are visiting", "toast-err");
    return;
  }
  if (!room) { showToast("Please enter the room number", "toast-err"); return; }
  if (!selectedIdType) { showToast("Please select your ID type", "toast-err"); return; }
  if (!idPhotoBase64) { showToast("Please upload a photo of your ID", "toast-err"); return; }

  // One sign-in AND one sign-out max per person per day
  const existing   = await fetchAllEntries();
  const today      = todayStr();
  const alreadyIn  = existing.find(e => e.visitorEmail === currentUser.email && e.date === today && e.status === "in");
  const alreadyOut = existing.find(e => e.visitorEmail === currentUser.email && e.date === today && e.status === "out");

  if (alreadyOut) { showAlreadyDone("out"); return; }
  if (alreadyIn)  { showAlreadyDone("in");  return; }

  const now   = new Date();
  const entry = {
    id:            Date.now().toString(),
    date:          today,
    visitorName:   vName,
    visitorEmail:  currentUser.email,
    visitorPhone:  phone,
    visitorRole:   currentUser.role,
    hostel,
    residentName:  selectedResident.name,
    residentEmail: selectedResident.email,
    room,
    idType:        selectedIdType,
    idPhoto:       idPhotoBase64,   // stored in Firebase, not Sheets
    timeIn:        now.toISOString(),
    timeInStr:     fmtTime(now),
    timeOut:       null,
    timeOutStr:    "",
    status:        "in",
  };

  setLoading("btn-sign-in", true);
  await writeEntry(entry);
  setLoading("btn-sign-in", false);

  // Show sign-out card with stored info immediately
  activeEntry = entry;
  document.getElementById("svi-name").textContent     = vName;
  document.getElementById("svi-resident").textContent =
    `${selectedResident.name} · Room ${room} · ${hostel}`;
  document.getElementById("svi-timein").textContent   = `Signed in at ${entry.timeInStr}`;
  document.getElementById("stored-visit-info").classList.remove("hidden");

  showSuccess("in", vName, selectedResident.name, room);
}

// ══════════════════════════════════════════════════════════════
//  SIGN-OUT PIN FLOW
// ══════════════════════════════════════════════════════════════

let currentSignOutPin = null;
let soBuffer          = "";
let activeEntry       = null;

function resetSignOutCard() {
  currentSignOutPin = null;
  soBuffer          = "";
  activeEntry       = null;
  document.getElementById("pin-request-step").classList.remove("hidden");
  document.getElementById("pin-entry-step").classList.add("hidden");
  document.getElementById("so-pin-error").classList.add("hidden");
  updateSoPinDots();
  const btn = document.getElementById("btn-sign-out");
  if (btn) btn.disabled = true;
}

async function requestSignOutPin() {
  const today   = todayStr();
  const entries = await fetchAllEntries();

  // Block if already signed out today
  const doneToday = entries.find(e =>
    e.visitorEmail === currentUser.email && e.date === today && e.status === "out"
  );
  if (doneToday) { showAlreadyDone("out"); return; }

  // Use stored activeEntry first, otherwise search Firebase
  if (!activeEntry) {
    activeEntry = entries.find(e =>
      e.visitorEmail === currentUser.email && e.status === "in" && e.date === today
    );
  }

  if (!activeEntry) {
    showToast("No active sign-in found. Please sign in first.", "toast-err");
    return;
  }

  // Generate random 4-digit PIN and store in Firebase
  const pin = String(Math.floor(1000 + Math.random() * 9000));
  currentSignOutPin = pin;

  // Save PIN to Firebase so it could be verified server-side in future
  if (firebaseDB) {
    await firebaseDB.ref("signout_pins/" + activeEntry.id).set({
      pin,
      visitorEmail: currentUser.email,
      createdAt:    Date.now(),
      expiresAt:    Date.now() + 5 * 60 * 1000,  // 5 min expiry
    });
  }

  // Show PIN and entry step
  document.getElementById("pin-reveal-digits").textContent = pin;
  document.getElementById("pin-request-step").classList.add("hidden");
  document.getElementById("pin-entry-step").classList.remove("hidden");
  soBuffer = "";
  updateSoPinDots();
  document.getElementById("so-pin-error").classList.add("hidden");
  document.getElementById("btn-sign-out").disabled = true;
}

function soPinPress(digit) {
  if (soBuffer.length >= 4) return;
  soBuffer += digit;
  updateSoPinDots();
  if (soBuffer.length === 4) {
    setTimeout(checkSoPin, 120);
  }
}

function soPinDel() {
  soBuffer = soBuffer.slice(0, -1);
  updateSoPinDots();
  document.getElementById("so-pin-error").classList.add("hidden");
}

function updateSoPinDots() {
  const dots = document.querySelectorAll("#so-pin-dots span");
  dots.forEach((d, i) => d.classList.toggle("filled", i < soBuffer.length));
}

function checkSoPin() {
  if (soBuffer === currentSignOutPin) {
    document.getElementById("so-pin-error").classList.add("hidden");
    document.getElementById("btn-sign-out").disabled = false;
    // Flash the PIN box green
    const box = document.getElementById("pin-reveal-box");
    box.classList.add("pin-correct");
    showToast("PIN correct — tap Sign Out", "toast-in");
  } else {
    document.getElementById("so-pin-error").classList.remove("hidden");
    document.querySelectorAll("#so-pin-dots span").forEach(d => d.classList.add("shake"));
    setTimeout(() => {
      soBuffer = "";
      updateSoPinDots();
      document.querySelectorAll("#so-pin-dots span").forEach(d => d.classList.remove("shake"));
    }, 600);
  }
}

async function doSignOut() {
  if (!activeEntry) { showToast("No active sign-in found", "toast-err"); return; }
  if (soBuffer !== currentSignOutPin) { showToast("PIN mismatch", "toast-err"); return; }

  const now          = new Date();
  activeEntry.status     = "out";
  activeEntry.timeOut    = now.toISOString();
  activeEntry.timeOutStr = fmtTime(now);

  setLoading("btn-sign-out", true);
  await updateSignOut(activeEntry);

  // Clean up pin from Firebase
  if (firebaseDB) firebaseDB.ref("signout_pins/" + activeEntry.id).remove();

  setLoading("btn-sign-out", false);
  clearResident();
  resetSignOutCard();
  showSuccess("out",
    activeEntry.visitorName,
    activeEntry.residentName,
    activeEntry.room
  );
}

function cancelPin() {
  currentSignOutPin = null;
  soBuffer          = "";
  if (firebaseDB && activeEntry) {
    firebaseDB.ref("signout_pins/" + activeEntry.id).remove();
  }
  activeEntry = null;
  document.getElementById("pin-request-step").classList.remove("hidden");
  document.getElementById("pin-entry-step").classList.add("hidden");
  document.getElementById("pin-reveal-box").classList.remove("pin-correct");
}

// ── Success screen ────────────────────────────────────────────
function showSuccess(action, vName, rName, room) {
  const isIn = action === "in";
  document.getElementById("success-title").textContent = isIn ? "✓ Signed in!"  : "✓ Signed out!";
  document.getElementById("success-msg").textContent   = isIn
    ? `Welcome ${vName.split(" ")[0]}! Visiting ${rName} in Room ${room}.`
    : `Goodbye ${vName.split(" ")[0]}! Safe travels.`;
  document.getElementById("success-time").textContent  = "At " + fmtTime(new Date());

  const screen = document.getElementById("success-screen");
  screen.className = "success-screen " + (isIn ? "success-in" : "success-out");
  screen.classList.remove("hidden");
  document.getElementById("visitor-form").classList.add("hidden");
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
let lastKnownCount = -1;

function initAdminDashboard() {
  document.getElementById("coord-date").textContent =
    new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"});

  if (typeof SHEET_URL === "string" && SHEET_URL.startsWith("https://")) {
    const l = document.getElementById("sheet-link");
    l.href  = SHEET_URL;
    l.classList.remove("hidden");
  }

  // Real-time listener
  listenForEntries(entries => {
    const isFirst = lastKnownCount === -1;
    allEntries    = entries;
    updateStats();
    renderLogs();
    flashRefresh();
    if (isFirst) lastKnownCount = entries.length;
  });

  // Notification listener — fires after initial load
  setTimeout(() => {
    listenForNewEntries((entry, type) => pushNotif(entry, type));
  }, 2500);
}

async function fetchEntries() {
  allEntries = await fetchAllEntries();
  updateStats();
  renderLogs();
  flashRefresh();
}

// ── Stats ─────────────────────────────────────────────────────
function updateStats() {
  document.getElementById("s-in").textContent    = allEntries.filter(e=>e.status==="in").length;
  document.getElementById("s-out").textContent   = allEntries.filter(e=>e.status==="out").length;
  document.getElementById("s-total").textContent = allEntries.length;
}

// ── Log ───────────────────────────────────────────────────────
function renderLogs() {
  const el = document.getElementById("log-list");
  let list = allEntries;
  if (currentFilter==="in")       list = allEntries.filter(e=>e.status==="in");
  else if (currentFilter==="out") list = allEntries.filter(e=>e.status==="out");
  else if (currentFilter==="student")  list = allEntries.filter(e=>e.visitorRole==="student");
  else if (currentFilter==="outsider") list = allEntries.filter(e=>e.visitorRole==="outsider");

  if (!list.length) {
    el.innerHTML = `<div class="empty-state">
      <i class="ti ti-clipboard-list"></i>
      <p>${currentFilter==="all"?"No entries today":"No entries for this filter"}</p>
      <span>Sign-ins appear here in real time</span></div>`;
    return;
  }

  el.innerHTML = list.map(e => {
    const tag = e.visitorRole==="outsider"
      ? `<span class="visitor-role-tag tag-outsider">Guest</span>`
      : `<span class="visitor-role-tag tag-student">Student</span>`;
    return `<div class="log-item">
      <div class="log-avatar ${e.status==="in"?"av-in":"av-out"}">${initials(e.visitorName)}</div>
      <div class="log-body">
        <div class="log-name-row"><span class="log-name">${e.visitorName}</span>${tag}</div>
        <div class="log-meta">Visiting <strong>${e.residentName}</strong> · Room <strong>${e.room}</strong>${e.hostel?` · <strong>${e.hostel}</strong>`:""}</div>
        <div class="log-email"><i class="ti ti-mail"></i> ${e.visitorEmail}</div>
        ${e.visitorPhone?`<div class="log-phone"><i class="ti ti-phone"></i> ${e.visitorPhone}</div>`:""}
        ${e.idType?`<div class="log-phone"><i class="ti ti-id-badge"></i> ${e.idType}${e.idPhoto?` <a href="${e.idPhoto}" target="_blank" class="id-view-link">View ID</a>`:""}</div>`:""}
      </div>
      <div class="log-right">
        <div class="log-time">In: ${e.timeInStr||fmtTime(e.timeIn)}</div>
        ${e.timeOutStr?`<div class="log-time">Out: ${e.timeOutStr}</div>`:""}
        <span class="pill ${e.status==="in"?"pill-in":"pill-out"}">${e.status==="in"?"Inside":"Left"}</span>
        ${e.status==="in"
          ?`<button class="signout-btn" onclick="adminSignOut('${e.id}')">Sign out</button>`:""}
      </div></div>`;
  }).join("");
}

async function adminSignOut(id) {
  const e = allEntries.find(x=>x.id===id);
  if (!e) return;
  const now=new Date();
  e.status="out"; e.timeOut=now.toISOString(); e.timeOutStr=fmtTime(now);
  renderLogs();
  await updateSignOut(e);
  showToast("✓ Signed out: "+e.visitorName,"toast-out");
}

function setFilter(f,el) {
  currentFilter=f;
  document.querySelectorAll(".fpill").forEach(b=>b.classList.remove("active"));
  el.classList.add("active");
  renderLogs();
}

function flashRefresh() {
  const b=document.getElementById("refresh-badge");
  if (!b) return;
  b.classList.add("flash");
  setTimeout(()=>b.classList.remove("flash"),2000);
}

// ══════════════════════════════════════════════════════════════
//  STACKED NOTIFICATIONS (pile up, each auto-dismisses in 10s)
// ══════════════════════════════════════════════════════════════
let notifCounter = 0;

function pushNotif(entry, type) {
  const isIn  = entry.status === "in";
  const id    = "notif-" + (++notifCounter);
  const stack = document.getElementById("notif-stack");

  const el = document.createElement("div");
  el.id        = id;
  el.className = "notif-pill " + (isIn ? "notif-pill-in" : "notif-pill-out");
  el.innerHTML = `
    <div class="notif-inner-flex">
      <div class="np-icon">${isIn ? '<i class="ti ti-door-enter"></i>' : '<i class="ti ti-door-exit"></i>'}</div>
      <div class="np-body">
        <div class="np-label">${isIn ? "Signed in" : "Signed out"}</div>
        <div class="np-name">${entry.visitorName}</div>
        <div class="np-detail">${entry.residentName} · Room ${entry.room}${entry.hostel ? " · " + entry.hostel : ""}</div>
        <div class="np-time">At ${isIn ? (entry.timeInStr||fmtTime(entry.timeIn)) : (entry.timeOutStr||fmtTime(new Date()))}</div>
      </div>
      <button class="np-close" onclick="dismissNotif('${id}')"><i class="ti ti-x"></i></button>
    </div>
    <div class="np-progress"></div>
  `;

  stack.appendChild(el);

  // Entrance animation
  requestAnimationFrame(() => el.classList.add("notif-pill-show"));

  // Auto-dismiss after 10s
  el._timer = setTimeout(() => dismissNotif(id), 10000);
}

function dismissNotif(id) {
  const el = document.getElementById(id);
  if (!el) return;
  clearTimeout(el._timer);
  el.classList.remove("notif-pill-show");
  el.classList.add("notif-pill-hide");
  setTimeout(() => el.remove(), 400);
}

// ── CSV export ────────────────────────────────────────────────
function exportCSV() {
  const h = ["Date","Visitor Name","Email","Phone","Role","Hostel","Resident Name","Resident Email","Room","ID Type","Time In","Time Out","Status"];
  const r = allEntries.map(e=>
    [e.date,e.visitorName,e.visitorEmail,e.visitorPhone||"",e.visitorRole||"",
     e.hostel||"",e.residentName,e.residentEmail||"",e.room,e.idType||"",
     e.timeInStr||fmtTime(e.timeIn),e.timeOutStr||"",e.status]
      .map(v=>`"${String(v||"").replace(/"/g,'""')}"`)
      .join(",")
  );
  const blob=new Blob([[h.join(","),...r].join("\n")],{type:"text/csv"});
  const a=Object.assign(document.createElement("a"),{
    href:URL.createObjectURL(blob),
    download:`hostel-${new Date().toISOString().slice(0,10)}.csv`
  });
  a.click(); URL.revokeObjectURL(a.href);
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  if (typeof HOSTEL_NAME !== "undefined") {
    document.title = HOSTEL_NAME;
    const n = document.getElementById("hostel-name");
    if (n) n.textContent = HOSTEL_NAME;
  }
});
