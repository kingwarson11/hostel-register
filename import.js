// import.js — Bulk resident import from CSV / Excel / TXT

let importRows    = [];   // parsed + validated rows ready to import
let importErrors  = [];   // rows with issues

// ── File selected via input or drag-drop ──────────────────────
function onImportFileSelected(input) {
  const file = input.files[0];
  if (file) processImportFile(file);
  input.value = "";
}

function onImportFileDrop(event) {
  event.preventDefault();
  document.getElementById("import-dropzone").classList.remove("drag-over");
  const file = event.dataTransfer.files[0];
  if (file) processImportFile(file);
}

function processImportFile(file) {
  const ext = file.name.split(".").pop().toLowerCase();
  const reader = new FileReader();

  if (ext === "csv" || ext === "txt") {
    reader.onload = e => parseCSV(e.target.result);
    reader.readAsText(file);
  } else if (ext === "xlsx" || ext === "xls") {
    reader.onload = e => parseExcel(e.target.result);
    reader.readAsArrayBuffer(file);
  } else {
    showImportMsg("Unsupported file type. Use CSV, Excel (.xlsx), or .txt", "error");
  }
}

// ── Parse CSV / TXT ───────────────────────────────────────────
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) { showImportMsg("File is empty", "error"); return; }

  // Detect delimiter (comma or semicolon or tab)
  const delim = lines[0].includes("\t") ? "\t"
    : lines[0].includes(";") ? ";" : ",";

  const rows = lines.map(l =>
    l.split(delim).map(v => v.trim().replace(/^"|"$/g, "").trim())
  );
  buildPreview(rows);
}

// ── Parse Excel ───────────────────────────────────────────────
function parseExcel(buffer) {
  try {
    const wb   = XLSX.read(buffer, { type: "array" });
    const ws   = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_array(ws, { defval: "" });
    buildPreview(rows);
  } catch(e) {
    showImportMsg("Could not read Excel file: " + e.message, "error");
  }
}

// ── Build preview from raw rows ───────────────────────────────
// Auto-detects which column is name / email / room / hostel
function buildPreview(rows) {
  if (rows.length < 2) {
    showImportMsg("File needs at least a header row and one data row", "error");
    return;
  }

  // Detect header row (first row)
  const header = rows[0].map(h => h.toString().toLowerCase().trim());

  // Find column indices — flexible matching
  const colName   = findCol(header, ["name","full name","fullname","student name","resident name"]);
  const colEmail  = findCol(header, ["email","e-mail","mail","school email","acity email"]);
  const colRoom   = findCol(header, ["room","room no","room number","room #","hall room"]);
  const colHostel = findCol(header, ["hostel","hall","block","hostel name"]);

  // If no header match, assume columns in order: Name, Email, Room, Hostel
  const iName   = colName   >= 0 ? colName   : 0;
  const iEmail  = colEmail  >= 0 ? colEmail  : 1;
  const iRoom   = colRoom   >= 0 ? colRoom   : 2;
  const iHostel = colHostel >= 0 ? colHostel : 3;

  importRows   = [];
  importErrors = [];

  const dataRows = rows.slice(1).filter(r => r.some(v => v.toString().trim()));

  dataRows.forEach((row, idx) => {
    const name   = (row[iName]   || "").toString().trim();
    const email  = (row[iEmail]  || "").toString().trim().toLowerCase();
    const room   = (row[iRoom]   || "").toString().trim().toUpperCase();
    const hostel = normaliseHostel((row[iHostel] || "").toString().trim());

    const errors = [];
    if (!name)                          errors.push("missing name");
    if (!email)                         errors.push("missing email");
    else if (!email.includes("@"))      errors.push("invalid email");
    if (!room)                          errors.push("missing room");
    if (!hostel)                        errors.push("missing/unknown hostel");

    importRows.push({ name, email, room, hostel, errors, rowNum: idx + 2 });
  });

  renderPreview();
}

function findCol(header, keywords) {
  for (const kw of keywords) {
    const i = header.findIndex(h => h.includes(kw));
    if (i >= 0) return i;
  }
  return -1;
}

function normaliseHostel(raw) {
  const l = raw.toLowerCase();
  if (l.includes("a") && !l.includes("b")) return "Hostel A";
  if (l.includes("b") && !l.includes("a")) return "Hostel B";
  if (l === "hostel a" || l === "a")       return "Hostel A";
  if (l === "hostel b" || l === "b")       return "Hostel B";
  return raw ? raw : "";   // pass through if unclear — flagged as error
}

// ── Render preview table ──────────────────────────────────────
function renderPreview() {
  const valid   = importRows.filter(r => r.errors.length === 0);
  const invalid = importRows.filter(r => r.errors.length  > 0);

  document.getElementById("import-preview-count").textContent =
    `${importRows.length} rows found — ${valid.length} valid, ${invalid.length} with issues`;

  const tbody = document.getElementById("import-tbody");
  tbody.innerHTML = importRows.map((r, i) => {
    const ok  = r.errors.length === 0;
    const cls = ok ? "irow-ok" : "irow-err";
    return `<tr class="${cls}">
      <td class="irow-num">${r.rowNum}</td>
      <td>${r.name  || '<span class="irow-missing">—</span>'}</td>
      <td class="irow-email">${r.email || '<span class="irow-missing">—</span>'}</td>
      <td>${r.room  || '<span class="irow-missing">—</span>'}</td>
      <td>${r.hostel|| '<span class="irow-missing">—</span>'}</td>
      <td>${ok
        ? '<span class="irow-status-ok"><i class="ti ti-check"></i> Ready</span>'
        : `<span class="irow-status-err"><i class="ti ti-alert-circle"></i> ${r.errors.join(", ")}</span>`}
      </td>
    </tr>`;
  }).join("");

  const btn = document.getElementById("import-go-btn");
  if (btn) {
    btn.textContent = valid.length
      ? `Import ${valid.length} resident${valid.length !== 1 ? "s" : ""}`
      : "No valid rows";
    btn.disabled = valid.length === 0;
  }

  document.getElementById("import-preview").classList.remove("hidden");
  document.getElementById("import-msg").classList.add("hidden");
}

// ── Run the actual import ─────────────────────────────────────
async function runImport() {
  if (!firebaseDB) {
    showImportMsg("Not connected to Firebase. Check your config.", "error");
    return;
  }

  const valid = importRows.filter(r => r.errors.length === 0);
  if (!valid.length) return;

  const btn = document.getElementById("import-go-btn");
  if (btn) { btn.disabled = true; btn.textContent = "Importing…"; }

  const progress    = document.getElementById("import-progress");
  const progressBar = document.getElementById("import-progress-bar");
  const progressLbl = document.getElementById("import-progress-label");
  progress.classList.remove("hidden");

  let done = 0, skipped = 0, added = 0;

  for (const r of valid) {
    const key = r.email.replace(/[.@]/g, "_");

    // Skip duplicates already in Firebase
    if (residentsCache[key]) {
      skipped++;
    } else {
      const resident = { name: r.name, email: r.email, room: r.room, hostel: r.hostel };
      await firebaseDB.ref("residents/" + key).set(resident);
      residentsCache[key] = resident;
      allResidents[key]   = resident;
      added++;
    }

    done++;
    const pct = Math.round((done / valid.length) * 100);
    progressBar.style.width = pct + "%";
    progressLbl.textContent =
      `${done} / ${valid.length} processed (${added} added, ${skipped} already existed)`;

    // Small yield so UI stays responsive
    if (done % 10 === 0) await new Promise(r => setTimeout(r, 0));
  }

  progress.classList.add("hidden");
  renderResidentList();

  const msg = `✓ Import complete — ${added} residents added${skipped ? ", " + skipped + " already existed" : ""}.`;
  showImportMsg(msg, "success");

  // Reset file input but keep preview visible
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ti ti-check"></i> Done'; }
}

function clearImport() {
  importRows = [];
  importErrors = [];
  document.getElementById("import-preview").classList.add("hidden");
  document.getElementById("import-msg").classList.add("hidden");
  document.getElementById("import-progress").classList.add("hidden");
  document.getElementById("import-file-input").value = "";
  const btn = document.getElementById("import-go-btn");
  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-database-import"></i> Import all'; }
}

function showImportMsg(text, type) {
  const el = document.getElementById("import-msg");
  el.textContent = text;
  el.className   = "import-msg " + (type === "success" ? "import-msg-ok" : "import-msg-err");
  el.classList.remove("hidden");
}
