function setCORSHeaders(response) {
  // We can't actually set arbitrary headers easily in ContentService without a web app workaround,
  // but Apps Script will automatically add CORS headers if we just return ContentService.
  // Actually, for a simple JSON response, this works out of the box with CORS mode in fetch if we just return JSON.
  // We still need to handle OPTIONS preflight request.
}

function doOptions(e) {
  var headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT);
    // Note: Apps Script might override or ignore explicit headers, 
    // but having doOptions often satisfies browser preflight checks.
}

function sanitizeString(str, maxLength) {
  if (str === null || str === undefined) return "";
  return String(str).trim().substring(0, maxLength);
}

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  try {
    var data;
    if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else {
      data = JSON.parse(e.parameter.data);
    }
    
    // Define headers if the sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Timestamp", "Session ID", "Name", "Age", "Gender", "Roll No", "Grade", "Section", "Time Taken (s)", 
        "Tab Switches", "Time Outside Tab (s)",
        "Q1", "Q2", "Q3", "Q4", "Q5", "Q6", 
        "Q7", "Q8", "Q9", "Q10", "Q11", "Q12"
      ]);
    }

    var sessionId = sanitizeString(data.sessionId, 100);
    
    // 2. Deduplication check
    if (sessionId) {
      var dataRange = sheet.getDataRange();
      var values = dataRange.getValues();
      for (var i = 1; i < values.length; i++) {
        if (values[i][1] === sessionId) { // Session ID is in column 2 (index 1)
          return ContentService.createTextOutput(JSON.stringify({"result": "success", "message": "Already recorded"}))
            .setMimeType(ContentService.MimeType.JSON);
        }
      }
    }
    
    // 3. Sanitization
    var name = sanitizeString(data.name, 100);
    var age = isNaN(Number(data.age)) ? "" : Number(data.age);
    var gender = sanitizeString(data.gender, 20);
    var rollNo = sanitizeString(data.rollNo, 50);
    var grade = sanitizeString(data.grade, 20);
    var section = sanitizeString(data.section, 20);
    
    var ans = data.answers || {};
    var timeTaken = isNaN(Number(ans.timeTakenSeconds)) ? "" : Number(ans.timeTakenSeconds);
    var tabSwitches = isNaN(Number(ans.tabSwitches)) ? 0 : Number(ans.tabSwitches);
    var timeOutside = isNaN(Number(ans.timeOutsideTabSeconds)) ? 0 : Number(ans.timeOutsideTabSeconds);

    // Append the row
    var row = [
      data.timestamp || new Date().toISOString(),
      sessionId,
      name,
      age,
      gender,
      rollNo,
      grade,
      section,
      timeTaken,
      tabSwitches,
      timeOutside,
      ans.Q1 !== undefined ? Number(ans.Q1) : "",
      ans.Q2 !== undefined ? Number(ans.Q2) : "",
      ans.Q3 !== undefined ? Number(ans.Q3) : "",
      ans.Q4 !== undefined ? Number(ans.Q4) : "",
      ans.Q5 !== undefined ? Number(ans.Q5) : "",
      ans.Q6 !== undefined ? Number(ans.Q6) : "",
      ans.Q7 !== undefined ? Number(ans.Q7) : "",
      ans.Q8 !== undefined ? Number(ans.Q8) : "",
      ans.Q9 !== undefined ? Number(ans.Q9) : "",
      ans.Q10 !== undefined ? Number(ans.Q10) : "",
      ans.Q11 !== undefined ? Number(ans.Q11) : "",
      ans.Q12 !== undefined ? Number(ans.Q12) : ""
    ];
    
    sheet.appendRow(row);
    
    return ContentService.createTextOutput(JSON.stringify({"result": "success"}))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({"result": "error", "error": error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
