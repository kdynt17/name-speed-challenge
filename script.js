(() => {
  "use strict";

  const STORAGE_KEY = "name-sprint-rankings-v1";

  const setupForm = document.querySelector("#setup-form");
  const nameInput = document.querySelector("#participant-name");
  const challengePanel = document.querySelector("#challenge-panel");
  const targetNameElement = document.querySelector("#target-name");
  const typingInput = document.querySelector("#typing-input");
  const typingBox = document.querySelector("#typing-box");
  const timer = document.querySelector("#timer");
  const timerStatus = document.querySelector("#timer-status");
  const timerValue = document.querySelector("#timer-value");
  const statusMark = document.querySelector("#status-mark");
  const statusMessage = document.querySelector("#status-message");
  const resultStrip = document.querySelector("#result-strip");
  const resultTime = document.querySelector("#result-time");
  const resultRank = document.querySelector("#result-rank");
  const resultMessage = document.querySelector("#result-message");
  const retryButton = document.querySelector("#retry-button");
  const nextButton = document.querySelector("#next-button");
  const participantCount = document.querySelector("#participant-count");
  const clearButton = document.querySelector("#clear-button");
  const emptyBoard = document.querySelector("#empty-board");
  const rankingList = document.querySelector("#ranking-list");

  let phase = "setup";
  let targetName = "";
  let startedAt = null;
  let animationFrame = null;
  let rankings = loadRankings();

  const normalizeName = (value) => value.trim().normalize("NFC");
  const formatTime = (timeMs) => `${(timeMs / 1000).toFixed(3)}초`;

  function loadRankings() {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];

      return parsed
        .filter(
          (item) =>
            item &&
            typeof item.id === "string" &&
            typeof item.name === "string" &&
            Number.isFinite(item.timeMs),
        )
        .sort((a, b) => a.timeMs - b.timeMs);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      return [];
    }
  }

  function makeId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function setStatus(message, nextPhase = phase) {
    phase = nextPhase;
    statusMessage.textContent = message;
    statusMark.className = `status-mark status-${nextPhase}`;
    timer.classList.toggle("timer-running", nextPhase === "typing");
    timerStatus.textContent =
      nextPhase === "typing" ? "TYPING" : nextPhase === "result" ? "FINISH" : "READY";
  }

  function updateTimer() {
    if (phase !== "typing" || startedAt === null) return;
    timerValue.textContent = formatTime(performance.now() - startedAt);
    animationFrame = requestAnimationFrame(updateTimer);
  }

  function startTimer() {
    if (startedAt !== null) return;
    startedAt = performance.now();
    setStatus("측정 중! 이름을 완성하고 Enter를 누르세요.", "typing");
    animationFrame = requestAnimationFrame(updateTimer);
  }

  function stopTimer() {
    if (animationFrame !== null) cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }

  function resetAttempt() {
    stopTimer();
    startedAt = null;
    typingInput.value = "";
    typingInput.disabled = false;
    timerValue.textContent = "0.000초";
    resultStrip.hidden = true;
    typingBox.classList.remove("typing-error");
    setStatus("첫 글자를 입력하는 순간 시간이 흐릅니다.", "ready");
    window.setTimeout(() => typingInput.focus(), 40);
  }

  function saveResult(timeMs) {
    const normalizedTarget = normalizeName(targetName);
    const existing = rankings.find((entry) => normalizeName(entry.name) === normalizedTarget);
    const isPersonalBest = !existing || timeMs < existing.timeMs;

    if (isPersonalBest) {
      rankings = [
        ...rankings.filter((entry) => normalizeName(entry.name) !== normalizedTarget),
        {
          id: existing?.id || makeId(),
          name: targetName,
          timeMs,
          createdAt: new Date().toISOString(),
        },
      ].sort((a, b) => a.timeMs - b.timeMs);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rankings));
    }

    const rank = rankings.findIndex((entry) => normalizeName(entry.name) === normalizedTarget) + 1;
    return { rank, isPersonalBest };
  }

  function finishAttempt() {
    if (startedAt === null) {
      setStatus("이름을 먼저 입력해 주세요.", "ready");
      return;
    }

    if (typingInput.value.normalize("NFC") !== targetName.normalize("NFC")) {
      typingBox.classList.remove("typing-error");
      void typingBox.offsetWidth;
      typingBox.classList.add("typing-error");
      setStatus(`“${targetName}”을 정확히 입력한 뒤 Enter를 눌러 주세요.`, "typing");
      return;
    }

    const finalTime = performance.now() - startedAt;
    stopTimer();
    timerValue.textContent = formatTime(finalTime);
    typingInput.disabled = true;
    const result = saveResult(finalTime);

    resultTime.textContent = formatTime(finalTime);
    resultRank.textContent = `${result.rank}위`;
    resultMessage.textContent = result.isPersonalBest
      ? result.rank === 1
        ? "새로운 1등! ⚡"
        : "개인 최고 기록!"
      : "최고 기록은 그대로예요.";
    resultStrip.hidden = false;
    setStatus("기록 완료! 순위표에 바로 반영됐어요.", "result");
    renderRankings();
  }

  function renderRankings() {
    participantCount.textContent = `${rankings.length}명 참가`;
    clearButton.hidden = rankings.length === 0;
    emptyBoard.hidden = rankings.length > 0;
    rankingList.hidden = rankings.length === 0;
    rankingList.replaceChildren();

    rankings.forEach((entry, index) => {
      const item = document.createElement("li");
      if (index < 3) item.className = `rank-top rank-${index + 1}`;

      const number = document.createElement("span");
      number.className = "rank-number";
      number.textContent = String(index + 1).padStart(2, "0");

      const name = document.createElement("div");
      name.className = "rank-name";
      const strong = document.createElement("strong");
      strong.textContent = entry.name;
      name.append(strong);
      if (index === 0) {
        const label = document.createElement("small");
        label.textContent = "현재 최고 기록";
        name.append(label);
      }

      const time = document.createElement("time");
      time.textContent = formatTime(entry.timeMs);
      item.append(number, name, time);
      rankingList.append(item);
    });
  }

  setupForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const normalized = normalizeName(nameInput.value);
    if (!normalized) {
      nameInput.focus();
      return;
    }

    targetName = normalized;
    nameInput.value = normalized;
    targetNameElement.textContent = normalized;
    typingInput.setAttribute("aria-label", `${normalized} 타자 입력`);
    setupForm.hidden = true;
    challengePanel.hidden = false;
    resetAttempt();
  });

  typingInput.addEventListener("input", () => {
    typingBox.classList.remove("typing-error");
    if (typingInput.value.length > 0) startTimer();
  });

  typingInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.isComposing && event.keyCode !== 229) {
      event.preventDefault();
      finishAttempt();
    }
  });

  typingInput.addEventListener("paste", (event) => {
    event.preventDefault();
    setStatus("붙여넣기는 사용할 수 없어요. 직접 타이핑해 주세요.", phase);
  });

  typingInput.addEventListener("drop", (event) => {
    event.preventDefault();
    setStatus("끌어놓기는 사용할 수 없어요. 직접 타이핑해 주세요.", phase);
  });

  retryButton.addEventListener("click", resetAttempt);

  nextButton.addEventListener("click", () => {
    stopTimer();
    startedAt = null;
    targetName = "";
    nameInput.value = "";
    challengePanel.hidden = true;
    setupForm.hidden = false;
    phase = "setup";
    window.setTimeout(() => nameInput.focus(), 40);
  });

  clearButton.addEventListener("click", () => {
    if (!window.confirm("모든 참가자의 기록을 지울까요? 이 작업은 되돌릴 수 없어요.")) {
      return;
    }
    rankings = [];
    window.localStorage.removeItem(STORAGE_KEY);
    renderRankings();
  });

  renderRankings();
})();
