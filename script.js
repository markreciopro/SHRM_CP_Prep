/* ===========================
   GLOBAL STATE & STORAGE
=========================== */
const STORAGE_KEYS = {
  USERS: "hr360_users",
  CURRENT_USER: "hr360_currentUser",
  ANALYTICS: "hr360_analytics",
  GAMIFICATION: "hr360_gamification"
};

const HR360_STATE = {
  users: JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || "{}"),
  currentUser: JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || "null"),
  analytics: JSON.parse(
    localStorage.getItem(STORAGE_KEYS.ANALYTICS) ||
      JSON.stringify({
        sessionsCompleted: 0,
        totalQuestions: 0,
        totalCorrect: 0,
        totalStudySeconds: 0,
        accuracyHistory: [],
        timeHistory: [],
        domainStats: {}
      })
  ),
  gamification: JSON.parse(
    localStorage.getItem(STORAGE_KEYS.GAMIFICATION) ||
      JSON.stringify({
        lifetimeXP: 0,
        level: 1,
        currentXP: 0,
        xpToNext: 100,
        bestStreak: 0,
        dailyStreak: 0,
        lastSessionDate: null,
        achievements: []
      })
  )
};

function saveAnalytics() {
  localStorage.setItem(STORAGE_KEYS.ANALYTICS, JSON.stringify(HR360_STATE.analytics));
}
function saveUsers() {
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(HR360_STATE.users));
}
function saveCurrentUser() {
  localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(HR360_STATE.currentUser));
}
function saveGamification() {
  localStorage.setItem(STORAGE_KEYS.GAMIFICATION, JSON.stringify(HR360_STATE.gamification));
}

/* ===========================
   DEMO SEEDING
=========================== */
function seedDemoAnalyticsIfEmpty() {
  const A = HR360_STATE.analytics;
  if (A.sessionsCompleted > 0 || A.totalQuestions > 0) return;

  A.sessionsCompleted = 4;
  A.totalQuestions = 120;
  A.totalCorrect = 92;
  A.totalStudySeconds = 120 * 65;

  A.accuracyHistory = [68, 74, 79, 82];
  A.timeHistory = [75, 70, 66, 62];

  A.domainStats = {
    People: { seen: 50, correct: 39, totalTime: 50 * 62 },
    Organization: { seen: 40, correct: 30, totalTime: 40 * 68 },
    Workplace: { seen: 30, correct: 23, totalTime: 30 * 66 }
  };

  saveAnalytics();
}

/* ===========================
   NAVIGATION
=========================== */
const navButtons = document.querySelectorAll(".nav-btn");
const sections = document.querySelectorAll(".section");
const jumpButtons = document.querySelectorAll("[data-section-jump]");

function setActiveSection(id) {
  sections.forEach(sec => sec.classList.remove("active"));
  navButtons.forEach(btn => btn.classList.remove("active"));
  const targetSection = document.getElementById(id);
  if (targetSection) targetSection.classList.add("active");
  const navBtn = document.querySelector(`.nav-btn[data-section="${id}"]`);
  if (navBtn) navBtn.classList.add("active");
}

navButtons.forEach(btn => {
  btn.addEventListener("click", () => setActiveSection(btn.getAttribute("data-section")));
});
jumpButtons.forEach(btn => {
  btn.addEventListener("click", () => setActiveSection(btn.getAttribute("data-section-jump")));
});

/* ===========================
   ACCOUNT SYSTEM
=========================== */
const profileStatus = document.getElementById("profileStatus");
const profileMode = document.getElementById("profileMode");

function updateProfileUI() {
  if (HR360_STATE.currentUser) {
    profileStatus.textContent = HR360_STATE.currentUser.email;
    profileMode.textContent = "Signed In · Persistent";
  } else {
    profileStatus.textContent = "Guest";
    profileMode.textContent = "Demo · Persistent";
  }
}
updateProfileUI();

document.getElementById("signupBtn").addEventListener("click", () => {
  const email = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value.trim();
  if (!email || !password) return alert("Enter email and password.");
  if (HR360_STATE.users[email]) return alert("Account already exists.");
  HR360_STATE.users[email] = { email, password };
  HR360_STATE.currentUser = { email };
  saveUsers();
  saveCurrentUser();
  updateProfileUI();
  alert("Account created. You are now logged in (frontend demo).");
});

document.getElementById("loginBtn").addEventListener("click", () => {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value.trim();
  const user = HR360_STATE.users[email];
  if (!user || user.password !== password) return alert("Invalid credentials.");
  HR360_STATE.currentUser = { email };
  saveCurrentUser();
  updateProfileUI();
  alert("Logged in successfully (frontend demo).");
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  HR360_STATE.currentUser = null;
  saveCurrentUser();
  updateProfileUI();
  alert("Logged out.");
});

/* ===========================
   QUESTION BANK (SAMPLE)
=========================== */
const baseQuestionBank = [
  {
    id: 1,
    domain: "People",
    difficulty: "Foundation",
    type: "Knowledge",
    question:
      "Which primary objective best aligns with an effective onboarding program for new hires?",
    options: [
      "Minimize the time managers spend with new employees",
      "Ensure new hires understand culture, expectations, and how their role contributes to business goals",
      "Limit training to only mandatory compliance topics",
      "Allow new hires to self-direct their first weeks with minimal structure"
    ],
    correctIndex: 1,
    rationale:
      "Effective onboarding connects new hires to culture, expectations, and business goals."
  },
  {
    id: 2,
    domain: "Organization",
    difficulty: "Intermediate",
    type: "Scenario",
    question:
      "HR is implementing a new HRIS. What is the most strategic first step to ensure adoption?",
    options: [
      "Train employees after go-live",
      "Select the system with the most features",
      "Conduct a stakeholder needs and process analysis",
      "Announce the change via email only"
    ],
    correctIndex: 2,
    rationale:
      "A stakeholder needs and process analysis ensures the system aligns with real workflows."
  },
  {
    id: 3,
    domain: "Workplace",
    difficulty: "Advanced",
    type: "Scenario",
    question:
      "An employee reports subtle but repeated exclusion from key meetings. What is the best HR response?",
    options: [
      "Advise the employee to ignore the behavior",
      "Immediately terminate the manager",
      "Investigate for potential discrimination and review inclusion practices",
      "Ask the employee to switch teams"
    ],
    correctIndex: 2,
    rationale:
      "Subtle exclusion can signal discrimination or culture issues; HR should investigate."
  }
];

const questionBank = window.SHRM_QUESTION_BANK || baseQuestionBank;

/* ===========================
   EXAM SESSION STATE
=========================== */
let sessionQuestions = [];
let currentIndex = 0;
let answeredCount = 0;
let correctCount = 0;
let timerInterval = null;
let timerSeconds = 0;
let selectedOptionIndex = null;
let sessionActive = false;
let questionStartTime = null;
let sessionXP = 0;
let currentStreak = 0;
const domainStatsSession = {};

/* ===========================
   TIMER
=========================== */
function startTimer() {
  clearInterval(timerInterval);
  timerSeconds = 0;
  timerInterval = setInterval(() => {
    timerSeconds++;
    const mins = String(Math.floor(timerSeconds / 60)).padStart(2, "0");
    const secs = String(timerSeconds % 60).padStart(2, "0");
    document.getElementById("timerDisplay").textContent = `${mins}:${secs}`;
  }, 1000);
}
function stopTimer() {
  clearInterval(timerInterval);
}

/* ===========================
   GAMIFICATION ENGINE
=========================== */
const ringCircle = document.querySelector(".progress-ring-value");
const ringRadius = 28;
const ringCircumference = 2 * Math.PI * ringRadius;

function xpRequiredForLevel(level) {
  // Exponential progression (P2)
  if (level <= 1) return 100;
  return Math.round(100 * Math.pow(1.6, level - 1));
}

function recalcXPThresholds() {
  const G = HR360_STATE.gamification;
  G.xpToNext = xpRequiredForLevel(G.level);
}

function addXP(amount) {
  const G = HR360_STATE.gamification;
  G.lifetimeXP += amount;
  G.currentXP += amount;

  let leveledUp = false;
  while (G.currentXP >= G.xpToNext) {
    G.currentXP -= G.xpToNext;
    G.level++;
    recalcXPThresholds();
    leveledUp = true;
  }

  saveGamification();
  updateGamificationUI(leveledUp, amount);
}

function updateGamificationUI(leveledUp = false, lastXP = 0) {
  const G = HR360_STATE.gamification;

  // Progress ring
  const progress = G.currentXP / G.xpToNext;
  const offset = ringCircumference * (1 - progress);
  ringCircle.style.strokeDasharray = `${ringCircumference}`;
  ringCircle.style.strokeDashoffset = offset;

  document.getElementById("overlayLevel").textContent = `Lv ${G.level}`;
  document.getElementById(
    "overlayXPLabel"
  ).textContent = `${G.currentXP} / ${G.xpToNext} XP`;

  document.getElementById("overlayStreakValue").textContent = currentStreak;
  document.getElementById("kpiLifetimeXP").textContent = G.lifetimeXP;
  document.getElementById("kpiLevel").textContent = G.level;
  document.getElementById("kpiBestStreak").textContent = G.bestStreak;

  document.getElementById("heroLifetimeXP").textContent = G.lifetimeXP;
  document.getElementById("heroLevel").textContent = G.level;
  document.getElementById("heroBestStreak").textContent = G.bestStreak;

  // XP burst overlay
  if (lastXP > 0) {
    const burst = document.getElementById("overlayXPBurst");
    burst.textContent = `+${lastXP} XP`;
    burst.classList.add("visible");
    setTimeout(() => burst.classList.remove("visible"), 900);
  }

  // Level-up toast
  if (leveledUp) {
    showToast(`Level up! You reached Level ${G.level}.`);
  }
}

function showToast(message) {
  const toast = document.getElementById("overlayToast");
  toast.textContent = message;
  toast.classList.add("visible");
  setTimeout(() => toast.classList.remove("visible"), 2200);
}

function updateStreak(isCorrect) {
  const G = HR360_STATE.gamification;
  if (isCorrect) {
    currentStreak++;
    if (currentStreak > G.bestStreak) {
      G.bestStreak = currentStreak;
      saveGamification();
      showToast(`New best streak: ${G.bestStreak}!`);
    }
  } else {
    currentStreak = 0;
  }
  updateGamificationUI(false, 0);
}

/* Dynamic XP rewards (R2) */
function calculateXPReward(question, isCorrect, elapsedSeconds) {
  let base = 0;
  if (isCorrect) {
    if (question.difficulty === "Foundation") base = 15;
    else if (question.difficulty === "Intermediate") base = 25;
    else if (question.difficulty === "Advanced") base = 40;
    else base = 20;
  } else {
    base = 5;
  }

  // Speed bonus
  let speedBonus = 0;
  if (isCorrect) {
    if (elapsedSeconds <= 40) speedBonus = 10;
    else if (elapsedSeconds <= 70) speedBonus = 5;
  }

  // Streak bonus
  let streakBonus = 0;
  if (isCorrect && currentStreak > 0) {
    if (currentStreak >= 10) streakBonus = 20;
    else if (currentStreak >= 5) streakBonus = 10;
    else streakBonus = 5;
  }

  return base + speedBonus + streakBonus;
}

/* Confetti (subtle) */
const confettiCanvas = document.getElementById("confettiCanvas");
const confettiCtx = confettiCanvas.getContext("2d");
let confettiPieces = [];
let confettiActive = false;

function resizeConfetti() {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}
resizeConfetti();
window.addEventListener("resize", resizeConfetti);

function launchConfetti() {
  confettiPieces = [];
  const count = 80;
  for (let i = 0; i < count; i++) {
    confettiPieces.push({
      x: Math.random() * confettiCanvas.width,
      y: Math.random() * -confettiCanvas.height,
      size: 4 + Math.random() * 4,
      speedY: 1 + Math.random() * 2,
      color: Math.random() > 0.5 ? "#4CC9F0" : "#3A6EA5"
    });
  }
  confettiActive = true;
  requestAnimationFrame(drawConfetti);
  setTimeout(() => (confettiActive = false), 1500);
}

function drawConfetti() {
  if (!confettiActive) return;
  confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  confettiPieces.forEach(p => {
    p.y += p.speedY;
    if (p.y > confettiCanvas.height) p.y = -10;
    confettiCtx.fillStyle = p.color;
    confettiCtx.fillRect(p.x, p.y, p.size, p.size);
  });
  requestAnimationFrame(drawConfetti);
}

/* ===========================
   START EXAM
=========================== */
document.getElementById("startExamBtn").addEventListener("click", startExamSession);

function startExamSession() {
  const length = Math.max(
    5,
    Math.min(160, parseInt(document.getElementById("configLength").value, 10) || 10)
  );
  const domain = document.getElementById("configDomain").value;
  const difficulty = document.getElementById("configDifficulty").value;

  let filtered = questionBank;
  if (domain !== "All") filtered = filtered.filter(q => q.domain === domain);
  if (difficulty !== "Mixed") filtered = filtered.filter(q => q.difficulty === difficulty);
  const pool = filtered.length ? filtered : questionBank;

  sessionQuestions = [];
  for (let i = 0; i < length; i++) {
    sessionQuestions.push(pool[i % pool.length]);
  }

  currentIndex = 0;
  answeredCount = 0;
  correctCount = 0;
  selectedOptionIndex = null;
  sessionActive = true;
  sessionXP = 0;
  currentStreak = 0;
  Object.keys(domainStatsSession).forEach(k => delete domainStatsSession[k]);

  document.getElementById("quizCard").style.display = "block";
  document.getElementById("quizRationale").style.display = "none";
  document.getElementById("metricAnswered").textContent = "0";
  document.getElementById("metricCorrect").textContent = "0";
  document.getElementById("metricAccuracy").textContent = "0%";
  document.getElementById("metricSessionXP").textContent = "0";
  document.getElementById("scoreLabel").textContent = "";

  renderCurrentQuestion();
  startTimer();
}

/* ===========================
   RENDER QUESTION
=========================== */
function renderCurrentQuestion() {
  const q = sessionQuestions[currentIndex];
  if (!q) return;

  document.getElementById("pillDomain").textContent = q.domain;
  document.getElementById("pillDifficulty").textContent = q.difficulty;
  document.getElementById("pillType").textContent = q.type;

  document.getElementById("quizQuestionText").textContent = q.question;
  const quizOptions = document.getElementById("quizOptions");
  quizOptions.innerHTML = "";
  selectedOptionIndex = null;

  q.options.forEach((opt, idx) => {
    const btn = document.createElement("button");
    btn.className = "quiz-option-btn";
    btn.textContent = opt;
    btn.addEventListener("click", () => {
      if (!sessionActive) return;
      document.querySelectorAll(".quiz-option-btn").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      selectedOptionIndex = idx;
    });
    quizOptions.appendChild(btn);
  });

  document.getElementById("progressLabel").textContent =
    `Question ${currentIndex + 1} of ${sessionQuestions.length}`;
  document.getElementById("progressFill").style.width =
    `${(currentIndex / sessionQuestions.length) * 100}%`;

  questionStartTime = performance.now();
}

/* ===========================
   SUBMIT / SKIP
=========================== */
document.getElementById("submitBtn").addEventListener("click", handleSubmit);
document.getElementById("skipBtn").addEventListener("click", handleSkip);

function handleSubmit() {
  if (!sessionActive) return;
  const q = sessionQuestions[currentIndex];
  if (!q) return;
  if (selectedOptionIndex === null) return alert("Select an option or skip.");

  const elapsed = Math.round((performance.now() - questionStartTime) / 1000);

  if (!domainStatsSession[q.domain]) {
    domainStatsSession[q.domain] = { seen: 0, correct: 0, totalTime: 0 };
  }
  domainStatsSession[q.domain].seen++;
  domainStatsSession[q.domain].totalTime += elapsed;

  answeredCount++;
  document.getElementById("metricAnswered").textContent = answeredCount;

  const optionButtons = document.querySelectorAll(".quiz-option-btn");
  optionButtons.forEach((btn, idx) => {
    if (idx === q.correctIndex) btn.classList.add("correct");
    if (idx === selectedOptionIndex && idx !== q.correctIndex) btn.classList.add("incorrect");
    btn.classList.remove("selected");
  });

  const isCorrect = selectedOptionIndex === q.correctIndex;
  if (isCorrect) {
    correctCount++;
    document.getElementById("metricCorrect").textContent = correctCount;
    domainStatsSession[q.domain].correct++;
  }

  const accuracy = Math.round((correctCount / answeredCount) * 100);
  document.getElementById("metricAccuracy").textContent = `${accuracy}%`;
  document.getElementById("scoreLabel").textContent = `Score: ${accuracy}%`;

  const rationaleBox = document.getElementById("quizRationale");
  rationaleBox.style.display = "block";
  rationaleBox.textContent = q.rationale;

  const log = document.getElementById("rationaleList");
  const entry = document.createElement("div");
  entry.className = "hint small";
  entry.textContent = `Q${currentIndex + 1} (${q.domain}): ${q.rationale}`;
  log.appendChild(entry);

  // Gamification: streak + XP
  updateStreak(isCorrect);
  const xpGain = calculateXPReward(q, isCorrect, elapsed);
  sessionXP += xpGain;
  document.getElementById("metricSessionXP").textContent = sessionXP;
  addXP(xpGain);

  setTimeout(() => goToNextQuestion(), 900);
}

function handleSkip() {
  if (!sessionActive) return;
  currentStreak = 0;
  updateGamificationUI(false, 0);
  goToNextQuestion();
}

function goToNextQuestion() {
  currentIndex++;
  if (currentIndex >= sessionQuestions.length) return endSession();
  renderCurrentQuestion();
}

/* ===========================
   END SESSION
=========================== */
function endSession() {
  sessionActive = false;
  stopTimer();

  const sessionAccuracy = correctCount / (answeredCount || 1);
  const avgTime = timerSeconds / (answeredCount || 1);

  const A = HR360_STATE.analytics;
  A.sessionsCompleted++;
  A.totalQuestions += answeredCount;
  A.totalCorrect += correctCount;
  A.totalStudySeconds += timerSeconds;
  A.accuracyHistory.push(Math.round(sessionAccuracy * 100));
  A.timeHistory.push(Math.round(avgTime));

  for (const d in domainStatsSession) {
    if (!A.domainStats[d]) A.domainStats[d] = { seen: 0, correct: 0, totalTime: 0 };
    A.domainStats[d].seen += domainStatsSession[d].seen;
    A.domainStats[d].correct += domainStatsSession[d].correct;
    A.domainStats[d].totalTime += domainStatsSession[d].totalTime;
  }

  saveAnalytics();
  updateDashboard();
  updateReviewAnalytics();

  document.getElementById("quizQuestionText").textContent =
    "Session complete. Review your analytics and XP to plan your next focused block.";
  document.getElementById("quizOptions").innerHTML = "";
  document.getElementById("quizRationale").style.display = "none";

  launchConfetti();
  showToast(`Session complete! You earned ${sessionXP} XP.`);
}

/* ===========================
   DASHBOARD + REVIEW
=========================== */
function updateDashboard() {
  const A = HR360_STATE.analytics;
  const G = HR360_STATE.gamification;

  document.getElementById("kpiSessions").textContent = A.sessionsCompleted;
  document.getElementById("kpiLifetimeXP").textContent = G.lifetimeXP;
  document.getElementById("kpiLevel").textContent = G.level;
  document.getElementById("kpiBestStreak").textContent = G.bestStreak;

  document.getElementById("heroLifetimeXP").textContent = G.lifetimeXP;
  document.getElementById("heroLevel").textContent = G.level;
  document.getElementById("heroBestStreak").textContent = G.bestStreak;

  renderAccuracyTrend();
  renderBellCurve();
  renderRadarChart();
  renderTimeHistogram();
  renderDomainHeatmap();
  renderInsights();
}

function updateReviewAnalytics() {
  const A = HR360_STATE.analytics;
  const tbody = document.getElementById("domainHeatmapBody");
  tbody.innerHTML = "";
  const domains = Object.keys(A.domainStats);
  if (!domains.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="hint small">No data yet.</td></tr>`;
    return;
  }

  domains.forEach(domain => {
    const s = A.domainStats[domain];
    const acc = s.seen ? Math.round((s.correct / s.seen) * 100) : 0;
    const avgTime = s.seen ? Math.round(s.totalTime / s.seen) : 0;
    let heatClass = "heat-medium";
    if (acc >= 80) heatClass = "heat-good";
    else if (acc < 60) heatClass = "heat-bad";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${domain}</td>
      <td class="${heatClass}">${acc}%</td>
      <td>${s.seen}</td>
      <td>${avgTime}s</td>
    `;
    tbody.appendChild(tr);
  });

  const overallAcc = A.totalQuestions ? A.totalCorrect / A.totalQuestions : 0;
  const coverage = Math.min(1, domains.length / 3);
  const passProb = Math.round(overallAcc * coverage * 100);
  document.getElementById("metricPassProb").textContent = `${passProb}%`;

  const avgTimeOverall = A.totalQuestions
    ? Math.round(A.totalStudySeconds / A.totalQuestions)
    : 0;
  document.getElementById("metricAvgTime").textContent = `${avgTimeOverall}s`;

  const studyList = document.getElementById("studyPathList");
  studyList.innerHTML = "";
  const sorted = domains
    .map(d => {
      const s = A.domainStats[d];
      return { domain: d, acc: s.correct / s.seen, seen: s.seen };
    })
    .sort((a, b) => a.acc - b.acc);

  sorted.forEach((entry, idx) => {
    const li = document.createElement("li");
    const pct = Math.round(entry.acc * 100);
    let label = pct < 60 ? "Critical focus" : pct < 80 ? "Needs reinforcement" : "Maintain strength";
    li.textContent = `${idx + 1}. ${entry.domain} — ${label} (${pct}% over ${entry.seen} questions)`;
    studyList.appendChild(li);
  });
}

/* ===========================
   CHART.JS THEME
=========================== */
Chart.defaults.color = "#e5e5e5";
Chart.defaults.borderColor = "rgba(255,255,255,0.08)";

let accuracyTrendChart = null;
let bellCurveChart = null;
let radarChart = null;
let timeHistogramChart = null;

/* ACCURACY TREND */
function renderAccuracyTrend() {
  const ctx = document.getElementById("accuracyTrendChart");
  const A = HR360_STATE.analytics;
  if (!ctx) return;
  if (accuracyTrendChart) accuracyTrendChart.destroy();

  const labels = A.accuracyHistory.map((_, i) => `S${i + 1}`);
  accuracyTrendChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Accuracy %",
          data: A.accuracyHistory,
          borderColor: "#4CC9F0",
          backgroundColor: "rgba(76,201,240,0.18)",
          tension: 0.3,
          fill: true
        }
      ]
    },
    options: {
      scales: {
        y: { min: 0, max: 100, ticks: { stepSize: 20 } }
      },
      plugins: { legend: { display: false } }
    }
  });
}

/* BELL CURVE (SIMPLIFIED) */
function renderBellCurve() {
  const ctx = document.getElementById("bellCurveChart");
  const A = HR360_STATE.analytics;
  if (!ctx) return;
  if (bellCurveChart) bellCurveChart.destroy();

  const mean =
    A.accuracyHistory.length
      ? A.accuracyHistory.reduce((a, b) => a + b, 0) / A.accuracyHistory.length
      : 70;
  const stdDev = 10;
  const xs = [];
  const ys = [];
  for (let x = 40; x <= 100; x += 2) {
    xs.push(x);
    const exponent = -0.5 * Math.pow((x - mean) / stdDev, 2);
    ys.push(Math.exp(exponent));
  }

  bellCurveChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: xs,
      datasets: [
        {
          label: "Relative probability",
          data: ys,
          borderColor: "#3A6EA5",
          backgroundColor: "rgba(58,110,165,0.18)",
          tension: 0.3,
          fill: true
        }
      ]
    },
    options: {
      scales: {
        x: { title: { display: true, text: "Score %" } },
        y: { display: false }
      },
      plugins: { legend: { display: false } }
    }
  });
}

/* RADAR CHART */
function renderRadarChart() {
  const ctx = document.getElementById("radarChart");
  const A = HR360_STATE.analytics;
  if (!ctx) return;
  if (radarChart) radarChart.destroy();

  const domains = Object.keys(A.domainStats);
  if (!domains.length) {
    radarChart = new Chart(ctx, {
      type: "radar",
      data: {
        labels: ["People", "Organization", "Workplace"],
        datasets: [
          {
            label: "Accuracy %",
            data: [60, 70, 65],
            borderColor: "#4CC9F0",
            backgroundColor: "rgba(76,201,240,0.18)"
          }
        ]
      },
      options: { plugins: { legend: { display: false } } }
    });
    return;
  }

  const data = domains.map(d => {
    const s = A.domainStats[d];
    return s.seen ? Math.round((s.correct / s.seen) * 100) : 0;
  });

  radarChart = new Chart(ctx, {
    type: "radar",
    data: {
      labels: domains,
      datasets: [
        {
          label: "Accuracy %",
          data,
          borderColor: "#4CC9F0",
          backgroundColor: "rgba(76,201,240,0.18)"
        }
      ]
    },
    options: { plugins: { legend: { display: false } } }
  });
}

/* TIME HISTOGRAM */
function renderTimeHistogram() {
  const ctx = document.getElementById("timeHistogramChart");
  const A = HR360_STATE.analytics;
  if (!ctx) return;
  if (timeHistogramChart) timeHistogramChart.destroy();

  const data = A.timeHistory.length ? A.timeHistory : [80, 75, 70, 65, 60, 55];
  const labels = data.map((_, i) => `S${i + 1}`);

  timeHistogramChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Avg seconds / question",
          data,
          backgroundColor: "rgba(58,110,165,0.7)"
        }
      ]
    },
    options: {
      plugins: { legend: { display: false } }
    }
  });
}

/* DOMAIN HEATMAP (CANVAS) */
function renderDomainHeatmap() {
  const canvas = document.getElementById("domainHeatmapCanvas");
  const A = HR360_STATE.analytics;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const domains = Object.keys(A.domainStats);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!domains.length) {
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "12px Inter, sans-serif";
    ctx.fillText("Domain heatmap will appear as you complete sessions.", 20, 40);
    return;
  }

  const width = canvas.width;
  const height = canvas.height;
  const cellWidth = width / domains.length;
  const cellHeight = height * 0.6;

  domains.forEach((domain, i) => {
    const s = A.domainStats[domain];
    const acc = s.seen ? s.correct / s.seen : 0;
    let color;
    if (acc >= 0.8) color = "#00e676";
    else if (acc >= 0.6) color = "#ffeb3b";
    else color = "#e53935";

    const x = i * cellWidth;
    const y = (height - cellHeight) / 2;

    ctx.fillStyle = color;
    ctx.fillRect(x + 4, y, cellWidth - 8, cellHeight);

    ctx.fillStyle = "#ffffff";
    ctx.font = "12px Inter, sans-serif";
    ctx.fillText(domain, x + 10, y + cellHeight + 16);
    ctx.fillText(`${Math.round(acc * 100)}%`, x + 10, y + 18);
  });
}

/* INSIGHTS */
function renderInsights() {
  const A = HR360_STATE.analytics;
  const list = document.getElementById("insightsList");
  list.innerHTML = "";

  const overallAcc = A.totalQuestions ? Math.round((A.totalCorrect / A.totalQuestions) * 100) : 0;
  const avgTime = A.totalQuestions
    ? Math.round(A.totalStudySeconds / A.totalQuestions)
    : 0;

  const li1 = document.createElement("li");
  li1.textContent = `Overall accuracy is ${overallAcc}%. Aim for 75–80%+ before exam day.`;
  list.appendChild(li1);

  const li2 = document.createElement("li");
  li2.textContent = `Average time per question is ${avgTime}s. Target 60–75 seconds per item.`;
  list.appendChild(li2);

  const domains = Object.keys(A.domainStats);
  if (domains.length) {
    const weakest = domains
      .map(d => {
        const s = A.domainStats[d];
        return { domain: d, acc: s.correct / s.seen };
      })
      .sort((a, b) => a.acc - b.acc)[0];

    const li3 = document.createElement("li");
    li3.textContent = `Current weakest domain: ${weakest.domain} (~${Math.round(
      weakest.acc * 100
    )}%). Schedule extra practice here this week.`;
    list.appendChild(li3);
  } else {
    const li3 = document.createElement("li");
    li3.textContent = "Complete at least one session to unlock domain-level insights.";
    list.appendChild(li3);
  }
}

/* ===========================
   INIT
=========================== */
document.addEventListener("DOMContentLoaded", () => {
  seedDemoAnalyticsIfEmpty();
  recalcXPThresholds();
  updateGamificationUI(false, 0);
  updateDashboard();
  updateReviewAnalytics();
});