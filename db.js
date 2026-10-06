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

  // Hide room options list
  const roomBox = document.getElementById("room-residents");
  if (roomBox) roomBox.classList.add("hidden");

  // Populate the styled card
  const avatarEl = document.getElementById("sel-avatar");
  const nameEl   = document.getElementById("sel-name");
  const roomEl2  = document.getElementById("sel-room");
  const card     = document.getElementById("selected-resident");

  if (avatarEl) {
    avatarEl.textContent = initials(r.name);
    // Colour avatar based on hostel
    avatarEl.className = "src-avatar " +
      (r.hostel === "Hostel B" ? "src-avatar-b" : "src-avatar-a");
  }
  if (nameEl)  nameEl.textContent  = r.name;
  if (roomEl2) roomEl2.textContent = `Room ${r.room} · ${r.hostel || ""} · ${r.email}`;

  // Show the card
  if (card) {
    card.classList.remove("hidden");
    card.classList.add("src-animate");
    setTimeout(() => card.classList.remove("src-animate"), 400);
  }

  // Auto-fill room input
  const roomInp = document.getElementById("room-input");
  if (roomInp) roomInp.value = r.room;

  // Auto-select hostel radio WITHOUT triggering clearResident
  if (r.hostel) {
    const radio = document.querySelector(`input[name="hostel"][value="${r.hostel}"]`);
    if (radio && !radio.checked) {
      radio.checked = true;
      // Manually update labels only — don't call onHostelChange (clears resident)
      document.getElementById("hostel-a-label")?.classList.toggle("radio-selected", r.hostel === "Hostel A");
      document.getElementById("hostel-b-label")?.classList.toggle("radio-selected", r.hostel === "Hostel B");
    }
  }
}

function clearResident() {
  selectedResident = null;
  const card = document.getElementById("selected-resident");
  if (card) card.classList.add("hidden");
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
// Track entry IDs we've already seen so we never show a duplicate notification
const seenEntryIds = new Set();
let initialLoadDone = false;

function listenForEntries(callback) {
  if (!firebaseDB) return;
  const today = todayStr();
  firebaseDB.ref("entries").orderByChild("date").equalTo(today)
    .on("value", snap => {
      const raw = snap.val() || {};
      const entries = Object.values(raw)
        .sort((a, b) => new Date(b.timeIn) - new Date(a.timeIn));

      // Mark all current IDs as seen on first load (for notification dedup)
      if (!initialLoadDone) {
        entries.forEach(e => seenEntryIds.add(e.id));
        initialLoadDone = true;
      }

      // Render the log immediately — don't wait for photo fetches
      callback(entries);

      // Then fetch photos in background and cache them in idPhotoCache
      // When admin taps "View ID", viewIdPhoto() reads from the cache
      entries.forEach(async e => {
        if (typeof idPhotoCache !== "undefined" && !idPhotoCache[e.id] && firebaseDB) {
          try {
            const ps = await firebaseDB.ref("id_photos/" + e.id).once("value");
            const pd = ps.val();
            if (pd && pd.photo) {
              idPhotoCache[e.id] = pd.photo;
              e.idPhoto = pd.photo; // also attach to entry object
            }
          } catch(err) {}
        }
      });
    });
}

function listenForNewEntries(onNew) {
  if (!firebaseDB) return;
  const today = todayStr();

  // Use child_added for NEW entries only — skip ones we already saw on load
  firebaseDB.ref("entries").orderByChild("date").equalTo(today)
    .on("child_added", snap => {
      const entry = snap.val();
      if (!entry) return;
      // Skip if we saw this on initial load
      if (seenEntryIds.has(entry.id)) return;
      seenEntryIds.add(entry.id);
      onNew(entry, "added");
    });

  // child_changed fires when sign-out updates an existing entry
  firebaseDB.ref("entries").orderByChild("date").equalTo(today)
    .on("child_changed", snap => {
      const entry = snap.val();
      if (!entry) return;
      onNew(entry, "changed");
    });
}

// Fetch today's entries — for admin dashboard
async function fetchAllEntries() {
  if (!firebaseDB) return [];
  const today = todayStr();
  const snap = await firebaseDB.ref("entries")
    .orderByChild("date").equalTo(today).once("value");
  return Object.values(snap.val() || {})
    .sort((a, b) => new Date(b.timeIn) - new Date(a.timeIn));
}

// Fetch ALL entries for a visitor across all dates — for sign-in/out state checks
async function fetchVisitorEntries(email) {
  if (!firebaseDB) return [];
  const snap = await firebaseDB.ref("entries")
    .orderByChild("visitorEmail").equalTo(email).once("value");
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
