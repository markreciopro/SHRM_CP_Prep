/* ============================================================
   MAREC HR360 — script.js
   Dual-table API: lightning_questions + shrm_cp_prep
============================================================ */

const API_BASE = "http://127.0.0.1:8000";

/* ── STORAGE KEYS ── */
const SK = {
  USERS: "hr360_users",
  USER:  "hr360_currentUser",
  ANA:   "hr360_analytics",
  GAME:  "hr360_gamification"
};

/* ── GLOBAL STATE ── */
const STATE = {
  users:       JSON.parse(localStorage.getItem(SK.USERS) || "{}"),
  currentUser: JSON.parse(localStorage.getItem(SK.USER)  || "null"),
  analytics:   JSON.parse(localStorage.getItem(SK.ANA)   || JSON.stringify({
    sessionsCompleted:0,
    totalQuestions:0,
    totalCorrect:0,
    totalStudySeconds:0,
    accuracyHistory:[],
    timeHistory:[],
    domainStats:{}
  })),
  gamification: JSON.parse(localStorage.getItem(SK.GAME) || JSON.stringify({
    lifetimeXP:0,
    level:1,
    currentXP:0,
    xpToNext:100,
    bestStreak:0,
    dailyStreak:0,
    lastSessionDate:null,
    achievements:[]
  }))
};

const save = {
  ana:   () => localStorage.setItem(SK.ANA,   JSON.stringify(STATE.analytics)),
  users: () => localStorage.setItem(SK.USERS, JSON.stringify(STATE.users)),
  user:  () => localStorage.setItem(SK.USER,  JSON.stringify(STATE.currentUser)),
  game:  () => localStorage.setItem(SK.GAME,  JSON.stringify(STATE.gamification))
};

/* ============================================================
   OPTION PARSER (PostgreSQL array literal)
============================================================ */

function parseOptions(raw) {
  if (!raw) return [];
  const s = raw.trim().replace(/^\{/, "").replace(/\}$/, "");
  const results = [];
  let current = "";
  let inQuote  = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '"') { inQuote = !inQuote; continue; }
    if (ch === "," && !inQuote) {
      results.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) results.push(current.trim());
  return results;
}

/* ============================================================
   NORMALIZE API QUESTIONS
============================================================ */
/*
 lightning_questions schema:
   id, domain, difficulty, qtype, question, options, answer (0-based), rationale
 shrm_cp_prep schema:
   id, question_id, question_text, options, correct_answer_index (0-based),
   rationale, domain, competency, is_situational, created_at
*/

function normalizeQuestion(raw, source) {
  let q, correctIndex, options, type, competency;

  if (source === "lightning_questions") {
    options      = parseOptions(raw.options);
    correctIndex = typeof raw.answer === "number" ? raw.answer : parseInt(raw.answer, 10);
    type         = raw.qtype || "Lightning";
    competency   = null;
    q            = raw.question || "";
  } else {
    // shrm_cp_prep
    options      = parseOptions(raw.options);
    correctIndex = typeof raw.correct_answer_index === "number"
      ? raw.correct_answer_index
      : parseInt(raw.correct_answer_index, 10);
    type         = raw.is_situational === true || raw.is_situational === "true"
      ? "Scenario"
      : "Knowledge";
    competency   = raw.competency || null;
    q            = raw.question_text || raw.question || "";
  }

  // Safety clamp
  if (isNaN(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
    correctIndex = 0;
  }

  return {
    id:           raw.id,
    source,
    domain:       raw.domain    || "General",
    difficulty:   raw.difficulty|| "Intermediate",
    type,
    competency,
    question:     q,
    options,
    correctIndex,
    rationale:    raw.rationale || ""
  };
}

/* ============================================================
   API FETCH HELPERS
============================================================ */

async function fetchFromEndpoint(endpoint, params = {}) {
  const url = new URL(`${API_BASE}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v && v !== "All" && v !== "Mixed") url.searchParams.set(k, v);
  });
  const res = await fetch(url.toString(), {
    headers: { "Content-Type": "application/json" }
  });
  if (!res.ok) throw new Error(`${endpoint} → HTTP ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : (data.questions ?? data.items ?? data.data ?? []);
}

async function fetchQuestionsFromAPI({ source, domain, difficulty, limit } = {}) {
  showLoading(true, "Loading questions from database…");

  const filterParams = {
    domain,
    difficulty,
    limit: limit ? String(limit) : undefined
  };

  try {
    let combined = [];

    if (source === "both" || source === "shrm_cp_prep") {
      const raw = await fetchFromEndpoint("/questions/", filterParams);
      combined = combined.concat(raw.map(q => normalizeQuestion(q, "shrm_cp_prep")));
    }

    if (source === "both" || source === "lightning_questions") {
      let raw = [];
      try {
        raw = await fetchFromEndpoint("/lightning_questions/", filterParams);
      } catch (_) {
        raw = await fetchFromEndpoint("/lightning/", filterParams);
      }
      combined = combined.concat(raw.map(q => normalizeQuestion(q, "lightning_questions")));
    }

    // Client-side filter safety net
    if (domain && domain !== "All") combined = combined.filter(q => q.domain === domain);
    if (difficulty && difficulty !== "Mixed") combined = combined.filter(q => q.difficulty === difficulty);

    if (!combined.length) {
      showAPIStatus("warning", "No questions match the selected filters. Try broadening your selection.");
      return getFallback(source);
    }

    // Shuffle
    for (let i = combined.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [combined[i], combined[j]] = [combined[j], combined[i]];
    }

    setBadge("connected");
    showAPIStatus("success", `Loaded ${combined.length} questions from database.`);
    return combined;

  } catch (err) {
    console.error("[HR360] API error:", err);
    setBadge("error");
    showAPIStatus("error", `Cannot reach backend (${err.message}). Using local fallback.`);
    return getFallback(source);
  } finally {
    showLoading(false);
  }
}

async function probeAPI() {
  try {
    const res = await fetch(`${API_BASE}/questions/?limit=1`);
    setBadge(res.ok ? "connected" : "error");
  } catch {
    setBadge("error");
  }
}

/* ============================================================
   UI HELPERS
============================================================ */

function showLoading(on, text = "") {
  const el = document.getElementById("apiLoadingIndicator");
  if (!el) return;
  el.style.display = on ? "flex" : "none";
  const txt = document.getElementById("apiLoadingText");
  if (txt && text) txt.textContent = text;
}

function showAPIStatus(type, msg) {
  const el = document.getElementById("apiStatusMsg");
  if (!el) return;
  el.textContent = msg;
  el.className = `api-status-msg api-status-${type}`;
  el.style.display = "block";
  if (type === "success") {
    setTimeout(() => { el.style.display = "none"; }, 3000);
  }
}

/* Connection badge is virtual in this layout; kept for extensibility. */
function setBadge(_status) {
  // No explicit badge element in this layout.
}

/* ============================================================
   FALLBACK QUESTIONS
============================================================ */

function getFallback(source) {
  const both = [
    {
      id:1, source:"lightning_questions", domain:"People", difficulty:"Intermediate", type:"Lightning", competency:null,
      question:"A high rating in all categories due to one specific positive trait is called:",
      options:["Leniency Error","Halo Effect","Central Tendency","Horn Effect"],
      correctIndex:1,
      rationale:"The Halo Effect occurs when a positive impression in one area biases all other ratings."
    },
    {
      id:2, source:"lightning_questions", domain:"Workplace", difficulty:"Advanced", type:"Lightning", competency:null,
      question:"The total value of all pay and benefits provided to an employee is:",
      options:["Direct Compensation","Total Rewards","Base Salary","Indirect Pay"],
      correctIndex:1,
      rationale:"Total Rewards encompasses all value resulting from the employment relationship."
    },
    {
      id:3, source:"shrm_cp_prep", domain:"Business", difficulty:"Intermediate", type:"Scenario", competency:"Analytical Aptitude",
      question:"A company faces high turnover in the first 90 days. Which HR intervention best demonstrates Analytical Aptitude?",
      options:[
        "Increase starting salary by 10%.",
        "Correlate onboarding feedback with turnover data.",
        "Mandate fun Fridays.",
        "Hire a recruiter."
      ],
      correctIndex:1,
      rationale:"Analytical Aptitude means using data to find root causes before applying solutions."
    },
    {
      id:4, source:"shrm_cp_prep", domain:"Leadership", difficulty:"Advanced", type:"Scenario", competency:"Leadership & Navigation",
      question:"An HR leader must handle a department head refusing to implement a new DEI initiative. Best approach:",
      options:[
        "Ignore to avoid conflict.",
        "Report to CEO immediately.",
        "Meet to understand concerns and align goals.",
        "Force a compliance signature."
      ],
      correctIndex:2,
      rationale:"Leadership & Navigation requires influencing through consultation and alignment."
    }
  ];
  if (source === "lightning_questions") return both.filter(q => q.source === "lightning_questions");
  if (source === "shrm_cp_prep")        return both.filter(q => q.source === "shrm_cp_prep");
  return both;
}

/* ============================================================
   NAVIGATION (TOP BAR + JUMPS)
============================================================ */

document.querySelectorAll(".nav-link").forEach(btn => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.section;
    if (!target) return;
    document.querySelectorAll(".nav-link").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".app-section").forEach(s => s.classList.remove("active"));
    document.getElementById(target)?.classList.add("active");
  });
});

document.querySelectorAll("[data-section-jump]").forEach(btn => {
  btn.addEventListener("click", () => {
    const id = btn.dataset.sectionJump;
    if (!id) return;
    document.querySelectorAll(".app-section").forEach(s => s.classList.remove("active"));
    document.getElementById(id)?.classList.add("active");
    document.querySelectorAll(".nav-link").forEach(b => {
      b.classList.toggle("active", b.dataset.section === id);
    });
  });
});

/* ============================================================
   SOURCE TOGGLE
============================================================ */

let activeSource = "both";
document.querySelectorAll(".source-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".source-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    activeSource = btn.dataset.source;
  });
});

/* ============================================================
   ACCOUNT / PROFILE
============================================================ */

function updateProfileUI() {
  const u = STATE.currentUser;
  const status = document.getElementById("profileStatus");
  const mode   = document.getElementById("profileMode");
  if (status) status.textContent = u ? u.email : "Guest";
  if (mode)   mode.textContent   = u ? "Signed In · Persistent" : "Demo · Persistent";
}

const signupBtn = document.getElementById("signupBtn");
if (signupBtn) {
  signupBtn.addEventListener("click", () => {
    const email = document.getElementById("signupEmail").value.trim();
    const pass  = document.getElementById("signupPassword").value.trim();
    if (!email || !pass) return alert("Enter email and password.");
    if (STATE.users[email]) return alert("Account already exists.");
    STATE.users[email] = { email, pass };
    STATE.currentUser = { email };
    save.users(); save.user();
    updateProfileUI();
    alert("Account created and logged in.");
  });
}

const loginBtn = document.getElementById("loginBtn");
if (loginBtn) {
  loginBtn.addEventListener("click", () => {
    const email = document.getElementById("loginEmail").value.trim();
    const pass  = document.getElementById("loginPassword").value.trim();
    if (!STATE.users[email] || STATE.users[email].pass !== pass) return alert("Invalid credentials.");
    STATE.currentUser = { email };
    save.user();
    updateProfileUI();
    alert("Logged in.");
  });
}

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    STATE.currentUser = null;
    save.user();
    updateProfileUI();
    alert("Logged out.");
  });
}

/* ============================================================
   GAMIFICATION
============================================================ */

const ringCircle     = document.querySelector(".progress-ring-value");
const RING_RADIUS    = 28;
const RING_CIRC      = 2 * Math.PI * RING_RADIUS;
let   currentStreak  = 0;

function xpForLevel(l) {
  return Math.round(100 * Math.pow(1.6, Math.max(l - 1, 0)));
}

function recalcXP() {
  STATE.gamification.xpToNext = xpForLevel(STATE.gamification.level);
}

function addXP(amount) {
  const G = STATE.gamification;
  G.lifetimeXP += amount;
  G.currentXP  += amount;
  let leveled = false;
  while (G.currentXP >= G.xpToNext) {
    G.currentXP -= G.xpToNext;
    G.level++;
    recalcXP();
    leveled = true;
  }
  save.game();
  updateGameUI(leveled, amount);
}

function updateGameUI(leveled = false, lastXP = 0) {
  const G = STATE.gamification;
  const offset = RING_CIRC * (1 - G.currentXP / G.xpToNext);
  if (ringCircle) {
    ringCircle.style.strokeDasharray  = `${RING_CIRC}`;
    ringCircle.style.strokeDashoffset = offset;
  }

  const setText = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.textContent = v;
  };

  setText("overlayLevel",       `Lv ${G.level}`);
  setText("overlayXPLabel",     `${G.currentXP}/${G.xpToNext} XP`);
  setText("overlayStreakValue", currentStreak);
  setText("kpiLifetimeXP",      G.lifetimeXP);
  setText("kpiLevel",           G.level);
  setText("kpiBestStreak",      G.bestStreak);

  const heroLifetime = document.getElementById("heroLifetimeXP");
  if (heroLifetime) heroLifetime.textContent = G.lifetimeXP;
  const heroLevel = document.getElementById("heroLevel");
  if (heroLevel) heroLevel.textContent = G.level;
  const heroBest = document.getElementById("heroBestStreak");
  if (heroBest) heroBest.textContent = G.bestStreak;

  if (lastXP > 0) {
    const burst = document.getElementById("overlayXPBurst");
    if (burst) {
      burst.textContent = `+${lastXP} XP`;
      burst.classList.add("visible");
      setTimeout(() => burst.classList.remove("visible"), 950);
    }
  }
  if (leveled) showToast(`Level up! You reached Level ${G.level}.`);
}

function showToast(msg) {
  const t = document.getElementById("overlayToast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("visible");
  setTimeout(() => t.classList.remove("visible"), 2300);
}

function updateStreak(correct) {
  const G = STATE.gamification;
  if (correct) {
    currentStreak++;
    if (currentStreak > G.bestStreak) {
      G.bestStreak = currentStreak;
      save.game();
      showToast(`New best streak: ${G.bestStreak}!`);
    }
  } else {
    currentStreak = 0;
  }
  updateGameUI(false, 0);
}

function calcXP(q, correct, secs) {
  let base = correct ? ({ Foundation:15, Intermediate:25, Advanced:40 }[q.difficulty] || 20) : 5;
  let speed = (correct && secs <= 40) ? 10 : (correct && secs <= 70) ? 5 : 0;
  let streak = correct ? (currentStreak >= 10 ? 20 : currentStreak >= 5 ? 10 : 5) : 0;
  return base + speed + streak;
}

/* ============================================================
   CONFETTI
============================================================ */

const confCanvas = document.getElementById("confettiCanvas");
const confCtx    = confCanvas.getContext("2d");
let confPieces   = [];
let confActive   = false;

function resizeConf() {
  confCanvas.width  = window.innerWidth;
  confCanvas.height = window.innerHeight;
}
resizeConf();
window.addEventListener("resize", resizeConf);

function launchConfetti() {
  confPieces = Array.from({ length: 80 }, () => ({
    x: Math.random() * confCanvas.width,
    y: Math.random() * -confCanvas.height,
    size: 4 + Math.random() * 4,
    speedY: 1.2 + Math.random() * 2,
    color: ["#E53935","#C4A55A","#4CC9F0","#F97316"][Math.floor(Math.random() * 4)]
  }));
  confActive = true;
  requestAnimationFrame(drawConf);
  setTimeout(() => { confActive = false; }, 1800);
}

function drawConf() {
  if (!confActive) {
    confCtx.clearRect(0, 0, confCanvas.width, confCanvas.height);
    return;
  }
  confCtx.clearRect(0, 0, confCanvas.width, confCanvas.height);
  confPieces.forEach(p => {
    p.y += p.speedY;
    if (p.y > confCanvas.height) p.y = -10;
    confCtx.fillStyle = p.color;
    confCtx.fillRect(p.x, p.y, p.size, p.size);
  });
  requestAnimationFrame(drawConf);
}

/* ============================================================
   EXAM SESSION STATE
============================================================ */

let sessionQuestions = [];
let currentIndex     = 0;
let answeredCount    = 0;
let correctCount     = 0;
let timerInterval    = null;
let timerSeconds     = 0;
let selectedIdx      = null;
let sessionActive    = false;
let questionStartTime = null;
let sessionXP        = 0;
const domStatsSession = {};

function startTimer() {
  clearInterval(timerInterval);
  timerSeconds = 0;
  timerInterval = setInterval(() => {
    timerSeconds++;
    const m = String(Math.floor(timerSeconds / 60)).padStart(2, "0");
    const s = String(timerSeconds % 60).padStart(2, "0");
    const el = document.getElementById("timerDisplay");
    if (el) el.textContent = `${m}:${s}`;
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
}

/* ============================================================
   START EXAM
============================================================ */

const startExamBtn = document.getElementById("startExamBtn");
if (startExamBtn) startExamBtn.addEventListener("click", startExam);

async function startExam() {
  const len    = Math.max(5, Math.min(200, parseInt(document.getElementById("configLength").value, 10) || 10));
  const domain = document.getElementById("configDomain").value;
  const diff   = document.getElementById("configDifficulty").value;

  const btn = document.getElementById("startExamBtn");
  btn.disabled = true;
  btn.textContent = "Loading from database…";

  const pool = await fetchQuestionsFromAPI({
    source: activeSource,
    domain,
    difficulty: diff,
    limit: Math.max(len * 4, 100)
  });

  btn.disabled = false;
  btn.textContent = "Start Exam Session";

  if (!pool.length) {
    showAPIStatus("error", "No questions available. Check your filters or database connection.");
    return;
  }

  sessionQuestions = Array.from({ length: len }, (_, i) => pool[i % pool.length]);

  currentIndex = 0;
  answeredCount = 0;
  correctCount = 0;
  selectedIdx = null;
  sessionActive = true;
  sessionXP = 0;
  currentStreak = 0;
  Object.keys(domStatsSession).forEach(k => delete domStatsSession[k]);

  const quizCard = document.getElementById("quizCard");
  if (quizCard) quizCard.style.display = "block";
  const rat = document.getElementById("quizRationale");
  if (rat) rat.style.display = "none";

  ["metricAnswered","metricCorrect","metricSessionXP"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = "0";
  });
  const acc = document.getElementById("metricAccuracy");
  if (acc) acc.textContent = "0%";
  const sc  = document.getElementById("scoreLabel");
  if (sc)  sc.textContent  = "";

  renderQuestion();
  startTimer();
}

/* ============================================================
   RENDER QUESTION
============================================================ */

const LETTERS = ["A","B","C","D","E"];

function renderQuestion() {
  const q = sessionQuestions[currentIndex];
  if (!q) return;

  const setText = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.textContent = v;
  };
  const setVis  = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.style.display = v;
  };

  setText("pillSource",     q.source === "lightning_questions" ? "Lightning" : "SHRM‑CP");
  setText("pillDomain",     q.domain);
  setText("pillDifficulty", q.difficulty);
  setText("pillType",       q.type);

  const compEl = document.getElementById("pillCompetency");
  if (compEl) {
    if (q.competency) {
      compEl.textContent = q.competency;
      setVis("pillCompetency", "inline");
    } else {
      setVis("pillCompetency", "none");
    }
  }

  setText("quizQuestionText", q.question);

  const optionsEl = document.getElementById("quizOptions");
  optionsEl.innerHTML = "";
  selectedIdx = null;

  q.options.forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.className      = "quiz-option-btn";
    btn.dataset.letter = LETTERS[i] || String(i + 1);
    btn.appendChild(document.createTextNode(opt));
    btn.addEventListener("click", () => {
      if (!sessionActive) return;
      document.querySelectorAll(".quiz-option-btn").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      selectedIdx = i;
    });
    optionsEl.appendChild(btn);
  });

  setText("progressLabel", `Question ${currentIndex + 1} of ${sessionQuestions.length}`);
  const fill = document.getElementById("progressFill");
  if (fill) fill.style.width = `${(currentIndex / sessionQuestions.length) * 100}%`;

  questionStartTime = performance.now();
}

/* ============================================================
   SUBMIT / SKIP
============================================================ */

const submitBtn = document.getElementById("submitBtn");
if (submitBtn) submitBtn.addEventListener("click", handleSubmit);

const skipBtn = document.getElementById("skipBtn");
if (skipBtn) skipBtn.addEventListener("click", handleSkip);

function handleSubmit() {
  if (!sessionActive) return;
  const q = sessionQuestions[currentIndex];
  if (!q) return;
  if (selectedIdx === null) {
    alert("Select an answer or use Skip.");
    return;
  }

  const elapsed = Math.round((performance.now() - questionStartTime) / 1000);

  if (!domStatsSession[q.domain]) domStatsSession[q.domain] = { seen:0, correct:0, totalTime:0 };
  domStatsSession[q.domain].seen++;
  domStatsSession[q.domain].totalTime += elapsed;

  answeredCount++;
  const answeredEl = document.getElementById("metricAnswered");
  if (answeredEl) answeredEl.textContent = answeredCount;

  document.querySelectorAll(".quiz-option-btn").forEach((btn, idx) => {
    if (idx === q.correctIndex)                         btn.classList.add("correct");
    if (idx === selectedIdx && idx !== q.correctIndex)  btn.classList.add("incorrect");
    btn.classList.remove("selected");
  });

  const correct = selectedIdx === q.correctIndex;
  if (correct) {
    correctCount++;
    const correctEl = document.getElementById("metricCorrect");
    if (correctEl) correctEl.textContent = correctCount;
    domStatsSession[q.domain].correct++;
  }

  const acc = Math.round((correctCount / answeredCount) * 100);
  const accEl = document.getElementById("metricAccuracy");
  if (accEl) accEl.textContent = `${acc}%`;
  const scoreLabel = document.getElementById("scoreLabel");
  if (scoreLabel) scoreLabel.textContent = `Score: ${acc}%`;

  const rat = document.getElementById("quizRationale");
  if (rat) {
    rat.style.display = "block";
    rat.textContent = q.rationale;
  }

  const log = document.getElementById("rationaleList");
  if (log) {
    const entry = document.createElement("div");
    entry.className   = "hint small";
    const src = q.source === "lightning_questions" ? "⚡" : "📋";
    entry.textContent = `${src} Q${currentIndex+1} (${q.domain}${q.competency ? " · " + q.competency : ""}): ${q.rationale}`;
    log.appendChild(entry);
  }

  updateStreak(correct);
  const xp = calcXP(q, correct, elapsed);
  sessionXP += xp;
  const xpEl = document.getElementById("metricSessionXP");
  if (xpEl) xpEl.textContent = sessionXP;
  addXP(xp);

  setTimeout(nextQuestion, 950);
}

function handleSkip() {
  if (!sessionActive) return;
  currentStreak = 0;
  updateGameUI(false, 0);
  nextQuestion();
}

function nextQuestion() {
  currentIndex++;
  if (currentIndex >= sessionQuestions.length) {
    endSession();
    return;
  }
  const rat = document.getElementById("quizRationale");
  if (rat) rat.style.display = "none";
  renderQuestion();
}

/* ============================================================
   END SESSION
============================================================ */

function endSession() {
  sessionActive = false;
  stopTimer();

  const A = STATE.analytics;
  A.sessionsCompleted++;
  A.totalQuestions    += answeredCount;
  A.totalCorrect      += correctCount;
  A.totalStudySeconds += timerSeconds;
  A.accuracyHistory.push(answeredCount ? Math.round((correctCount / answeredCount) * 100) : 0);
  A.timeHistory.push(answeredCount ? Math.round(timerSeconds / answeredCount) : 0);

  Object.entries(domStatsSession).forEach(([d, s]) => {
    if (!A.domainStats[d]) A.domainStats[d] = { seen:0, correct:0, totalTime:0 };
    A.domainStats[d].seen      += s.seen;
    A.domainStats[d].correct   += s.correct;
    A.domainStats[d].totalTime += s.totalTime;
  });
  save.ana();
  updateDashboard();
  updateReview();

  const qtEl = document.getElementById("quizQuestionText");
  if (qtEl) qtEl.textContent = "Session complete. Review your analytics below to plan your next block.";
  const optEl = document.getElementById("quizOptions");
  if (optEl) optEl.innerHTML = "";
  const rat = document.getElementById("quizRationale");
  if (rat) rat.style.display = "none";

  launchConfetti();
  showToast(`Session complete! +${sessionXP} XP earned.`);
}

/* ============================================================
   DASHBOARD & ANALYTICS
============================================================ */

Chart.defaults.color       = "#9CA3AF";
Chart.defaults.borderColor = "rgba(148,163,184,0.35)";

let charts = {};

function renderChart(id, type, data, options = {}) {
  if (charts[id]) charts[id].destroy();
  const ctx = document.getElementById(id);
  if (!ctx) return;
  charts[id] = new Chart(ctx, {
    type,
    data,
    options: { responsive:true, ...options }
  });
}

function updateDashboard() {
  const A = STATE.analytics;
  const G = STATE.gamification;

  const setText = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.textContent = v;
  };

  setText("kpiSessions",    A.sessionsCompleted);
  setText("kpiLifetimeXP",  G.lifetimeXP);
  setText("kpiLevel",       G.level);
  setText("kpiBestStreak",  G.bestStreak);

  // Accuracy trend
  renderChart("accuracyTrendChart", "line", {
    labels: A.accuracyHistory.map((_, i) => `S${i+1}`),
    datasets: [{
      label:"Accuracy %",
      data: A.accuracyHistory,
      borderColor:"#E53935",
      backgroundColor:"rgba(229,57,53,0.18)",
      tension:0.3,
      fill:true
    }]
  }, {
    scales:{ y:{ min:0, max:100 } },
    plugins:{ legend:{ display:false } }
  });

  // Bell curve (score distribution)
  const mean = A.accuracyHistory.length
    ? A.accuracyHistory.reduce((a,b)=>a+b,0)/A.accuracyHistory.length
    : 70;
  const xs = [];
  const ys = [];
  for (let x = 40; x <= 100; x += 2) {
    xs.push(x);
    ys.push(Math.exp(-0.5 * Math.pow((x - mean) / 10, 2)));
  }
  renderChart("bellCurveChart", "line", {
    labels: xs,
    datasets: [{
      label:"Distribution",
      data: ys,
      borderColor:"#4CC9F0",
      backgroundColor:"rgba(76,201,240,0.18)",
      tension:0.3,
      fill:true
    }]
  }, {
    scales:{
      x:{ title:{ display:true, text:"Score %" } },
      y:{ display:false }
    },
    plugins:{ legend:{ display:false } }
  });

  // Radar (domain accuracy)
  const domains = Object.keys(A.domainStats);
  renderChart("radarChart", "radar", {
    labels: domains.length ? domains : ["People","Organization","Workplace"],
    datasets: [{
      label:"Accuracy %",
      data: domains.length
        ? domains.map(d => {
            const s = A.domainStats[d];
            return s.seen ? Math.round(s.correct / s.seen * 100) : 0;
          })
        : [60,65,70],
      borderColor:"#C4A55A",
      backgroundColor:"rgba(196,165,90,0.18)"
    }]
  }, {
    plugins:{ legend:{ display:false } }
  });
}

/* ============================================================
   REVIEW / DOMAIN BREAKDOWN
============================================================ */

function updateReview() {
  const A = STATE.analytics;
  const list1 = document.getElementById("reviewDomainList");
  const list2 = document.getElementById("reviewDomainListSecondary");
  if (!list1 && !list2) return;

  const domains = Object.keys(A.domainStats);
  const rows = domains.map(d => {
    const s = A.domainStats[d];
    const acc = s.seen ? Math.round((s.correct / s.seen) * 100) : 0;
    const avgTime = s.seen ? Math.round(s.totalTime / s.seen) : 0;

    const row = document.createElement("div");
    row.className = "review-row";

    const colDomain = document.createElement("div");
    colDomain.className = "review-domain";
    colDomain.textContent = d;

    const colAcc = document.createElement("div");
    colAcc.className = "review-accuracy";
    colAcc.textContent = `${acc}%`;

    const colTime = document.createElement("div");
    colTime.className = "review-time";
    colTime.textContent = `${avgTime}s / question`;

    row.appendChild(colDomain);
    row.appendChild(colAcc);
    row.appendChild(colTime);
    return row;
  });

  [list1, list2].forEach(list => {
    if (!list) return;
    list.innerHTML = "";
    if (!rows.length) {
      const empty = document.createElement("div");
      empty.className = "hint small";
      empty.textContent = "Complete at least one session to see domain breakdown.";
      list.appendChild(empty);
    } else {
      rows.forEach(r => list.appendChild(r.cloneNode(true)));
    }
  });
}

/* ============================================================
   INIT
============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  recalcXP();
  updateGameUI(false, 0);
  updateProfileUI();
  updateDashboard();
  updateReview();
  probeAPI();
});