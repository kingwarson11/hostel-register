// ============================================================
//  HOSTEL REGISTER — Google Apps Script
//  Paste into Extensions → Apps Script in your Google Sheet
//  Deploy as Web App: Execute as Me, Anyone can access
// ============================================================

var SHEET_NAME = "Register";

function doGet(e) {
  var p      = e.parameter || {};
  var action = p.action    || "";
  var result;

  if      (action === "ping")    result = handlePing();
  else if (action === "append")  result = handleAppend(p);
  else if (action === "signout") result = handleSignOut(p);
  else if (action === "getRows") result = handleGetRows();
  else                           result = { status: "error", message: "Unknown action" };

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    var hdr = sheet.getRange(1, 1, 1, 11);
    hdr.setValues([[
      "ID","Date","Visitor Name","Visitor Email","Visitor Phone",
      "Resident Name","Resident Email","Room","Time In","Time Out","Status"
    ]]);
    hdr.setFontWeight("bold").setBackground("#1D9E75").setFontColor("#FFFFFF");
    sheet.setFrozenRows(1);
    [140,160,180,200,140,180,200,80,80,80,70].forEach(function(w,i){
      sheet.setColumnWidth(i+1, w);
    });
  }
  return sheet;
}

function handlePing() {
  getSheet();
  return { status: "ok" };
}

function handleAppend(p) {
  try {
    var sheet = getSheet();
    sheet.appendRow([
      p.id||"", p.date||"", p.visitorName||"", p.visitorEmail||"",
      p.visitorPhone||"", p.residentName||"", p.residentEmail||"",
      p.room||"", p.timeIn||"", p.timeOut||"", p.status||"in"
    ]);
    var last = sheet.getLastRow();
    if (last % 2 === 0)
      sheet.getRange(last, 1, 1, 11).setBackground("#F7F8FA");
    return { status: "ok" };
  } catch(e) { return { status: "error", message: e.toString() }; }
}

function handleSignOut(p) {
  try {
    var sheet = getSheet();
    var data  = sheet.getDataRange().getValues();
    for (var i = data.length - 1; i >= 1; i--) {
      var r = data[i];
      if ((p.id && String(r[0]) === String(p.id)) ||
          (!p.id && r[1]===p.date && r[2]===p.visitorName &&
           r[7]===p.room && r[10]==="in")) {
        sheet.getRange(i+1, 10).setValue(p.timeOut||"");
        sheet.getRange(i+1, 11).setValue("out");
        return { status: "ok" };
      }
    }
    return { status: "not_found" };
  } catch(e) { return { status: "error", message: e.toString() }; }
}

function handleGetRows() {
  try {
    var sheet = getSheet();
    var data  = sheet.getDataRange().getValues();
    if (data.length <= 1) return { status: "ok", rows: [] };
    var rows = [];
    for (var i = data.length - 1; i >= 1; i--) {
      var r = data[i];
      rows.push({
        id: String(r[0]), date: String(r[1]),
        visitorName: String(r[2]),  visitorEmail: String(r[3]),
        visitorPhone: String(r[4]), residentName: String(r[5]),
        residentEmail: String(r[6]), room: String(r[7]),
        timeInStr: String(r[8]),   timeOutStr: String(r[9]),
        status: String(r[10]),
      });
    }
    return { status: "ok", rows: rows };
  } catch(e) { return { status: "error", message: e.toString() }; }
}
