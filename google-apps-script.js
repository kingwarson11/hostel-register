// ============================================================
//  HOSTEL REGISTER — Google Apps Script
//  Paste this into Extensions → Apps Script in your Google Sheet
// ============================================================

function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet()
                    .getSheetByName("visitors");

    let data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch(err) {
      // fallback: try reading from parameter
      data = JSON.parse(e.parameter.data);
    }

    if (data.action === "signout") {
      const rows = sheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === String(data.id)) {
          sheet.getRange(i + 1, 8).setValue(data.time_out);
          const statusCell = sheet.getRange(i + 1, 9);
          statusCell.setValue("out");
          statusCell.setBackground("#FECACA").setFontColor("#7F1D1D").setFontWeight("bold");
          break;
        }
      }
    } else {
      const lastRow = sheet.getLastRow() + 1;
      sheet.appendRow([
        data.id,
        data.date,
        data.visitor_name,
        data.visitor_phone || "",
        data.resident_name,
        data.room,
        data.time_in,
        "",
        "in",
      ]);
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
  // Used to read rows AND to receive data (CORS workaround)
  if (e.parameter && e.parameter.data) {
    return doPost({ postData: { contents: e.parameter.data }, parameter: e.parameter });
  }

  const sheet   = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("visitors");
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
