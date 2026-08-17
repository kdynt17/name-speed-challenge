"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type Phase = "setup" | "ready" | "typing" | "result";

type Ranking = {
  id: string;
  name: string;
  timeMs: number;
  createdAt: string;
};

type Result = {
  timeMs: number;
  rank: number;
  isPersonalBest: boolean;
};

const STORAGE_KEY = "name-sprint-rankings-v1";

const normalizeName = (value: string) => value.trim().normalize("NFC");
const namesMatch = (typed: string, target: string) =>
  typed.normalize("NFC") === target.normalize("NFC");
const formatTime = (timeMs: number) => `${(timeMs / 1000).toFixed(3)}초`;

export default function Home() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [nameDraft, setNameDraft] = useState("");
  const [targetName, setTargetName] = useState("");
  const [typedName, setTypedName] = useState("");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [message, setMessage] = useState("이름을 등록하면 도전이 시작돼요.");
  const [hasInputError, setHasInputError] = useState(false);

  const startedAtRef = useRef<number | null>(null);
  const typingInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadSavedRankings = window.requestAnimationFrame(() => {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (!saved) return;

        const parsed = JSON.parse(saved) as Ranking[];
        if (!Array.isArray(parsed)) return;

        const valid = parsed
          .filter(
            (item) =>
              typeof item?.id === "string" &&
              typeof item?.name === "string" &&
              typeof item?.timeMs === "number" &&
              Number.isFinite(item.timeMs),
          )
          .sort((a, b) => a.timeMs - b.timeMs);
        setRankings(valid);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    });

    return () => window.cancelAnimationFrame(loadSavedRankings);
  }, []);

  useEffect(() => {
    if (phase !== "typing") return;

    let animationFrame = 0;
    const updateTimer = () => {
      if (startedAtRef.current !== null) {
        setElapsedMs(performance.now() - startedAtRef.current);
      }
      animationFrame = requestAnimationFrame(updateTimer);
    };

    animationFrame = requestAnimationFrame(updateTimer);
    return () => cancelAnimationFrame(animationFrame);
  }, [phase]);

  const focusTypingInput = () => {
    window.setTimeout(() => typingInputRef.current?.focus(), 40);
  };

  const handleNameSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = normalizeName(nameDraft);

    if (!normalized) {
      setMessage("먼저 참가자 이름을 입력해 주세요.");
      nameInputRef.current?.focus();
      return;
    }

    setTargetName(normalized);
    setNameDraft(normalized);
    setTypedName("");
    setElapsedMs(0);
    setResult(null);
    setPhase("ready");
    setMessage("첫 글자를 입력하는 순간 시간이 흐릅니다.");
    startedAtRef.current = null;
    focusTypingInput();
  };

  const handleTyping = (value: string) => {
    if (phase === "result") return;

    if (startedAtRef.current === null && value.length > 0) {
      startedAtRef.current = performance.now();
      setPhase("typing");
      setMessage("측정 중! 이름을 완성하고 Enter를 누르세요.");
    }

    setTypedName(value);
    setHasInputError(false);
  };

  const saveResult = (timeMs: number) => {
    const existing = rankings.find(
      (entry) => normalizeName(entry.name) === normalizeName(targetName),
    );
    const isPersonalBest = !existing || timeMs < existing.timeMs;

    const nextRankings = isPersonalBest
      ? [
          ...rankings.filter(
            (entry) => normalizeName(entry.name) !== normalizeName(targetName),
          ),
          {
            id: existing?.id ?? crypto.randomUUID(),
            name: targetName,
            timeMs,
            createdAt: new Date().toISOString(),
          },
        ].sort((a, b) => a.timeMs - b.timeMs)
      : rankings;

    const rank =
      nextRankings.findIndex(
        (entry) => normalizeName(entry.name) === normalizeName(targetName),
      ) + 1;

    setRankings(nextRankings);
    setResult({ timeMs, rank, isPersonalBest });
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextRankings));
  };

  const finishAttempt = () => {
    if (startedAtRef.current === null) {
      setMessage("이름을 먼저 입력해 주세요.");
      return;
    }

    if (!namesMatch(typedName, targetName)) {
      setHasInputError(true);
      setMessage(`“${targetName}”을 정확히 입력한 뒤 Enter를 눌러 주세요.`);
      window.setTimeout(() => setHasInputError(false), 450);
      return;
    }

    const finalTime = performance.now() - startedAtRef.current;
    setElapsedMs(finalTime);
    setPhase("result");
    setMessage("기록 완료! 순위표에 바로 반영됐어요.");
    saveResult(finalTime);
  };

  const retry = () => {
    startedAtRef.current = null;
    setTypedName("");
    setElapsedMs(0);
    setResult(null);
    setPhase("ready");
    setMessage("첫 글자를 입력하는 순간 시간이 흐릅니다.");
    focusTypingInput();
  };

  const nextParticipant = () => {
    startedAtRef.current = null;
    setTargetName("");
    setNameDraft("");
    setTypedName("");
    setElapsedMs(0);
    setResult(null);
    setPhase("setup");
    setMessage("다음 참가자의 이름을 등록해 주세요.");
    window.setTimeout(() => nameInputRef.current?.focus(), 40);
  };

  const clearRankings = () => {
    if (!window.confirm("모든 참가자의 기록을 지울까요? 이 작업은 되돌릴 수 없어요.")) {
      return;
    }

    window.localStorage.removeItem(STORAGE_KEY);
    setRankings([]);
    setMessage("순위표를 깨끗하게 비웠어요.");
  };

  const blockShortcut = (label: string) => {
    setMessage(`${label}은 사용할 수 없어요. 직접 타이핑해 주세요.`);
  };

  return (
    <main className="site-shell">
      <div className="speed-lines speed-lines-left" aria-hidden="true" />
      <div className="speed-lines speed-lines-right" aria-hidden="true" />

      <section className="hero" aria-labelledby="page-title">
        <div className="eyebrow">
          <span className="live-dot" aria-hidden="true" />
          NAME TYPING RACE
        </div>
        <h1 id="page-title">
          내 이름,
          <br />
          <span>누가 제일 빠를까?</span>
        </h1>
        <p>
          첫 글자부터 Enter까지 단 한 번의 질주.
          <br className="mobile-break" /> 이 컴퓨터에 최고 기록을 남겨보세요.
        </p>
      </section>

      <section className="game-card" aria-label="이름 타자 기록 측정">
        <div className="card-topline">
          <span>ROUND / NAME</span>
          <span className="local-badge">LOCAL SCOREBOARD</span>
        </div>

        {phase === "setup" ? (
          <form className="setup-panel" onSubmit={handleNameSubmit}>
            <label htmlFor="participant-name">참가자 이름</label>
            <div className="setup-row">
              <input
                ref={nameInputRef}
                id="participant-name"
                value={nameDraft}
                onChange={(event) => setNameDraft(event.target.value)}
                maxLength={20}
                autoComplete="off"
                placeholder="예: 김도연"
                aria-describedby="setup-help"
                autoFocus
              />
              <button type="submit">도전 준비</button>
            </div>
            <p id="setup-help">이 이름과 똑같이 입력해야 기록이 저장됩니다.</p>
          </form>
        ) : (
          <div className="challenge-panel">
            <div className="target-row">
              <div>
                <span className="mini-label">TYPE THIS NAME</span>
                <strong>{targetName}</strong>
              </div>
              <div className={`timer ${phase === "typing" ? "timer-running" : ""}`}>
                <span className="timer-status">
                  {phase === "ready" && "READY"}
                  {phase === "typing" && "TYPING"}
                  {phase === "result" && "FINISH"}
                </span>
                <b>{formatTime(elapsedMs)}</b>
              </div>
            </div>

            <div className={`typing-box ${hasInputError ? "typing-error" : ""}`}>
              <input
                ref={typingInputRef}
                value={typedName}
                onChange={(event) => handleTyping(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.nativeEvent.isComposing &&
                    phase !== "result"
                  ) {
                    event.preventDefault();
                    finishAttempt();
                  }
                }}
                onPaste={(event) => {
                  event.preventDefault();
                  blockShortcut("붙여넣기");
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  blockShortcut("끌어놓기");
                }}
                disabled={phase === "result"}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                maxLength={24}
                aria-label={`${targetName} 타자 입력`}
                placeholder="여기에 이름을 입력하세요"
              />
              <kbd>ENTER ↵</kbd>
            </div>

            <div className="status-row" aria-live="polite">
              <span className={`status-mark status-${phase}`} aria-hidden="true" />
              <p>{message}</p>
            </div>

            {result && (
              <div className="result-strip" aria-live="polite">
                <div>
                  <span>이번 기록</span>
                  <strong>{formatTime(result.timeMs)}</strong>
                </div>
                <div>
                  <span>현재 순위</span>
                  <strong>{result.rank}위</strong>
                </div>
                <p>
                  {result.isPersonalBest
                    ? result.rank === 1
                      ? "새로운 1등! ⚡"
                      : "개인 최고 기록!"
                    : "최고 기록은 그대로예요."}
                </p>
              </div>
            )}

            <div className="action-row">
              <button className="button-secondary" type="button" onClick={retry}>
                다시 도전
              </button>
              <button className="button-primary" type="button" onClick={nextParticipant}>
                다음 참가자 <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="leaderboard" aria-labelledby="leaderboard-title">
        <div className="leaderboard-heading">
          <div>
            <span className="mini-label">FASTEST ON THIS DEVICE</span>
            <h2 id="leaderboard-title">실시간 순위</h2>
          </div>
          <div className="leaderboard-actions">
            <span>{rankings.length}명 참가</span>
            {rankings.length > 0 && (
              <button type="button" onClick={clearRankings}>기록 초기화</button>
            )}
          </div>
        </div>

        {rankings.length === 0 ? (
          <div className="empty-board">
            <span aria-hidden="true">01</span>
            <p>아직 기록이 없어요.<br />첫 번째 이름을 가장 먼저 올려보세요!</p>
          </div>
        ) : (
          <ol className="ranking-list">
            {rankings.map((entry, index) => (
              <li className={index < 3 ? `rank-top rank-${index + 1}` : ""} key={entry.id}>
                <span className="rank-number">{String(index + 1).padStart(2, "0")}</span>
                <div className="rank-name">
                  <strong>{entry.name}</strong>
                  {index === 0 && <small>현재 최고 기록</small>}
                </div>
                <time>{formatTime(entry.timeMs)}</time>
              </li>
            ))}
          </ol>
        )}
      </section>

      <footer>
        <p>기록은 이 브라우저에만 안전하게 저장됩니다.</p>
        <span>NO LOGIN · NO DATABASE</span>
      </footer>
    </main>
  );
}
