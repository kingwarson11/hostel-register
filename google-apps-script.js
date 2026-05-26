// ============================================================
//  HOSTEL REGISTER — Google Apps Script
//  Paste this entire file into your Apps Script editor.
//  See README.md for step-by-step instructions.
// ============================================================

var SHEET_NAME = "Register";

function doGet(e) {
  var params = e.parameter;
  var action = params.action || "";

  if (action === "ping") {
    return jsonResponse({ status: "ok" });
  }

  if (action === "append") {
    return handleAppend(params);
  }

  if (action === "signout") {
    return handleSignOut(params);
  }

  return jsonResponse({ status: "error", message: "Unknown action" });
}

// ── Helpers ──────────────────────────────────────────────────

function getSheet() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow([
      "Date", "Visitor Name", "Visitor Phone",
      "Resident Name", "Resident Phone", "Room",
      "Time In", "Time Out", "Status"
    ]);
    // Style header row
    var header = sheet.getRange(1, 1, 1, 9);
    header.setFontWeight("bold");
    header.setBackground("#1D9E75");
    header.setFontColor("#FFFFFF");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Append a new sign-in row ──────────────────────────────────

function handleAppend(p) {
  try {
    var sheet = getSheet();
    sheet.appendRow([
      p.date         || "",
      p.visitorName  || "",
      p.visitorPhone || "",
      p.residentName || "",
      p.residentPhone|| "",
      p.room         || "",
      p.timeIn       || "",
      p.timeOut      || "",
      p.status       || "in"
    ]);
    return jsonResponse({ status: "ok" });
  } catch (err) {
    return jsonResponse({ status: "error", message: err.toString() });
  }
}

// ── Update sign-out time on existing row ──────────────────────

function handleSignOut(p) {
  try {
    var sheet = getSheet();
    var data  = sheet.getDataRange().getValues();

    // Search from the bottom so we match the most recent entry
    for (var i = data.length - 1; i >= 1; i--) {
      var row = data[i];
      // Columns: 0=Date, 1=VisitorName, 5=Room, 8=Status
      if (
        row[0] === p.date &&
        row[1] === p.visitorName &&
        row[5] === p.room &&
        row[8] === "in"
      ) {
        sheet.getRange(i + 1, 8).setValue(p.timeOut); // col 8 = Time Out
        sheet.getRange(i + 1, 9).setValue("out");     // col 9 = Status
        return jsonResponse({ status: "ok" });
      }
    }
    return jsonResponse({ status: "not_found" });
  } catch (err) {
    return jsonResponse({ status: "error", message: err.toString() });
  }
}
