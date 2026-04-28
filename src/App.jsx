import React, { useEffect, useState } from "react";

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbymWg8TtMG_qQAfnA9AaPaVwawApDrYDGcBZExdom49-_oNzODRorj6H1NoZ40Itfg6/exec";

/** 시트/API에서 온 유형 값 정리 (전각·공백·대소문자) */
function normalizeQuestionTypeFromApi(v) {
  if (v == null) return "";
  const s = String(v).trim();
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code >= 0xff01 && code <= 0xff5e) {
      out += String.fromCharCode(code - 0xfee0);
    } else {
      out += s[i];
    }
  }
  return out.toLowerCase().replace(/\s+/g, "");
}

/** 응답 시트용: KST, yy.MM.dd HH.mm.ss (재배포 없이 프론트에서만 포맷) */
function formatKstSubmittedAt(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const v = (t) => parts.find((p) => p.type === t)?.value ?? "";
  return `${v("year")}.${v("month")}.${v("day")} ${v("hour")}.${v("minute")}.${v("second")}`;
}

async function fetchQuestionsFromSheet() {
  const url = `${GOOGLE_SCRIPT_URL}?action=questions`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`서버 응답 ${res.status}`);
  }
  const data = await res.json();
  if (!data.ok) {
    throw new Error(data.error || "문제를 불러오지 못했습니다.");
  }
  return Array.isArray(data.questions) ? data.questions : [];
}

export default function App() {
  const [quizList, setQuizList] = useState([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [questionsError, setQuestionsError] = useState(null);

  const [userName, setUserName] = useState("");
  const [isStarted, setIsStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [result, setResult] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionCorrect, setSubmissionCorrect] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshingForStart, setIsRefreshingForStart] = useState(false);

  const loadQuestions = async () => {
    setQuestionsError(null);
    setQuestionsLoading(true);
    try {
      const list = await fetchQuestionsFromSheet();
      setQuizList(list);
      if (list.length === 0) {
        setQuestionsError("등록된 문제가 없습니다. 스프레드시트 「문제」 시트를 확인해 주세요.");
      }
    } catch (err) {
      setQuizList([]);
      setQuestionsError(err.message || "문제를 불러오지 못했습니다.");
    } finally {
      setQuestionsLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, []);

  const currentQuiz = quizList[currentIndex];
  const isLastQuiz = quizList.length > 0 && currentIndex === quizList.length - 1;

  const normalize = (value) => {
    return value.trim().replace(/\s/g, "").toLowerCase();
  };

  const normalizeOx = (value) => {
    const s = String(value || "")
      .trim()
      .toLowerCase();
    if (s === "o" || s === "ㅇ") return "o";
    if (s === "x") return "x";
    return "";
  };

  const answersMatch = (user, correct, type) => {
    if (type === "ox") {
      return normalizeOx(user) !== "" && normalizeOx(user) === normalizeOx(correct);
    }
    return normalize(user) === normalize(correct);
  };

  const isOxQuestion = (quiz) => {
    if (!quiz) return false;
    return normalizeQuestionTypeFromApi(quiz.type) === "ox";
  };

  const isMcQuestion = (quiz) => {
    if (!quiz || !Array.isArray(quiz.options) || quiz.options.length < 2) return false;
    const t = normalizeQuestionTypeFromApi(quiz.type);
    return (
      t === "mc" ||
      t === "객관식" ||
      t === "choice" ||
      t === "multiple" ||
      t === "multiplechoice"
    );
  };

  const handleStart = async () => {
    if (questionsLoading || isRefreshingForStart) return;
    if (!userName.trim()) {
      alert("이름을 입력해 주세요.");
      return;
    }
    setIsRefreshingForStart(true);
    setQuestionsError(null);
    try {
      const list = await fetchQuestionsFromSheet();
      setQuizList(list);
      if (!list.length) {
        setQuestionsError("등록된 문제가 없습니다. 「문제」 시트에 문제와 정답을 입력해 주세요.");
        return;
      }
      setCurrentIndex(0);
      setUserAnswer("");
      setResult("");
      setIsSubmitted(false);
      setSubmissionCorrect(null);
      setIsStarted(true);
    } catch (err) {
      setQuestionsError(err.message || "문제를 불러오지 못했습니다.");
    } finally {
      setIsRefreshingForStart(false);
    }
  };

  const saveToGoogleSheet = async (data) => {
    await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      body: JSON.stringify(data),
    });
  };

  const submitWithAnswer = async (answer) => {
    if (!currentQuiz || isSaving) return;

    const ox = isOxQuestion(currentQuiz);
    const mc = isMcQuestion(currentQuiz);

    if (ox) {
      const o = normalizeOx(answer);
      if (o !== "o" && o !== "x") {
        setResult("O 또는 X를 선택해 주세요.");
        return;
      }
      setUserAnswer(o.toUpperCase());
    } else if (mc) {
      const picked = String(answer ?? "").trim();
      if (!picked) {
        setResult("보기를 선택해 주세요.");
        return;
      }
      setUserAnswer(picked);
    } else {
      if (!String(answer).trim()) {
        setResult("정답을 입력해 주세요.");
        return;
      }
      setUserAnswer(String(answer).trim());
    }

    const rawU = ox ? answer : String(answer ?? "").trim();
    const typeKey = ox ? "ox" : mc ? "mc" : "short";
    const isCorrect = answersMatch(rawU, currentQuiz.answer, typeKey);
    const userAnswerForSheet = ox ? normalizeOx(answer).toUpperCase() : String(answer ?? "").trim();

    setIsSaving(true);
    try {
      await saveToGoogleSheet({
        name: userName,
        questionId: currentQuiz.id,
        question: currentQuiz.question,
        userAnswer: userAnswerForSheet,
        correctAnswer: currentQuiz.answer,
        isCorrect: isCorrect ? "정답" : "오답",
        submittedAt: formatKstSubmittedAt(),
      });
      setResult(isCorrect ? "정답입니다 🎉" : "오답입니다");
    } catch (error) {
      console.error("구글 시트 저장 실패", error);
      setResult("저장에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setSubmissionCorrect(isCorrect);
      setIsSubmitted(true);
      setIsSaving(false);
    }
  };

  const handleSubmit = () => {
    if (isSaving) return;
    void submitWithAnswer(userAnswer);
  };

  const handleOxPick = (letter) => {
    if (!currentQuiz || isSubmitted || isSaving) return;
    void submitWithAnswer(letter);
  };

  const showLoadingOverlay = questionsLoading || isRefreshingForStart || isSaving;
  const loadingOverlayMessage = isSaving ? "제출하는 중..." : "불러오는 중...";

  const handleNext = () => {
    if (isLastQuiz) return;
    setCurrentIndex((prev) => prev + 1);
    setUserAnswer("");
    setResult("");
    setIsSubmitted(false);
    setSubmissionCorrect(null);
  };

  if (!isStarted) {
    return (
      <div style={styles.page}>
        {/* <LoadingOverlay open={showLoadingOverlay} message={loadingOverlayMessage} /> */}
        <div style={styles.card}>
          <div style={styles.outer}>
            <div>아이샵케어 CX팀</div>
          </div>
          <div style={styles.introTitleStack}>
            <div style={styles.title}>온보딩 퀴즈</div>
            <div style={styles.introTagline}>💡 배운 내용, 퀴즈로 체크해봐요!</div>
          </div>
          <div style={styles.introSpacer} />
          <div style={styles.description}>이름을 입력해 주세요.</div>
          {questionsError && (
            <p style={styles.error} role="alert">
              {questionsError}
            </p>
          )}
          <input
            style={styles.input}
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleStart();
            }}
            placeholder="이름"
          />
          <button type="button" style={styles.button} onClick={handleStart}>
            시작하기
          </button>
          {!questionsLoading && questionsError && (
            <button type="button" style={styles.subButton} onClick={loadQuestions}>
              다시 불러오기
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!currentQuiz) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <p style={styles.error}>표시할 문제가 없습니다.</p>
          <button
            type="button"
            style={styles.button}
            onClick={() => {
              setIsStarted(false);
              loadQuestions();
            }}
          >
            처음으로
          </button>
        </div>
      </div>
    );
  }

  const showAnswerReveal = isSubmitted && submissionCorrect === false;

  const oxButtonStyle = (letter) => {
    const base = letter === "O" ? styles.oxBtnO : styles.oxBtnX;
    if (!isSubmitted) return base;
    if (submissionCorrect) {
      const correctO = normalizeOx(currentQuiz.answer) === "o";
      if (letter === "O" && correctO) return { ...base, ...styles.oxRevealCorrect };
      if (letter === "X" && !correctO) return { ...base, ...styles.oxRevealCorrect };
      return { ...base, ...styles.oxBtnMuted };
    }
    if (!showAnswerReveal) return { ...base, ...styles.oxBtnMuted };
    const correctO = normalizeOx(currentQuiz.answer) === "o";
    const userO = normalizeOx(userAnswer) === "o";
    if (letter === "O") {
      if (correctO) return { ...base, ...styles.oxRevealCorrect };
      if (userO && !correctO) return { ...base, ...styles.oxRevealWrong };
      return { ...base, ...styles.oxBtnMuted };
    }
    if (!correctO) return { ...base, ...styles.oxRevealCorrect };
    if (!userO && correctO) return { ...base, ...styles.oxRevealWrong };
    return { ...base, ...styles.oxBtnMuted };
  };

  const mcOptionCombinedStyle = (opt) => {
    const base = { ...styles.mcOption };
    if (!isSubmitted) {
      if (userAnswer === opt) return { ...base, ...styles.mcOptionSelected };
      return base;
    }
    if (submissionCorrect) {
      if (userAnswer === opt) return { ...base, ...styles.mcOptionRevealCorrect };
      return { ...base, ...styles.mcOptionDim };
    }
    if (showAnswerReveal) {
      const nU = normalize(userAnswer);
      const nO = normalize(opt);
      const nA = normalize(currentQuiz.answer);
      if (nO === nA) return { ...base, ...styles.mcOptionRevealCorrect };
      if (nO === nU) return { ...base, ...styles.mcOptionRevealWrong };
      return { ...base, ...styles.mcOptionDim };
    }
    return base;
  };

  return (
    <div style={styles.page}>
      <LoadingOverlay open={showLoadingOverlay} message={loadingOverlayMessage} />
      <div style={styles.card}>
        <p style={styles.progress}>
          {userName}님 · 문제 {currentIndex + 1} / {quizList.length}
        </p>

        <h2 style={styles.question}>{currentQuiz.question}</h2>

        {isOxQuestion(currentQuiz) ? (
          <div style={styles.oxWrap} role="group" aria-label="O 또는 X 선택">
            <button
              type="button"
              style={oxButtonStyle("O")}
              onClick={() => handleOxPick("O")}
              disabled={isSubmitted}
              aria-label="O"
            >
              O
            </button>
            <button
              type="button"
              style={oxButtonStyle("X")}
              onClick={() => handleOxPick("X")}
              disabled={isSubmitted}
              aria-label="X"
            >
              ×
            </button>
          </div>
        ) : isMcQuestion(currentQuiz) ? (
          <div style={styles.mcBlock}>
            <div style={styles.mcList} role="group" aria-label="보기 선택">
              {currentQuiz.options.map((opt, i) => (
                <button
                  key={`${i}-${opt.slice(0, 24)}`}
                  type="button"
                  style={mcOptionCombinedStyle(opt)}
                  onClick={() => {
                    if (!isSubmitted) setUserAnswer(opt);
                  }}
                  disabled={isSubmitted}
                >
                  <span style={styles.mcBadge}>{i + 1}</span>
                  <span style={styles.mcText}>{opt}</span>
                </button>
              ))}
            </div>
            {!isSubmitted && (
              <button type="button" style={styles.button} onClick={handleSubmit}>
                제출
              </button>
            )}
          </div>
        ) : (
          <>
            <input
              style={shortAnswerInputStyle(
                showAnswerReveal,
                isSubmitted && submissionCorrect === true,
              )}
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isSubmitted && !isSaving) handleSubmit();
              }}
              placeholder="정답을 입력해 주세요"
              disabled={isSubmitted}
            />
            {showAnswerReveal && !isMcQuestion(currentQuiz) && !isOxQuestion(currentQuiz) && (
              <div style={styles.correctAnswerCallout} role="status">
                <span style={styles.correctAnswerLabel}>정답</span>
                <p style={styles.correctAnswerText}>{currentQuiz.answer}</p>
              </div>
            )}

            {!isSubmitted && (
              <button type="button" style={styles.button} onClick={handleSubmit}>
                제출
              </button>
            )}
          </>
        )}

        {result && <div style={styles.result}>{result}</div>}

        {showAnswerReveal && currentQuiz.explanation && (
          <div style={styles.explanationBox}>
            <div style={styles.explanationTitle}>해설</div>
            <p style={styles.explanationBody}>{currentQuiz.explanation}</p>
          </div>
        )}

        {isSubmitted && !isLastQuiz && (
          <button type="button" style={styles.subButton} onClick={handleNext}>
            다음 문제
          </button>
        )}

        {isSubmitted && isLastQuiz && (
          <div style={styles.complete}>모든 문제를 완료했습니다.</div>
        )}
      </div>
    </div>
  );
}

function LoadingOverlay({ open, message }) {
  if (!open) return null;
  return (
    <div
      style={styles.loadingRoot}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={message}
    >
      <div style={styles.loadingCard}>
        <div className="quiz-app-spinner" style={styles.loadingSpinner} />
        <p style={styles.loadingMessage}>{message}</p>
      </div>
    </div>
  );
}

const font =
  '"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif';

const styles = {
  outer: {
    border: "1px solid #e5e8eb",
    padding: "10px 16px",
    borderRadius: "18px",
    width: "fit-content",
    background: "#4285F4",
    color: "#ffffff",
    fontWeight: "700",
    display: "flex",
    flexDirection: "column",
  },
  introTitleStack: {
    display: "flex",
    flexDirection: "column",
    gap: "0px",
  },
  introTagline: {
    fontSize: "16px",
  },
  introSpacer: {
    height: "1px",
  },
  page: {
    minHeight: "100vh",
    background: "#f2f4f6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px 20px",
    boxSizing: "border-box",
    fontFamily: font,
    flexDirection: "column",
  },
  card: {
    width: "100%",
    maxWidth: "560px",
    background: "#ffffff",
    padding: "28px 24px",
    borderRadius: "20px",
    boxSizing: "border-box",
    border: "1px solid #e5e8eb",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  title: {
    fontSize: "32px",
    fontWeight: "700",
    letterSpacing: "-0.02em",
    color: "#050505",
    lineHeight: "1.3",
  },
  subtitle: {
    margin: "0 0 8px",
    fontSize: "14px",
    fontWeight: "700",
    letterSpacing: "-0.02em",
    color: "#3c568a",
    lineHeight: "1.3",
  },
  description: { color: "#6b7684", fontSize: "16px", lineHeight: "1.5" },
  hint: {
    color: "#8b95a1",
    fontSize: "14px",
    lineHeight: "1.45",
  },
  error: {
    margin: "0 0 16px",
    color: "#f04452",
    fontSize: "15px",
    lineHeight: "1.5",
  },
  progress: {
    margin: "0 0 16px",
    color: "#8b95a1",
    fontSize: "14px",
    fontWeight: "500",
    lineHeight: "1.4",
  },
  question: {
    margin: "0 0 24px",
    fontSize: "22px",
    fontWeight: "600",
    lineHeight: "1.45",
    letterSpacing: "-0.02em",
    color: "#191f28",
    wordBreak: "keep-all",
  },
  mcBlock: {
    width: "100%",
    marginBottom: "4px",
  },
  mcList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginBottom: "14px",
    width: "100%",
  },
  mcOption: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    width: "100%",
    padding: "14px 14px",
    textAlign: "left",
    border: "1px solid #e5e8eb",
    borderRadius: "12px",
    background: "#ffffff",
    cursor: "pointer",
    fontFamily: font,
    boxSizing: "border-box",
    transition: "border-color 0.15s, background 0.15s",
  },
  mcOptionSelected: {
    borderColor: "#3182f6",
    background: "#e8f3ff",
  },
  mcOptionDim: {
    opacity: 0.52,
  },
  mcOptionRevealCorrect: {
    border: "2px solid #3182f6",
    background: "#e8f3ff",
    opacity: 1,
  },
  mcOptionRevealWrong: {
    border: "2px solid #f04452",
    background: "#fff5f5",
    opacity: 1,
  },
  mcBadge: {
    flexShrink: 0,
    width: "26px",
    height: "26px",
    borderRadius: "8px",
    background: "#f2f4f6",
    color: "#4e5968",
    fontSize: "14px",
    fontWeight: "700",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginTop: "2px",
  },
  mcText: {
    flex: 1,
    fontSize: "16px",
    fontWeight: "500",
    lineHeight: 1.5,
    color: "#191f28",
    wordBreak: "keep-all",
  },
  input: {
    width: "100%",
    padding: "16px",
    fontSize: "17px",
    border: "1px solid #e5e8eb",
    borderRadius: "12px",
    boxSizing: "border-box",
    marginBottom: "12px",
    background: "#ffffff",
    color: "#191f28",
    fontFamily: font,
    outline: "none",
  },
  inputRevealWrong: {
    border: "2px solid #f04452",
    background: "#fff8f8",
  },
  inputRevealCorrect: {
    border: "2px solid #3182f6",
    background: "#e8f3ff",
  },
  correctAnswerCallout: {
    marginBottom: "14px",
    padding: "14px 16px",
    borderRadius: "12px",
    border: "2px solid #3182f6",
    background: "#e8f3ff",
    boxSizing: "border-box",
  },
  correctAnswerLabel: {
    display: "block",
    fontSize: "13px",
    fontWeight: "700",
    color: "#2272eb",
    marginBottom: "6px",
  },
  correctAnswerText: {
    margin: 0,
    fontSize: "16px",
    fontWeight: "600",
    lineHeight: 1.5,
    color: "#191f28",
    wordBreak: "keep-all",
  },
  explanationBox: {
    marginTop: "16px",
    marginBottom: "4px",
    padding: "16px",
    borderRadius: "12px",
    border: "1px solid #e5e8eb",
    background: "#fafafa",
    boxSizing: "border-box",
  },
  explanationTitle: {
    fontSize: "15px",
    fontWeight: "700",
    color: "#191f28",
    marginBottom: "10px",
  },
  explanationBody: {
    margin: 0,
    fontSize: "15px",
    lineHeight: 1.55,
    color: "#4e5968",
    whiteSpace: "pre-wrap",
    wordBreak: "keep-all",
  },
  oxWrap: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: "max(8vw, 28px)",
    marginBottom: "16px",
    width: "100%",
  },
  oxBtnO: {
    width: "min(33vw, 108px)",
    height: "min(33vw, 108px)",
    maxWidth: "108px",
    maxHeight: "108px",
    aspectRatio: "1",
    flexShrink: 0,
    padding: 0,
    border: "none",
    borderRadius: "50%",
    background: "#3182f6",
    color: "#ffffff",
    fontSize: "clamp(32px, 8vw, 40px)",
    fontWeight: "700",
    lineHeight: 1,
    cursor: "pointer",
    fontFamily: font,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  oxBtnX: {
    width: "min(33vw, 108px)",
    height: "min(33vw, 108px)",
    maxWidth: "108px",
    maxHeight: "108px",
    aspectRatio: "1",
    flexShrink: 0,
    padding: 0,
    border: "none",
    borderRadius: "50%",
    background: "#f04452",
    color: "#ffffff",
    fontSize: "clamp(40px, 10vw, 52px)",
    fontWeight: "500",
    lineHeight: 1,
    cursor: "pointer",
    fontFamily: font,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  oxBtnMuted: {
    opacity: 0.45,
    cursor: "not-allowed",
  },
  oxRevealCorrect: {
    opacity: 1,
    outline: "3px solid #3182f6",
    outlineOffset: "3px",
  },
  oxRevealWrong: {
    opacity: 1,
    outline: "3px solid #f04452",
    outlineOffset: "3px",
  },
  loadingRoot: {
    position: "fixed",
    inset: 0,
    zIndex: 10000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    background: "rgba(25, 31, 40, 0.42)",
    fontFamily: font,
  },
  loadingCard: {
    background: "#ffffff",
    borderRadius: "20px",
    padding: "28px 32px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "18px",
    maxWidth: "320px",
    width: "100%",
    border: "1px solid #e5e8eb",
    boxShadow: "0 12px 40px rgba(0, 0, 0, 0.12)",
  },
  loadingSpinner: {
    width: 44,
    height: 44,
    border: "3px solid #e5e8eb",
    borderTopColor: "#3182f6",
    borderRadius: "50%",
    flexShrink: 0,
  },
  loadingMessage: {
    margin: 0,
    fontSize: "17px",
    fontWeight: "600",
    color: "#191f28",
    textAlign: "center",
    lineHeight: 1.45,
  },
  button: {
    width: "100%",
    padding: "16px",
    fontSize: "17px",
    fontWeight: "600",
    border: "none",
    borderRadius: "12px",
    background: "#3182f6",
    color: "#ffffff",
    cursor: "pointer",
    fontFamily: font,
  },
  buttonInactive: {
    background: "#e5e8eb",
    color: "#8b95a1",
    cursor: "not-allowed",
  },
  subButton: {
    width: "100%",
    padding: "16px",
    fontSize: "17px",
    fontWeight: "600",
    border: "1px solid #e5e8eb",
    borderRadius: "12px",
    background: "#ffffff",
    color: "#4e5968",
    cursor: "pointer",
    marginTop: "12px",
    fontFamily: font,
  },
  result: {
    marginTop: "16px",
    padding: "14px 16px",
    borderRadius: "12px",
    background: "#e8f3ff",
    color: "#2272eb",
    textAlign: "center",
    fontWeight: "600",
    fontSize: "16px",
    lineHeight: "1.5",
  },
  complete: {
    marginTop: "16px",
    padding: "14px 16px",
    borderRadius: "12px",
    background: "#e8f3ff",
    color: "#2272eb",
    textAlign: "center",
    fontWeight: "600",
    fontSize: "16px",
    lineHeight: "1.5",
  },
};

function shortAnswerInputStyle(revealWrong, revealCorrect) {
  if (revealWrong) return { ...styles.input, ...styles.inputRevealWrong };
  if (revealCorrect) return { ...styles.input, ...styles.inputRevealCorrect };
  return styles.input;
}
