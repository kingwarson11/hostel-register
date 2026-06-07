// ============================================================
//  HOSTEL REGISTER — Google Apps Script
//  Paste this into Extensions → Apps Script in your Google Sheet
// ============================================================

function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet()
                    .getSheetByName("visitors");
    const data = JSON.parse(e.postData.contents);

    if (data.action === "signout") {
      // Find row by ID and update time_out + status
      const rows = sheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === String(data.id)) {
          sheet.getRange(i + 1, 8).setValue(data.time_out); // Time Out (col H)
          const statusCell = sheet.getRange(i + 1, 9);
          statusCell.setValue("out");
          // 🔴 Red = signed out
          statusCell.setBackground("#FECACA").setFontColor("#7F1D1D").setFontWeight("bold");
          break;
        }
      }
    } else {
      // New sign-in → append row
      const lastRow = sheet.getLastRow() + 1;
      sheet.appendRow([
        data.id,            // A - ID
        data.date,          // B - Date
        data.visitor_name,  // C - Visitor Name
        data.visitor_phone, // D - Visitor Phone
        data.resident_name, // E - Resident Name
        data.room,          // F - Room
        data.time_in,       // G - Time In
        "",                 // H - Time Out
        "in",               // I - Status
      ]);
      // 🟢 Green = signed in
      const statusCell = sheet.getRange(lastRow, 9);
      statusCell.setBackground("#BBF7D0").setFontColor("#14532D").setFontWeight("bold");
    }

    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet()
                  .getSheetByName("visitors");
  const rows    = sheet.getDataRange().getValues();
  const headers = rows[0];
  const data    = rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h.toLowerCase().replace(/ /g, "_")] = row[i];
    });
    return obj;
  });
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
