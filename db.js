// db.js — Firebase Realtime Database + Google Sheets sync

// ── Residents cache ───────────────────────────────────────────
let residentsCache = {};

async function loadResidents() {
  if (!firebaseDB) return;
  const snap = await firebaseDB.ref("residents").once("value");
  residentsCache = snap.val() || {};

  // If empty, seed demo residents automatically
  if (Object.keys(residentsCache).length === 0) {
    await seedDemoResidents();
  }
}

// ── 10 random demo residents ──────────────────────────────────
async function seedDemoResidents() {
  const demo = [
    { name:"Efua Asante",     email:"efua.asante@acity.edu.gh",     room:"A101", hostel:"Hostel A" },
    { name:"Kofi Mensah",     email:"kofi.mensah@acity.edu.gh",     room:"A204", hostel:"Hostel A" },
    { name:"Abena Darko",     email:"abena.darko@acity.edu.gh",     room:"B112", hostel:"Hostel B" },
    { name:"Kwame Boateng",   email:"kwame.boateng@acity.edu.gh",   room:"B305", hostel:"Hostel B" },
    { name:"Ama Owusu",       email:"ama.owusu@acity.edu.gh",       room:"A310", hostel:"Hostel A" },
    { name:"Yaw Adjei",       email:"yaw.adjei@acity.edu.gh",       room:"B208", hostel:"Hostel B" },
    { name:"Akosua Frimpong", email:"akosua.frimpong@acity.edu.gh", room:"A115", hostel:"Hostel A" },
    { name:"Nana Agyeman",    email:"nana.agyeman@acity.edu.gh",    room:"B401", hostel:"Hostel B" },
    { name:"Adwoa Asare",     email:"adwoa.asare@acity.edu.gh",     room:"A222", hostel:"Hostel A" },
    { name:"Kojo Amponsah",   email:"kojo.amponsah@acity.edu.gh",   room:"B119", hostel:"Hostel B" },
  ];

  for (const r of demo) {
    const key = r.email.replace(/[.@]/g, "_");
    await firebaseDB.ref("residents/" + key).set(r);
    residentsCache[key] = r;
  }
  console.log("Demo residents seeded ✓");
}

// ── Room input → show residents in that room ─────────────────
function onRoomInput(value) {
  const roomBox = document.getElementById("room-residents");
  const q = value.trim().toUpperCase();
  if (!q || q.length < 2) { roomBox.classList.add("hidden"); return; }

  // Find all residents whose room starts with / matches the input
  const matches = Object.values(residentsCache)
    .filter(r => (r.room||"").toUpperCase().startsWith(q) ||
                 (r.room||"").toUpperCase() === q);

  if (!matches.length) {
    roomBox.innerHTML = `<div class="room-no-match">
      <i class="ti ti-mood-empty"></i> No residents found in room "${q}"
    </div>`;
    roomBox.classList.remove("hidden");
    return;
  }

  roomBox.innerHTML = matches.map(r => `
    <button class="room-resident-option" onclick="selectResident('${encodeURIComponent(JSON.stringify(r))}')">
      <div class="rro-avatar">${initials(r.name)}</div>
      <div class="rro-info">
        <strong>${r.name}</strong>
        <span>Room ${r.room}${r.hostel ? " · " + r.hostel : ""}</span>
      </div>
      <div class="rro-select"><i class="ti ti-chevron-right"></i></div>
    </button>
  `).join("");
  roomBox.classList.remove("hidden");
}

// ── Fallback name search (still used by admin add flow) ───────
function searchResidents(query) {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase();
  return Object.values(residentsCache).filter(r =>
    r.name.toLowerCase().includes(q) ||
    r.email.toLowerCase().includes(q)
  ).slice(0, 8);
}

let selectedResident = null;

function selectResident(encoded) {
  selectedResident = JSON.parse(decodeURIComponent(encoded));

  // Hide the room options list
  const roomBox = document.getElementById("room-residents");
  if (roomBox) roomBox.classList.add("hidden");

  // Show selected chip
  document.getElementById("sel-avatar").textContent = initials(selectedResident.name);
  document.getElementById("sel-name").textContent   = selectedResident.name;
  document.getElementById("sel-room").textContent   =
    "Room " + selectedResident.room + (selectedResident.hostel ? " · " + selectedResident.hostel : "");
  document.getElementById("selected-resident").classList.remove("hidden");

  // Auto-fill room input with the exact room
  const roomEl = document.getElementById("room-input");
  if (roomEl && selectedResident.room) roomEl.value = selectedResident.room;

  // Auto-select hostel radio
  if (selectedResident.hostel) {
    const radio = document.querySelector(`input[name="hostel"][value="${selectedResident.hostel}"]`);
    if (radio) { radio.checked = true; onHostelChange(); }
  }
}

function clearResident() {
  selectedResident = null;
  document.getElementById("selected-resident").classList.add("hidden");
  // Reset room input and hide options
  const roomEl  = document.getElementById("room-input");
  const roomBox = document.getElementById("room-residents");
  if (roomEl)  roomEl.value = "";
  if (roomBox) roomBox.classList.add("hidden");
}

// Close dropdown when clicking outside
document.addEventListener("click", e => {
  const dd = document.getElementById("resident-dropdown");
  if (dd && !dd.contains(e.target) && e.target.id !== "r-search") {
    dd.classList.add("hidden");
  }
});

// ── Write entry (sign-in) ─────────────────────────────────────
async function writeEntry(entry) {
  if (firebaseDB) {
    // Store without idPhoto in the main entry (photo goes separately)
    const { idPhoto, ...entryNoPhoto } = entry;
    await firebaseDB.ref("entries/" + entry.id).set(entryNoPhoto);
    // Store photo separately so it doesn't bloat the entries list
    if (idPhoto) {
      await firebaseDB.ref("id_photos/" + entry.id).set({ photo: idPhoto, email: entry.visitorEmail });
    }
  }
  // Write to Sheets (no photo)
  if (typeof SHEET_WEBAPP_URL === "string" && SHEET_WEBAPP_URL.startsWith("https://")) {
    const params = new URLSearchParams({
      action:"append", id:entry.id, date:entry.date,
      visitorName:entry.visitorName, visitorEmail:entry.visitorEmail,
      visitorPhone:entry.visitorPhone||"", visitorRole:entry.visitorRole||"",
      hostel:entry.hostel||"", residentName:entry.residentName,
      residentEmail:entry.residentEmail||"", room:entry.room,
      idType:entry.idType||"", timeIn:entry.timeInStr, status:"in",
    });
    try { await fetch(SHEET_WEBAPP_URL + "?" + params); } catch {}
  }
}

// ── Update sign-out — updates existing row, NOT a new entry ───
async function updateSignOut(entry) {
  if (firebaseDB) {
    // Update just the sign-out fields on the existing entry
    await firebaseDB.ref("entries/" + entry.id).update({
      status:     "out",
      timeOut:    entry.timeOut,
      timeOutStr: entry.timeOutStr,
    });
  }
  if (typeof SHEET_WEBAPP_URL === "string" && SHEET_WEBAPP_URL.startsWith("https://")) {
    const params = new URLSearchParams({
      action:"signout", id:entry.id, date:entry.date,
      visitorName:entry.visitorName, room:entry.room, timeOut:entry.timeOutStr,
    });
    try { await fetch(SHEET_WEBAPP_URL + "?" + params); } catch {}
  }
}

// ── Listen for all today's entries ───────────────────────────
function listenForEntries(callback) {
  if (!firebaseDB) return;
  const today = todayStr();
  firebaseDB.ref("entries")
    .orderByChild("date").equalTo(today)
    .on("value", snap => {
      const raw = snap.val() || {};
      // Attach idPhoto from cache if available for rendering
      const entries = Object.values(raw)
        .sort((a,b) => new Date(b.timeIn) - new Date(a.timeIn));
      // Fetch photos for entries that have them
      Promise.all(entries.map(async e => {
        if (!e.idPhoto && firebaseDB) {
          const ps = await firebaseDB.ref("id_photos/" + e.id).once("value");
          const pd = ps.val();
          if (pd) e.idPhoto = pd.photo;
        }
        return e;
      })).then(callback);
    });
}

function listenForNewEntries(onNew) {
  if (!firebaseDB) return;
  const today = todayStr();
  firebaseDB.ref("entries").orderByChild("date").equalTo(today)
    .on("child_changed", snap => onNew(snap.val(), "changed"));
  firebaseDB.ref("entries").orderByChild("date").equalTo(today)
    .on("child_added",   snap => {
      if (lastKnownCount < 0) return;
      onNew(snap.val(), "added");
    });
}

async function fetchAllEntries() {
  if (!firebaseDB) return [];
  const today = todayStr();
  const snap  = await firebaseDB.ref("entries")
    .orderByChild("date").equalTo(today).once("value");
  const raw = snap.val() || {};
  return Object.values(raw).sort((a,b) => new Date(b.timeIn) - new Date(a.timeIn));
}
