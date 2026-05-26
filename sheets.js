// sheets.js — Google Sheets sync via Apps Script Web App

const Sheets = (() => {
  let connected = false;

  function isConfigured() {
    return (
      typeof SHEET_WEBAPP_URL === "string" &&
      SHEET_WEBAPP_URL !== "YOUR_GOOGLE_APPS_SCRIPT_URL_HERE" &&
      SHEET_WEBAPP_URL.startsWith("https://")
    );
  }

  function showBanner(msg, isError) {
    const banner = document.getElementById("sheet-banner");
    const status = document.getElementById("sheet-status");
    const link   = document.getElementById("sheet-link");
    if (!banner) return;
    banner.style.display = "flex";
    banner.className = "sheet-banner" + (isError ? " error" : connected ? " ok" : "");
    status.textContent = msg;
    if (connected && typeof SHEET_URL === "string" && SHEET_URL !== "YOUR_GOOGLE_SHEET_URL_HERE") {
      link.href = SHEET_URL;
      link.style.display = "inline-flex";
    }
  }

  async function init() {
    if (!isConfigured()) return;
    showBanner("Connecting to Google Sheets…", false);
    try {
      const res = await fetch(SHEET_WEBAPP_URL + "?action=ping");
      const json = await res.json();
      if (json.status === "ok") {
        connected = true;
        showBanner("Connected — entries save to Google Sheets automatically", false);
      } else {
        showBanner("Sheet connected but returned unexpected response", true);
      }
    } catch {
      showBanner("Could not reach Google Sheets. Entries still saved locally.", true);
    }
  }

  // Send a new sign-in or sign-out row to the sheet
  async function appendRow(entry) {
    if (!isConfigured()) return;
    const params = new URLSearchParams({
      action:       "append",
      date:         entry.date,
      visitorName:  entry.vName,
      visitorPhone: entry.vPhone  || "",
      residentName: entry.rName,
      residentPhone:entry.rPhone  || "",
      room:         entry.rRoom,
      timeIn:       entry.timeInStr,
      timeOut:      entry.timeOutStr || "",
      status:       entry.status,
    });
    try {
      await fetch(SHEET_WEBAPP_URL + "?" + params.toString());
    } catch {
      // silent — local data is still preserved
    }
  }

  // Update an existing row's sign-out time (matched by visitor name + room + date)
  async function updateSignOut(entry) {
    if (!isConfigured()) return;
    const params = new URLSearchParams({
      action:      "signout",
      date:        entry.date,
      visitorName: entry.vName,
      room:        entry.rRoom,
      timeOut:     entry.timeOutStr,
    });
    try {
      await fetch(SHEET_WEBAPP_URL + "?" + params.toString());
    } catch {
      // silent
    }
  }

  return { init, appendRow, updateSignOut, isConfigured };
})();
