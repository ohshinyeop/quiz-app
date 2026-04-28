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
          style={{ ...styles.button, opacity: isSubmitted || isSaving ? 0.6 : 1 }}
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

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f5f5f5",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    boxSizing: "border-box",
    fontFamily: "Arial, sans-serif",
  },
  card: {
    width: "100%",
    maxWidth: "480px",
    background: "#fff",
    padding: "24px",
    borderRadius: "16px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
    boxSizing: "border-box",
  },
  title: { margin: "0 0 8px", fontSize: "24px" },
  description: { margin: "0 0 16px", color: "#666" },
  progress: { margin: "0 0 12px", color: "#777", fontSize: "14px" },
  question: { margin: "0 0 20px", fontSize: "22px", lineHeight: "1.4" },
  input: {
    width: "100%",
    padding: "14px",
    fontSize: "16px",
    border: "1px solid #ccc",
    borderRadius: "10px",
    boxSizing: "border-box",
    marginBottom: "12px",
  },
  button: {
    width: "100%",
    padding: "14px",
    fontSize: "16px",
    border: "none",
    borderRadius: "10px",
    background: "#111",
    color: "#fff",
    cursor: "pointer",
  },
  subButton: {
    width: "100%",
    padding: "14px",
    fontSize: "16px",
    border: "1px solid #111",
    borderRadius: "10px",
    background: "#fff",
    color: "#111",
    cursor: "pointer",
    marginTop: "12px",
  },
  result: {
    marginTop: "14px",
    padding: "12px",
    borderRadius: "10px",
    background: "#f1f1f1",
    textAlign: "center",
    fontWeight: "bold",
  },
  complete: {
    marginTop: "14px",
    padding: "12px",
    borderRadius: "10px",
    background: "#f1f1f1",
    textAlign: "center",
    fontWeight: "bold",
  },
};
