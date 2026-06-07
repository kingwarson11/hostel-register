// sheets.js — Google Apps Script integration
// Uses a hidden form POST — the only truly CORS-safe way to write to Apps Script

const Sheets = (() => {

  function isConfigured() {
    return typeof APPS_SCRIPT_URL === "string" &&
           APPS_SCRIPT_URL.startsWith("https://") &&
           !APPS_SCRIPT_URL.includes("YOUR_APPS_SCRIPT");
  }

  async function init() {
    if (!isConfigured()) {
      console.warn("⚠️ APPS_SCRIPT_URL not set in config.js");
    }
  }

  // Submit data via hidden iframe form — bypasses CORS completely
  function sendViaForm(payload) {
    return new Promise((resolve) => {
      if (!isConfigured()) { resolve(false); return; }

      try {
        // Create hidden iframe to absorb the response
        const iframe = document.createElement("iframe");
        iframe.name  = "hidden_submit_" + Date.now();
        iframe.style.display = "none";
        document.body.appendChild(iframe);

        // Create a form that targets the iframe
        const form   = document.createElement("form");
        form.method  = "POST";
        form.action  = APPS_SCRIPT_URL;
        form.target  = iframe.name;
        form.style.display = "none";

        // Add payload as a single hidden field
        const input  = document.createElement("input");
        input.type   = "hidden";
        input.name   = "payload";
        input.value  = JSON.stringify(payload);
        form.appendChild(input);

        document.body.appendChild(form);
        form.submit();

        // Clean up after 3 seconds
        setTimeout(() => {
          document.body.removeChild(form);
          document.body.removeChild(iframe);
        }, 3000);

        resolve(true);
      } catch (err) {
        console.error("sendViaForm error:", err);
        resolve(false);
      }
    });
  }

  async function appendRow(entry) {
    return await sendViaForm({
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
    return await sendViaForm({
      action:   "signout",
      id:       entry.id,
      time_out: entry.timeOutStr,
    });
  }

  async function getRows() {
    if (!isConfigured()) return null;
    try {
      const res = await fetch(APPS_SCRIPT_URL + "?read=1");
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
