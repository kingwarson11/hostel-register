// db.js — Firebase Realtime Database + Google Sheets sync

// ── Residents cache ───────────────────────────────────────────
let residentsCache = {};

async function loadResidents() {
  if (!firebaseDB) return;
  const snap = await firebaseDB.ref("residents").once("value");
  residentsCache = snap.val() || {};
  if (Object.keys(residentsCache).length === 0) await seedDemoResidents();
}

async function seedDemoResidents() {
  const demo = [
    { name:"Efua Asante",     email:"efua.asante@acity.edu.gh",     room:"A101", hostel:"Hostel A" },
    { name:"Kofi Mensah",     email:"kofi.mensah@acity.edu.gh",     room:"A101", hostel:"Hostel A" },
    { name:"Abena Darko",     email:"abena.darko@acity.edu.gh",     room:"B112", hostel:"Hostel B" },
    { name:"Kwame Boateng",   email:"kwame.boateng@acity.edu.gh",   room:"B112", hostel:"Hostel B" },
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

// ── Room input → show residents filtered by hostel + room ─────
function onRoomInput(value) {
  const roomBox = document.getElementById("room-residents");
  const q = value.trim().toUpperCase();

  const hostel = document.querySelector('input[name="hostel"]:checked')?.value;
  if (!hostel) {
    roomBox.innerHTML = `<div class="room-no-match">
      <i class="ti ti-alert-circle"></i> Please select a hostel first
    </div>`;
    roomBox.classList.remove("hidden");
    return;
  }

  if (!q) { roomBox.classList.add("hidden"); return; }

  const matches = Object.entries(residentsCache)
    .filter(([, r]) =>
      (r.hostel || "") === hostel &&
      ((r.room || "").toUpperCase().startsWith(q) ||
       (r.room || "").toUpperCase() === q)
    );

  if (!matches.length) {
    roomBox.innerHTML = `<div class="room-no-match">
      <i class="ti ti-mood-empty"></i> No residents in room "${q}" · ${hostel}
    </div>`;
    roomBox.classList.remove("hidden");
    return;
  }

  // Use data-key attribute — no JSON in onclick
  roomBox.innerHTML = matches.map(([key, r]) => `
    <button class="room-resident-option" data-key="${key}" onclick="selectResidentByKey(this.dataset.key)">
      <div class="rro-avatar">${initials(r.name)}</div>
      <div class="rro-info">
        <strong>${r.name}</strong>
        <span>Room ${r.room} · ${r.hostel}</span>
      </div>
      <div class="rro-select"><i class="ti ti-chevron-right"></i></div>
    </button>
  `).join("");
  roomBox.classList.remove("hidden");
}

// ── Select resident by cache key (safe, no JSON in HTML) ──────
let selectedResident = null;

function selectResidentByKey(key) {
  const r = residentsCache[key];
  if (!r) { console.warn("Resident not found:", key); return; }
  selectResident(r);
}

function selectResident(r) {
  selectedResident = r;

  // Hide room options
  const roomBox = document.getElementById("room-residents");
  if (roomBox) roomBox.classList.add("hidden");

  // Show selected chip
  document.getElementById("sel-avatar").textContent = initials(r.name);
  document.getElementById("sel-name").textContent   = r.name;
  document.getElementById("sel-room").textContent   =
    "Room " + r.room + (r.hostel ? " · " + r.hostel : "");
  document.getElementById("selected-resident").classList.remove("hidden");

  // Auto-fill room
  const roomEl = document.getElementById("room-input");
  if (roomEl) roomEl.value = r.room;

  // Auto-select hostel
  if (r.hostel) {
    const radio = document.querySelector(`input[name="hostel"][value="${r.hostel}"]`);
    if (radio) { radio.checked = true; onHostelChange(); }
  }
}

function clearResident() {
  selectedResident = null;
  document.getElementById("selected-resident").classList.add("hidden");
  const roomEl  = document.getElementById("room-input");
  const roomBox = document.getElementById("room-residents");
  if (roomEl)  roomEl.value = "";
  if (roomBox) roomBox.classList.add("hidden");
}

// Close dropdown on outside click
document.addEventListener("click", e => {
  const roomBox = document.getElementById("room-residents");
  const roomInp = document.getElementById("room-input");
  if (roomBox && roomInp && !roomBox.contains(e.target) && e.target !== roomInp) {
    roomBox.classList.add("hidden");
  }
});

// ── Write entry (sign-in) ─────────────────────────────────────
async function writeEntry(entry) {
  if (firebaseDB) {
    const { idPhoto, ...entryNoPhoto } = entry;
    await firebaseDB.ref("entries/" + entry.id).set(entryNoPhoto);
    if (idPhoto) {
      await firebaseDB.ref("id_photos/" + entry.id).set({
        photo: idPhoto, email: entry.visitorEmail
      });
    }
  }
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

// ── Update sign-out (updates existing row) ────────────────────
async function updateSignOut(entry) {
  if (firebaseDB) {
    await firebaseDB.ref("entries/" + entry.id).update({
      status: "out", timeOut: entry.timeOut, timeOutStr: entry.timeOutStr,
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

// ── Live listeners ────────────────────────────────────────────
function listenForEntries(callback) {
  if (!firebaseDB) return;
  const today = todayStr();
  firebaseDB.ref("entries").orderByChild("date").equalTo(today)
    .on("value", snap => {
      const raw = snap.val() || {};
      const entries = Object.values(raw)
        .sort((a, b) => new Date(b.timeIn) - new Date(a.timeIn));
      Promise.all(entries.map(async e => {
        if (!e.idPhoto) {
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
    .on("child_added", snap => {
      if (lastKnownCount < 0) return;
      onNew(snap.val(), "added");
    });
}

async function fetchAllEntries() {
  if (!firebaseDB) return [];
  const today = todayStr();
  const snap = await firebaseDB.ref("entries")
    .orderByChild("date").equalTo(today).once("value");
  return Object.values(snap.val() || {})
    .sort((a, b) => new Date(b.timeIn) - new Date(a.timeIn));
}

// Fallback search for admin panel
function searchResidents(query) {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase();
  return Object.values(residentsCache).filter(r =>
    r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q)
  ).slice(0, 8);
}
