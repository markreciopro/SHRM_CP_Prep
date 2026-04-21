/* ================================
   MAREC HR360 — SHRM‑CP Advanced Engine
   500+ Procedurally Generated Questions
   ================================ */

/* NAVIGATION */
function showSection(id, btn) {
  document.querySelectorAll(".section").forEach((s) => s.classList.remove("active"));
  const target = document.getElementById(id);
  if (target) target.classList.add("active");

  if (btn) {
    document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
  }

  if (id === "results") {
    buildDomainRadar();
    renderDomainTable();
    renderRationaleList();
  }
}

/* DOMAINS */
const DOMAINS = ["People", "Organization", "Workplace", "Strategy"];

const domainStats = {
  People: { correct: 0, attempts: 0 },
  Organization: { correct: 0, attempts: 0 },
  Workplace: { correct: 0, attempts: 0 },
  Strategy: { correct: 0, attempts: 0 }
};

let domainRadarChart = null;

/* TIMER (4‑hour exam) */
let timerInterval = null;
let remainingSeconds = 0;

function startTimer(seconds) {
  clearTimer();
  remainingSeconds = seconds;
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    remainingSeconds--;
    if (remainingSeconds <= 0) {
      remainingSeconds = 0;
      updateTimerDisplay();
      clearTimer();
      finalizeSession(true);
      document.getElementById("sessionStatus").textContent =
        "Time is up. Session automatically finalized.";
      showSection("results", document.querySelectorAll(".nav-btn")[2]);
    } else {
      updateTimerDisplay();
    }
  }, 1000);
}

function clearTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function updateTimerDisplay() {
  const display = document.getElementById("timerDisplay");
  if (!display) return;
  if (remainingSeconds <= 0) {
    display.textContent = "—:—:—";
    return;
  }
  const h = Math.floor(remainingSeconds / 3600);
  const m = Math.floor((remainingSeconds % 3600) / 60);
  const s = remainingSeconds % 60;
  display.textContent =
    String(h).padStart(2, "0") +
    ":" +
    String(m).padStart(2, "0") +
    ":" +
    String(s).padStart(2, "0");
}

/* RANDOM HELPERS */
const industries = [
  "healthcare",
  "manufacturing",
  "technology",
  "financial services",
  "retail",
  "hospitality",
  "logistics",
  "education",
  "nonprofit",
  "government contractor"
];

const roles = [
  "HR director",
  "HR business partner",
  "HR manager",
  "talent acquisition lead",
  "compensation analyst",
  "employee relations specialist",
  "HR generalist",
  "chief people officer"
];

const legalTopics = [
  "ADA (disability accommodation)",
  "FMLA (family and medical leave)",
  "FLSA (exempt vs nonexempt classification)",
  "Title VII (discrimination and harassment)",
  "ADEA (age discrimination)",
  "NLRA (protected concerted activity)",
  "OSHA (workplace safety)",
  "USERRA (military leave and reinstatement)",
  "Equal Pay Act (pay equity)"
];

const conflictThemes = [
  "performance concerns with a long‑tenured employee",
  "a high‑performing manager accused of harassment",
  "a request for remote work as a potential accommodation",
  "a dispute over overtime eligibility",
  "a complaint about perceived favoritism in promotions",
  "a conflict between a union steward and a supervisor",
  "a safety concern raised by frontline employees",
  "a reduction‑in‑force targeting older workers",
  "a denial of leave that may qualify under FMLA"
];

const constraints = [
  "tight project deadlines",
  "pressure from senior leadership to act quickly",
  "limited documentation of prior issues",
  "a lack of clear policy guidance",
  "fear of negative publicity",
  "concern about setting a precedent",
  "budget constraints",
  "a recent merger and culture clash",
  "ongoing union organizing activity"
];

const knowledgeTopics = [
  "workforce planning",
  "talent acquisition metrics",
  "compensation strategy",
  "performance management systems",
  "employee engagement and retention",
  "HR analytics and dashboards",
  "succession planning",
  "learning and development",
  "change management",
  "HR risk and compliance"
];

const difficultyLevels = ["Easy", "Medium", "Hard", "Very Hard"];

/* RANDOM UTILITIES */
function randItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/* QUESTION GENERATION */

/* Generate one advanced SJI question */
function generateSJIQuestion(id) {
  const domainWeights = {
    People: 0.35,
    Organization: 0.3,
    Workplace: 0.2,
    Strategy: 0.15
  };
  const r = Math.random();
  let domain;
  if (r < domainWeights.People) domain = "People";
  else if (r < domainWeights.People + domainWeights.Organization) domain = "Organization";
  else if (r < domainWeights.People + domainWeights.Organization + domainWeights.Workplace)
    domain = "Workplace";
  else domain = "Strategy";

  const difficulty = randItem(difficultyLevels);
  const industry = randItem(industries);
  const role = randItem(roles);
  const legal = randItem(legalTopics);
  const conflict = randItem(conflictThemes);
  const constraint = randItem(constraints);

  const stem =
    `You are the ${role} at a mid‑sized ${industry} organization. ` +
    `The company is experiencing ${conflict}. ` +
    `During your review of the situation, you identify potential implications under ${legal}. ` +
    `Senior leadership is applying pressure to resolve the issue quickly due to ${constraint}. ` +
    `Which of the following actions best reflects a SHRM‑aligned, legally aware, and strategically sound response?`;

  const options = [
    "Conduct a prompt, well‑documented investigation, consult with legal counsel as needed, and apply policy consistently while considering the legal requirements.",
    "Take immediate action based solely on leadership’s preference to demonstrate alignment with executives, even if documentation is incomplete.",
    "Delay any response until an external agency or attorney forces the organization to act, to avoid drawing attention internally.",
    "Handle the matter informally through verbal conversations only, avoiding written records to reduce discoverable documentation."
  ];

  const correctIndex = 0;

  const rationale =
    `The best response balances legal compliance, risk management, and organizational strategy. ` +
    `A prompt, well‑documented investigation that considers ${legal} and applies policy consistently aligns with SHRM’s expectations for ethical, legally aware HR practice. ` +
    `Acting solely on leadership pressure, avoiding documentation, or waiting for external enforcement increases legal and reputational risk.`;

  return {
    id,
    type: "SJI",
    domain,
    difficulty,
    stem,
    options,
    correctIndex,
    rationale
  };
}

/* Generate one knowledge question */
function generateKnowledgeQuestion(id) {
  const domain = randItem(DOMAINS);
  const difficulty = randItem(difficultyLevels);
  const topic = randItem(knowledgeTopics);

  const stem =
    `In the context of ${topic}, which of the following actions best reflects a SHRM‑aligned, data‑driven HR approach?`;

  const options = [
    "Use relevant metrics and trend data to diagnose the issue, then design and evaluate targeted interventions.",
    "Rely solely on anecdotal feedback from one or two leaders without reviewing any data.",
    "Implement a solution based on what another company did, without considering your organization’s context or data.",
    "Avoid measuring outcomes to prevent negative results from being visible to leadership."
  ];

  const correctIndex = 0;

  const rationale =
    `SHRM emphasizes evidence‑based HR. Using relevant metrics and trend data to diagnose issues, design interventions, and evaluate outcomes reflects a data‑driven, strategic approach. ` +
    `Relying only on anecdotes, copying other organizations without context, or avoiding measurement undermines HR’s strategic value.`;

  return {
    id,
    type: "Knowledge",
    domain,
    difficulty,
    stem,
    options,
    correctIndex,
    rationale
  };
}

/* Generate full bank of N questions (60% SJI, 40% knowledge) */
function generateQuestionBank(count) {
  const questions = [];
  const sjiTarget = Math.round(count * 0.6);
  const knowledgeTarget = count - sjiTarget;

  for (let i = 0; i < sjiTarget; i++) {
    questions.push(generateSJIQuestion(i + 1));
  }
  for (let j = 0; j < knowledgeTarget; j++) {
    questions.push(generateKnowledgeQuestion(sjiTarget + j + 1));
  }

  // Shuffle
  for (let i = questions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [questions[i], questions[j]] = [questions[j], questions[i]];
  }

  return questions;
}

/* SESSION STATE */
let fullBank = generateQuestionBank(500);
let sessionQuestions = [];
let sessionMode = "study";
let currentIndex = 0;
let answeredMap = {}; // index -> {selectedIndex, correct}
let totalCorrect = 0;
let totalAttempts = 0;
let sessionComplete = false;

/* START SESSION */
function startSession() {
  const modeSelect = document.getElementById("modeSelect");
  const countSelect = document.getElementById("countSelect");
  const statusEl = document.getElementById("sessionStatus");

  const mode = modeSelect.value;
  const count = parseInt(countSelect.value, 10);

  sessionMode = mode;
  sessionComplete = false;
  answeredMap = {};
  totalCorrect = 0;
  totalAttempts = 0;

  Object.keys(domainStats).forEach((d) => {
    domainStats[d].correct = 0;
    domainStats[d].attempts = 0;
  });

  // Regenerate full bank each session for freshness
  fullBank = generateQuestionBank(500);
  sessionQuestions = sampleQuestions(fullBank, count);
  currentIndex = 0;

  statusEl.textContent =
    `Session started in ${mode === "study" ? "Study" : "Timed Exam"} Mode with ${count} questions.`;
  document.getElementById("metricTotal").textContent = count;
  document.getElementById("metricCorrect").textContent = "0";
  document.getElementById("metricAttempts").textContent = "0";
  document.getElementById("progressFill").style.width = "0%";
  document.getElementById("progressCountLabel").textContent = "0 / " + count + " answered";
  document.getElementById("progressScoreLabel").textContent = "Score: 0%";
  document.getElementById("modeHint").textContent =
    mode === "study"
      ? "Study Mode: rationales appear immediately after you submit each question."
      : "Timed Exam Mode: rationales are hidden until you finish or time expires.";

  const timerHint = document.getElementById("timerHint");
  if (mode === "exam") {
    timerHint.textContent = "Timed Exam Mode: 4‑hour countdown is active.";
    startTimer(4 * 60 * 60); // 4 hours
  } else {
    timerHint.textContent = "Timer runs only in Timed Exam Mode (4 hours by default).";
    clearTimer();
    updateTimerDisplay();
  }

  renderCurrentQuestion();
}

/* RANDOM SAMPLE WITHOUT REPLACEMENT */
function sampleQuestions(bank, count) {
  const indices = bank.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const selected = indices.slice(0, count).map((idx) => bank[idx]);
  return selected;
}

/* RENDER CURRENT QUESTION */
function renderCurrentQuestion() {
  const q = sessionQuestions[currentIndex];
  const qText = document.getElementById("qText");
  const qOptions = document.getElementById("qOptions");
  const qIndexLabel = document.getElementById("qIndexLabel");
  const qDomainLabel = document.getElementById("qDomainLabel");
  const qDifficultyLabel = document.getElementById("qDifficultyLabel");
  const qTypeLabel = document.getElementById("qTypeLabel");
  const qRationale = document.getElementById("qRationale");

  if (!q) {
    qText.textContent = "No active session. Start a new session to load questions.";
    qOptions.innerHTML = "";
    qIndexLabel.textContent = "Question —";
    qDomainLabel.textContent = "Domain: —";
    qDifficultyLabel.textContent = "Difficulty: —";
    qTypeLabel.textContent = "Type: —";
    qRationale.textContent = "";
    return;
  }

  qText.textContent = q.stem;
  qIndexLabel.textContent = `Question ${currentIndex + 1} of ${sessionQuestions.length}`;
  qDomainLabel.textContent = `Domain: ${q.domain}`;
  qDifficultyLabel.textContent = `Difficulty: ${q.difficulty}`;
  qTypeLabel.textContent = `Type: ${q.type}`;

  qOptions.innerHTML = "";
  q.options.forEach((opt, idx) => {
    const btn = document.createElement("button");
    btn.className = "quiz-option-btn";
    btn.textContent = opt;
    btn.dataset.index = idx;
    btn.onclick = () => selectOption(idx);
    qOptions.appendChild(btn);
  });

  qRationale.textContent = "";

  const answered = answeredMap[currentIndex];
  if (answered) {
    const buttons = document.querySelectorAll("#qOptions .quiz-option-btn");
    buttons.forEach((b) => {
      const idx = parseInt(b.dataset.index, 10);
      if (idx === answered.selectedIndex) {
        b.classList.add("selected");
      }
      if (sessionComplete || sessionMode === "study") {
        if (idx === q.correctIndex) b.classList.add("correct");
        else if (idx === answered.selectedIndex) b.classList.add("incorrect");
        b.disabled = true;
      }
    });

    if (sessionMode === "study" || sessionComplete) {
      qRationale.textContent = q.rationale;
    }
  }
}

/* SELECT OPTION */
function selectOption(idx) {
  if (sessionComplete) return;
  const buttons = document.querySelectorAll("#qOptions .quiz-option-btn");
  buttons.forEach((b) => b.classList.remove("selected"));
  const btn = document.querySelector(`#qOptions .quiz-option-btn[data-index="${idx}"]`);
  if (btn) btn.classList.add("selected");
}

/* SUBMIT OR NEXT */
function submitOrNext() {
  if (!sessionQuestions.length) return;

  const answered = answeredMap[currentIndex];
  if (!answered) {
    const selectedBtn = document.querySelector("#qOptions .quiz-option-btn.selected");
    if (!selectedBtn) {
      document.getElementById("sessionStatus").textContent =
        "Select an option before submitting.";
      return;
    }
    gradeCurrentQuestion(selectedBtn);
  } else {
    nextQuestion();
  }
}

/* GRADE CURRENT QUESTION */
function gradeCurrentQuestion(selectedBtn) {
  const q = sessionQuestions[currentIndex];
  const selectedIndex = parseInt(selectedBtn.dataset.index, 10);
  const buttons = document.querySelectorAll("#qOptions .quiz-option-btn");
  const qRationale = document.getElementById("qRationale");

  let correct = selectedIndex === q.correctIndex;

  buttons.forEach((b) => {
    const idx = parseInt(b.dataset.index, 10);
    if (idx === q.correctIndex) b.classList.add("correct");
    else if (idx === selectedIndex) b.classList.add("incorrect");
    b.disabled = true;
  });

  answeredMap[currentIndex] = { selectedIndex, correct };

  totalAttempts++;
  if (correct) totalCorrect++;

  if (domainStats[q.domain]) {
    domainStats[q.domain].attempts += 1;
    if (correct) domainStats[q.domain].correct += 1;
  }

  if (sessionMode === "study") {
    qRationale.textContent = q.rationale;
  }

  updateProgressUI();

  if (totalAttempts === sessionQuestions.length) {
    finalizeSession(false);
  }
}

/* UPDATE PROGRESS UI */
function updateProgressUI() {
  const total = sessionQuestions.length;
  const progressFill = document.getElementById("progressFill");
  const progressCountLabel = document.getElementById("progressCountLabel");
  const progressScoreLabel = document.getElementById("progressScoreLabel");
  const metricCorrect = document.getElementById("metricCorrect");
  const metricAttempts = document.getElementById("metricAttempts");

  const progress = total === 0 ? 0 : (totalAttempts / total) * 100;
  const score = totalAttempts === 0 ? 0 : Math.round((totalCorrect / totalAttempts) * 100);

  progressFill.style.width = progress + "%";
  progressCountLabel.textContent = `${totalAttempts} / ${total} answered`;
  progressScoreLabel.textContent = `Score: ${score}%`;
  metricCorrect.textContent = totalCorrect;
  metricAttempts.textContent = totalAttempts;
}

/* NEXT / PREVIOUS */
function nextQuestion() {
  if (!sessionQuestions.length) return;
  if (currentIndex < sessionQuestions.length - 1) {
    currentIndex++;
    renderCurrentQuestion();
  } else if (!sessionComplete && totalAttempts === sessionQuestions.length) {
    finalizeSession(false);
    showSection("results", document.querySelectorAll(".nav-btn")[2]);
  }
}

function prevQuestion() {
  if (!sessionQuestions.length) return;
  if (currentIndex > 0) {
    currentIndex--;
    renderCurrentQuestion();
  }
}

/* FINALIZE SESSION */
function finalizeSession(fromTimer) {
  if (sessionComplete) return;
  sessionComplete = true;
  clearTimer();

  const total = sessionQuestions.length;
  const scorePercent = totalAttempts === 0 ? 0 : Math.round((totalCorrect / totalAttempts) * 100);

  document.getElementById("resultScore").textContent = scorePercent + "%";
  document.getElementById("resultCorrect").textContent = totalCorrect;
  document.getElementById("resultTotal").textContent = total;

  buildDomainRadar();
  renderDomainTable();
  renderRationaleList();

  // Reveal rationales for current question
  renderCurrentQuestion();

  if (!fromTimer) {
    document.getElementById("sessionStatus").textContent =
      "Session complete. Review your results and domain analytics.";
  }
}

/* DOMAIN RADAR */
function buildDomainRadar() {
  const ctx = document.getElementById("domainRadarChart");
  if (!ctx) return;

  const labels = DOMAINS;
  const values = labels.map((d) => {
    const s = domainStats[d];
    if (s.attempts === 0) return 0;
    return Math.round((s.correct / s.attempts) * 100);
  });

  if (domainRadarChart) domainRadarChart.destroy();

  domainRadarChart = new Chart(ctx, {
    type: "radar",
    data: {
      labels,
      datasets: [
        {
          label: "Domain Accuracy %",
          data: values,
          borderColor: "#4cc9f0",
          backgroundColor: "rgba(76, 201, 240, 0.18)",
          borderWidth: 2,
          pointRadius: 3
        }
      ]
    },
    options: {
      plugins: { legend: { labels: { color: "#cfcfcf" } } },
      scales: {
        r: {
          min: 0,
          max: 100,
          angleLines: { color: "rgba(255, 255, 255, 0.12)" },
          grid: { color: "rgba(255, 255, 255, 0.12)" },
          pointLabels: { color: "#cfcfcf" },
          ticks: { display: true, stepSize: 20, color: "#cfcfcf" }
        }
      }
    }
  });
}

/* DOMAIN TABLE */
function renderDomainTable() {
  const tbody = document.getElementById("domainTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  DOMAINS.forEach((d) => {
    const s = domainStats[d];
    const acc = s.attempts === 0 ? "—" : Math.round((s.correct / s.attempts) * 100) + "%";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${d}</td>
      <td>${s.correct}</td>
      <td>${s.attempts}</td>
      <td>${acc}</td>
    `;
    tbody.appendChild(tr);
  });
}

/* RATIONALE LIST */
function renderRationaleList() {
  const container = document.getElementById("rationaleList");
  if (!container) return;
  container.innerHTML = "";

  sessionQuestions.forEach((q, idx) => {
    const answered = answeredMap[idx];
    const status =
      answered && answered.correct === true
        ? "Correct"
        : answered
        ? "Incorrect"
        : "Not answered";

    const div = document.createElement("div");
    div.className = "rationale-item";
    div.innerHTML = `
      <div class="rationale-item-title">Q${idx + 1}: ${q.stem}</div>
      <div class="rationale-item-meta">
        Domain: ${q.domain} • Difficulty: ${q.difficulty} • Type: ${q.type} • Status: ${status}
      </div>
      <div>${q.rationale}</div>
    `;
    container.appendChild(div);
  });
}

/* RESTART SESSION */
function restartSession() {
  sessionQuestions = [];
  sessionMode = "study";
  currentIndex = 0;
  answeredMap = {};
  totalCorrect = 0;
  totalAttempts = 0;
  sessionComplete = false;

  Object.keys(domainStats).forEach((d) => {
    domainStats[d].correct = 0;
    domainStats[d].attempts = 0;
  });

  clearTimer();
  remainingSeconds = 0;
  updateTimerDisplay();

  document.getElementById("sessionStatus").textContent =
    "No active session. Configure options and click Start.";
  document.getElementById("qText").textContent =
    "Start a session to load advanced SHRM‑CP style questions.";
  document.getElementById("qOptions").innerHTML = "";
  document.getElementById("qRationale").textContent = "";
  document.getElementById("qIndexLabel").textContent = "Question —";
  document.getElementById("qDomainLabel").textContent = "Domain: —";
  document.getElementById("qDifficultyLabel").textContent = "Difficulty: —";
  document.getElementById("qTypeLabel").textContent = "Type: —";

  document.getElementById("metricTotal").textContent = "0";
  document.getElementById("metricCorrect").textContent = "0";
  document.getElementById("metricAttempts").textContent = "0";
  document.getElementById("progressFill").style.width = "0%";
  document.getElementById("progressCountLabel").textContent = "0 / 0 answered";
  document.getElementById("progressScoreLabel").textContent = "Score: 0%";

  document.getElementById("resultScore").textContent = "0%";
  document.getElementById("resultCorrect").textContent = "0";
  document.getElementById("resultTotal").textContent = "0";
  document.getElementById("rationaleList").innerHTML = "";

  if (domainRadarChart) {
    domainRadarChart.destroy();
    domainRadarChart = null;
  }

  showSection("study", document.querySelectorAll(".nav-btn")[1]);
}

/* INIT */
document.addEventListener("DOMContentLoaded", () => {
  renderCurrentQuestion();
});