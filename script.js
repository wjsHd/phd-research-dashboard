const STORAGE_KEY = "phd-dashboard-v1";
const THEME_KEY = "phd-dashboard-theme";
const POMODORO_SECONDS = 25 * 60;
const DAILY_QUOTES = [
  "苟日新，日日新，又日新。-《礼记》",
  "路虽远，行则将至；事虽难，做则必成。-《荀子》",
  "不积跬步，无以至千里。-《荀子》",
  "千淘万漉虽辛苦，吹尽狂沙始到金。-刘禹锡",
  "The future depends on what you do today. - Mahatma Gandhi",
  "Success is the sum of small efforts, repeated day in and day out. - Robert Collier",
  "Discipline is choosing between what you want now and what you want most. - Abraham Lincoln",
  "Per aspera ad astra. (Through hardships to the stars.)"
];

const initialData = {
  habits: [
    { id: crypto.randomUUID(), name: "读文献 60 分钟", checkedDates: [] },
    { id: crypto.randomUUID(), name: "实验记录整理", checkedDates: [] },
    { id: crypto.randomUUID(), name: "英语写作训练 30 分钟", checkedDates: [] }
  ],
  todos: [
    { id: crypto.randomUUID(), text: "整理本周组会汇报材料", priority: "high", done: false },
    { id: crypto.randomUUID(), text: "复现 baseline 模型并记录参数", priority: "medium", done: false }
  ],
  events: [
    { id: crypto.randomUUID(), date: toDateInput(new Date()), text: "每周组会" }
  ],
  projects: [
    {
      id: crypto.randomUUID(),
      name: "课题 A：联邦学习异常检测",
      stage: "实验中",
      progress: 45,
      nextStep: "完成消融实验并画结果图"
    }
  ],
  papers: [
    {
      id: crypto.randomUUID(),
      title: "Attention Is All You Need",
      tag: "NLP",
      status: "精读完成",
      note: "多头注意力是核心创新",
      addedAt: toDateInput(new Date())
    },
    {
      id: crypto.randomUUID(),
      title: "FedAvg",
      tag: "联邦学习",
      status: "在读",
      note: "通信轮次与本地 epoch 是关键参数",
      addedAt: toDateInput(new Date())
    }
  ],
  focusMinutes: 180,
  completedPomodoros: 0,
  monthlyMetrics: {
    paperTarget: 8,
    expTarget: 20,
    writingTarget: 6000,
    expCurrent: 4,
    writingCurrent: 1300
  }
};

const state = loadData();
let viewDate = new Date();
let timerSecondsLeft = POMODORO_SECONDS;
let timerId = null;

const todayText = document.querySelector("#todayText");
const dailyQuote = document.querySelector("#dailyQuote");
const habitList = document.querySelector("#habitList");
const habitForm = document.querySelector("#habitForm");
const habitInput = document.querySelector("#habitInput");
const habitDoneCount = document.querySelector("#habitDoneCount");
const todoLeftCount = document.querySelector("#todoLeftCount");
const milestoneCount = document.querySelector("#milestoneCount");
const focusTime = document.querySelector("#focusTime");
const todoForm = document.querySelector("#todoForm");
const todoList = document.querySelector("#todoList");
const eventForm = document.querySelector("#eventForm");
const eventDate = document.querySelector("#eventDate");
const eventText = document.querySelector("#eventText");
const monthLabel = document.querySelector("#monthLabel");
const calendarGrid = document.querySelector("#calendarGrid");
const projectForm = document.querySelector("#projectForm");
const projectList = document.querySelector("#projectList");
const timerDisplay = document.querySelector("#timerDisplay");
const paperForm = document.querySelector("#paperForm");
const paperList = document.querySelector("#paperList");
const weeklyReport = document.querySelector("#weeklyReport");
const kanbanTodo = document.querySelector("#kanbanTodo");
const kanbanDoing = document.querySelector("#kanbanDoing");
const kanbanBlocked = document.querySelector("#kanbanBlocked");
const kanbanDone = document.querySelector("#kanbanDone");
const kpiForm = document.querySelector("#kpiForm");
const kpiGrid = document.querySelector("#kpiGrid");
const themeToggleBtn = document.querySelector("#themeToggleBtn");

document.querySelector("#prevMonth").addEventListener("click", () => {
  viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
  renderCalendar();
});

document.querySelector("#nextMonth").addEventListener("click", () => {
  viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
  renderCalendar();
});

document.querySelector("#resetBtn").addEventListener("click", () => {
  if (!confirm("确认重置为示例数据？")) return;
  stopTimer();
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
});

document.querySelector("#exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `phd-dashboard-${toDateInput(new Date())}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

document.querySelector("#importFile").addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const imported = JSON.parse(text);
    validateImportedData(imported);
    Object.assign(state, imported);
    stopTimer();
    timerSecondsLeft = POMODORO_SECONDS;
    persistAndRender();
    alert("数据导入成功");
  } catch {
    alert("导入失败，请检查 JSON 文件格式");
  }
  e.target.value = "";
});

habitForm.addEventListener("submit", (e) => {
  e.preventDefault();
  state.habits.unshift({
    id: crypto.randomUUID(),
    name: habitInput.value.trim(),
    checkedDates: []
  });
  habitInput.value = "";
  persistAndRender();
});

todoForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = document.querySelector("#todoText").value.trim();
  const priority = document.querySelector("#todoPriority").value;
  state.todos.unshift({ id: crypto.randomUUID(), text, priority, done: false });
  todoForm.reset();
  persistAndRender();
});

eventForm.addEventListener("submit", (e) => {
  e.preventDefault();
  state.events.push({
    id: crypto.randomUUID(),
    date: eventDate.value,
    text: eventText.value.trim()
  });
  eventForm.reset();
  persistAndRender();
});

projectForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.querySelector("#projectName").value.trim();
  const stage = document.querySelector("#projectStage").value;
  const progress = clamp(Number(document.querySelector("#projectProgress").value), 0, 100);
  const nextStep = document.querySelector("#projectNext").value.trim();
  state.projects.unshift({ id: crypto.randomUUID(), name, stage, progress, nextStep });
  projectForm.reset();
  persistAndRender();
});

paperForm.addEventListener("submit", (e) => {
  e.preventDefault();
  state.papers.unshift({
    id: crypto.randomUUID(),
    title: document.querySelector("#paperTitle").value.trim(),
    tag: document.querySelector("#paperTag").value.trim(),
    status: document.querySelector("#paperStatus").value,
    note: document.querySelector("#paperNote").value.trim(),
    addedAt: toDateInput(new Date())
  });
  paperForm.reset();
  persistAndRender();
});

document.querySelector("#startTimerBtn").addEventListener("click", startTimer);
document.querySelector("#pauseTimerBtn").addEventListener("click", stopTimer);
document.querySelector("#resetTimerBtn").addEventListener("click", () => {
  stopTimer();
  timerSecondsLeft = POMODORO_SECONDS;
  renderTimer();
});

document.querySelector("#completeTimerBtn").addEventListener("click", () => {
  completeOnePomodoro();
});

document.querySelector("#generateReportBtn").addEventListener("click", () => {
  weeklyReport.value = buildWeeklyReport();
});

document.querySelector("#copyReportBtn").addEventListener("click", async () => {
  if (!weeklyReport.value.trim()) {
    weeklyReport.value = buildWeeklyReport();
  }
  try {
    await navigator.clipboard.writeText(weeklyReport.value);
    alert("周报已复制");
  } catch {
    alert("复制失败，请手动复制");
  }
});

themeToggleBtn.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  applyTheme(next);
});

kpiForm.addEventListener("submit", (e) => {
  e.preventDefault();
  state.monthlyMetrics.paperTarget = clamp(Number(document.querySelector("#paperTarget").value), 1, 999);
  state.monthlyMetrics.expTarget = clamp(Number(document.querySelector("#expTarget").value), 1, 999);
  state.monthlyMetrics.writingTarget = clamp(Number(document.querySelector("#writingTarget").value), 100, 999999);
  state.monthlyMetrics.expCurrent = clamp(Number(document.querySelector("#expCurrent").value), 0, 999999);
  state.monthlyMetrics.writingCurrent = clamp(Number(document.querySelector("#writingCurrent").value), 0, 9999999);
  persistAndRender();
});

document.querySelectorAll(".kanban-col").forEach((col) => {
  col.addEventListener("dragover", (e) => {
    e.preventDefault();
  });
  col.addEventListener("drop", (e) => {
    e.preventDefault();
    const projectId = e.dataTransfer?.getData("text/project-id");
    const status = col.getAttribute("data-status");
    if (!projectId || !status) return;
    const project = state.projects.find((x) => x.id === projectId);
    if (!project) return;
    project.boardStatus = status;
    persistAndRender();
  });
});

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(initialData);
    return mergeDefaults(JSON.parse(raw));
  } catch {
    return structuredClone(initialData);
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function persistAndRender() {
  saveData();
  renderAll();
}

function renderAll() {
  renderTopBar();
  renderHabits();
  renderTodos();
  renderCalendar();
  renderProjects();
  renderKanban();
  renderPapers();
  renderKpi();
  renderOverview();
  renderTimer();
  renderThemeButton();
}

function renderTopBar() {
  const now = new Date();
  todayText.textContent = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} | 周${"日一二三四五六"[now.getDay()]}`;
  dailyQuote.textContent = getDailyQuote(now);
}

function getDailyQuote(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  const oneDay = 24 * 60 * 60 * 1000;
  const dayOfYear = Math.floor(diff / oneDay);
  return DAILY_QUOTES[(dayOfYear - 1) % DAILY_QUOTES.length];
}

function renderThemeButton() {
  const current = document.documentElement.getAttribute("data-theme");
  themeToggleBtn.textContent = current === "dark" ? "浅色模式" : "深色模式";
}

function renderOverview() {
  const today = toDateInput(new Date());
  const doneHabits = state.habits.filter((h) => h.checkedDates.includes(today)).length;
  const leftTodos = state.todos.filter((t) => !t.done).length;
  const milestones = state.projects.filter((p) => p.progress >= 70).length;
  habitDoneCount.textContent = String(doneHabits);
  todoLeftCount.textContent = String(leftTodos);
  milestoneCount.textContent = String(milestones);
  focusTime.textContent = `${(state.focusMinutes / 60).toFixed(1)}h`;
}

function renderHabits() {
  habitList.innerHTML = "";
  const today = toDateInput(new Date());

  state.habits.forEach((habit) => {
    const item = document.createElement("div");
    item.className = "habit-item";

    const left = document.createElement("div");
    left.innerHTML = `<strong>${escapeHtml(habit.name)}</strong><div class="habit-meta">连续 ${calcStreak(habit.checkedDates)} 天</div>`;

    const right = document.createElement("div");

    const checkBtn = document.createElement("button");
    const checked = habit.checkedDates.includes(today);
    checkBtn.textContent = checked ? "已打卡" : "打卡";
    checkBtn.className = checked ? "ghost" : "";
    checkBtn.addEventListener("click", () => {
      if (checked) {
        habit.checkedDates = habit.checkedDates.filter((d) => d !== today);
      } else {
        habit.checkedDates.push(today);
      }
      persistAndRender();
    });

    const delBtn = document.createElement("button");
    delBtn.textContent = "删除";
    delBtn.className = "ghost danger";
    delBtn.addEventListener("click", () => {
      state.habits = state.habits.filter((h) => h.id !== habit.id);
      persistAndRender();
    });

    right.append(checkBtn, delBtn);
    item.append(left, right);
    habitList.append(item);
  });
}

function renderTodos() {
  todoList.innerHTML = "";
  const sorted = [...state.todos].sort((a, b) => priorityValue(a.priority) - priorityValue(b.priority));

  sorted.forEach((todo) => {
    const item = document.createElement("div");
    item.className = `todo-item ${todo.done ? "done" : ""}`;

    const left = document.createElement("div");
    left.innerHTML = `<strong>${escapeHtml(todo.text)}</strong><div class="todo-meta"><span class="pill ${todo.priority}">${priorityZh(todo.priority)}</span></div>`;

    const right = document.createElement("div");
    const doneBtn = document.createElement("button");
    doneBtn.textContent = todo.done ? "撤销" : "完成";
    doneBtn.className = "ghost";
    doneBtn.addEventListener("click", () => {
      todo.done = !todo.done;
      persistAndRender();
    });

    const delBtn = document.createElement("button");
    delBtn.textContent = "删除";
    delBtn.className = "ghost danger";
    delBtn.addEventListener("click", () => {
      state.todos = state.todos.filter((t) => t.id !== todo.id);
      persistAndRender();
    });

    right.append(doneBtn, delBtn);
    item.append(left, right);
    todoList.append(item);
  });
}

function renderCalendar() {
  calendarGrid.innerHTML = "";
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  monthLabel.textContent = `${year} 年 ${month + 1} 月`;

  const firstDay = new Date(year, month, 1);
  const startWeekday = (firstDay.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - startWeekday);

  for (let i = 0; i < 42; i += 1) {
    const d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
    const day = document.createElement("div");
    day.className = "day";
    if (d.getMonth() !== month) day.classList.add("outside");
    if (toDateInput(d) === toDateInput(new Date())) day.classList.add("today");
    day.innerHTML = `<div class="day-num">${d.getDate()}</div>`;

    const events = state.events.filter((e) => e.date === toDateInput(d)).slice(0, 2);
    events.forEach((e) => {
      const event = document.createElement("div");
      event.className = "event";
      event.textContent = e.text;
      day.append(event);
    });
    calendarGrid.append(day);
  }
}

function renderProjects() {
  projectList.innerHTML = "";
  state.projects.forEach((p) => {
    const item = document.createElement("div");
    item.className = "project-item";
    item.innerHTML = `
      <div><strong>${escapeHtml(p.name)}</strong></div>
      <div class="todo-meta">阶段：${escapeHtml(p.stage)}</div>
      <div class="todo-meta">下一步：${escapeHtml(p.nextStep)}</div>
      <div class="progress-bar"><div class="progress-inner" style="width:${p.progress}%;"></div></div>
      <div class="todo-meta">进度：${p.progress}%</div>
    `;

    const actionRow = document.createElement("div");
    actionRow.style.marginTop = "8px";
    actionRow.style.display = "flex";
    actionRow.style.gap = "8px";

    const plusBtn = document.createElement("button");
    plusBtn.className = "ghost";
    plusBtn.textContent = "+10%";
    plusBtn.addEventListener("click", () => {
      p.progress = clamp(p.progress + 10, 0, 100);
      persistAndRender();
    });

    const delBtn = document.createElement("button");
    delBtn.className = "ghost danger";
    delBtn.textContent = "删除";
    delBtn.addEventListener("click", () => {
      state.projects = state.projects.filter((x) => x.id !== p.id);
      persistAndRender();
    });

    actionRow.append(plusBtn, delBtn);
    item.append(actionRow);
    projectList.append(item);
  });
}

function renderKanban() {
  kanbanTodo.innerHTML = "";
  kanbanDoing.innerHTML = "";
  kanbanBlocked.innerHTML = "";
  kanbanDone.innerHTML = "";

  state.projects.forEach((p) => {
    const card = document.createElement("div");
    card.className = "kanban-card";
    card.draggable = true;
    card.innerHTML = `
      <strong>${escapeHtml(p.name)}</strong>
      <div class="todo-meta">${escapeHtml(p.stage)} | ${p.progress}%</div>
    `;
    card.addEventListener("dragstart", (e) => {
      card.classList.add("dragging");
      e.dataTransfer?.setData("text/project-id", p.id);
    });
    card.addEventListener("dragend", () => {
      card.classList.remove("dragging");
    });

    const boardStatus = p.boardStatus || mapStageToStatus(p.stage, p.progress);
    if (boardStatus === "todo") kanbanTodo.append(card);
    if (boardStatus === "doing") kanbanDoing.append(card);
    if (boardStatus === "blocked") kanbanBlocked.append(card);
    if (boardStatus === "done") kanbanDone.append(card);
  });
}

function renderPapers() {
  paperList.innerHTML = "";
  state.papers.forEach((p) => {
    const item = document.createElement("div");
    item.className = "paper-item";
    item.innerHTML = `
      <div><strong>${escapeHtml(p.title)}</strong></div>
      <div class="paper-meta">方向：${escapeHtml(p.tag)} | 状态：${escapeHtml(p.status)}</div>
      <div class="paper-meta">笔记：${escapeHtml(p.note)}</div>
      <div class="paper-meta">添加时间：${escapeHtml(p.addedAt)}</div>
    `;

    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.gap = "8px";
    row.style.marginTop = "8px";

    const nextBtn = document.createElement("button");
    nextBtn.className = "ghost";
    nextBtn.textContent = "推进状态";
    nextBtn.addEventListener("click", () => {
      p.status = nextPaperStatus(p.status);
      persistAndRender();
    });

    const delBtn = document.createElement("button");
    delBtn.className = "ghost danger";
    delBtn.textContent = "删除";
    delBtn.addEventListener("click", () => {
      state.papers = state.papers.filter((x) => x.id !== p.id);
      persistAndRender();
    });

    row.append(nextBtn, delBtn);
    item.append(row);
    paperList.append(item);
  });
}

function renderKpi() {
  const currentMonthDonePapers = state.papers.filter((p) => {
    if (p.status !== "精读完成") return false;
    if (!p.addedAt) return false;
    return isCurrentMonthDate(p.addedAt);
  }).length;

  const m = state.monthlyMetrics;
  document.querySelector("#paperTarget").value = m.paperTarget;
  document.querySelector("#expTarget").value = m.expTarget;
  document.querySelector("#writingTarget").value = m.writingTarget;
  document.querySelector("#expCurrent").value = m.expCurrent;
  document.querySelector("#writingCurrent").value = m.writingCurrent;

  const items = [
    {
      label: "论文精读（本月）",
      current: currentMonthDonePapers,
      target: m.paperTarget,
      suffix: "篇"
    },
    {
      label: "实验轮次（本月）",
      current: m.expCurrent,
      target: m.expTarget,
      suffix: "次"
    },
    {
      label: "写作字数（本月）",
      current: m.writingCurrent,
      target: m.writingTarget,
      suffix: "字"
    }
  ];

  kpiGrid.innerHTML = "";
  items.forEach((x) => {
    const rate = Math.min((x.current / x.target) * 100, 100);
    const div = document.createElement("div");
    div.className = "kpi-item";
    div.innerHTML = `
      <div class="kpi-label">${x.label}</div>
      <div class="kpi-value">${x.current}/${x.target}${x.suffix}</div>
      <div class="progress-bar"><div class="progress-inner" style="width:${rate}%;"></div></div>
      <div class="todo-meta">完成率：${rate.toFixed(0)}%</div>
    `;
    kpiGrid.append(div);
  });
}

function startTimer() {
  if (timerId) return;
  timerId = setInterval(() => {
    timerSecondsLeft -= 1;
    renderTimer();
    if (timerSecondsLeft <= 0) {
      completeOnePomodoro();
    }
  }, 1000);
}

function stopTimer() {
  if (!timerId) return;
  clearInterval(timerId);
  timerId = null;
}

function renderTimer() {
  const mm = String(Math.floor(timerSecondsLeft / 60)).padStart(2, "0");
  const ss = String(timerSecondsLeft % 60).padStart(2, "0");
  timerDisplay.textContent = `${mm}:${ss}`;
}

function completeOnePomodoro() {
  stopTimer();
  timerSecondsLeft = POMODORO_SECONDS;
  state.completedPomodoros += 1;
  state.focusMinutes += 25;
  persistAndRender();
  alert("已完成 1 个番茄钟，专注时长 +25 分钟");
}

function buildWeeklyReport() {
  const now = new Date();
  const monday = getMonday(now);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  const weekRange = `${toDateInput(monday)} ~ ${toDateInput(sunday)}`;
  const doneTodos = state.todos.filter((t) => t.done);
  const inProgressProjects = state.projects.filter((p) => p.progress < 100);
  const doneHabitsToday = state.habits.filter((h) => h.checkedDates.includes(toDateInput(now))).length;
  const donePapers = state.papers.filter((p) => p.status === "精读完成");
  const upcomingEvents = state.events
    .filter((e) => e.date >= toDateInput(now))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);

  return [
    `【博士科研周报】(${weekRange})`,
    "",
    "1) 本周完成",
    `- 待办完成：${doneTodos.length} 项`,
    `- 文献精读完成累计：${donePapers.length} 篇`,
    `- 本周累计番茄钟：${state.completedPomodoros} 个（累计专注 ${(state.focusMinutes / 60).toFixed(1)} 小时）`,
    "",
    "2) 当前进行中",
    ...inProgressProjects.slice(0, 5).map((p) => `- ${p.name}（${p.stage}，进度 ${p.progress}%）：${p.nextStep}`),
    "",
    "3) 学习与习惯",
    `- 今日习惯完成：${doneHabitsToday}/${state.habits.length}`,
    ...state.habits.slice(0, 3).map((h) => `- ${h.name}：连续 ${calcStreak(h.checkedDates)} 天`),
    "",
    "4) 下周计划",
    ...inProgressProjects.slice(0, 3).map((p) => `- 推进 ${p.name}：${p.nextStep}`),
    ...upcomingEvents.map((e) => `- ${e.date}：${e.text}`),
    "",
    "5) 风险与需要支持",
    "- 风险：实验结果波动较大/时间分配不均（按需修改）",
    "- 需要支持：请导师反馈实验设计与论文结构（按需修改）"
  ].join("\n");
}

function calcStreak(dates) {
  const set = new Set(dates);
  let streak = 0;
  let cursor = new Date();
  while (set.has(toDateInput(cursor))) {
    streak += 1;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 1);
  }
  return streak;
}

function priorityValue(p) {
  if (p === "high") return 0;
  if (p === "medium") return 1;
  return 2;
}

function priorityZh(p) {
  if (p === "high") return "高优先级";
  if (p === "medium") return "中优先级";
  return "低优先级";
}

function nextPaperStatus(status) {
  if (status === "待读") return "在读";
  if (status === "在读") return "精读完成";
  return "精读完成";
}

function getMonday(date) {
  const day = (date.getDay() + 6) % 7;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - day);
}

function mergeDefaults(raw) {
  return {
    habits: Array.isArray(raw.habits) ? raw.habits : structuredClone(initialData.habits),
    todos: Array.isArray(raw.todos) ? raw.todos : structuredClone(initialData.todos),
    events: Array.isArray(raw.events) ? raw.events : structuredClone(initialData.events),
    projects: Array.isArray(raw.projects) ? raw.projects : structuredClone(initialData.projects),
    papers: Array.isArray(raw.papers) ? raw.papers : structuredClone(initialData.papers),
    focusMinutes: Number.isFinite(raw.focusMinutes) ? raw.focusMinutes : initialData.focusMinutes,
    completedPomodoros: Number.isFinite(raw.completedPomodoros) ? raw.completedPomodoros : initialData.completedPomodoros,
    monthlyMetrics: raw.monthlyMetrics && typeof raw.monthlyMetrics === "object"
      ? {
          paperTarget: Number.isFinite(raw.monthlyMetrics.paperTarget) ? raw.monthlyMetrics.paperTarget : initialData.monthlyMetrics.paperTarget,
          expTarget: Number.isFinite(raw.monthlyMetrics.expTarget) ? raw.monthlyMetrics.expTarget : initialData.monthlyMetrics.expTarget,
          writingTarget: Number.isFinite(raw.monthlyMetrics.writingTarget) ? raw.monthlyMetrics.writingTarget : initialData.monthlyMetrics.writingTarget,
          expCurrent: Number.isFinite(raw.monthlyMetrics.expCurrent) ? raw.monthlyMetrics.expCurrent : initialData.monthlyMetrics.expCurrent,
          writingCurrent: Number.isFinite(raw.monthlyMetrics.writingCurrent) ? raw.monthlyMetrics.writingCurrent : initialData.monthlyMetrics.writingCurrent
        }
      : structuredClone(initialData.monthlyMetrics)
  };
}

function validateImportedData(data) {
  if (!data || typeof data !== "object") {
    throw new Error("invalid data");
  }
  if (!Array.isArray(data.habits) || !Array.isArray(data.todos)) {
    throw new Error("invalid data shape");
  }
}

function toDateInput(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isCurrentMonthDate(dateText) {
  const d = new Date(dateText);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function mapStageToStatus(stage, progress) {
  if (progress >= 100) return "done";
  if (stage.includes("调研")) return "todo";
  if (stage.includes("投稿")) return "blocked";
  return "doing";
}

function clamp(n, min, max) {
  return Math.min(Math.max(n, min), max);
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_KEY, theme);
  renderThemeButton();
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const isDarkPreferred = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const initialTheme = saved || (isDarkPreferred ? "dark" : "light");
  applyTheme(initialTheme);
}

initTheme();
renderAll();
