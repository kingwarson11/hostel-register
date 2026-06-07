// sheets.js — Google Apps Script integration

const Sheets = (() => {

  function isConfigured() {
    return typeof APPS_SCRIPT_URL === "string" && APPS_SCRIPT_URL.startsWith("https://");
  }

  async function init() {
    // Nothing to init for Apps Script
  }

  async function appendRow(entry) {
    if (!isConfigured()) return false;
    try {
      const res = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify({
          id:            entry.id,
          date:          entry.date,
          visitor_name:  entry.vName,
          visitor_phone: entry.vPhone || "",
          resident_name: entry.rName,
          room:          entry.rRoom,
          time_in:       entry.timeInStr,
          time_out:      "",
          status:        "in",
        }),
      });
      const data = await res.json();
      return data.success === true;
    } catch {
      return false;
    }
  }

  async function updateSignOut(entry) {
    if (!isConfigured()) return false;
    try {
      const res = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify({
          action:   "signout",
          id:       entry.id,
          time_out: entry.timeOutStr,
        }),
      });
      const data = await res.json();
      return data.success === true;
    } catch {
      return false;
    }
  }

  async function getRows() {
    if (!isConfigured()) return null;
    try {
      const res  = await fetch(APPS_SCRIPT_URL);
      const data = await res.json();
      return data.map(r => ({
        id:         String(r.id),
        date:       r.date,
        vName:      r.visitor_name,
        vPhone:     r.visitor_phone || "",
        rName:      r.resident_name,
        rRoom:      r.room,
        timeInStr:  r.time_in,
        timeOutStr: r.time_out || "",
        status:     r.status,
      }));
    } catch {
      return null;
    }
  }

  return { init, getRows, appendRow, updateSignOut, isConfigured };
})();
