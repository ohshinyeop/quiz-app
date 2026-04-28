import React, { useState } from "react";

const quizList = [
  {
    id: 1,
    question: "프론트 뒷면 USB-C 포트에는 어떤 케이블을 사용해야 하나요?",
    answer: "전용 케이블",
  },
  {
    id: 2,
    question: "프론트 어댑터는 아무거나 사용해도 되나요?",
    answer: "아니오",
  },
  {
    id: 3,
    question: "유선프린터 POS8385 연결 시 확인해야 하는 케이블은 무엇인가요?",
    answer: "시리얼 케이블",
  },
];

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzRpWHSZjnfnZXynrlGq1JYqM-7oaxBhZcTqyRghCWqLLVN5IHXLC4mNhFAm1ayIoTH/exec";

export default function App() {
  const [userName, setUserName] = useState("");
  const [isStarted, setIsStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [result, setResult] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const currentQuiz = quizList[currentIndex];
  const isLastQuiz = currentIndex === quizList.length - 1;

  const normalize = (value) => {
    return value.trim().replace(/\s/g, "").toLowerCase();
  };

  const handleStart = () => {
    if (!userName.trim()) {
      alert("이름을 입력해 주세요.");
      return;
    }
    setIsStarted(true);
  };

  const saveToGoogleSheet = async (data) => {
    await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      body: JSON.stringify(data),
    });
  };

  const handleSubmit = async () => {
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

  if (!isStarted) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h2 style={styles.title}>퀴즈 시작</h2>
          <p style={styles.description}>이름을 입력해 주세요.</p>
          <input
            style={styles.input}
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleStart();
            }}
            placeholder="이름"
          />
          <button style={styles.button} onClick={handleStart}>
            시작하기
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
          <button style={styles.subButton} onClick={handleNext}>
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
