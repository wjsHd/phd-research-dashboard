const STORAGE_KEY = "phd-dashboard-v1";
const THEME_KEY = "phd-dashboard-theme";
const POMODORO_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;
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
let isBreakMode = false;
let isMuted = false;

const todayText = document.querySelector("#todayText");
const dailyQuote = document.querySelector("#dailyQuote");
const habitList = document.querySelector("#habitList");
const habitForm = document.querySelector("#habitForm");
const habitInput = document.querySelector("#habitInput");
const habitDoneCount = document.querySelector("#habitDoneCount");
const todoLeftCount = document.querySelector("#todoLeftCount");
const milestoneCount = document.querySelector("#milestoneCount");
const focusTime = document.querySelector("#focusTime");
const treeCount = document.querySelector("#treeCount");
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
const forestStats = document.querySelector("#forestStats");
const forestGrid = document.querySelector("#forestGrid");
const ringProgress = document.querySelector("#ringProgress");
const timerTreeEmoji = document.querySelector("#timerTreeEmoji");
const timerModeLabel = document.querySelector("#timerModeLabel");
const breakTimerBtn = document.querySelector("#breakTimerBtn");
const sessionTag = document.querySelector("#sessionTag");
const muteBtn = document.querySelector("#muteBtn");

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
    showToast("数据导入成功 ✓", "success");
  } catch {
    showToast("导入失败，请检查 JSON 文件格式", "error");
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
  isBreakMode = false;
  timerSecondsLeft = POMODORO_SECONDS;
  if (breakTimerBtn) breakTimerBtn.style.display = "none";
  renderTimer();
});

document.querySelector("#breakTimerBtn").addEventListener("click", () => {
  startBreakTimer();
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
    showToast("周报已复制 ✓", "success");
  } catch {
    showToast("复制失败，请手动选中文本框内容复制", "error");
  }
});

muteBtn?.addEventListener("click", () => {
  isMuted = !isMuted;
  muteBtn.textContent = isMuted ? "🔇" : "🔊";
});

document.querySelector("#paperSearch")?.addEventListener("input", () => renderPapers());
document.querySelector("#paperTagFilter")?.addEventListener("change", () => renderPapers());
document.querySelector("#paperStatusFilter")?.addEventListener("change", () => renderPapers());

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
  const fns = [
    renderTopBar, renderHabits, renderTodos, renderCalendar,
    renderKanban, renderPapers, renderKpi, renderOverview,
    renderForest, renderHeatmap, renderTimer, renderThemeButton
  ];
  fns.forEach((fn) => {
    try { fn(); } catch (err) { console.error(`[${fn.name}]`, err); }
  });
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
  const trees = calcTreeMetrics().totalTrees;
  habitDoneCount.textContent = String(doneHabits);
  todoLeftCount.textContent = String(leftTodos);
  milestoneCount.textContent = String(milestones);
  focusTime.textContent = `${(state.focusMinutes / 60).toFixed(1)}h`;
  treeCount.textContent = String(trees);
}

function renderForest() {
  const metrics = calcTreeMetrics();
  forestStats.innerHTML = `
    <div class="forest-pill">总树数：<strong>${metrics.totalTrees}</strong></div>
    <div class="forest-pill">番茄树：<strong>${metrics.focusTrees}</strong></div>
    <div class="forest-pill">任务树：<strong>${metrics.todoTrees}</strong></div>
    <div class="forest-pill">里程碑树：<strong>${metrics.projectTrees}</strong></div>
  `;

  forestGrid.innerHTML = "";
  const maxShow = Math.max(12, Math.min(36, metrics.totalTrees));
  for (let i = 0; i < maxShow; i += 1) {
    const cell = document.createElement("div");
    cell.className = "tree-cell";
    if (i < metrics.totalTrees) {
      const age = metrics.totalTrees - i;
      const treeEmoji = age <= 2 ? "🌱" : age <= 6 ? "🌿" : age <= 15 ? "🌲" : "🌳";
      cell.innerHTML = `<span class="tree-icon" title="第 ${metrics.totalTrees - i} 棵树">${treeEmoji}</span>`;
    } else {
      cell.innerHTML = `<span class="tree-icon ghost-tree">·</span>`;
    }
    forestGrid.append(cell);
  }
}

function calcTreeMetrics() {
  const todoTrees = state.todos.filter((t) => t.done).length;
  const focusTrees = state.completedPomodoros;
  const projectTrees = state.projects.filter((p) => p.progress >= 100).length * 2;
  const habitTrees = state.habits.reduce((sum, h) => sum + Math.floor(h.checkedDates.length / 7), 0);
  return {
    todoTrees,
    focusTrees,
    projectTrees,
    habitTrees,
    totalTrees: todoTrees + focusTrees + projectTrees + habitTrees
  };
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
    events.forEach((ev) => {
      const event = document.createElement("div");
      event.className = "event";
      event.innerHTML = `<span class="event-text">${escapeHtml(ev.text)}</span><button class="event-del-btn" title="删除">×</button>`;
      event.querySelector(".event-del-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        state.events = state.events.filter((x) => x.id !== ev.id);
        persistAndRender();
      });
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

    const progressColor = p.progress >= 100 ? "#16a34a" : p.progress >= 60 ? "#f59e0b" : "var(--primary)";

    card.innerHTML = `
      <div class="kcard-name">${escapeHtml(p.name)}</div>
      <div class="kcard-stage">${escapeHtml(p.stage)}</div>
      <div class="progress-bar" style="margin:6px 0 2px">
        <div class="progress-inner" style="width:${p.progress}%;background:${progressColor}"></div>
      </div>
      <div class="kcard-prog">${p.progress}%</div>
      <div class="kcard-next">→ ${escapeHtml(p.nextStep)}</div>
    `;

    const actions = document.createElement("div");
    actions.className = "kcard-actions";

    const plusBtn = document.createElement("button");
    plusBtn.className = "ghost kcard-btn";
    plusBtn.textContent = "+10%";
    plusBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      p.progress = clamp(p.progress + 10, 0, 100);
      persistAndRender();
    });

    const delBtn = document.createElement("button");
    delBtn.className = "ghost danger kcard-btn";
    delBtn.textContent = "删除";
    delBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      state.projects = state.projects.filter((x) => x.id !== p.id);
      persistAndRender();
    });

    actions.append(plusBtn, delBtn);
    card.append(actions);

    card.addEventListener("dragstart", (e) => {
      card.classList.add("dragging");
      e.dataTransfer?.setData("text/project-id", p.id);
    });
    card.addEventListener("dragend", () => card.classList.remove("dragging"));

    const boardStatus = p.boardStatus || mapStageToStatus(p.stage, p.progress);
    if (boardStatus === "todo") kanbanTodo.append(card);
    if (boardStatus === "doing") kanbanDoing.append(card);
    if (boardStatus === "blocked") kanbanBlocked.append(card);
    if (boardStatus === "done") kanbanDone.append(card);
  });
}

function renderPapers() {
  const search = (document.querySelector("#paperSearch")?.value || "").toLowerCase().trim();
  const tagFilter = document.querySelector("#paperTagFilter")?.value || "";
  const statusFilter = document.querySelector("#paperStatusFilter")?.value || "";

  // Update tag dropdown
  const tagSelect = document.querySelector("#paperTagFilter");
  if (tagSelect) {
    const allTags = [...new Set(state.papers.map((p) => p.tag).filter(Boolean))].sort();
    const current = tagSelect.value;
    tagSelect.innerHTML = `<option value="">全部方向</option>` +
      allTags.map((t) => `<option value="${escapeHtml(t)}" ${t === current ? "selected" : ""}>${escapeHtml(t)}</option>`).join("");
  }

  const filtered = state.papers.filter((p) => {
    if (tagFilter && p.tag !== tagFilter) return false;
    if (statusFilter && p.status !== statusFilter) return false;
    if (search && !p.title.toLowerCase().includes(search) && !p.note.toLowerCase().includes(search)) return false;
    return true;
  });

  const countEl = document.querySelector("#paperCount");
  if (countEl) countEl.textContent = `共 ${filtered.length} / ${state.papers.length} 篇`;

  paperList.innerHTML = "";
  if (filtered.length === 0) {
    paperList.innerHTML = `<p class="muted" style="padding:8px">没有匹配的文献</p>`;
    return;
  }

  filtered.forEach((p) => {
    const item = document.createElement("div");
    item.className = "paper-item";
    const statusClass = p.status === "精读完成" ? "low" : p.status === "在读" ? "medium" : "high";
    item.innerHTML = `
      <div><strong>${highlight(escapeHtml(p.title), search)}</strong></div>
      <div class="paper-meta" style="margin-top:4px">
        <span class="pill ${statusClass}">${escapeHtml(p.status)}</span>
        <span style="margin-left:6px;color:var(--muted)">🏷 ${escapeHtml(p.tag)}</span>
      </div>
      <div class="paper-meta" style="margin-top:4px">📝 ${highlight(escapeHtml(p.note), search)}</div>
      <div class="paper-meta" style="margin-top:2px">🗓 ${escapeHtml(p.addedAt)}</div>
    `;

    const row = document.createElement("div");
    row.style.cssText = "display:flex;gap:8px;margin-top:8px";

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

function highlight(text, keyword) {
  if (!keyword) return text;
  const re = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  return text.replace(re, `<mark>$1</mark>`);
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
      if (isBreakMode) completeBreak();
      else completeOnePomodoro();
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

  const totalSeconds = isBreakMode ? BREAK_SECONDS : POMODORO_SECONDS;
  const progress = 1 - timerSecondsLeft / totalSeconds;
  const circumference = 314.16;
  const offset = circumference * (1 - progress);

  if (ringProgress) {
    ringProgress.style.strokeDashoffset = String(offset);
    ringProgress.style.stroke = isBreakMode ? "#60a5fa" : "var(--primary)";
  }

  if (timerTreeEmoji) {
    if (isBreakMode) {
      timerTreeEmoji.textContent = "☕";
    } else if (progress < 0.2) {
      timerTreeEmoji.textContent = "🌱";
    } else if (progress < 0.5) {
      timerTreeEmoji.textContent = "🌿";
    } else if (progress < 0.8) {
      timerTreeEmoji.textContent = "🌲";
    } else {
      timerTreeEmoji.textContent = "🌳";
    }
  }

  if (timerModeLabel) {
    if (timerId) {
      timerModeLabel.textContent = isBreakMode ? "休息中 ☕" : "专注中 🔥";
    } else {
      timerModeLabel.textContent = isBreakMode ? "休息暂停" : "准备就绪";
    }
  }
}

function completeOnePomodoro() {
  stopTimer();
  isBreakMode = false;
  timerSecondsLeft = POMODORO_SECONDS;
  state.completedPomodoros += 1;
  state.focusMinutes += 25;
  persistAndRender();
  const tag = sessionTag ? sessionTag.value.trim() : "";
  const tagMsg = tag ? `「${tag}」` : "";
  playSound("complete");
  showToast(`🌳 种树成功${tagMsg}！专注 +25 分钟，森林又多了一棵树`, "success", 4000);
  if (breakTimerBtn) breakTimerBtn.style.display = "";
}

function startBreakTimer() {
  isBreakMode = true;
  timerSecondsLeft = BREAK_SECONDS;
  if (breakTimerBtn) breakTimerBtn.style.display = "none";
  startTimer();
}

function completeBreak() {
  stopTimer();
  isBreakMode = false;
  timerSecondsLeft = POMODORO_SECONDS;
  renderTimer();
  playSound("break");
  showToast("☕ 休息结束！准备开始新的专注", "info", 3000);
}

function showToast(message, type = "success", duration = 3000) {
  const container = document.querySelector("#toastContainer");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.append(toast);
  requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add("toast-show")));
  setTimeout(() => {
    toast.classList.remove("toast-show");
    toast.addEventListener("transitionend", () => toast.remove(), { once: true });
  }, duration);
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
  const safeHabits = (Array.isArray(raw.habits) ? raw.habits : structuredClone(initialData.habits))
    .map((h) => ({ ...h, checkedDates: Array.isArray(h.checkedDates) ? h.checkedDates : [] }));
  const safePapers = (Array.isArray(raw.papers) ? raw.papers : structuredClone(initialData.papers))
    .map((p) => ({ tag: "", note: "", status: "待读", title: "", addedAt: toDateInput(new Date()), ...p }));
  const safeProjects = (Array.isArray(raw.projects) ? raw.projects : structuredClone(initialData.projects))
    .map((p) => ({ stage: "调研", progress: 0, nextStep: "", name: "", ...p }));
  return {
    habits: safeHabits,
    todos: Array.isArray(raw.todos) ? raw.todos : structuredClone(initialData.todos),
    events: Array.isArray(raw.events) ? raw.events : structuredClone(initialData.events),
    projects: safeProjects,
    papers: safePapers,
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

function renderHeatmap() {
  const grid = document.querySelector("#heatmapGrid");
  if (!grid) return;
  const totalHabits = state.habits.length || 1;
  const days = 84;
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - days + 1);
  grid.innerHTML = "";
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const key = toDateInput(d);
    const count = state.habits.filter((h) => h.checkedDates.includes(key)).length;
    const level = totalHabits === 0 ? 0 : Math.min(4, Math.ceil((count / totalHabits) * 4));
    const cell = document.createElement("div");
    cell.className = `heatmap-cell level-${level}`;
    cell.title = `${key}：完成 ${count}/${totalHabits} 个习惯`;
    grid.append(cell);
  }
}

function playSound(type) {
  if (isMuted) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (type === "complete") {
      [523, 659, 784].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = "sine";
        gain.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.22);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.22 + 0.5);
        osc.start(ctx.currentTime + i * 0.22);
        osc.stop(ctx.currentTime + i * 0.22 + 0.6);
      });
    } else if (type === "break") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 440;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 1.3);
    }
  } catch { /* 浏览器不支持 AudioContext 则静默忽略 */ }
}

initTheme();
renderAll();
