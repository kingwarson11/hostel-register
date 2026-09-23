// db.js — Firebase Realtime Database + Google Sheets sync

// ── Residents directory (stored in Firebase) ──────────────────
// Format: { email: { name, room, email } }
let residentsCache = {};

async function loadResidents() {
  if (!firebaseDB) return;
  const snap = await firebaseDB.ref("residents").once("value");
  residentsCache = snap.val() || {};
}

function searchResidents(query) {
  if (!query || query.length < 2) {
    document.getElementById("resident-dropdown").classList.add("hidden");
    return;
  }
  const q = query.toLowerCase();
  const matches = Object.values(residentsCache).filter(r =>
    r.name.toLowerCase().includes(q) ||
    r.email.toLowerCase().includes(q) ||
    (r.room && r.room.toLowerCase().includes(q))
  ).slice(0, 6);

  const dd = document.getElementById("resident-dropdown");
  if (!matches.length) {
    dd.innerHTML = `<div class="dd-empty">No residents found</div>`;
    dd.classList.remove("hidden");
    return;
  }
  dd.innerHTML = matches.map(r => `
    <div class="dd-item" onclick="selectResident('${encodeURIComponent(JSON.stringify(r))}')">
      <div class="dd-avatar">${initials(r.name)}</div>
      <div class="dd-info">
        <strong>${r.name}</strong>
        <span>Room ${r.room} · ${r.email}</span>
      </div>
    </div>
  `).join("");
  dd.classList.remove("hidden");
}

let selectedResident = null;

function selectResident(encoded) {
  selectedResident = JSON.parse(decodeURIComponent(encoded));
  document.getElementById("r-search").value = "";
  document.getElementById("resident-dropdown").classList.add("hidden");

  document.getElementById("sel-avatar").textContent = initials(selectedResident.name);
  document.getElementById("sel-name").textContent   = selectedResident.name;
  document.getElementById("sel-room").textContent   = "Room " + selectedResident.room;
  document.getElementById("selected-resident").classList.remove("hidden");
}

function clearResident() {
  selectedResident = null;
  document.getElementById("selected-resident").classList.add("hidden");
  document.getElementById("r-search").value = "";
}

// ── Write a sign-in / sign-out entry ─────────────────────────
async function writeEntry(entry) {
  // 1. Write to Firebase (real-time — admins see it instantly)
  if (firebaseDB) {
    await firebaseDB.ref("entries/" + entry.id).set(entry);
  }

  // 2. Write to Google Sheets (permanent record)
  if (typeof SHEET_WEBAPP_URL === "string" && SHEET_WEBAPP_URL.startsWith("https://")) {
    const params = new URLSearchParams({
      action:        "append",
      id:            entry.id,
      date:          entry.date,
      visitorName:   entry.visitorName,
      visitorEmail:  entry.visitorEmail,
      visitorPhone:  entry.visitorPhone  || "",
      residentName:  entry.residentName,
      residentEmail: entry.residentEmail || "",
      room:          entry.room,
      timeIn:        entry.timeInStr,
      timeOut:       entry.timeOutStr   || "",
      status:        entry.status,
    });
    try {
      await fetch(SHEET_WEBAPP_URL + "?" + params.toString());
    } catch { /* silent — Firebase already has the data */ }
  }
}

// ── Update sign-out on existing entry ────────────────────────
async function updateSignOut(entry) {
  // Firebase
  if (firebaseDB) {
    await firebaseDB.ref("entries/" + entry.id).update({
      status:     "out",
      timeOut:    entry.timeOut,
      timeOutStr: entry.timeOutStr,
    });
  }

  // Sheets
  if (typeof SHEET_WEBAPP_URL === "string" && SHEET_WEBAPP_URL.startsWith("https://")) {
    const params = new URLSearchParams({
      action:      "signout",
      id:          entry.id,
      date:        entry.date,
      visitorName: entry.visitorName,
      room:        entry.room,
      timeOut:     entry.timeOutStr,
    });
    try { await fetch(SHEET_WEBAPP_URL + "?" + params.toString()); }
    catch { /* silent */ }
  }
}

// ── Listen for new entries (admin real-time feed) ─────────────
function listenForEntries(callback) {
  if (!firebaseDB) return;
  const today = todayStr();
  firebaseDB.ref("entries")
    .orderByChild("date")
    .equalTo(today)
    .on("value", snap => {
      const raw = snap.val() || {};
      const entries = Object.values(raw).sort((a, b) =>
        new Date(b.timeIn) - new Date(a.timeIn)
      );
      callback(entries);
    });
}

// ── Listen for NEW entries only (for notifications) ───────────
let lastKnownCount = -1;
function listenForNewEntries(onNew) {
  if (!firebaseDB) return;
  const today = todayStr();
  firebaseDB.ref("entries")
    .orderByChild("date")
    .equalTo(today)
    .on("child_changed", snap => {
      const entry = snap.val();
      if (lastKnownCount >= 0) onNew(entry, "changed");
    });
  firebaseDB.ref("entries")
    .orderByChild("date")
    .equalTo(today)
    .on("child_added", snap => {
      if (lastKnownCount < 0) return; // skip initial load
      const entry = snap.val();
      onNew(entry, "added");
    });
}

// ── Fetch all entries (for coordinator, one-time) ─────────────
async function fetchAllEntries() {
  if (!firebaseDB) return [];
  const today = todayStr();
  const snap  = await firebaseDB.ref("entries")
    .orderByChild("date")
    .equalTo(today)
    .once("value");
  const raw = snap.val() || {};
  return Object.values(raw).sort((a, b) => new Date(b.timeIn) - new Date(a.timeIn));
}
