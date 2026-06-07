// sheets.js — Google Apps Script integration
// Uses GET + ?data= param to avoid CORS issues with POST

const Sheets = (() => {

  function isConfigured() {
    return typeof APPS_SCRIPT_URL === "string" &&
           APPS_SCRIPT_URL.startsWith("https://") &&
           !APPS_SCRIPT_URL.includes("YOUR_APPS_SCRIPT");
  }

  async function init() {}

  // Send data via GET ?data=... (fully CORS-safe)
  async function sendData(payload) {
    if (!isConfigured()) {
      console.warn("Apps Script URL not configured in config.js");
      return false;
    }
    try {
      const encoded = encodeURIComponent(JSON.stringify(payload));
      const url = APPS_SCRIPT_URL + "?data=" + encoded;
      await fetch(url, { mode: "no-cors" });
      return true;
    } catch (err) {
      console.error("sendData failed:", err);
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
    });
  }

  async function updateSignOut(entry) {
    return await sendData({
      action:   "signout",
      id:       entry.id,
      time_out: entry.timeOutStr,
    });
  }

  async function getRows() {
    if (!isConfigured()) return null;
    try {
      const res  = await fetch(APPS_SCRIPT_URL);
      if (!res.ok) return null;
      const data = await res.json();
      if (!Array.isArray(data)) return null;
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
    } catch (err) {
      console.error("getRows failed:", err);
      return null;
    }
  }

  return { init, getRows, appendRow, updateSignOut, isConfigured };
})();
