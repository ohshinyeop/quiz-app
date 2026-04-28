/**
 * 스프레드시트에 바인드된 프로젝트에 이 코드를 붙여 넣은 뒤,
 * 배포 > 새 배포 > 유형: 웹 앱
 * - 실행: 나
 * - 액세스 권한: 전체
 * 로 배포하고 URL을 웹앱 GOOGLE_SCRIPT_URL 에 넣으세요.
 *
 * 시트 구성
 * ---------
 * 1) 시트 이름: 응답
 *    제출 로그(기존과 동일). 1행이 비어 있으면 아래 헤더를 자동으로 씁니다.
 *    이름 | 문제번호 | 문제 | 사용자답 | 정답 | 결과 | 제출시각
 *
 * 2) 시트 이름: 문제
 *    1행 헤더: 문제 | 정답  (또는 question | answer)
 *    2행부터 한 행에 한 문제. 시트만 저장하면 다음 로드/시작하기 시 반영됩니다.
 */

var SHEET_SUBMISSIONS = "응답";
var SHEET_QUESTIONS = "문제";

var SUB_HEADERS = ["이름", "문제번호", "문제", "사용자답", "정답", "결과", "제출시각"];

function doGet(e) {
  var action = e && e.parameter && e.parameter.action;
  if (action === "questions") {
    try {
      var sheet = getQuestionSheet();
      var questions = readQuestionsFromSheet(sheet);
      return jsonOutput({ ok: true, questions: questions });
    } catch (err) {
      return jsonOutput({ ok: false, error: String(err.message || err) });
    }
  }
  return jsonOutput({ ok: false, error: "Unknown action" });
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = getOrInitSubmissionSheet();
    ensureSubmissionHeaders(sheet);
    sheet.appendRow([
      data.name,
      data.questionId,
      data.question,
      data.userAnswer,
      data.correctAnswer,
      data.isCorrect,
      data.submittedAt,
    ]);
    return jsonOutput({ ok: true });
  } catch (err) {
    return jsonOutput({ ok: false, error: String(err.message || err) });
  }
}

function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getQuestionSheet() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_QUESTIONS);
  if (!sheet) {
    throw new Error('시트 "' + SHEET_QUESTIONS + '" 가 없습니다.');
  }
  return sheet;
}

function getOrInitSubmissionSheet() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_SUBMISSIONS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_SUBMISSIONS);
  }
  return sheet;
}

function ensureSubmissionHeaders(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow === 0) {
    sheet.appendRow(SUB_HEADERS);
    return;
  }
  var firstCell = sheet.getRange(1, 1).getValue();
  if (firstCell === "" || firstCell === null) {
    sheet.getRange(1, 1, 1, SUB_HEADERS.length).setValues([SUB_HEADERS]);
  }
}

function readQuestionsFromSheet(sheet) {
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    return [];
  }
  var header = values[0];
  var qCol = findColumnIndex(header, ["문제", "question", "Question"]);
  var aCol = findColumnIndex(header, ["정답", "answer", "Answer"]);
  if (qCol === -1 || aCol === -1) {
    throw new Error('문제 시트 1행에 "문제"와 "정답" 열이 필요합니다.');
  }
  var out = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var q = String(row[qCol] || "").trim();
    var a = String(row[aCol] || "").trim();
    if (q === "" && a === "") continue;
    out.push({
      id: r + 1,
      question: q,
      answer: a,
    });
  }
  return out;
}

function findColumnIndex(headerRow, candidates) {
  for (var c = 0; c < headerRow.length; c++) {
    var cell = String(headerRow[c] || "")
      .trim()
      .toLowerCase();
    for (var i = 0; i < candidates.length; i++) {
      if (cell === String(candidates[i]).toLowerCase()) {
        return c;
      }
    }
  }
  return -1;
}

function jsonOutput(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
