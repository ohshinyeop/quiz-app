import React, { useEffect, useState } from "react";

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyl_EyxCVfHWcY72Uy4RzkV_58Odo_4Lkz3o4L84_Q5j2cDIoLzqNI8poH9PXovZ81Q/exec";

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

  const handleStart = async () => {
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

  const handleSubmit = async () => {
    if (!currentQuiz) return;
    if (!userAnswer.trim()) {
      setResult("정답을 입력해 주세요.");
      return;
    }

    const isCorrect = normalize(userAnswer) === normalize(currentQuiz.answer);

    setResult(isCorrect ? "정답입니다 🎉" : "오답입니다");
    setIsSubmitted(true);
    setIsSaving(true);

    try {
      await saveToGoogleSheet({
        name: userName,
        questionId: currentQuiz.id,
        question: currentQuiz.question,
        userAnswer,
        correctAnswer: currentQuiz.answer,
        isCorrect: isCorrect ? "정답" : "오답",
        submittedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("구글 시트 저장 실패", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = () => {
    if (isLastQuiz) return;
    setCurrentIndex((prev) => prev + 1);
    setUserAnswer("");
    setResult("");
    setIsSubmitted(false);
  };

  const busy = questionsLoading || isRefreshingForStart;

  if (!isStarted) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h2 style={styles.title}>아이샵케어 퀴즈</h2>
          <h2 style={styles.title}>Made by 김슬기</h2>
          <p style={styles.description}>이름을 입력해 주세요.</p>
          {questionsError && (
            <p style={styles.error} role="alert">
              {questionsError}
            </p>
          )}
          {!questionsLoading && quizList.length > 0 && (
            <p style={styles.hint}>문제 {quizList.length}개 · 시트에서 바꾼 내용은 시작 시 다시 불러옵니다.</p>
          )}
          <input
            style={styles.input}
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !busy) handleStart();
            }}
            placeholder="이름"
            disabled={busy}
          />
          <button
            style={{
              ...styles.button,
              ...(busy ? styles.buttonInactive : {}),
            }}
            onClick={handleStart}
            disabled={busy}
          >
            {isRefreshingForStart
              ? "최신 문제 불러오는 중..."
              : questionsLoading
                ? "문제 불러오는 중..."
                : "시작하기"}
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

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <p style={styles.progress}>
          {userName}님 · 문제 {currentIndex + 1} / {quizList.length}
        </p>

        <h2 style={styles.question}>{currentQuiz.question}</h2>

        <input
          style={styles.input}
          value={userAnswer}
          onChange={(e) => setUserAnswer(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !isSubmitted) handleSubmit();
          }}
          placeholder="정답을 입력해 주세요"
          disabled={isSubmitted}
        />

        <button
          style={{
            ...styles.button,
            ...(isSubmitted || isSaving ? styles.buttonInactive : {}),
          }}
          onClick={handleSubmit}
          disabled={isSubmitted || isSaving}
        >
          {isSaving ? "저장 중..." : "제출"}
        </button>

        {result && <div style={styles.result}>{result}</div>}

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

const font =
  '"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif';

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f2f4f6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px 20px",
    boxSizing: "border-box",
    fontFamily: font,
  },
  card: {
    width: "100%",
    maxWidth: "480px",
    background: "#ffffff",
    padding: "28px 24px",
    borderRadius: "20px",
    boxSizing: "border-box",
    border: "1px solid #e5e8eb",
  },
  title: {
    margin: "0 0 8px",
    fontSize: "26px",
    fontWeight: "700",
    letterSpacing: "-0.02em",
    color: "#191f28",
    lineHeight: "1.3",
  },
  description: { margin: "0 0 20px", color: "#6b7684", fontSize: "16px", lineHeight: "1.5" },
  hint: {
    margin: "0 0 16px",
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
