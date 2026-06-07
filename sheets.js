// db.js — Supabase as the single source of truth
// (file kept as sheets.js so index.html script tag doesn't need changing)

const Sheets = (() => {
  const TABLE = "visitors";

  function isConfigured() {
    return (
      typeof SUPABASE_URL === "string" && SUPABASE_URL.startsWith("https://") &&
      typeof SUPABASE_ANON_KEY === "string" && SUPABASE_ANON_KEY.length > 10
    );
  }

  function showBanner(msg, state) {
    const banner = document.getElementById("sheet-banner");
    const status = document.getElementById("sheet-status");
    const link   = document.getElementById("sheet-link");
    if (!banner) return;
    banner.classList.remove("hidden", "ok", "error");
    banner.classList.add(state === "ok" ? "ok" : state === "error" ? "error" : "");
    status.textContent = msg;
    if (link) link.classList.add("hidden"); // no sheet link for Supabase
  }

  function headers() {
    return {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": "Bearer " + SUPABASE_ANON_KEY,
    };
  }

  function endpoint(query = "") {
    return `${SUPABASE_URL}/rest/v1/${TABLE}${query}`;
  }

  // ── Ping / init ──────────────────────────────────────────────
  async function init() {
    if (!isConfigured()) return;
    showBanner("Connecting to Supabase…", "");
    try {
      const res = await fetch(endpoint("?limit=1"), {
        headers: { ...headers(), "Prefer": "count=none" }
      });
      if (res.ok) {
        showBanner("Connected to Supabase", "ok");
      } else {
        showBanner("Supabase error — check your URL and key", "error");
      }
    } catch {
      showBanner("Cannot reach Supabase — check your connection", "error");
    }
  }

  // ── Read today's rows ─────────────────────────────────────────
  async function getRows() {
    if (!isConfigured()) return null;
    try {
      const today = new Date().toLocaleDateString("en-GB");
      const res = await fetch(
        endpoint(`?date=eq.${encodeURIComponent(today)}&order=created_at.desc`),
        { headers: headers() }
      );
      if (!res.ok) return null;
      const data = await res.json();
      // Map Supabase column names → app's internal names
      return data.map(r => ({
        id:         String(r.id),
        date:       r.date,
        vName:      r.visitor_name,
        vPhone:     r.visitor_phone || "",
        rName:      r.resident_name,
        rPhone:     r.resident_phone || "",
        rRoom:      r.room,
        timeInStr:  r.time_in,
        timeOutStr: r.time_out || "",
        status:     r.status,
      }));
    } catch (e) {
      console.warn("getRows failed:", e);
      return null;
    }
  }

  // ── Append a new sign-in row ──────────────────────────────────
  async function appendRow(entry) {
    if (!isConfigured()) return false;
    try {
      const res = await fetch(endpoint(), {
        method: "POST",
        headers: { ...headers(), "Prefer": "return=minimal" },
        body: JSON.stringify({
          id:             entry.id,
          date:           entry.date,
          visitor_name:   entry.vName,
          visitor_phone:  entry.vPhone  || "",
          resident_name:  entry.rName,
          resident_phone: entry.rPhone  || "",
          room:           entry.rRoom,
          time_in:        entry.timeInStr,
          time_out:       "",
          status:         "in",
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  // ── Update sign-out on existing row ──────────────────────────
  async function updateSignOut(entry) {
    if (!isConfigured()) return false;
    try {
      const res = await fetch(endpoint(`?id=eq.${entry.id}`), {
        method: "PATCH",
        headers: { ...headers(), "Prefer": "return=minimal" },
        body: JSON.stringify({
          time_out: entry.timeOutStr,
          status:   "out",
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  return { init, getRows, appendRow, updateSignOut, isConfigured };
})();
