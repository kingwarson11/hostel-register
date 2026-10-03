// app.js

// ── Helpers ───────────────────────────────────────────────────
function fmtTime(d)  { return d ? new Date(d).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"}) : "—"; }
function todayStr()  { return new Date().toLocaleDateString("en-GB"); }
function initials(n) { return (n||"?").trim().split(" ").map(w=>w[0]).join("").substring(0,2).toUpperCase(); }
function cap(s)      { return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : ""; }

function nameFromEmail(email) {
  if (!email) return "";
  const local = email.split("@")[0];
  return local.split(/[._-]/).map(cap).join(" ");
}

function showToast(msg, type) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className   = "toast " + type + " show";
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 3500);
}

function showAlreadyDone(state) {
  const screen = document.getElementById("success-screen");
  const form   = document.getElementById("visitor-form");
  const icon   = screen.querySelector(".success-icon i");
  if (state === "in") {
    document.getElementById("success-title").textContent = "Already signed in";
    document.getElementById("success-msg").textContent   =
      "You are already signed in today. Use the sign-out card below when you leave.";
    screen.className = "success-screen success-in";
    if (icon) icon.className = "ti ti-info-circle";
  } else {
    document.getElementById("success-title").textContent = "Already signed out";
    document.getElementById("success-msg").textContent   =
      "You have already signed in and out today. See you tomorrow!";
    screen.className = "success-screen success-out";
    if (icon) icon.className = "ti ti-calendar-off";
  }
  document.getElementById("success-time").textContent = "";
  screen.classList.remove("hidden");
  form.classList.add("hidden");
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
//  NAME FROM EMAIL
// ══════════════════════════════════════════════════════════════
function resolveFullName(user) {
  if (user.name && !user.name.includes("@") && user.name.trim().split(" ").length >= 2) {
    return user.name.trim().split(" ").map(cap).join(" ");
  }
  return nameFromEmail(user.email);
}

// ══════════════════════════════════════════════════════════════
//  VISITOR FORM
// ══════════════════════════════════════════════════════════════
let selectedIdType = null;
let idPhotoBase64  = null;
let activeEntry    = null;
let savedFormData  = null;

function initVisitorForm() {
  const fullName = resolveFullName(currentUser);
  currentUser.name  = fullName;
  currentUser.given = fullName.split(" ")[0];

  document.getElementById("visitor-first-name").textContent = currentUser.given;

  const banner = document.getElementById("autofill-banner");
  banner.classList.remove("hidden");
  document.getElementById("autofill-name").textContent  = fullName;
  document.getElementById("autofill-email").textContent = currentUser.email;
  document.getElementById("outsider-name-section").style.display = "none";

  if (currentUser.role === "outsider") {
    document.getElementById("visitor-hero-icon").style.background =
      "linear-gradient(135deg,#fef3c7,#fde68a)";
  }

  // Reset ID fields
  selectedIdType = null;
  idPhotoBase64  = null;
  document.querySelectorAll(".id-type-btn").forEach(b => b.classList.remove("selected"));
  document.getElementById("id-upload-field").classList.add("hidden");
  const pw = document.getElementById("id-preview-wrap");
  if (pw) pw.classList.add("hidden");
  const ub = document.getElementById("id-upload-btns");
  if (ub) ub.classList.remove("hidden");

  if (savedFormData) restoreFormData();

  loadResidents();
  resetSignOutCard();
  loadStoredVisitInfo();
}

function saveFormData() {
  savedFormData = {
    phone:    document.getElementById("v-phone").value.trim(),
    hostel:   document.querySelector('input[name="hostel"]:checked')?.value || "",
    room:     document.getElementById("room-input").value.trim(),
    resident: selectedResident,
    idType:   selectedIdType,
    idPhoto:  idPhotoBase64,
  };
}

function restoreFormData() {
  if (!savedFormData) return;
  if (savedFormData.phone) document.getElementById("v-phone").value = savedFormData.phone;
  if (savedFormData.room)  document.getElementById("room-input").value = savedFormData.room;
  if (savedFormData.hostel) {
    const radio = document.querySelector(`input[name="hostel"][value="${savedFormData.hostel}"]`);
    if (radio) { radio.checked = true; onHostelChange(); }
  }
  if (savedFormData.resident) {
    selectedResident = savedFormData.resident;
    document.getElementById("sel-avatar").textContent = initials(selectedResident.name);
    document.getElementById("sel-name").textContent   = selectedResident.name;
    document.getElementById("sel-room").textContent   = "Room " + selectedResident.room;
    document.getElementById("selected-resident").classList.remove("hidden");
  }
  if (savedFormData.idType) {
    selectedIdType = savedFormData.idType;
    document.querySelectorAll(".id-type-btn").forEach(b => {
      if (b.dataset.id === selectedIdType) b.classList.add("selected");
    });
    document.getElementById("id-upload-field").classList.remove("hidden");
    document.getElementById("id-upload-label").textContent = `Photo of your ${selectedIdType} *`;
  }
  if (savedFormData.idPhoto) {
    idPhotoBase64 = savedFormData.idPhoto;
    const prev = document.getElementById("id-preview");
    if (prev) prev.src = idPhotoBase64;
    const pw = document.getElementById("id-preview-wrap");
    if (pw) pw.classList.remove("hidden");
    const ub = document.getElementById("id-upload-btns");
    if (ub) ub.classList.add("hidden");
  }
}

// ── Hostel selection ──────────────────────────────────────────
function onHostelChange() {
  const val = document.querySelector('input[name="hostel"]:checked')?.value;
  document.getElementById("hostel-a-label").classList.toggle("radio-selected", val === "Hostel A");
  document.getElementById("hostel-b-label").classList.toggle("radio-selected", val === "Hostel B");

  // Update room input placeholder
  const roomEl = document.getElementById("room-input");
  if (roomEl) roomEl.placeholder = val ? `Enter room number in ${val}` : "Enter room number";

  // Clear room / resident if hostel changed
  clearResident();
}

// ── ID type ───────────────────────────────────────────────────
function selectIdType(btn) {
  document.querySelectorAll(".id-type-btn").forEach(b => b.classList.remove("selected"));
  btn.classList.add("selected");
  selectedIdType = btn.dataset.id;
  document.getElementById("id-upload-label").textContent = `Photo of your ${selectedIdType} *`;
  document.getElementById("id-upload-field").classList.remove("hidden");
  idPhotoBase64 = null;
  const pw = document.getElementById("id-preview-wrap");
  if (pw) pw.classList.add("hidden");
  const ub = document.getElementById("id-upload-btns");
  if (ub) ub.classList.remove("hidden");
}

// ── ID photo ──────────────────────────────────────────────────
function onIdPhotoSelected(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    idPhotoBase64 = e.target.result;
    const prev = document.getElementById("id-preview");
    if (prev) prev.src = idPhotoBase64;
    const pw = document.getElementById("id-preview-wrap");
    if (pw) pw.classList.remove("hidden");
    const ub = document.getElementById("id-upload-btns");
    if (ub) ub.classList.add("hidden");
    input.value = "";
  };
  reader.readAsDataURL(file);
}

function retakeIdPhoto() {
  idPhotoBase64 = null;
  const pw = document.getElementById("id-preview-wrap");
  if (pw) pw.classList.add("hidden");
  const ub = document.getElementById("id-upload-btns");
  if (ub) ub.classList.remove("hidden");
  const prev = document.getElementById("id-preview");
  if (prev) prev.src = "";
}

// ── Sign-out card ─────────────────────────────────────────────
function resetSignOutCard() {
  activeEntry       = null;
  currentSignOutPin = null;
  soPinBuffer       = "";
  const svi = document.getElementById("stored-visit-info");
  if (svi) svi.classList.add("hidden");
  const req = document.getElementById("so-request-step");
  if (req) req.classList.remove("hidden");
  const ent = document.getElementById("so-enter-step");
  if (ent) ent.classList.add("hidden");
  const err = document.getElementById("so-pin-error");
  if (err) err.classList.add("hidden");
  const btn = document.getElementById("btn-sign-out");
  if (btn) btn.disabled = true;
  updateSoPinDots();
}

async function loadStoredVisitInfo() {
  const entries = await fetchAllEntries();
  const open = entries.find(e =>
    e.visitorEmail === currentUser.email && e.status === "in"
  );
  if (open) {
    showSignOutInfo(open);
    activeEntry = open;
  }
}

function showSignOutInfo(entry) {
  document.getElementById("svi-name").textContent =
    entry.visitorName + " · " + (entry.visitorRole === "outsider" ? "Guest" : "Student");
  document.getElementById("svi-resident").textContent =
    `${entry.residentName} · Room ${entry.room}${entry.hostel ? " · " + entry.hostel : ""}`;
  document.getElementById("svi-timein").textContent = `Signed in at ${entry.timeInStr}`;
  document.getElementById("stored-visit-info").classList.remove("hidden");
}

// ══════════════════════════════════════════════════════════════
//  SIGN IN
// ══════════════════════════════════════════════════════════════
let signingIn = false;  // guard against double-tap

async function doSignIn() {
  if (signingIn) return;
  const fullName = currentUser.name;
  const phone    = document.getElementById("v-phone").value.trim();
  const hostel   = document.querySelector('input[name="hostel"]:checked')?.value;
  const room     = document.getElementById("room-input").value.trim().toUpperCase();

  if (!phone)           { showToast("Please enter your phone number", "toast-err"); return; }
  if (typeof isPhoneValid === "function" && !isPhoneValid()) {
    showToast("Phone number length is incorrect for the selected country", "toast-err"); return;
  }
  if (!hostel)          { showToast("Please select Hostel A or Hostel B", "toast-err"); return; }
  if (!selectedResident){ showToast("Please select the resident you are visiting", "toast-err"); return; }
  if (!room)            { showToast("Please enter the room number", "toast-err"); return; }
  if (!selectedIdType)  { showToast("Please select your ID type", "toast-err"); return; }
  if (!idPhotoBase64)   { showToast("Please upload a photo of your ID", "toast-err"); return; }

  // No restriction — visitor can sign in multiple times

  const now   = new Date();
  const entry = {
    id:            Date.now().toString(),
    date:          today,
    visitorName:   fullName,
    visitorEmail:  currentUser.email,
    visitorPhone:  phone,
    visitorRole:   currentUser.role,
    hostel,
    residentName:  selectedResident.name,
    residentEmail: selectedResident.email,
    room,
    idType:        selectedIdType,
    idPhoto:       idPhotoBase64,
    timeIn:        now.toISOString(),
    timeInStr:     fmtTime(now),
    timeOut:       null,
    timeOutStr:    "",
    status:        "in",
  };

  signingIn = true;
  setLoading("btn-sign-in", true);
  await writeEntry(entry);
  setLoading("btn-sign-in", false);
  signingIn = false;

  saveFormData();
  activeEntry = entry;
  showSignOutInfo(entry);
  showSuccess("in", fullName, selectedResident.name, room);
}

// ══════════════════════════════════════════════════════════════
//  SIGN-OUT PIN FLOW
//  Visitor requests code → admin sees popup with code →
//  admin tells visitor → visitor types code → signs out
// ══════════════════════════════════════════════════════════════
let currentSignOutPin = null;
let soPinBuffer       = "";

async function requestSignOutCode() {
  const entries = await fetchAllEntries();

  if (!activeEntry) {
    activeEntry = entries.find(e =>
      e.visitorEmail === currentUser.email && e.status === "in"
    );
  }

  if (!activeEntry) {
    showToast("No active sign-in found. Please sign in first.", "toast-err");
    return;
  }

  // Generate random 4-digit code
  const code = String(Math.floor(1000 + Math.random() * 9000));
  currentSignOutPin = code;

  const expiresAt = Date.now() + 2 * 60 * 1000;

  // Store code in Firebase so admin can see it in real-time
  if (firebaseDB) {
    await firebaseDB.ref("signout_codes/" + activeEntry.id).set({
      code,
      visitorName:  activeEntry.visitorName,
      visitorEmail: activeEntry.visitorEmail,
      residentName: activeEntry.residentName,
      room:         activeEntry.room,
      hostel:       activeEntry.hostel || "",
      requestedAt:  Date.now(),
      expiresAt,
    });
  }

  // Show PIN entry step to visitor
  document.getElementById("so-request-step").classList.add("hidden");
  document.getElementById("so-enter-step").classList.remove("hidden");
  soPinBuffer = "";
  updateSoPinDots();
  document.getElementById("so-pin-error").classList.add("hidden");
  const btn = document.getElementById("btn-sign-out");
  if (btn) btn.disabled = true;

  // Start live 2-minute countdown for visitor
  startSignOutCountdown(expiresAt);
}

let countdownTimer = null;

function startSignOutCountdown(expiresAt) {
  clearInterval(countdownTimer);
  const countEl = document.getElementById("so-countdown");

  function tick() {
    const remaining = expiresAt - Date.now();
    if (!countEl) return;
    if (remaining <= 0) {
      clearInterval(countdownTimer);
      countEl.textContent = "Code expired";
      countEl.className   = "so-countdown expired";
      // Auto-cancel after expiry
      setTimeout(() => {
        cancelSignOutCode();
        showToast("Sign-out code expired — request a new one", "toast-err");
      }, 1000);
      return;
    }
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    countEl.textContent = `Code expires in ${mins}:${String(secs).padStart(2,"0")}`;
    countEl.className   = remaining < 30000 ? "so-countdown urgent" : "so-countdown";
  }
  tick();
  countdownTimer = setInterval(tick, 1000);
}

function soPinPress(digit) {
  if (soPinBuffer.length >= 4) return;
  soPinBuffer += digit;
  updateSoPinDots();
  if (soPinBuffer.length === 4) setTimeout(checkSoPin, 120);
}

function soPinDel() {
  soPinBuffer = soPinBuffer.slice(0, -1);
  updateSoPinDots();
  document.getElementById("so-pin-error").classList.add("hidden");
}

function updateSoPinDots() {
  for (let i = 0; i < 4; i++) {
    const dot = document.getElementById("sd" + i);
    if (dot) dot.classList.toggle("filled", i < soPinBuffer.length);
  }
}

function checkSoPin() {
  if (soPinBuffer === currentSignOutPin) {
    document.getElementById("so-pin-error").classList.add("hidden");
    const btn = document.getElementById("btn-sign-out");
    if (btn) { btn.disabled = false; btn.classList.add("btn-unlocked"); }
    showToast("Code correct — tap Sign Out", "toast-in");
  } else {
    document.getElementById("so-pin-error").classList.remove("hidden");
    document.querySelectorAll(".so-pin-dots span").forEach(d => d.classList.add("shake"));
    setTimeout(() => {
      soPinBuffer = "";
      updateSoPinDots();
      document.querySelectorAll(".so-pin-dots span").forEach(d => d.classList.remove("shake"));
    }, 600);
  }
}

function cancelSignOutCode() {
  clearInterval(countdownTimer);
  currentSignOutPin = null;
  soPinBuffer       = "";
  if (firebaseDB && activeEntry) {
    firebaseDB.ref("signout_codes/" + activeEntry.id).remove();
  }
  document.getElementById("so-request-step").classList.remove("hidden");
  document.getElementById("so-enter-step").classList.add("hidden");
  const countEl = document.getElementById("so-countdown");
  if (countEl) countEl.textContent = "";
  updateSoPinDots();
}

async function doSignOut() {
  if (!activeEntry)                          { showToast("No active sign-in found.", "toast-err"); return; }
  if (soPinBuffer !== currentSignOutPin)     { showToast("Incorrect code.", "toast-err"); return; }

  const now          = new Date();
  activeEntry.status     = "out";
  activeEntry.timeOut    = now.toISOString();
  activeEntry.timeOutStr = fmtTime(now);

  clearInterval(countdownTimer);
  setLoading("btn-sign-out", true);
  await updateSignOut(activeEntry);

  // Clean up code from Firebase
  if (firebaseDB) firebaseDB.ref("signout_codes/" + activeEntry.id).remove();

  setLoading("btn-sign-out", false);

  const name  = activeEntry.visitorName;
  const rName = activeEntry.residentName;
  const room  = activeEntry.room;

  savedFormData = null;
  clearResident();
  resetSignOutCard();
  showSuccess("out", name, rName, room);
}

// ── Success screen ────────────────────────────────────────────
function showSuccess(action, vName, rName, room) {
  const isIn = action === "in";
  document.getElementById("success-title").textContent = isIn ? "✓ Signed in!" : "✓ Signed out!";
  document.getElementById("success-msg").textContent   = isIn
    ? `Welcome ${vName.split(" ")[0]}! Visiting ${rName} in Room ${room}.`
    : `Goodbye ${vName.split(" ")[0]}! Safe travels.`;
  document.getElementById("success-time").textContent = "At " + fmtTime(new Date());
  const screen = document.getElementById("success-screen");
  screen.className = "success-screen " + (isIn ? "success-in" : "success-out");
  const icon = screen.querySelector(".success-icon i");
  if (icon) icon.className = "ti ti-circle-check";
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
//  ADMIN — Tab switching
// ══════════════════════════════════════════════════════════════
function switchAdminTab(tab) {
  document.getElementById("tab-dashboard").classList.toggle("active", tab === "dashboard");
  document.getElementById("tab-residents").classList.toggle("active", tab === "residents");
  document.getElementById("admin-dashboard-panel").classList.toggle("hidden", tab !== "dashboard");
  document.getElementById("admin-residents-panel").classList.toggle("hidden", tab !== "residents");
  if (tab === "residents") renderResidentList();
}

// ══════════════════════════════════════════════════════════════
//  ADMIN — Dashboard
// ══════════════════════════════════════════════════════════════
let allEntries     = [];
let currentFilter  = "all";
let logSearchQuery = "";

function initAdminDashboard() {
  document.getElementById("coord-date").textContent =
    new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"});

  if (typeof SHEET_URL === "string" && SHEET_URL.startsWith("https://")) {
    const l = document.getElementById("sheet-link");
    if (l) { l.href = SHEET_URL; l.classList.remove("hidden"); }
  }

  // Live entries listener — rebuilds the log every time Firebase updates
  listenForEntries(entries => {
    allEntries = entries;
    updateStats();
    renderLogs();
    flashRefresh();
  });

  // Notification listener — only fires for genuinely new events
  // Small delay so initial load IDs are marked as seen first
  setTimeout(() => listenForNewEntries((entry) => pushNotif(entry)), 1000);

  // Listen for sign-out code requests — show admin popup
  listenForSignOutCodes();

  loadAdminResidents();
}

async function fetchEntries() {
  allEntries = await fetchAllEntries();
  updateStats(); renderLogs(); flashRefresh();
}

function updateStats() {
  document.getElementById("s-in").textContent    = allEntries.filter(e=>e.status==="in").length;
  document.getElementById("s-out").textContent   = allEntries.filter(e=>e.status==="out").length;
  document.getElementById("s-total").textContent = allEntries.length;
}

// ── Log search ────────────────────────────────────────────────
function filterLog(q) {
  logSearchQuery = q.toLowerCase();
  const clearBtn = document.getElementById("admin-search-clear");
  if (clearBtn) clearBtn.classList.toggle("hidden", !q);
  renderLogs();
}

function clearLogSearch() {
  logSearchQuery = "";
  const inp = document.getElementById("admin-search");
  if (inp) inp.value = "";
  const clearBtn = document.getElementById("admin-search-clear");
  if (clearBtn) clearBtn.classList.add("hidden");
  renderLogs();
}

function renderLogs() {
  const el = document.getElementById("log-list");
  let list = allEntries;

  // Filter by tab
  if (currentFilter==="in")       list = allEntries.filter(e=>e.status==="in");
  else if (currentFilter==="out") list = allEntries.filter(e=>e.status==="out");
  else if (currentFilter==="student")  list = allEntries.filter(e=>e.visitorRole==="student");
  else if (currentFilter==="outsider") list = allEntries.filter(e=>e.visitorRole==="outsider");

  // Apply search query
  if (logSearchQuery) {
    const q = logSearchQuery;
    list = list.filter(e =>
      (e.visitorName||"").toLowerCase().includes(q) ||
      (e.visitorEmail||"").toLowerCase().includes(q) ||
      (e.residentName||"").toLowerCase().includes(q) ||
      (e.room||"").toLowerCase().includes(q) ||
      (e.hostel||"").toLowerCase().includes(q)
    );
  }

  if (!list.length) {
    el.innerHTML = `<div class="empty-state"><i class="ti ti-clipboard-list"></i>
      <p>${logSearchQuery ? "No results for: " + logSearchQuery : currentFilter==="all"?"No entries today":"No entries for this filter"}</p>
      <span>${logSearchQuery ? "Try a different name or room" : "Sign-ins appear here in real time"}</span></div>`;
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
        <div class="log-meta">→ <strong>${e.residentName}</strong> · Room <strong>${e.room}</strong>${e.hostel?` · ${e.hostel}`:""}</div>
        <div class="log-email"><i class="ti ti-mail"></i> ${e.visitorEmail}</div>
        ${e.visitorPhone?`<div class="log-phone"><i class="ti ti-phone"></i> ${e.visitorPhone}</div>`:""}
        ${e.idType?`<div class="log-phone"><i class="ti ti-id-badge"></i> ${e.idType}
          ${e.idPhoto?`<a href="${e.idPhoto}" target="_blank" class="id-view-link"><i class="ti ti-eye"></i> View ID</a>`:""}</div>`:""}
      </div>
      <div class="log-right">
        <div class="log-time"><i class="ti ti-login"></i> ${e.timeInStr||fmtTime(e.timeIn)}</div>
        ${e.timeOutStr?`<div class="log-time"><i class="ti ti-logout"></i> ${e.timeOutStr}</div>`:""}
        <span class="pill ${e.status==="in"?"pill-in":"pill-out"}">${e.status==="in"?"Inside":"Left"}</span>
        ${e.status==="in"?`<button class="signout-btn" onclick="adminSignOut('${e.id}')">Sign out</button>`:""}
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
  showToast("✓ Signed out: "+e.visitorName, "toast-out");
}

function setFilter(f, el) {
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

// ── Admin sign-out code listener ──────────────────────────────
function listenForSignOutCodes() {
  if (!firebaseDB) return;
  firebaseDB.ref("signout_codes").on("child_added", snap => {
    const data = snap.val();
    if (!data) return;
    // Check it hasn't expired
    if (data.expiresAt && Date.now() > data.expiresAt) return;
    showAdminSignOutPopup(data);
  });
}

function showAdminSignOutPopup(data) {
  document.getElementById("asc-visitor-name").textContent =
    data.visitorName + " wants to sign out";
  document.getElementById("asc-detail").textContent =
    `Visiting ${data.residentName} · Room ${data.room}${data.hostel ? " · " + data.hostel : ""}`;
  document.getElementById("asc-code").textContent = data.code;

  // Countdown timer
  const expiresIn = Math.round((data.expiresAt - Date.now()) / 1000 / 60);
  document.getElementById("asc-expires").textContent = `Valid for ${expiresIn} minute${expiresIn!==1?"s":""}`;

  document.getElementById("admin-signout-overlay").classList.remove("hidden");
}

function dismissSignOutCode() {
  document.getElementById("admin-signout-overlay").classList.add("hidden");
}

// ══════════════════════════════════════════════════════════════
//  NOTIFICATIONS (stacked pills)
// ══════════════════════════════════════════════════════════════
let notifCounter = 0;

function pushNotif(entry) {
  const isIn  = entry.status === "in";
  const id    = "notif-" + (++notifCounter);
  const stack = document.getElementById("notif-stack");
  if (!stack) return;

  const el = document.createElement("div");
  el.id        = id;
  el.className = "notif-pill " + (isIn ? "notif-pill-in" : "notif-pill-out");
  el.innerHTML = `
    <div class="notif-inner-flex">
      <div class="np-icon">${isIn?"<i class='ti ti-door-enter'></i>":"<i class='ti ti-door-exit'></i>"}</div>
      <div class="np-body">
        <div class="np-label">${isIn?"Signed in":"Signed out"}</div>
        <div class="np-name">${entry.visitorName}</div>
        <div class="np-detail">→ ${entry.residentName} · Room ${entry.room}${entry.hostel?" · "+entry.hostel:""}</div>
        <div class="np-time">At ${isIn?(entry.timeInStr||fmtTime(entry.timeIn)):(entry.timeOutStr||fmtTime(new Date()))}</div>
        ${entry.idType?`<div class="np-id"><i class="ti ti-id-badge"></i> ${entry.idType}
          ${entry.idPhoto?`<a href="${entry.idPhoto}" target="_blank" class="id-view-link np-id-link">View ID</a>`:""}</div>`:""}
      </div>
      <button class="np-close" onclick="dismissNotif('${id}')"><i class="ti ti-x"></i></button>
    </div>
    <div class="np-progress"></div>`;

  stack.appendChild(el);
  requestAnimationFrame(() => el.classList.add("notif-pill-show"));
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

// ══════════════════════════════════════════════════════════════
//  ADMIN — Residents management
// ══════════════════════════════════════════════════════════════
let allResidents   = {};
let residentFilter = "";

async function loadAdminResidents() {
  if (!firebaseDB) return;
  const snap = await firebaseDB.ref("residents").once("value");
  allResidents = snap.val() || {};
  renderResidentList();
}

function renderResidentList() {
  const el  = document.getElementById("resident-list");
  if (!el) return;
  const q   = residentFilter.toLowerCase();
  const list = Object.entries(allResidents)
    .filter(([,r]) => !q ||
      r.name.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      (r.room||"").toLowerCase().includes(q)
    )
    .sort(([,a],[,b]) => a.name.localeCompare(b.name));

  if (!list.length) {
    el.innerHTML = `<div class="empty-state"><i class="ti ti-users"></i>
      <p>${q?"No residents match":"No residents yet"}</p>
      <span>${q?"Try a different name or email":"Add residents above"}</span></div>`;
    return;
  }

  el.innerHTML = list.map(([key, r]) => `
    <div class="resident-item">
      <div class="resident-avatar">${initials(r.name)}</div>
      <div class="resident-info">
        <div class="resident-name">${r.name}</div>
        <div class="resident-meta">${r.email}</div>
        <div class="resident-meta">Room ${r.room}${r.hostel?" · "+r.hostel:""}</div>
      </div>
      <button class="resident-remove-btn" onclick="adminRemoveResident('${key}','${r.name.replace(/'/g,"\\'")}')">
        <i class="ti ti-trash"></i>
      </button>
    </div>
  `).join("");
}

function filterResidentList(q) {
  residentFilter = q;
  renderResidentList();
}

async function adminAddResident() {
  const name   = document.getElementById("res-add-name").value.trim();
  const email  = document.getElementById("res-add-email").value.trim().toLowerCase();
  const room   = document.getElementById("res-add-room").value.trim().toUpperCase();
  const hostel = document.getElementById("res-add-hostel").value;
  const msg    = document.getElementById("add-resident-msg");

  // Validate ALL fields required
  if (!name)   { showMsg(msg, "Name is required", "error"); return; }
  if (!email)  { showMsg(msg, "Email is required", "error"); return; }
  if (!room)   { showMsg(msg, "Room number is required", "error"); return; }
  if (!hostel) { showMsg(msg, "Please select a hostel", "error"); return; }

  if (!email.endsWith("@acity.edu.gh")) {
    showMsg(msg, "Email must be an @acity.edu.gh address", "error"); return;
  }

  const dup = Object.values(allResidents).find(r => r.email === email);
  if (dup) { showMsg(msg, `${dup.name} is already listed`, "error"); return; }

  if (!firebaseDB) { showMsg(msg, "Not connected to Firebase yet", "error"); return; }

  const key      = email.replace(/[.@]/g, "_");
  const resident = { name, email, room, hostel };

  await firebaseDB.ref("residents/" + key).set(resident);
  allResidents[key]  = resident;
  residentsCache[key] = resident;

  ["res-add-name","res-add-email","res-add-room"].forEach(id =>
    document.getElementById(id).value = ""
  );
  document.getElementById("res-add-hostel").value = "";

  showMsg(msg, `✓ ${name} added to Room ${room} (${hostel})`, "success");
  renderResidentList();
}

async function adminRemoveResident(key, name) {
  if (!confirm(`Remove ${name} from the residents list?`)) return;
  if (!firebaseDB) return;
  await firebaseDB.ref("residents/" + key).remove();
  delete allResidents[key];
  delete residentsCache[key];
  renderResidentList();
  showToast(`${name} removed`, "toast-out");
}

function showMsg(el, text, type) {
  el.textContent = text;
  el.className   = "add-resident-msg " + (type === "success" ? "msg-success" : "msg-error");
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 4000);
}

// ── CSV export ────────────────────────────────────────────────
function exportCSV() {
  const h = ["Date","Visitor Name","Email","Phone","Role","Hostel",
             "Resident Name","Resident Email","Room","ID Type","Time In","Time Out","Status"];
  const r = allEntries.map(e=>
    [e.date,e.visitorName,e.visitorEmail,e.visitorPhone||"",e.visitorRole||"",
     e.hostel||"",e.residentName,e.residentEmail||"",e.room,e.idType||"",
     e.timeInStr||fmtTime(e.timeIn),e.timeOutStr||"",e.status]
      .map(v=>`"${String(v||"").replace(/"/g,'""')}"`)
      .join(",")
  );
  const blob = new Blob([[h.join(","),...r].join("\n")],{type:"text/csv"});
  const a = Object.assign(document.createElement("a"),{
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
