import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

/**
 * 개발 모드: 목 문제·응답 시트 POST 생략(로컬 UI만 확인).
 * 배포/실연동 시 false 로 두면 Google Apps Script 로 조회·제출합니다.
 */
const IS_DEV_MODE = true;


/** window / document / 레이아웃 스크롤 루트까지 맨 위로 (환경·뷰포트에 따라 스크롤 대상이 갈림) */
function scrollLayoutToTop(layoutRoots) {
  window.scrollTo(0, 0);
  const de = document.documentElement;
  const bd = document.body;
  de.scrollTop = 0;
  de.scrollLeft = 0;
  bd.scrollTop = 0;
  bd.scrollLeft = 0;
  if (layoutRoots) {
    const { desktopShellEl, mobileMainEl } = layoutRoots;
    if (desktopShellEl) {
      desktopShellEl.scrollTop = 0;
      desktopShellEl.scrollLeft = 0;
    }
    if (mobileMainEl) {
      mobileMainEl.scrollTop = 0;
      mobileMainEl.scrollLeft = 0;
    }
  }
}

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbymWg8TtMG_qQAfnA9AaPaVwawApDrYDGcBZExdom49-_oNzODRorj6H1NoZ40Itfg6/exec";


/** 모바일: 상단바 + 드로어 / PC·태블릿: 좌측 고정 사이드바 */
const MOBILE_SIDEBAR_MQ = "(max-width: 767px)";

/** 스프레드시트 `문제` 시트와 동일한 형태(id, question, answer, type, options?, explanation?) */
const MOCK_QUIZ_LIST = [
  {
    id: 1,
    question: "[개발용] OX 문제: 온보딩 퀴즈는 팀 문화를 돕는다.",
    answer: "O",
    type: "ox",
    explanation: "샘플 해설입니다.",
  },
  {
    id: 2,
    question: "[개발용] 객관식: 이 화면을 보는 팀은?",
    answer: "아이샵케어 CX팀",
    type: "mc",
    options: ["아이샵케어 CX팀", "다른 팀", "해당 없음"],
    explanation: "샘플 해설입니다.",
  },
  {
    id: 3,
    question: "[개발용] 주관식: 업무 인사 한 마디를 적어 주세요.",
    answer: "화이팅",
    type: "short",
    explanation: "샘플 해설입니다.",
  },
  {
    id: 4,
    question: "[개발용] OX: 고객 응대 시 먼저 공감을 표현하는 것이 좋다.",
    answer: "O",
    type: "ox",
    explanation: "공감 후 해결을 제시하면 신뢰가 쌓입니다.",
  },
  {
    id: 5,
    question: "[개발용] 객관식: CX의 일반적 의미는?",
    answer: "고객 경험",
    type: "mc",
    options: ["고객 경험", "재무 분석", "생산 공정"],
    explanation: "Customer Experience의 약자입니다.",
  },
  {
    id: 6,
    question: "[개발용] 주관식: 오늘 목표 한 단어로 적어 주세요.",
    answer: "집중",
    type: "short",
    explanation: "샘플 해설입니다.",
  },
  {
    id: 7,
    question: "[개발용] OX: 문의가 길어지면 상대방을 먼저 비난해도 된다.",
    answer: "X",
    type: "ox",
    explanation: "비난보다는 사실 확인과 해결에 초점을 둡니다.",
  },
  {
    id: 8,
    question: "[개발용] 객관식: 올바른 인사말에 가까운 것은?",
    answer: "안녕하세요, 무엇을 도와드릴까요?",
    type: "mc",
    options: ["안녕하세요, 무엇을 도와드릴까요?", "왜 그랬어요?", "그건 제 책임 아닙니다"],
    explanation: "열린 질문으로 대화를 시작합니다.",
  },
  {
    id: 9,
    question: "[개발용] 주관식: 팀 약속 한 가지를 짧게 써 주세요.",
    answer: "존중",
    type: "short",
    explanation: "샘플 해설입니다.",
  },
  {
    id: 10,
    question: "[개발용] OX: 해결 불가 시에도 안내와 대안을 제시해야 한다.",
    answer: "O",
    type: "ox",
    explanation: "다음 단계나 대체 경로를 알려 주는 것이 좋습니다.",
  },
  {
    id: 11,
    question: "[개발용] 객관식: 응대 기록을 남기는 이유로 맞는 것은?",
    answer: "이력 공유와 품질 개선",
    type: "mc",
    options: ["이력 공유와 품질 개선", "개인 일기", "불필요한 중복"],
    explanation: "후속 응대와 개선에 활용됩니다.",
  },
  {
    id: 12,
    question: "[개발용] 주관식: 감사 인사 한 문장을 적어 주세요.",
    answer: "감사합니다",
    type: "short",
    explanation: "샘플 해설입니다.",
  },
  {
    id: 13,
    question: "[개발용] OX: 약속한 시간에 연락드리겠다고 하면 반드시 지켜야 한다.",
    answer: "O",
    type: "ox",
    explanation: "지연 시 미리 알리는 것도 포함됩니다.",
  },
  {
    id: 14,
    question: "[개발용] 객관식: 어려운 고객일 때 우선할 태도는?",
    answer: "침착하고 일관된 톤 유지",
    type: "mc",
    options: ["침착하고 일관된 톤 유지", "감정적으로 맞받아치기", "무시하기"],
    explanation: "프로페셔널한 태도가 신뢰를 지킵니다.",
  },
  {
    id: 15,
    question: "[개발용] 주관식: 오늘 배운 점 한 줄 요약.",
    answer: "경청",
    type: "short",
    explanation: "샘플 해설입니다.",
  },
  {
    id: 16,
    question: "[개발용] OX: 내부 용어를 고객에게 그대로 써도 된다.",
    answer: "X",
    type: "ox",
    explanation: "고객이 이해하기 쉬운 말로 풀어 설명합니다.",
  },
  {
    id: 17,
    question: "[개발용] 객관식: 피드백을 받았을 때 먼저 할 일은?",
    answer: "듣고 확인 질문하기",
    type: "mc",
    options: ["듣고 확인 질문하기", "즉시 반박하기", "읽지 않기"],
    explanation: "의도를 정확히 파악한 뒤 대응합니다.",
  },
  {
    id: 18,
    question: "[개발용] 주관식: 동료에게 건넬 격려 한 마디.",
    answer: "수고했어",
    type: "short",
    explanation: "샘플 해설입니다.",
  },
  {
    id: 19,
    question: "[개발용] OX: 에스컬레이션은 문제를 회피하기 위한 수단이다.",
    answer: "X",
    type: "ox",
    explanation: "필요 시 빠른 해결을 위해 적절한 채널로 옮깁니다.",
  },
  {
    id: 20,
    question: "[개발용] 객관식: Follow-up의 의미로 가장 가까운 것은?",
    answer: "후속 조치·연락",
    type: "mc",
    options: ["후속 조치·연락", "휴가 신청", "회식 준비"],
    explanation: "약속한 대로 이어가는 연락이나 확인입니다.",
  },
  {
    id: 21,
    question: "[개발용] 주관식: 업무 중 스트레스 해소법 한 가지.",
    answer: "산책",
    type: "short",
    explanation: "샘플 해설입니다.",
  },
  {
    id: 22,
    question: "[개발용] OX: 개인정보는 필요한 범위에서만 수집·안내한다.",
    answer: "O",
    type: "ox",
    explanation: "보안과 규정을 준수합니다.",
  },
  {
    id: 23,
    question: "[개발용] 객관식: ‘한 번에 한 가지 이슈’로 대화하면 좋은 이유는?",
    answer: "혼선을 줄인다",
    type: "mc",
    options: ["혼선을 줄인다", "대화를 길게 한다", "이슈를 숨긴다"],
    explanation: "주제가 명확할수록 해결이 빨라집니다.",
  },
  {
    id: 24,
    question: "[개발용] 주관식: 이번 주 나에게 주는 칭찬 한 마디.",
    answer: "잘했다",
    type: "short",
    explanation: "샘플 해설입니다.",
  },
  {
    id: 25,
    question: "[개발용] OX: 템플릿 답변은 항상 그대로 보내도 된다.",
    answer: "X",
    type: "ox",
    explanation: "상황에 맞게 다듬어야 합니다.",
  },
  {
    id: 26,
    question: "[개발용] 객관식: VOC의 의미에 가까운 것은?",
    answer: "고객의 소리",
    type: "mc",
    options: ["고객의 소리", "내부 회의록", "재고 현황"],
    explanation: "Voice of Customer입니다.",
  },
  {
    id: 27,
    question: "[개발용] 주관식: 신입에게 해 주고 싶은 조언 한 줄.",
    answer: "질문하세요",
    type: "short",
    explanation: "샘플 해설입니다.",
  },
  {
    id: 28,
    question: "[개발용] OX: 상대방 말을 끝까지 듣는 것이 경청이다.",
    answer: "O",
    type: "ox",
    explanation: "요지를 파악한 뒤 응답합니다.",
  },
  {
    id: 29,
    question: "[개발용] 객관식: 마감이 촉박할 때 우선 순위를 정하는 이유는?",
    answer: "영향도가 큰 일부터",
    type: "mc",
    options: ["영향도가 큰 일부터", "무작위", "쉬운 것만"],
    explanation: "리스크와 임팩트를 고려합니다.",
  },
  {
    id: 30,
    question: "[개발용] 주관식: 앞으로 지키고 싶은 습관 한 가지.",
    answer: "기록",
    type: "short",
    explanation: "샘플 해설입니다.",
  },
];

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

/*
 * --- Google Apps Script 문제 불러오기 원본 (IS_DEV_MODE 가 false 일 때 fetchQuestionsFromSheet 와 동일) ---
 * const url = `${GOOGLE_SCRIPT_URL}?action=questions`;
 * const res = await fetch(url);
 * if (!res.ok) {
 *   throw new Error(`서버 응답 ${res.status}`);
 * }
 * const data = await res.json();
 * if (!data.ok) {
 *   throw new Error(data.error || "문제를 불러오지 못했습니다.");
 * }
 * return Array.isArray(data.questions) ? data.questions : [];
 * ---
 */
async function fetchQuestionsFromSheet() {
  if (IS_DEV_MODE) {
    return [...MOCK_QUIZ_LIST];
  }

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

function truncateNavTitle(text, maxLen = 48) {
  const s = String(text || "").replace(/\s+/g, " ").trim();
  if (s.length <= maxLen) return s;
  return `${s.slice(0, maxLen)}…`;
}

function HomeIcon({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
    </svg>
  );
}

/** Bootstrap Icons — bi-sun-fill */
function ThemeIconSun() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="jp-theme-icon-svg bi bi-sun-fill"
      fill="currentColor"
      width={23}
      height={23}
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zm8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zm10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0zm-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708z" />
    </svg>
  );
}

/** Bootstrap Icons — bi-moon-stars-fill */
function ThemeIconMoon() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="jp-theme-icon-svg bi bi-moon-stars-fill"
      fill="currentColor"
      width={23}
      height={23}
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z" />
      <path d="M10.794 3.148a.217.217 0 0 1 .412 0l.387 1.162c.173.518.579.924 1.097 1.097l1.162.387a.217.217 0 0 1 0 .412l-1.162.387a1.734 1.734 0 0 0-1.097 1.097l-.387 1.162a.217.217 0 0 1-.412 0l-.387-1.162A1.734 1.734 0 0 0 9.31 6.593l-1.162-.387a.217.217 0 0 1 0-.412l1.162-.387a1.734 1.734 0 0 0 1.097-1.097l.387-1.162zM13.863.099a.145.145 0 0 1 .274 0l.258.774c.115.346.386.617.732.732l.774.258a.145.145 0 0 1 0 .274l-.774.258a1.156 1.156 0 0 0-.732.732l-.258.774a.145.145 0 0 1-.274 0l-.258-.774a1.156 1.156 0 0 0-.732-.732l-.774-.258a.145.145 0 0 1 0-.274l.774-.258c.346-.115.617-.386.732-.732L13.863.1z" />
    </svg>
  );
}

function IntroTeamBook() {
  const [touchOpen, setTouchOpen] = useState(false);
  const [tapToggle, setTapToggle] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(hover: none)").matches : false,
  );

  useEffect(() => {
    const mq = window.matchMedia("(hover: none)");
    const onChange = () => {
      setTapToggle(mq.matches);
      if (!mq.matches) setTouchOpen(false);
    };
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const classNames = [
    "quiz-app-intro-book",
    "quiz-app-book",
    tapToggle ? "quiz-app-intro-book--tap-toggle" : "",
    tapToggle && touchOpen ? "quiz-app-intro-book--touch-open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={classNames}
      aria-label={tapToggle ? "아이샵케어 CX팀 — 눌러서 제작자 정보 열기·닫기" : "아이샵케어 CX팀 — 호버 시 제작자 정보"}
      {...(tapToggle
        ? {
            role: "button",
            tabIndex: 0,
            "aria-expanded": touchOpen,
            onClick: () => setTouchOpen((o) => !o),
            onKeyDown: (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setTouchOpen((o) => !o);
              }
            },
          }
        : {})}
    >
      <div className="quiz-app-book-stack">
        <p className="quiz-app-book-inner-text quiz-app-book-size-only" aria-hidden="true">
          {`아이샵케어 CX팀`}
        </p>
        <p className="quiz-app-book-inner-text">Made by 김슬기</p>
      </div>
      <div className="quiz-app-book-cover">
        <p className="quiz-app-book-cover-text">아이샵케어 CX팀</p>
      </div>
    </div>
  );
}

function DarkModeToggleFixed({ darkMode, onDarkModeChange, wrapStyle }) {
  const id = "quiz-app-dark-color-mode";
  return (
    <div className="quiz-app-dark-mode-fixed-wrap" style={wrapStyle}>
      <div className="quiz-app-jp-toggle btn-container">
        <span className="jp-theme-icon jp-theme-icon--sun" aria-hidden>
          <ThemeIconSun />
        </span>
        <div className="switch btn-color-mode-switch">
          <input
            id={id}
            type="checkbox"
            checked={darkMode}
            onChange={(e) => onDarkModeChange(e.target.checked)}
            aria-label={darkMode ? "다크 모드 끄기" : "다크 모드 켜기"}
          />
          <label
            htmlFor={id}
            className="btn-color-mode-switch-inner"
            data-on="다크"
            data-off="라이트"
          />
        </div>
        <span className="jp-theme-icon jp-theme-icon--moon" aria-hidden>
          <ThemeIconMoon />
        </span>
      </div>
    </div>
  );
}

const CELEBRATION_MAIN_SPARKS = 20;
const CELEBRATION_SMALL_SPARKS = 14;

/** 인라인 🎉 — autoPlayOnKey: 정답 줄 등 마운트 시 자동 1회 / false면 탭만 */
function CelebrationIconBurst({ fireKey, onManualTap, autoPlayOnKey = true, ariaLabel = "폭죽 다시 보기" }) {
  const [burstKey, setBurstKey] = useState(0);
  const [borderBurst, setBorderBurst] = useState(false);
  const borderTimerRef = useRef(null);

  const playBurst = useCallback(() => {
    setBurstKey((k) => k + 1);
    setBorderBurst(true);
    if (borderTimerRef.current) clearTimeout(borderTimerRef.current);
    borderTimerRef.current = setTimeout(() => setBorderBurst(false), 720);
  }, []);

  useEffect(() => {
    if (!autoPlayOnKey) return;
    if (fireKey == null || fireKey === "") return;
    playBurst();
  }, [fireKey, playBurst, autoPlayOnKey]);

  useEffect(() => {
    return () => {
      if (borderTimerRef.current) clearTimeout(borderTimerRef.current);
    };
  }, []);

  const handleButtonClick = useCallback(() => {
    onManualTap?.();
    playBurst();
  }, [onManualTap, playBurst]);

  return (
    <div className="quiz-celebration-inline-wrap">
      {burstKey > 0 ? (
        <div className="quiz-celebration-sparks quiz-celebration-sparks--inline" key={burstKey} aria-hidden>
          {Array.from({ length: CELEBRATION_MAIN_SPARKS }, (_, i) => (
            <span
              key={`m-${i}`}
              className="quiz-celebration-spark quiz-celebration-spark--inline"
              style={{
                "--celebration-angle": `${(360 / CELEBRATION_MAIN_SPARKS) * i}deg`,
                "--celebration-delay": `${(i % 5) * 0.02}s`,
                "--celebration-hue": `${12 + ((i * 23) % 330)}`,
              }}
            />
          ))}
          {Array.from({ length: CELEBRATION_SMALL_SPARKS }, (_, i) => (
            <span
              key={`s-${i}`}
              className="quiz-celebration-spark quiz-celebration-spark--small quiz-celebration-spark--inline-small"
              style={{
                "--celebration-angle": `${(360 / CELEBRATION_SMALL_SPARKS) * i + 12.5}deg`,
                "--celebration-delay": `${0.04 + (i % 3) * 0.03}s`,
                "--celebration-hue": `${265 + ((i * 17) % 80)}`,
              }}
            />
          ))}
        </div>
      ) : null}
      <button
        type="button"
        className={`quiz-celebration-inline-icon ${borderBurst ? "quiz-celebration-inline-icon--burst" : ""}`}
        onClick={handleButtonClick}
        aria-label={ariaLabel}
      >
        <span aria-hidden>🎉</span>
      </button>
    </div>
  );
}

function QuizSidebar({
  variant,
  open,
  onClose,
  themeStyles: s,
  quizList,
  isStarted,
  quizPhase,
  currentIndex,
  allQuestionsAnswered,
  showLoadingOverlay,
  onFirstScreen,
  onOpenQuestion,
  onOpenSummary,
}) {
  const isDrawer = variant === "mobile";

  const asideStyle = isDrawer
    ? {
        ...s.sidebarAsideDrawer,
        transform: open ? "translateX(0)" : "translateX(-100%)",
      }
    : {
        ...s.sidebarAsideFixed,
        width: open ? 300 : 0,
        minWidth: open ? 300 : 0,
        borderRight: open ? s.sidebarAsideFixed.borderRight : "none",
        overflow: "hidden",
        opacity: open ? 1 : 0,
        pointerEvents: open ? "auto" : "none",
        transition: "width 0.22s ease, min-width 0.22s ease, opacity 0.18s ease",
      };

  const navAriaHidden = !open;

  return (
    <>
      <aside style={asideStyle} aria-hidden={navAriaHidden} id="quiz-sidebar-panel">
        <div style={s.sidebarInner}>
          {isDrawer ? (
            <div style={s.sidebarDrawerTop}>
              <span style={s.sidebarDrawerTitle}>목록</span>
              <button type="button" style={s.sidebarCloseBtn} onClick={onClose} aria-label="메뉴 닫기">
                ×
              </button>
            </div>
          ) : (
            <div style={s.sidebarDesktopChrome}>
              <button
                type="button"
                style={s.sidebarDesktopMenuBtn}
                onClick={onClose}
                aria-label="메뉴 닫기"
                aria-expanded={open}
                aria-controls="quiz-sidebar-nav"
              >
                <span style={s.hamburgerBar} />
                <span style={s.hamburgerBar} />
                <span style={s.hamburgerBar} />
              </button>
              <div style={s.sidebarTitle}>목록</div>
            </div>
          )}
          <nav style={s.sidebarNav} id="quiz-sidebar-nav" aria-label="퀴즈 목차">
            <button
              type="button"
              style={{
                ...s.sidebarLink,
                ...(!isStarted ? s.sidebarLinkActive : {}),
              }}
              onClick={onFirstScreen}
            >
              첫 화면
            </button>
            {isStarted
              ? quizList.map((q, i) => {
                  const active = quizPhase === "quiz" && currentIndex === i;
                  return (
                    <button
                      type="button"
                      key={q.id ?? i}
                      style={{
                        ...s.sidebarLink,
                        ...(active ? s.sidebarLinkActive : {}),
                      }}
                      onClick={() => onOpenQuestion(i)}
                      disabled={showLoadingOverlay}
                    >
                      <span style={s.sidebarLinkNum}>문제 {i + 1}</span>
                      <span style={s.sidebarLinkTitle}>{truncateNavTitle(q.question)}</span>
                    </button>
                  );
                })
              : null}
            {isStarted ? (
              <button
                type="button"
                style={{
                  ...s.sidebarLink,
                  ...(quizPhase === "summary" ? s.sidebarLinkActive : {}),
                  ...(!allQuestionsAnswered ? s.sidebarLinkMuted : {}),
                }}
                onClick={onOpenSummary}
                disabled={!allQuestionsAnswered || showLoadingOverlay}
              >
                최종 해설
              </button>
            ) : (
              <p style={s.sidebarStartHint} role="note">
                이름을 입력 후 시작하기를 누르면 문제 목록이 표시됩니다 !
              </p>
            )}
          </nav>
        </div>
      </aside>
      {isDrawer && open ? (
        <button
          type="button"
          style={s.sidebarScrim}
          aria-label="메뉴 닫기"
          onClick={onClose}
        />
      ) : null}
    </>
  );
}

export default function App() {
  const [quizList, setQuizList] = useState([]);
  const [questionsLoading, setQuestionsLoading] = useState(IS_DEV_MODE ? false : true);
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
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== "undefined" ? !window.matchMedia(MOBILE_SIDEBAR_MQ).matches : true,
  );
  const [isMobileLayout, setIsMobileLayout] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(MOBILE_SIDEBAR_MQ).matches : false,
  );
  /** quiz: 풀이 화면 · summary: 최종 정리·해설 */
  const [quizPhase, setQuizPhase] = useState("quiz");
  /** 인덱스별 제출 스냅샷 (사이드바·이전/다음 이동 시 복원) */
  const [quizProgress, setQuizProgress] = useState([]);

  /** 문제(페이지)마다 폭죽 🎉 수동 탭 — 4회 이상이면 이스터에그 알림 */
  const celebrationManualTapRef = useRef(0);

  const [humorToastMessage, setHumorToastMessage] = useState(null);
  const humorToastTimerRef = useRef(null);

  const desktopShellRef = useRef(null);
  const mobileMainColumnRef = useRef(null);

  const [darkMode, setDarkMode] = useState(() => {
    try {
      return localStorage.getItem("quiz-app-dark") === "1";
    } catch {
      return false;
    }
  });

  /** 풀이 중 스크롤 후 첫 화면으로 오면 카드가 뷰포트 아래에 붙어 보이는 현상 방지 (내부 스크롤 루트 포함) */
  const wasQuizStartedRef = useRef(false);
  useLayoutEffect(() => {
    if (wasQuizStartedRef.current && !isStarted) {
      const roots = {
        desktopShellEl: desktopShellRef.current,
        mobileMainEl: mobileMainColumnRef.current,
      };
      scrollLayoutToTop(roots);
      requestAnimationFrame(() => scrollLayoutToTop(roots));
    }
    wasQuizStartedRef.current = isStarted;
  }, [isStarted]);

  useEffect(() => {
    try {
      localStorage.setItem("quiz-app-dark", darkMode ? "1" : "0");
    } catch {
      /* ignore */
    }
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    return () => {
      if (humorToastTimerRef.current != null) {
        window.clearTimeout(humorToastTimerRef.current);
      }
    };
  }, []);

  const styles = useMemo(() => mergeTheme(darkMode), [darkMode]);

  const showHumorToast = useCallback((message) => {
    setHumorToastMessage(message);
    if (humorToastTimerRef.current != null) {
      window.clearTimeout(humorToastTimerRef.current);
    }
    humorToastTimerRef.current = window.setTimeout(() => {
      setHumorToastMessage(null);
      humorToastTimerRef.current = null;
    }, 3800);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_SIDEBAR_MQ);
    const onChange = () => setIsMobileLayout(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  /**
   * iPhone 크롬(CriOS): layout 뷰포트 높이가 커져 flex center 아래에 큰 빈 영역·이상한 스크롤이 생기는 경우가 있음.
   * innerHeight로 html/body를 맞추고 스크롤은 .quiz-app-mobile-main 내부로만 두는 패턴.
   */
  useEffect(() => {
    const clearDocLock = () => {
      document.documentElement.style.removeProperty("height");
      document.body.style.removeProperty("height");
      document.documentElement.style.removeProperty("overflow");
      document.body.style.removeProperty("overflow");
    };

    if (!isMobileLayout) {
      clearDocLock();
      return undefined;
    }

    const isIosChrome = /iPhone|iPad|iPod/.test(navigator.userAgent) && /CriOS\//.test(navigator.userAgent);
    if (!isIosChrome) {
      return undefined;
    }

    const apply = () => {
      const h = window.innerHeight;
      document.documentElement.style.height = `${h}px`;
      document.body.style.height = `${h}px`;
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    };

    apply();
    window.addEventListener("resize", apply);
    window.addEventListener("orientationchange", apply);
    return () => {
      clearDocLock();
      window.removeEventListener("resize", apply);
      window.removeEventListener("orientationchange", apply);
    };
  }, [isMobileLayout]);

  useEffect(() => {
    if (isMobileLayout) {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(true);
    }
  }, [isMobileLayout]);

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

  useEffect(() => {
    if (!isStarted || quizPhase !== "quiz") return;
    const p = quizProgress[currentIndex];
    if (p?.isSubmitted) {
      setUserAnswer(p.userAnswer);
      setResult(p.result);
      setIsSubmitted(true);
      setSubmissionCorrect(p.submissionCorrect);
    } else {
      setUserAnswer("");
      setResult("");
      setIsSubmitted(false);
      setSubmissionCorrect(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- quizProgress는 같은 인덱스 제출 시 갱신만 되며, 인덱스 변경 시에만 폼을 맞춤
  }, [currentIndex, isStarted, quizPhase]);

  useEffect(() => {
    celebrationManualTapRef.current = 0;
  }, [currentIndex]);

  const currentQuiz = quizList[currentIndex];
  const isLastQuiz = quizList.length > 0 && currentIndex === quizList.length - 1;
  const allQuestionsAnswered =
    quizList.length > 0 &&
    quizList.every((_, i) => quizProgress[i]?.isSubmitted);

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
      showHumorToast("이름을 입력해 주세요.");
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
      setQuizProgress(list.map(() => null));
      setQuizPhase("quiz");
      setIsStarted(true);
    } catch (err) {
      setQuestionsError(err.message || "문제를 불러오지 못했습니다.");
    } finally {
      setIsRefreshingForStart(false);
    }
  };

  const saveToGoogleSheet = async (data) => {
    if (IS_DEV_MODE) {
      return;
    }

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
    const displayAnswer = userAnswerForSheet;

    let resultMessage = "";
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
      resultMessage = isCorrect ? "정답입니다" : "오답입니다";
      setResult(resultMessage);
    } catch (error) {
      console.error("구글 시트 저장 실패", error);
      resultMessage = "저장에 실패했습니다. 다시 시도해 주세요.";
      setResult(resultMessage);
    } finally {
      setSubmissionCorrect(isCorrect);
      setIsSubmitted(true);
      setIsSaving(false);
      setQuizProgress((prev) => {
        const next = quizList.map((_, i) => prev[i] ?? null);
        next[currentIndex] = {
          userAnswer: displayAnswer,
          result: resultMessage,
          isSubmitted: true,
          submissionCorrect: isCorrect,
        };
        return next;
      });
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
  };

  const handleGoToIntro = () => {
    if (isSaving) return;
    setSidebarOpen(false);
    setQuizPhase("quiz");
    setIsStarted(false);
    setUserAnswer("");
    setResult("");
    setIsSubmitted(false);
    setSubmissionCorrect(null);
    setCurrentIndex(0);
    const roots = {
      desktopShellEl: desktopShellRef.current,
      mobileMainEl: mobileMainColumnRef.current,
    };
    scrollLayoutToTop(roots);
    requestAnimationFrame(() => scrollLayoutToTop(roots));
  };

  const handleCelebrationManualTap = useCallback(() => {
    celebrationManualTapRef.current += 1;
    if (celebrationManualTapRef.current >= 4) {
      queueMicrotask(() => {
        showHumorToast("다음 문제를 풀어주세요");
      });
      celebrationManualTapRef.current = 0;
    }
  }, [showHumorToast]);

  const openQuizAtIndex = async (index) => {
    if (!userName.trim()) {
      showHumorToast("이름을 입력해 주세요.");
      return;
    }
    setSidebarOpen(false);
    let list = quizList;
    if (!list.length) {
      setIsRefreshingForStart(true);
      setQuestionsError(null);
      try {
        list = await fetchQuestionsFromSheet();
        if (!list.length) {
          setQuestionsError("등록된 문제가 없습니다. 「문제」 시트에 문제와 정답을 입력해 주세요.");
          return;
        }
        setQuizList(list);
      } catch (err) {
        setQuestionsError(err.message || "문제를 불러오지 못했습니다.");
        return;
      } finally {
        setIsRefreshingForStart(false);
      }
    }
    if (index < 0 || index >= list.length) return;

    if (!isStarted) {
      setQuizList(list);
      if (quizProgress.length !== list.length) {
        setQuizProgress(list.map(() => null));
      }
      setIsStarted(true);
    } else if (quizProgress.length !== list.length) {
      setQuizProgress(list.map((_, i) => quizProgress[i] ?? null));
    }
    setQuizPhase("quiz");
    setCurrentIndex(index);
  };

  const openSummary = () => {
    if (!allQuestionsAnswered) {
      showHumorToast("모든 문제를 제출한 뒤 확인할 수 있습니다.");
      return;
    }
    setSidebarOpen(false);
    setQuizPhase("summary");
  };

  const goFirstScreenFromSidebar = () => {
    setSidebarOpen(false);
    handleGoToIntro();
  };

  const wrapLayout = (node) => (
    <>
      <LoadingOverlay open={showLoadingOverlay} message={loadingOverlayMessage} theme={styles} />
      <HumorToast message={humorToastMessage} theme={styles} />
      {!isMobileLayout ? (
        <DarkModeToggleFixed
          darkMode={darkMode}
          onDarkModeChange={setDarkMode}
          wrapStyle={{
            ...styles.darkModeToggleFixed,
            top: "calc(12px + env(safe-area-inset-top, 0px))",
          }}
        />
      ) : null}
      {isMobileLayout ? (
        <header style={styles.mobileTopBar}>
          <button
            type="button"
            style={styles.mobileTopBarMenuBtn}
            onClick={() => setSidebarOpen((open) => !open)}
            aria-expanded={sidebarOpen}
            aria-controls="quiz-sidebar-panel"
            aria-label={sidebarOpen ? "메뉴 닫기" : "메뉴 열기"}
          >
            <span style={styles.mobileTopBarMenuBtnInner}>
              <span style={styles.hamburgerBar} />
              <span style={styles.hamburgerBar} />
              <span style={styles.hamburgerBar} />
            </span>
          </button>
          <span style={styles.mobileTopBarTitle}>온보딩 퀴즈</span>
          <DarkModeToggleFixed
            darkMode={darkMode}
            onDarkModeChange={setDarkMode}
            wrapStyle={styles.darkModeToggleInTopBar}
          />
        </header>
      ) : null}
      {isMobileLayout ? (
        <>
          <QuizSidebar
            variant="mobile"
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            themeStyles={styles}
            quizList={quizList}
            isStarted={isStarted}
            quizPhase={quizPhase}
            currentIndex={currentIndex}
            allQuestionsAnswered={allQuestionsAnswered}
            onFirstScreen={goFirstScreenFromSidebar}
            onOpenQuestion={openQuizAtIndex}
            onOpenSummary={openSummary}
            showLoadingOverlay={showLoadingOverlay}
          />
          <div
            ref={mobileMainColumnRef}
            className="quiz-app-mobile-main"
            style={{
              ...styles.mainColumnMobile,
              ...(isStarted && quizPhase === "summary" ? { justifyContent: "flex-start" } : {}),
            }}
          >
            {node}
          </div>
        </>
      ) : (
        <div ref={desktopShellRef} style={styles.desktopShell}>
          {!sidebarOpen ? (
            <button
              type="button"
              style={styles.desktopSidebarOpenBtn}
              onClick={() => setSidebarOpen(true)}
              aria-label="메뉴 열기"
              aria-controls="quiz-sidebar-panel"
              aria-expanded={false}
            >
              <span style={styles.desktopSidebarOpenBtnInner}>
                <span style={styles.hamburgerBar} />
                <span style={styles.hamburgerBar} />
                <span style={styles.hamburgerBar} />
              </span>
            </button>
          ) : null}
          <QuizSidebar
            variant="desktop"
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            themeStyles={styles}
            quizList={quizList}
            isStarted={isStarted}
            quizPhase={quizPhase}
            currentIndex={currentIndex}
            allQuestionsAnswered={allQuestionsAnswered}
            onFirstScreen={goFirstScreenFromSidebar}
            onOpenQuestion={openQuizAtIndex}
            onOpenSummary={openSummary}
            showLoadingOverlay={showLoadingOverlay}
          />
          <div
            style={{
              ...styles.mainColumnDesktop,
              ...(isStarted && quizPhase === "summary" ? { justifyContent: "flex-start" } : {}),
            }}
          >
            {node}
          </div>
        </div>
      )}
    </>
  );

  const handlePreviousQuestion = () => {
    if (isSaving) return;
    if (currentIndex <= 0) return;
    setCurrentIndex((prev) => prev - 1);
  };

  if (!isStarted) {
    return wrapLayout(
      <div style={styles.card}>
      <div style={styles.introBookWrap}>
        <IntroTeamBook />
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
    );
  }

  if (isStarted && quizPhase === "summary") {
    const total = quizList.length;
    const correctCount = quizList.filter((_, i) => quizProgress[i]?.submissionCorrect === true).length;
    const wrongCount = quizList.filter((_, i) => quizProgress[i]?.submissionCorrect === false).length;

    return wrapLayout(
      <div style={styles.card}>
        <h2 style={styles.summaryTitle}>최종 해설</h2>
        <div style={styles.summaryStatsCard}>
          <div style={styles.summaryStatsGreetingRow}>
            <p style={styles.summaryStatsGreeting}>
              <span style={styles.summaryStatsName}>{userName}</span>님
            </p>
            <CelebrationIconBurst autoPlayOnKey={false} ariaLabel="폭죽" />
          </div>
          <p style={styles.summaryStatsLead}>전체 {total}문항 중 결과</p>
          <div style={styles.summaryStatsPillRow}>
            <div style={{ ...styles.summaryStatPill, ...styles.summaryStatPillOk }}>
              <span style={styles.summaryStatPillLabel}>정답</span>
              <span style={styles.summaryStatPillValue}>{correctCount}</span>
              <span style={styles.summaryStatPillUnit}>개</span>
            </div>
            <div style={{ ...styles.summaryStatPill, ...styles.summaryStatPillBad }}>
              <span style={styles.summaryStatPillLabel}>오답</span>
              <span style={styles.summaryStatPillValue}>{wrongCount}</span>
              <span style={styles.summaryStatPillUnit}>개</span>
            </div>
          </div>
        </div>
        <ul style={styles.summaryList}>
          {quizList.map((q, i) => {
            const p = quizProgress[i];
            const ok = p?.submissionCorrect;
            let verdict = "미응답";
            if (ok === true) verdict = "정답";
            else if (ok === false) verdict = "오답";
            return (
              <li key={q.id ?? i} style={styles.summaryItem}>
                <div style={styles.summaryItemHead}>
                  <span
                    style={{
                      ...styles.summaryVerdict,
                      ...(ok === true ? styles.summaryVerdictOk : {}),
                      ...(ok === false ? styles.summaryVerdictBad : {}),
                    }}
                  >
                    문제 {i + 1} : {verdict}
                  </span>
                </div>
                <p style={styles.summaryItemQ}>{q.question}</p>
                {q.explanation ? (
                  <div style={styles.summaryExplain}>
                    <span style={styles.summaryExplainLabel}>해설</span>
                    <p style={styles.summaryExplainBody}>{q.explanation}</p>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
        <div style={styles.summaryFooterRow}>
          <button
            type="button"
            style={styles.nextPrevButton}
            onClick={() => {
              setQuizPhase("quiz");
              setCurrentIndex((n) => Math.max(0, Math.min(n, quizList.length - 1)));
            }}
          >
            문제 화면으로
          </button>
          <button
            type="button"
            style={{ ...styles.nextPrevButton, ...styles.summaryHomeButton }}
            onClick={handleGoToIntro}
          >
            <span style={styles.summaryHomeIcon} aria-hidden>
              <HomeIcon size={20} />
            </span>
            홈으로
          </button>
        </div>
      </div>
    );
  }

  if (isStarted && quizPhase === "quiz" && !currentQuiz) {
    return wrapLayout(
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

  return wrapLayout(
    <div style={styles.card}>
      <button
        type="button"
        style={{ ...styles.backButton, ...(isSaving ? styles.backButtonDisabled : {}) }}
        onClick={handleGoToIntro}
        disabled={isSaving}
      >
        ← 처음으로
      </button>
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
                styles,
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

      {result &&
        (submissionCorrect === true && /^\s*정답입니다/.test(String(result)) ? (
          <div style={styles.resultRowCorrect}>
            <span style={styles.resultTextCorrect}>정답입니다</span>
            <CelebrationIconBurst
              fireKey={`${currentIndex}|${isSubmitted}|${submissionCorrect}|${result}`}
              onManualTap={handleCelebrationManualTap}
            />
          </div>
        ) : (
          <div style={styles.result}>{result}</div>
        ))}

      {showAnswerReveal && currentQuiz.explanation && (
        <div style={styles.explanationBox}>
          <div style={styles.explanationTitle}>해설</div>
          <p style={styles.explanationBody}>{currentQuiz.explanation}</p>
        </div>
      )}

      {isSubmitted && quizPhase === "quiz" && (
        <div style={styles.nextPrevRow}>
          <button
            type="button"
            style={{
              ...styles.nextPrevButton,
              ...(currentIndex === 0 || isSaving ? styles.navButtonDisabled : {}),
            }}
            onClick={handlePreviousQuestion}
            disabled={currentIndex === 0 || isSaving}
          >
            이전 문제
          </button>
          {!isLastQuiz ? (
            <button type="button" style={styles.nextPrevButton} onClick={handleNext}>
              다음 문제
            </button>
          ) : (
            <button
              type="button"
              style={{
                ...styles.nextPrevButton,
                ...(!allQuestionsAnswered || isSaving ? styles.navButtonDisabled : {}),
              }}
              onClick={openSummary}
              disabled={!allQuestionsAnswered || isSaving}
            >
              최종 해설 보기
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function HumorToast({ message, theme }) {
  if (!message) return null;
  const s = theme;
  return (
    <div style={s.humorToastWrap} role="status" aria-live="polite" aria-atomic="true">
      <div style={s.humorToastCard}>{message}</div>
    </div>
  );
}

function LoadingOverlay({ open, message, theme }) {
  if (!open) return null;
  const s = theme;
  return (
    <div
      style={s.loadingRoot}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={message}
    >
      <div style={s.loadingCard}>
        <div className="quiz-app-spinner" style={s.loadingSpinner} />
        <p style={s.loadingMessage}>{message}</p>
      </div>
    </div>
  );
}

const font =
  '"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif';

const baseStyles = {
  introBookWrap: {
    width: "fit-content",
    maxWidth: "100%",
    alignSelf: "flex-start",
    marginBottom: "6px",
    boxSizing: "border-box",
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
  appShell: {
    minHeight: "100vh",
    background: "#f2f4f6",
    position: "relative",
    width: "100%",
    boxSizing: "border-box",
  },
  mainColumnDesktop: {
    flex: 1,
    minWidth: 0,
    minHeight: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "28px 20px 32px",
    boxSizing: "border-box",
    fontFamily: font,
    width: "100%",
    overflow: "auto",
  },
  mainColumnMobile: {
    overflowX: "hidden",
    overscrollBehavior: "contain",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
    fontFamily: font,
    width: "100%",
    height: "100%",
    minHeight: 0,
    background: "#f2f4f6",
  },
  desktopShell: {
    display: "flex",
    flexDirection: "row",
    alignItems: "stretch",
    height: "100dvh",
    maxHeight: "100dvh",
    minHeight: "100dvh",
    overflowX: "hidden",
    overflowY: "auto",
    overscrollBehavior: "contain",
    width: "100%",
    background: "#f2f4f6",
    boxSizing: "border-box",
    position: "relative",
  },
  desktopSidebarOpenBtn: {
    position: "absolute",
    left: 0,
    top: 16,
    zIndex: 5,
    width: 44,
    height: 44,
    padding: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid #e5e8eb",
    borderLeft: "none",
    borderRadius: "0 12px 12px 0",
    background: "#ffffff",
    cursor: "pointer",
    boxShadow: "2px 2px 10px rgba(0,0,0,0.08)",
    fontFamily: font,
    boxSizing: "border-box",
  },
  desktopSidebarOpenBtnInner: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  mobileTopBar: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 260,
    height: 52,
    padding: "0 8px 0 4px",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    background: "#ffffff",
    borderBottom: "1px solid #e5e8eb",
    boxSizing: "border-box",
    fontFamily: font,
  },
  mobileTopBarMenuBtn: {
    width: 48,
    height: 48,
    padding: 0,
    border: "none",
    borderRadius: 12,
    background: "transparent",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    fontFamily: font,
  },
  mobileTopBarMenuBtnInner: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  mobileTopBarTitle: {
    fontSize: "17px",
    fontWeight: "700",
    color: "#191f28",
    letterSpacing: "-0.02em",
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  darkModeToggleFixed: {
    position: "fixed",
    right: "max(12px, env(safe-area-inset-right, 0px))",
    zIndex: 280,
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "flex-start",
    pointerEvents: "auto",
    fontFamily: font,
  },
  /** 모바일 상단바 우측 — fixed 해제, flex 줄 말끝 정렬 */
  darkModeToggleInTopBar: {
    position: "relative",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingTop: 0,
    paddingRight: "max(4px, env(safe-area-inset-right, 0px))",
    fontFamily: font,
  },
  hamburgerBar: {
    display: "block",
    width: 18,
    height: 2,
    borderRadius: 1,
    background: "#191f28",
  },
  sidebarAsideFixed: {
    position: "relative",
    width: 300,
    flexShrink: 0,
    minHeight: "100vh",
    background: "#ffffff",
    borderRight: "1px solid #e5e8eb",
    fontFamily: font,
    boxSizing: "border-box",
    zIndex: 1,
    transition: "none",
    overflowX: "hidden",
    overflowY: "auto",
  },
  sidebarAsideDrawer: {
    position: "fixed",
    top: 52,
    left: 0,
    bottom: 0,
    width: 300,
    maxWidth: "min(300px, 92vw)",
    zIndex: 270,
    background: "#ffffff",
    borderRight: "1px solid #e5e8eb",
    boxShadow: "4px 0 24px rgba(0,0,0,0.12)",
    transition: "transform 0.22s ease",
    fontFamily: font,
    boxSizing: "border-box",
    overflowX: "hidden",
    overflowY: "auto",
  },
  sidebarDesktopChrome: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: "14px",
    flexShrink: 0,
  },
  sidebarDesktopMenuBtn: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    width: 40,
    height: 40,
    borderRadius: 10,
    background: "#f2f4f6",
    flexShrink: 0,
    border: "none",
    padding: 0,
    margin: 0,
    cursor: "pointer",
    fontFamily: font,
    boxSizing: "border-box",
  },
  sidebarDrawerTop: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: "12px",
    paddingBottom: "12px",
    borderBottom: "1px solid #e5e8eb",
    flexShrink: 0,
  },
  sidebarDrawerTitle: {
    fontSize: "17px",
    fontWeight: "700",
    color: "#191f28",
    letterSpacing: "-0.02em",
  },
  sidebarCloseBtn: {
    width: 40,
    height: 40,
    margin: 0,
    padding: 0,
    border: "none",
    borderRadius: 10,
    background: "#f2f4f6",
    cursor: "pointer",
    fontSize: "26px",
    lineHeight: 1,
    color: "#4e5968",
    flexShrink: 0,
    fontFamily: font,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  sidebarInner: {
    padding: "20px 16px 20px",
    height: "100%",
    overflow: "visible",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
  },
  sidebarTitle: {
    fontSize: "17px",
    fontWeight: "700",
    color: "#191f28",
    marginBottom: 0,
    letterSpacing: "-0.02em",
    flex: 1,
    minWidth: 0,
  },
  sidebarNav: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    flex: 1,
    minHeight: 0,
    overflow: "auto",
  },
  sidebarLink: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 4,
    width: "100%",
    padding: "12px 14px",
    textAlign: "left",
    border: "none",
    borderRadius: 12,
    background: "transparent",
    cursor: "pointer",
    fontFamily: font,
    boxSizing: "border-box",
  },
  sidebarLinkActive: {
    background: "#e8f3ff",
  },
  sidebarLinkMuted: {
    opacity: 0.45,
    cursor: "not-allowed",
  },
  sidebarStartHint: {
    margin: "8px 0 0",
    padding: "14px 14px",
    fontSize: "14px",
    fontWeight: "600",
    lineHeight: 1.5,
    color: "#4e5968",
    background: "#f2f4f6",
    borderRadius: 12,
    border: "1px solid #e5e8eb",
    boxSizing: "border-box",
  },
  sidebarLinkNum: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#8b95a1",
  },
  sidebarLinkTitle: {
    fontSize: "15px",
    fontWeight: "600",
    color: "#191f28",
    lineHeight: 1.35,
    wordBreak: "keep-all",
  },
  sidebarScrim: {
    position: "fixed",
    top: 52,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 250,
    margin: 0,
    padding: 0,
    border: "none",
    background: "rgba(25, 31, 40, 0.35)",
    cursor: "pointer",
  },
  summaryTitle: {
    margin: "0 0 8px",
    fontSize: "24px",
    fontWeight: "700",
    color: "#191f28",
    letterSpacing: "-0.02em",
  },
  summaryStatsCard: {
    width: "100%",
    margin: "4px 0 20px",
    padding: "22px 20px",
    borderRadius: "16px",
    background: "linear-gradient(180deg, #f0f6ff 0%, #ffffff 48%, #fafbfc 100%)",
    border: "1px solid #d0e3ff",
    boxSizing: "border-box",
    boxShadow: "0 4px 20px rgba(49, 130, 246, 0.08)",
  },
  summaryStatsGreetingRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    width: "100%",
    margin: "0 0 6px",
    boxSizing: "border-box",
  },
  summaryStatsGreeting: {
    margin: 0,
    flex: 1,
    minWidth: 0,
    fontSize: "20px",
    fontWeight: "600",
    color: "#4e5968",
    lineHeight: 1.4,
  },
  summaryStatsName: {
    fontSize: "24px",
    fontWeight: "800",
    color: "#191f28",
    letterSpacing: "-0.03em",
  },
  summaryStatsLead: {
    margin: "0 0 18px",
    fontSize: "16px",
    fontWeight: "700",
    color: "#3182f6",
    letterSpacing: "-0.02em",
  },
  summaryStatsPillRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
    alignItems: "stretch",
  },
  summaryStatPill: {
    flex: "1 1 140px",
    minWidth: "min(100%, 140px)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px 14px",
    borderRadius: "14px",
    borderWidth: "2px",
    borderStyle: "solid",
    boxSizing: "border-box",
    gap: "4px",
  },
  summaryStatPillOk: {
    background: "#e8f3ff",
    borderColor: "#8ebbff",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.85)",
    color: "#145fcc",
  },
  summaryStatPillBad: {
    background: "#fff0f0",
    borderColor: "#ffc9c9",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)",
    color: "#d92d20",
  },
  summaryStatPillLabel: {
    fontSize: "15px",
    fontWeight: "800",
    letterSpacing: "-0.02em",
  },
  summaryStatPillValue: {
    fontSize: "32px",
    fontWeight: "800",
    lineHeight: 1.1,
    letterSpacing: "-0.04em",
  },
  summaryStatPillUnit: {
    fontSize: "14px",
    fontWeight: "700",
    opacity: 0.9,
  },
  summaryList: {
    listStyle: "none",
    margin: "8px 0 0",
    padding: 0,
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  summaryItem: {
    padding: "16px",
    borderRadius: 14,
    border: "1px solid #e5e8eb",
    background: "#fafafa",
    boxSizing: "border-box",
  },
  summaryItemHead: {
    marginBottom: 10,
  },
  summaryVerdict: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#4e5968",
  },
  summaryVerdictOk: {
    color: "#2272eb",
  },
  summaryVerdictBad: {
    color: "#f04452",
  },
  summaryItemQ: {
    margin: 0,
    fontSize: "15px",
    lineHeight: 1.5,
    color: "#191f28",
    fontWeight: "500",
    wordBreak: "keep-all",
  },
  summaryExplain: {
    marginTop: 12,
    paddingTop: 12,
    borderTop: "1px solid #e5e8eb",
  },
  summaryExplainLabel: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#8b95a1",
    display: "block",
    marginBottom: 6,
  },
  summaryExplainBody: {
    margin: 0,
    fontSize: "14px",
    lineHeight: 1.55,
    color: "#4e5968",
    whiteSpace: "pre-wrap",
    wordBreak: "keep-all",
  },
  summaryFooterRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "stretch",
    gap: "12px",
    marginTop: "20px",
    width: "100%",
  },
  summaryHomeButton: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  },
  summaryHomeIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 0,
  },
  card: {
    position: "relative",
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
  nextPrevRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "stretch",
    gap: "12px",
    marginTop: "8px",
    width: "100%",
  },
  nextPrevButton: {
    flex: 1,
    minWidth: "120px",
    padding: "16px",
    fontSize: "17px",
    fontWeight: "600",
    border: "1px solid #e5e8eb",
    borderRadius: "12px",
    background: "#ffffff",
    color: "#4e5968",
    cursor: "pointer",
    fontFamily: font,
  },
  navButtonDisabled: {
    opacity: 0.45,
    cursor: "not-allowed",
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: "4px",
    padding: "6px 8px 6px 0",
    border: "none",
    borderRadius: "8px",
    background: "transparent",
    color: "#4e5968",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    fontFamily: font,
  },
  backButtonDisabled: {
    opacity: 0.45,
    cursor: "not-allowed",
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
  humorToastWrap: {
    position: "fixed",
    left: "50%",
    bottom: "max(24px, env(safe-area-inset-bottom, 0px))",
    transform: "translateX(-50%)",
    zIndex: 12000,
    maxWidth: "min(92vw, 400px)",
    width: "max-content",
    pointerEvents: "none",
    fontFamily: font,
    boxSizing: "border-box",
  },
  humorToastCard: {
    pointerEvents: "auto",
    margin: "0 auto",
    padding: "14px 22px",
    borderRadius: "14px",
    background: "#ffffff",
    color: "#191f28",
    fontSize: "15px",
    fontWeight: "600",
    lineHeight: 1.45,
    textAlign: "center",
    border: "1px solid #e5e8eb",
    boxShadow: "0 12px 40px rgba(0, 0, 0, 0.14), 0 4px 12px rgba(0, 0, 0, 0.06)",
    boxSizing: "border-box",
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
  resultRowCorrect: {
    marginTop: "16px",
    padding: "14px 16px",
    borderRadius: "12px",
    background: "#e8f3ff",
    color: "#2272eb",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: "6px 10px",
    fontWeight: "600",
    fontSize: "16px",
    lineHeight: "1.5",
    boxSizing: "border-box",
  },
  resultTextCorrect: {
    color: "#2272eb",
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

const DARK_THEME_PATCH = {
  mainColumnDesktop: { background: "#12151a" },
  mainColumnMobile: { background: "#12151a" },
  desktopShell: { background: "#12151a" },
  mobileTopBar: {
    background: "#1a1f26",
    borderBottom: "1px solid #2a3340",
  },
  mobileTopBarTitle: { color: "#e8ecf0" },
  hamburgerBar: { background: "#e8ecf0" },
  sidebarAsideFixed: {
    background: "#1a1f26",
    borderRight: "1px solid #2a3340",
  },
  sidebarAsideDrawer: {
    background: "#1a1f26",
    borderRight: "1px solid #2a3340",
    boxShadow: "4px 0 24px rgba(0,0,0,0.45)",
  },
  sidebarDesktopMenuBtn: { background: "#2a3038" },
  desktopSidebarOpenBtn: {
    background: "#2a3038",
    border: "1px solid #3d4654",
    borderLeft: "none",
    boxShadow: "2px 2px 12px rgba(0,0,0,0.35)",
  },
  sidebarDrawerTop: { borderBottom: "1px solid #2a3340" },
  sidebarDrawerTitle: { color: "#e8ecf0" },
  sidebarCloseBtn: { background: "#2a3038", color: "#e4e8ed" },
  sidebarTitle: { color: "#e8ecf0" },
  sidebarLinkActive: { background: "rgba(49, 130, 246, 0.22)" },
  sidebarLinkTitle: { color: "#e4e8ed" },
  sidebarLinkNum: { color: "#8b95a1" },
  sidebarStartHint: {
    color: "#adb5bd",
    background: "#252b33",
    border: "1px solid #3d4654",
  },
  sidebarScrim: { background: "rgba(0, 0, 0, 0.55)" },
  card: {
    background: "#1e232b",
    border: "1px solid #2f3847",
    color: "#e4e8ed",
  },
  title: { color: "#f2f4f6" },
  introTagline: { color: "#adb5bd" },
  description: { color: "#9aa4b2" },
  error: { color: "#ff8a8a" },
  input: {
    background: "#252b33",
    border: "1px solid #3d4654",
    color: "#e4e8ed",
  },
  inputRevealWrong: {
    border: "2px solid #f04452",
    background: "rgba(240, 68, 82, 0.12)",
  },
  inputRevealCorrect: {
    border: "2px solid #3182f6",
    background: "rgba(49, 130, 246, 0.12)",
  },
  subButton: {
    background: "#2a3038",
    border: "1px solid #3d4654",
    color: "#e4e8ed",
  },
  progress: { color: "#8b95a1" },
  question: { color: "#e8ecf0" },
  backButton: { color: "#9aa4b2" },
  mcOption: {
    background: "#252b33",
    border: "1px solid #3d4654",
  },
  mcOptionSelected: {
    borderColor: "#3182f6",
    background: "rgba(49, 130, 246, 0.15)",
  },
  mcBadge: { background: "#3d4654", color: "#e4e8ed" },
  mcText: { color: "#e4e8ed" },
  mcOptionRevealCorrect: {
    border: "2px solid #3182f6",
    background: "rgba(49, 130, 246, 0.15)",
  },
  mcOptionRevealWrong: {
    border: "2px solid #f04452",
    background: "rgba(240, 68, 82, 0.12)",
  },
  result: {
    background: "rgba(49, 130, 246, 0.18)",
    color: "#9ec5ff",
  },
  resultRowCorrect: {
    background: "rgba(49, 130, 246, 0.18)",
    color: "#9ec5ff",
  },
  resultTextCorrect: {
    color: "#9ec5ff",
  },
  complete: {
    background: "rgba(49, 130, 246, 0.18)",
    color: "#9ec5ff",
  },
  explanationBox: {
    background: "#252b33",
    border: "1px solid #3d4654",
  },
  explanationTitle: { color: "#e8ecf0" },
  explanationBody: { color: "#9aa4b2" },
  correctAnswerCallout: {
    border: "2px solid #3182f6",
    background: "rgba(49, 130, 246, 0.12)",
  },
  correctAnswerLabel: { color: "#7eb8ff" },
  correctAnswerText: { color: "#e4e8ed" },
  nextPrevButton: {
    background: "#2a3038",
    border: "1px solid #3d4654",
    color: "#e4e8ed",
  },
  loadingCard: {
    background: "#1e232b",
    border: "1px solid #2f3847",
    boxShadow: "0 12px 40px rgba(0, 0, 0, 0.4)",
  },
  loadingSpinner: {
    border: "3px solid #3d4654",
    borderTopColor: "#3182f6",
  },
  loadingMessage: { color: "#e4e8ed" },
  humorToastCard: {
    background: "#2a3038",
    color: "#e8ecf0",
    border: "1px solid #3d4654",
    boxShadow: "0 12px 40px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.05)",
  },
  summaryTitle: { color: "#e8ecf0" },
  summaryStatsCard: {
    background: "linear-gradient(180deg, #1a2538 0%, #1e232b 50%, #1a1f26 100%)",
    border: "1px solid #2f4a7a",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.25)",
  },
  summaryStatsGreeting: { color: "#9aa4b2" },
  summaryStatsName: { color: "#f2f4f6" },
  summaryStatsLead: { color: "#6eb0ff" },
  summaryStatPillOk: {
    background: "rgba(49, 130, 246, 0.2)",
    borderColor: "#2d5a9e",
    color: "#7eb8ff",
  },
  summaryStatPillBad: {
    background: "rgba(240, 68, 82, 0.14)",
    borderColor: "#8f3a42",
    color: "#ff9a9a",
  },
  summaryItem: {
    background: "#252b33",
    border: "1px solid #3d4654",
  },
  summaryVerdict: { color: "#9aa4b2" },
  summaryVerdictOk: { color: "#7eb8ff" },
  summaryVerdictBad: { color: "#ff8a8a" },
  summaryItemQ: { color: "#e4e8ed" },
  summaryExplain: { borderTop: "1px solid #3d4654" },
  summaryExplainLabel: { color: "#8b95a1" },
  summaryExplainBody: { color: "#9aa4b2" },
};

function mergeTheme(isDark) {
  if (!isDark) return baseStyles;
  const out = {};
  for (const key of Object.keys(baseStyles)) {
    const patch = DARK_THEME_PATCH[key];
    out[key] = patch ? { ...baseStyles[key], ...patch } : baseStyles[key];
  }
  return out;
}

function shortAnswerInputStyle(revealWrong, revealCorrect, theme) {
  const s = theme;
  if (revealWrong) return { ...s.input, ...s.inputRevealWrong };
  if (revealCorrect) return { ...s.input, ...s.inputRevealCorrect };
  return s.input;
}
