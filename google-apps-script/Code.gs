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
 *    주관식: 문제 | 정답 | 유형(비움)
 *    OX:      문제 | 정답(O/X) | 유형(ox)
 *    객관식:  문제 | 정답(보기 중 정답 문장과 동일) | 유형(객관식 또는 mc) | 보기1 | 보기2 | …
 *    보기 열 이름: 보기1~보기15, 선택1, option1 등 (영문 대소문자 허용)
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
  var typeCol = findTypeColumnIndex(header, qCol, aCol);
  var optionColIndices = findOptionColumnIndices(header);
  var out = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var q = String(row[qCol] || "").trim();
    var a = String(row[aCol] || "").trim();
    if (q === "" && a === "") continue;

    var rawType =
      typeCol >= 0 && typeCol < row.length
        ? normalizeQuestionTypeCell(row[typeCol])
        : "";
    var isOx = rawType === "ox";
    var isMc = isMcQuestionType(rawType);
    var mcOptions = null;
    if (isOx && isMc) {
      throw new Error("행 " + (r + 1) + ": 유형은 ox 와 객관식을 동시에 쓸 수 없습니다.");
    }
    if (isOx) {
      var ax = normalizeOxAnswer(a);
      if (ax !== "o" && ax !== "x") {
        throw new Error(
          "OX 문제(행 " +
            (r + 1) +
            ')의 정답은 O 또는 X 여야 합니다. 현재: "' +
            a +
            '"'
        );
      }
      a = ax.toUpperCase();
    } else if (isMc) {
      if (optionColIndices.length < 2) {
        throw new Error(
          '객관식은 시트에 "보기1", "보기2" … 열(최소 2개)이 필요합니다.'
        );
      }
      var options = [];
      for (var oi = 0; oi < optionColIndices.length; oi++) {
        var optText = String(row[optionColIndices[oi]] || "").trim();
        if (optText !== "") options.push(optText);
      }
      if (options.length < 2) {
        throw new Error(
          "객관식 행 " +
            (r + 1) +
            "(스프레드시트 " +
            (r + 1) +
            "행): 채워진 보기가 2개 미만입니다. " +
            "① 1행에 보기1·보기2… 헤더가 있는지, " +
            "② 해당 행에 선택지 텍스트가 들어갔는지 확인해 주세요. " +
            "(빈 행에는 유형을 비우세요 · 현재 인식된 보기 " +
            options.length +
            "개)"
        );
      }
      var ansNorm = normalizeForMcCompare(a);
      var matched = false;
      for (var j = 0; j < options.length; j++) {
        if (normalizeForMcCompare(options[j]) === ansNorm) {
          matched = true;
          break;
        }
      }
      if (!matched) {
        throw new Error(
          '객관식 행 ' +
            (r + 1) +
            ': 정답 셀 내용이 보기 중 하나와 같아야 합니다. (정답: "' +
            a +
            '")'
        );
      }
      mcOptions = options;
    }
    if (q === "" && a === "") continue;
    var item = {
      id: r + 1,
      question: q,
      answer: a,
      type: isOx ? "ox" : isMc ? "mc" : "short",
    };
    if (mcOptions) item.options = mcOptions;
    out.push(item);
  }
  return out;
}

function isMcQuestionType(rawType) {
  return (
    rawType === "mc" ||
    rawType === "객관식" ||
    rawType === "choice" ||
    rawType === "multiple" ||
    rawType === "multiplechoice"
  );
}

function normalizeForMcCompare(s) {
  return String(s || "")
    .trim()
    .replace(/\s+/g, "")
    .toLowerCase();
}

/** 보기1 … 보기15, 선택1, option1, A열 식(1~10만) */
function findOptionColumnIndices(headerRow) {
  var found = [];
  for (var n = 1; n <= 15; n++) {
    var idx = findColumnIndex(headerRow, [
      "보기" + n,
      "보기 " + n,
      "선택" + n,
      "선택 " + n,
      "option" + n,
      "Option" + n,
    ]);
    if (idx !== -1) {
      found.push({ n: n, idx: idx });
    }
  }
  found.sort(function (a, b) {
    return a.n - b.n;
  });
  var outIdx = [];
  for (var i = 0; i < found.length; i++) {
    outIdx.push(found[i].idx);
  }
  return outIdx;
}

/** 헤더에 "유형" 포함 여부·3열 가정 등으로 열 인덱스 찾기 */
function findTypeColumnIndex(headerRow, qCol, aCol) {
  var idx = findColumnIndex(headerRow, [
    "유형",
    "type",
    "Type",
    "문제유형",
    "형식",
    "문제 유형",
  ]);
  if (idx !== -1) return idx;
  for (var c = 0; c < headerRow.length; c++) {
    var h = String(headerRow[c] || "")
      .replace(/\s+/g, "")
      .toLowerCase();
    if (h.indexOf("유형") !== -1) return c;
    if (h === "type" || h === "kind") return c;
  }
  var afterQA = Math.max(qCol, aCol) + 1;
  if (afterQA < headerRow.length) return afterQA;
  if (headerRow.length >= 3) return headerRow.length - 1;
  return -1;
}

/** 셀 값: 전각 영문·공백 정리 후 소문자 (ox 판별용) */
function normalizeQuestionTypeCell(value) {
  var s = String(value || "").trim();
  if (s === "") return "";
  var out = "";
  for (var i = 0; i < s.length; i++) {
    var code = s.charCodeAt(i);
    if (code >= 0xff01 && code <= 0xff5e) {
      out += String.fromCharCode(code - 0xfee0);
    } else {
      out += s.charAt(i);
    }
  }
  return out.toLowerCase().replace(/\s+/g, "");
}

function normalizeOxAnswer(value) {
  var s = String(value || "")
    .trim()
    .toLowerCase();
  if (s === "o" || s === "ㅇ") return "o";
  if (s === "x") return "x";
  return s;
}

function normalizeHeaderForMatch(v) {
  var s = String(v || "").trim().toLowerCase();
  var out = "";
  for (var i = 0; i < s.length; i++) {
    var code = s.charCodeAt(i);
    if (code >= 0xff10 && code <= 0xff19) {
      out += String.fromCharCode(code - 0xff10 + 48);
    } else if (code >= 0xff01 && code <= 0xff5e) {
      out += String.fromCharCode(code - 0xfee0);
    } else {
      out += s.charAt(i);
    }
  }
  return out.replace(/\s+/g, "");
}

function findColumnIndex(headerRow, candidates) {
  for (var c = 0; c < headerRow.length; c++) {
    var cell = normalizeHeaderForMatch(headerRow[c]);
    for (var i = 0; i < candidates.length; i++) {
      if (cell === normalizeHeaderForMatch(candidates[i])) {
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
