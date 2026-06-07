// sheets.js — Google Apps Script integration (CORS-safe via no-cors)

const Sheets = (() => {

  function isConfigured() {
    return typeof APPS_SCRIPT_URL === "string" && APPS_SCRIPT_URL.startsWith("https://");
  }

  async function init() {}

  // Send data via no-cors (bypasses CORS block)
  // Apps Script receives it fine, we just can't read the response — that's okay
  async function sendData(payload) {
    if (!isConfigured()) return false;
    try {
      await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",  // ← key fix: bypasses CORS restriction
        body: JSON.stringify(payload),
      });
      return true; // no-cors always "succeeds" silently
    } catch {
      return false;
    }
  }

  async function appendRow(entry) {
    return await sendData({
      id:            entry.id,
      date:          entry.date,
      visitor_name:  entry.vName,
      visitor_phone: entry.vPhone || "",
      resident_name: entry.rName,
      room:          entry.rRoom,
      time_in:       entry.timeInStr,
      time_out:      "",
      status:        "in",
    });
  }

  async function updateSignOut(entry) {
    return await sendData({
      action:   "signout",
      id:       entry.id,
      time_out: entry.timeOutStr,
    });
  }

  // Reading uses a regular GET (Apps Script allows this)
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
