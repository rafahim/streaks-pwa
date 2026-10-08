import {
  listHabits, saveHabit, deleteHabit, toggleArchive, getEntry, saveEntry, deleteEntry, listEntries,
  reorderHabits, exportJson, importJson, buildDemoData, formatFrequency, todayISO, addDays, makeId
} from "./modules/habits.js";
import { clearAll, getSettings, setSetting } from "./modules/db.js";
import { totals, currentStreak, longestStreak, weeklySeries, monthlySeries, yearReview } from "./modules/stats.js";
import { renderHeatmap } from "./modules/heatmap.js";
import { getNotificationSettings, saveNotificationSettings, requestNotificationPermission, maybeNotify, maybeChainWarning } from "./modules/notifications.js";

const state = {
  habits: [],
  entries: [],
  settings: {},
  lang: localStorage.getItem("streaks-lang") || "en",
  theme: localStorage.getItem("streaks-theme") || "dark",
  calendarDate: new Date()
};

const i18n = {
  en: {
    today: "Today", greeting: "Build your streak.", summary: "Keep your chain alive.",
    add: "+ Add habit", progress: "This year", calendar: "Calendar", stats: "Stats", settings: "Settings", about: "About",
    habits: "habits", completions: "completions", percent: "completion", current: "current streak", longest: "longest streak",
    noHabits: "No habits yet.", createFirst: "Create your first habit to start tracking.", saved: "Saved", completed: "Completed", notes: "Notes",
    edit: "Edit", archive: "Archive", restore: "Restore", delete: "Delete", backfill: "Backfill", cancel: "Cancel", save: "Save",
    name: "Habit name", emoji: "Emoji", color: "Color", frequency: "Frequency", daily: "Daily", weekly: "Weekly", days: "Selected days",
    every: "Every N days", tags: "Tags", quantity: "Quantity-based", unit: "Unit", target: "Target", negative: "Negative habit",
    date: "Date", note: "Note", done: "Done", titleNew: "New habit", titleEdit: "Edit habit", selectHabit: "Select habit",
    weeklyX: "Times per week", interval: "Every N days", archiveInfo: "Archived habits stay in your data.",
    imported: "Imported", demoLoaded: "Demo data loaded", cleared: "Local data deleted", install: "Install",
    bestDay: "Best day", total: "Total completions", activeDays: "Active days", yearReview: "Year in review",
    bestHabit: "Best habit", scheduled: "scheduled", noData: "Not enough data yet."
  },
  bn: {
    today: "আজ", greeting: "স্ট্রিক তৈরি করুন।", summary: "আপনার চেইন ধরে রাখুন।",
    add: "+ হ্যাবিট যোগ", progress: "এই বছর", calendar: "ক্যালেন্ডার", stats: "স্ট্যাটস", settings: "সেটিংস", about: "সম্পর্কে",
    habits: "হ্যাবিট", completions: "সম্পন্ন", percent: "সম্পূর্ণতা", current: "বর্তমান স্ট্রিক", longest: "দীর্ঘতম স্ট্রিক",
    noHabits: "এখনও কোনো হ্যাবিট নেই।", createFirst: "ট্র্যাকিং শুরু করতে প্রথম হ্যাবিট তৈরি করুন।", saved: "সেভ হয়েছে", completed: "সম্পন্ন", notes: "নোট",
    edit: "এডিট", archive: "আর্কাইভ", restore: "রিস্টোর", delete: "ডিলিট", backfill: "পেছনের তারিখ", cancel: "বাতিল", save: "সেভ",
    name: "হ্যাবিট নাম", emoji: "ইমোজি", color: "রং", frequency: "ফ্রিকোয়েন্সি", daily: "প্রতিদিন", weekly: "সাপ্তাহিক", days: "নির্ধারিত দিন",
    every: "প্রতি N দিন", tags: "ট্যাগ", quantity: "পরিমাণভিত্তিক", unit: "ইউনিট", target: "লক্ষ্য", negative: "নেগেটিভ হ্যাবিট",
    date: "তারিখ", note: "নোট", done: "সম্পন্ন", titleNew: "নতুন হ্যাবিট", titleEdit: "হ্যাবিট এডিট", selectHabit: "হ্যাবিট নির্বাচন",
    weeklyX: "প্রতি সপ্তাহে কতবার", interval: "প্রতি N দিন", archiveInfo: "আর্কাইভ করা হ্যাবিট ডেটায় থাকবে।",
    imported: "ইমপোর্ট হয়েছে", demoLoaded: "ডেমো ডেটা লোড হয়েছে", cleared: "লোকাল ডেটা ডিলিট হয়েছে", install: "ইনস্টল",
    bestDay: "সেরা দিন", total: "মোট সম্পন্ন", activeDays: "অ্যাক্টিভ দিন", yearReview: "বছরের পর্যালোচনা",
    bestHabit: "সেরা হ্যাবিট", scheduled: "নির্ধারিত", noData: "এখনও যথেষ্ট ডেটা নেই।"
  }
};

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const t = key => i18n[state.lang][key] || key;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[c]));
}

function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("show"), 2200);
}

function setTheme(theme) {
  state.theme = theme;
  document.documentElement.dataset.theme = theme === "light" ? "light" : "dark";
  localStorage.setItem("streaks-theme", state.theme);
  $("#themeToggle").textContent = state.theme === "light" ? "◐" : "☼";
}

function applyLanguage() {
  $("#brandSub").textContent = state.lang === "bn" ? "অফলাইন হ্যাবিট ট্র্যাকার" : "Offline-first habit tracker";
  $("#todayLabel").textContent = t("today");
  $("#greeting").textContent = t("greeting");
  $("#todaySummary").textContent = t("summary");
  $("#addHabitButton").textContent = t("add");
  $("#progressTitle").textContent = t("progress");
  $(".nav-button[data-view='dashboardView'] small").textContent = "Home";
  $(".nav-button[data-view='calendarView'] small").textContent = t("calendar");
  $(".nav-button[data-view='statsView'] small").textContent = t("stats");
  $(".nav-button[data-view='settingsView'] small").textContent = t("settings");
  $(".nav-button[data-view='aboutView'] small").textContent = t("about");
  $("#calendarTitle").textContent = t("calendar");
  $("#statsTitle").textContent = t("stats");
  $("#settingsTitle").textContent = t("settings");
  $("#langToggle").textContent = state.lang === "en" ? "বাংলা" : "EN";
  renderStatsStrip();
  renderHabits();
  renderHeatmapCard();
  renderCharts();
  renderCalendar();
  renderStatsPage();
  renderSettings();
}

function showView(id) {
  $$(".view").forEach(view => view.classList.toggle("active", view.id === id));
  $$(".nav-button").forEach(btn => btn.classList.toggle("active", btn.dataset.view === id));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function todaySummary() {
  const active = state.habits.filter(h => !h.archived);
  let done = 0;
  let scheduled = 0;
  const date = todayISO();
  for (const habit of active) {
    const scheduledToday = true;
    if (scheduledToday) {
      scheduled++;
      if (state.entries.some(e => e.habitId === habit.id && e.date === date && e.done)) done++;
    }
  }
  $("#todaySummary").textContent = state.lang === "bn"
    ? `${done}/${scheduled} সম্পন্ন · ${scheduled ? Math.round(done / scheduled * 100) : 0}%`
    : `${done}/${scheduled} complete · ${scheduled ? Math.round(done / scheduled * 100) : 0}%`;
}

function renderStatsStrip() {
  const date = todayISO();
  const start = `${new Date().getFullYear()}-01-01`;
  const year = totals(state.habits, state.entries, start, date);
  const active = state.habits.filter(h => !h.archived);
  const current = active.reduce((sum, h) => sum + currentStreak(h, state.entries, date), 0);
  $("#statsStrip").innerHTML = [
    ["value", active.length, t("habits")],
    ["value", year.completions, t("completions")],
    ["value", `${year.percent}%`, t("percent")],
    ["value", current, t("current")]
  ].map(([_, value, label]) => `<div class="stat-chip"><div class="value">${value}</div><div class="label">${label}</div></div>`).join("");
}

function habitCard(habit) {
  const date = todayISO();
  const entry = state.entries.find(e => e.habitId === habit.id && e.date === date);
  const streak = currentStreak(habit, state.entries, date);
  const doneClass = entry?.done ? "done" : "";
  const quantityText = habit.quantityEnabled && entry?.quantity != null ? ` · ${entry.quantity}/${habit.quantityTarget || 1} ${escapeHtml(habit.quantityUnit || "")}` : "";
  const tags = (habit.tags || []).slice(0, 3).map(tag => `<span class="pill">${escapeHtml(tag)}</span>`).join("");
  return `<article class="habit-card" draggable="true" data-id="${habit.id}" style="--habit-color:${habit.color}">
    <div class="habit-icon">${escapeHtml(habit.emoji)}</div>
    <div>
      <div class="habit-name">${escapeHtml(habit.name)}</div>
      <div class="habit-meta"><span class="pill">${escapeHtml(formatFrequency(habit.frequency, state.lang))}</span>${habit.negative ? `<span class="pill">−</span>` : ""}${tags}</div>
      <div class="streak-line">🔥 ${streak} ${t("current")}${quantityText}</div>
    </div>
    <div class="habit-actions">
      <button class="complete-button ${doneClass}" data-action="complete" aria-label="${escapeHtml(habit.name)}">${entry?.done ? "✓" : "○"}</button>
      <button class="menu-button" data-action="menu">⋯</button>
    </div>
  </article>`;
}

function renderHabits() {
  const list = $("#habitList");
  const active = state.habits.filter(h => !h.archived);
  if (!active.length) {
    list.innerHTML = `<div class="empty-state"><h2>${t("noHabits")}</h2><p class="muted">${t("createFirst")}</p><button class="primary-button" data-empty-add>${t("add")}</button></div>`;
    return;
  }
  list.innerHTML = active.map(habitCard).join("");
  $$(".habit-card").forEach(card => {
    card.addEventListener("dragstart", () => card.classList.add("dragging"));
    card.addEventListener("dragend", async () => {
      card.classList.remove("dragging");
      const ids = $$(".habit-card").map(el => el.dataset.id);
      await reorderHabits(ids);
      await reload();
    });
    card.addEventListener("dragover", event => {
      event.preventDefault();
      const dragging = $(".habit-card.dragging");
      if (!dragging || dragging === card) return;
      const rect = card.getBoundingClientRect();
      const before = event.clientY < rect.top + rect.height / 2;
      card.parentNode.insertBefore(dragging, before ? card : card.nextSibling);
    });
    card.querySelector("[data-action='complete']").addEventListener("click", () => toggleToday(card.dataset.id));
    card.querySelector("[data-action='menu']").addEventListener("click", () => openHabitMenu(card.dataset.id));
  });
  $("[data-empty-add]")?.addEventListener("click", () => openHabitModal());
}

async function toggleToday(habitId) {
  const habit = state.habits.find(h => h.id === habitId);
  const date = todayISO();
  const current = await getEntry(habitId, date);
  if (current?.done) await deleteEntry(habitId, date);
  else {
    const quantity = habit.quantityEnabled ? Number(habit.quantityTarget || 1) : 1;
    await saveEntry(habitId, date, { done: true, quantity });
    if (navigator.vibrate) navigator.vibrate([18]);
  }
  await reload();
}

function openHabitMenu(id) {
  const habit = state.habits.find(h => h.id === id);
  if (!habit) return;
  const archivedText = habit.archived ? t("restore") : t("archive");
  openModal(`
    <div class="modal">
      <h2>${escapeHtml(habit.name)}</h2>
      <p class="muted">${escapeHtml(formatFrequency(habit.frequency, state.lang))}</p>
      <div class="modal-actions">
        <button class="ghost-button" data-close>${t("cancel")}</button>
        <button class="secondary-button" data-backfill>${t("backfill")}</button>
        <button class="secondary-button" data-edit>${t("edit")}</button>
        <button class="secondary-button" data-archive>${archivedText}</button>
        <button class="danger-button" data-delete>${t("delete")}</button>
      </div>
    </div>
  `);
  $("[data-backfill]").addEventListener("click", () => openEntryModal(habit.id));
  $("[data-edit]").addEventListener("click", () => openHabitModal(habit));
  $("[data-archive]").addEventListener("click", async () => { await toggleArchive(id); closeModal(); await reload(); });
  $("[data-delete]").addEventListener("click", async () => {
    if (confirm(`${t("delete")}: ${habit.name}?`)) {
      await deleteHabit(id);
      closeModal();
      await reload();
    }
  });
  $("[data-close]").addEventListener("click", closeModal);
}

function renderHeatmapCard() {
  renderHeatmap($("#heatmapCard"), state.habits.filter(h => !h.archived), state.entries, new Date().getFullYear());
}

function lineChart(title, points) {
  if (!points.length) return `<h2>${title}</h2><p class="muted">${t("noData")}</p>`;
  const width = 560, height = 180, pad = 28;
  const max = 100, min = 0;
  const x = i => pad + i * ((width - pad * 2) / Math.max(1, points.length - 1));
  const y = value => height - pad - ((value - min) / (max - min)) * (height - pad * 2);
  const poly = points.map((p, i) => `${x(i)},${y(p.value)}`).join(" ");
  const dots = points.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.value)}" r="3.5" fill="currentColor"></circle>`).join("");
  const labels = points.map((p, i) => i % Math.max(1, Math.floor(points.length / 6)) === 0 ? `<text class="chart-label" x="${x(i)}" y="${height-6}">${escapeHtml(p.label || i + 1)}</text>` : "").join("");
  return `<h2>${title}</h2><div class="chart-wrap"><svg class="chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(title)}"><polyline points="${poly}" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></polyline>${dots}${labels}</svg></div>`;
}

function barChart(title, points) {
  if (!points.length) return `<h2>${title}</h2><p class="muted">${t("noData")}</p>`;
  const width = 560, height = 180, pad = 28, inner = width - pad * 2;
  const gap = 6, barW = Math.max(6, inner / points.length - gap);
  const bars = points.map((p, i) => {
    const h = ((p.value || 0) / 100) * (height - pad * 2);
    const bx = pad + i * (inner / points.length) + gap / 2;
    const by = height - pad - h;
    return `<rect x="${bx}" y="${by}" width="${barW}" height="${h}" rx="5" fill="currentColor" opacity=".72"><title>${escapeHtml(p.label)}: ${p.value}%</title></rect>`;
  }).join("");
  return `<h2>${title}</h2><div class="chart-wrap"><svg class="chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(title)}">${bars}</svg></div>`;
}

function renderCharts() {
  const week = weeklySeries(state.habits, state.entries, todayISO(), 12).map(p => ({ value: p.value, label: p.start.slice(5) }));
  const year = new Date().getFullYear();
  const monthNames = new Intl.DateTimeFormat(state.lang === "bn" ? "bn" : "en", { month: "short" });
  const month = monthlySeries(state.habits, state.entries, year).map(p => ({ value: p.value, label: monthNames.format(new Date(year, p.month, 1)) }));
  $("#weeklyChart").innerHTML = lineChart(state.lang === "bn" ? "সাপ্তাহিক ট্রেন্ড" : "Weekly completion", week);
  $("#monthlyChart").innerHTML = barChart(state.lang === "bn" ? "মাসিক ট্রেন্ড" : "Monthly completion", month);
}

function renderCalendar() {
  const date = state.calendarDate;
  const year = date.getFullYear();
  const month = date.getMonth();
  $("#monthLabel").textContent = new Intl.DateTimeFormat(state.lang === "bn" ? "bn" : "en", { month: "long", year: "numeric" }).format(date);
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const offset = first.getDay();
  const totalDays = offset + last.getDate();
  const days = Math.ceil(totalDays / 7) * 7;
  let html = "";
  const dayNames = state.lang === "bn" ? ["রবি","সোম","মঙ্গল","বুধ","বৃহস্পতি","শুক্র","শনি"] : ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  dayNames.forEach(d => { html += `<div class="calendar-day-name">${d}</div>`; });
  const firstCell = new Date(year, month, 1 - offset);
  for (let i = 0; i < days; i++) {
    const d = new Date(firstCell);
    d.setDate(firstCell.getDate() + i);
    const iso = todayISO(d);
    const outside = d.getMonth() !== month;
    const dots = state.habits.filter(h => !h.archived && state.entries.some(e => e.habitId === h.id && e.date === iso && e.done))
      .map(h => `<span class="day-dot" style="background:${h.color}" title="${escapeHtml(h.name)}"></span>`).join("");
    html += `<div class="calendar-day ${outside ? "outside" : ""} ${iso === todayISO() ? "today" : ""}" data-date="${iso}">
      <div class="calendar-day-num">${d.getDate()}</div><div class="day-dots">${dots}</div></div>`;
  }
  $("#calendarCard").innerHTML = `<div class="calendar-grid">${html}</div>`;
  $$(".calendar-day").forEach(day => day.addEventListener("click", () => openDayDetails(day.dataset.date)));
}

function openDayDetails(date) {
  const items = state.habits.filter(h => !h.archived);
  const rows = items.map(h => {
    const e = state.entries.find(entry => entry.habitId === h.id && entry.date === date);
    return `<div class="habit-card" style="--habit-color:${h.color}">
      <div class="habit-icon">${escapeHtml(h.emoji)}</div>
      <div><div class="habit-name">${escapeHtml(h.name)}</div><div class="muted small">${e?.done ? t("completed") : "—"}${h.quantityEnabled && e?.quantity ? ` · ${e.quantity} ${escapeHtml(h.quantityUnit || "")}` : ""}</div></div>
      <button class="menu-button" data-day-note="${h.id}">${t("notes")}</button>
    </div>`;
  }).join("");
  openModal(`<div class="modal"><h2>${escapeHtml(date)}</h2><div class="modal-grid">${rows || `<p class="muted">${t("noHabits")}</p>`}</div><div class="modal-actions"><button class="ghost-button" data-close>${t("cancel")}</button><button class="primary-button" data-add-day>${t("backfill")}</button></div></div>`);
  $("[data-add-day]").addEventListener("click", () => openEntryModal(items[0]?.id, date));
  $$("[data-day-note]").forEach(btn => btn.addEventListener("click", () => openEntryModal(btn.dataset.dayNote, date)));
  $("[data-close]").addEventListener("click", closeModal);
}

function renderStatsPage() {
  const now = todayISO();
  const start = `${new Date().getFullYear()}-01-01`;
  const review = yearReview(state.habits, state.entries, new Date().getFullYear());
  const active = state.habits.filter(h => !h.archived);
  const best = active.length ? Math.max(...active.map(h => longestStreak(h, state.entries))) : 0;
  const cards = [
    [review.completions, t("total")],
    [review.percent + "%", t("percent")],
    [review.bestDay.done, t("bestDay")],
    [best, t("longest")]
  ];
  $("#statsCards").innerHTML = cards.map(([value, label]) => `<div class="card big-stat"><div class="value">${value}</div><div class="muted">${label}</div></div>`).join("");
  const bestName = review.bestHabit?.habit?.name || "—";
  const currentTotal = active.reduce((sum, h) => sum + currentStreak(h, state.entries, now), 0);
  $("#yearReview").innerHTML = `<h2>${t("yearReview")}</h2>
    <div class="review-grid">
      <div class="review-item"><strong>${escapeHtml(bestName)}</strong><div class="muted">${t("bestHabit")}</div></div>
      <div class="review-item"><strong>${currentTotal}</strong><div class="muted">${t("current")}</div></div>
      <div class="review-item"><strong>${escapeHtml(review.bestDayLabel)}</strong><div class="muted">${t("bestDay")}</div></div>
      <div class="review-item"><strong>${review.activeHabits}</strong><div class="muted">${t("habits")}</div></div>
    </div>`;
}

function renderSettings() {
  $("#notifyEnabled").checked = Boolean(state.settings.notifyEnabled);
  $("#notifyTime").value = state.settings.notifyTime || "21:00";
  $("#chainWarning").checked = Boolean(state.settings.chainWarning);
  $("#webdavUrl").value = state.settings.webdavUrl || "";
  $("#webdavUser").value = state.settings.webdavUser || "";
}

function openModal(inner) {
  $("#modalRoot").innerHTML = inner;
  $("#modalRoot").hidden = false;
}

function closeModal() {
  $("#modalRoot").hidden = true;
  $("#modalRoot").innerHTML = "";
}

function openHabitModal(habit = null) {
  const editing = Boolean(habit);
  const base = habit || { ...defaultHabitForForm(), id: "", tags: [], frequency: { type: "daily", value: 1, days: [] } };
  const selectedDays = new Set(base.frequency?.days || []);
  openModal(`<div class="modal">
    <h2>${editing ? t("titleEdit") : t("titleNew")}</h2>
    <div class="modal-grid">
      <label>${t("name")}<input id="habitName" value="${escapeHtml(base.name)}" maxlength="80"></label>
      <div class="form-row">
        <label>${t("emoji")}<input id="habitEmoji" value="${escapeHtml(base.emoji)}" maxlength="4"></label>
        <label>${t("color")}<input id="habitColor" type="color" value="${escapeHtml(base.color)}"></label>
      </div>
      <label>${t("frequency")}
        <select id="habitFrequency">
          <option value="daily" ${base.frequency?.type === "daily" ? "selected" : ""}>${t("daily")}</option>
          <option value="weekly" ${base.frequency?.type === "weekly" ? "selected" : ""}>${t("weekly")}</option>
          <option value="days" ${base.frequency?.type === "days" ? "selected" : ""}>${t("days")}</option>
          <option value="interval" ${base.frequency?.type === "interval" ? "selected" : ""}>${t("every")}</option>
        </select>
      </label>
      <div id="frequencyExtra"></div>
      <label>${t("tags")}<div id="tagsBox" class="tags-input"><input id="tagInput" placeholder="work, health"><div id="tagPills"></div></div></label>
      <label class="toggle-row"><span>${t("quantity")}</span><input id="quantityEnabled" type="checkbox" ${base.quantityEnabled ? "checked" : ""}><span class="switch"></span></label>
      <div class="form-row" id="quantityFields">
        <label>${t("unit")}<input id="quantityUnit" value="${escapeHtml(base.quantityUnit || "")}"></label>
        <label>${t("target")}<input id="quantityTarget" type="number" min="0" step="0.1" value="${Number(base.quantityTarget || 1)}"></label>
      </div>
      <label class="toggle-row"><span>${t("negative")}</span><input id="negativeHabit" type="checkbox" ${base.negative ? "checked" : ""}><span class="switch"></span></label>
    </div>
    <div class="modal-actions"><button class="ghost-button" data-close>${t("cancel")}</button><button class="primary-button" id="saveHabit">${t("save")}</button></div>
  </div>`);
  let tags = [...(base.tags || [])];
  const renderTags = () => { $("#tagPills").innerHTML = tags.map(tag => `<span class="tag-pill">${escapeHtml(tag)}</span>`).join(""); };
  renderTags();
  $("#tagInput").addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      const value = event.target.value.trim().replace(/,$/, "");
      if (value && !tags.includes(value)) tags.push(value);
      event.target.value = "";
      renderTags();
    }
  });
  const renderExtra = () => {
    const type = $("#habitFrequency").value;
    $("#frequencyExtra").innerHTML = type === "weekly"
      ? `<label>${t("weeklyX")}<input id="frequencyValue" type="number" min="1" max="7" value="${Number(base.frequency?.value || 1)}"></label>`
      : type === "interval"
        ? `<label>${t("interval")}<input id="frequencyValue" type="number" min="1" max="365" value="${Number(base.frequency?.value || 1)}"></label>`
        : type === "days"
          ? `<div><p class="muted small">${t("days")}</p><div class="checkbox-grid">${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((label, i) => `<label class="day-check"><input type="checkbox" value="${i}" ${selectedDays.has(i) ? "checked" : ""}><span>${label[0]}</span></label>`).join("")}</div></div>`
          : "";
  };
  renderExtra();
  $("#habitFrequency").addEventListener("change", renderExtra);
  $("[data-close]").addEventListener("click", closeModal);
  $("#saveHabit").addEventListener("click", async () => {
    const type = $("#habitFrequency").value;
    const frequency = { type, value: 1, days: [] };
    if (type === "weekly" || type === "interval") frequency.value = Number($("#frequencyValue").value || 1);
    if (type === "days") frequency.days = $$(".day-check input:checked").map(input => Number(input.value));
    const inputTag = $("#tagInput").value.trim();
    if (inputTag && !tags.includes(inputTag)) tags.push(inputTag);
    const next = {
      ...defaultHabit(editing ? habit.order : state.habits.length),
      ...base,
      id: editing ? habit.id : makeId("habit"),
      name: $("#habitName").value.trim() || "Untitled habit",
      emoji: $("#habitEmoji").value.trim() || "✨",
      color: $("#habitColor").value,
      frequency,
      tags,
      quantityEnabled: $("#quantityEnabled").checked,
      quantityUnit: $("#quantityUnit").value.trim(),
      quantityTarget: Number($("#quantityTarget").value || 1),
      negative: $("#negativeHabit").checked
    };
    await saveHabit(next);
    closeModal();
    await reload();
    toast(t("saved"));
  });
}

function defaultHabitForForm() {
  return { name: "", emoji: "✨", color: "#8b5cf6", quantityEnabled: false, quantityUnit: "", quantityTarget: 1, negative: false, order: state.habits.length };
}

function openEntryModal(habitId, date = todayISO()) {
  if (!habitId) return;
  const habit = state.habits.find(h => h.id === habitId);
  if (!habit) return;
  const current = state.entries.find(e => e.habitId === habitId && e.date === date);
  openModal(`<div class="modal">
    <h2>${escapeHtml(habit.name)}</h2>
    <p class="muted">${escapeHtml(date)}</p>
    <div class="modal-grid">
      <label class="toggle-row"><span>${t("done")}</span><input id="entryDone" type="checkbox" ${current?.done ? "checked" : ""}><span class="switch"></span></label>
      ${habit.quantityEnabled ? `<label>${t("quantity")} · ${escapeHtml(habit.quantityUnit || "")}<input id="entryQuantity" type="number" min="0" step="0.1" value="${Number(current?.quantity || habit.quantityTarget || 1)}"></label>` : ""}
      <label>${t("note")}<textarea id="entryNote" placeholder="${t("notes")}">${escapeHtml(current?.note || "")}</textarea></label>
    </div>
    <div class="modal-actions"><button class="ghost-button" data-close>${t("cancel")}</button><button class="danger-button" id="removeEntry">${t("delete")}</button><button class="primary-button" id="saveEntry">${t("save")}</button></div>
  </div>`);
  $("[data-close]").addEventListener("click", closeModal);
  $("#removeEntry").addEventListener("click", async () => { await deleteEntry(habitId, date); closeModal(); await reload(); });
  $("#saveEntry").addEventListener("click", async () => {
    await saveEntry(habitId, date, {
      done: $("#entryDone").checked,
      quantity: habit.quantityEnabled ? Number($("#entryQuantity").value || 0) : 1,
      note: $("#entryNote").value
    });
    closeModal();
    await reload();
    toast(t("saved"));
  });
}

function csvText() {
  const rows = [["habit_id","habit_name","date","done","quantity","note"]];
  for (const entry of state.entries) {
    const habit = state.habits.find(h => h.id === entry.habitId);
    rows.push([entry.habitId, habit?.name || "", entry.date, entry.done ? "1" : "0", entry.quantity ?? "", entry.note || ""]);
  }
  return rows.map(row => row.map(value => `"${String(value).replaceAll('"','""')}"`).join(",")).join("\n");
}

function download(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

async function handleExportJson() {
  download(`streaks-${todayISO()}.json`, JSON.stringify(await exportJson(), null, 2), "application/json");
}

function jsonPayloadForBackup(data) {
  return JSON.stringify(data);
}

async function deriveKey(password, salt) {
  const baseKey = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 210000, hash: "SHA-256" }, baseKey, { name: "AES-GCM", length: 256 }, false, ["encrypt","decrypt"]);
}

async function encryptBackup(data, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(jsonPayloadForBackup(data))));
  const packet = { v: 1, salt: Array.from(salt), iv: Array.from(iv), data: Array.from(cipher) };
  return JSON.stringify(packet);
}

async function decryptBackup(text, password) {
  const packet = JSON.parse(text);
  const salt = new Uint8Array(packet.salt);
  const iv = new Uint8Array(packet.iv);
  const key = await deriveKey(password, salt);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, new Uint8Array(packet.data));
  return JSON.parse(new TextDecoder().decode(plain));
}

async function webdavHeaders(password) {
  const user = $("#webdavUser").value.trim();
  return {
    "Authorization": `Basic ${btoa(`${user}:${password}`)}`,
    "Content-Type": "application/octet-stream"
  };
}

async function webdavUpload() {
  const url = $("#webdavUrl").value.trim();
  const user = $("#webdavUser").value.trim();
  const accountPassword = $("#webdavPass").value;
  const backupPassword = $("#backupPass").value;
  if (!url || !user || !accountPassword || !backupPassword) throw new Error("Complete WebDAV fields first");
  const encrypted = await encryptBackup(await exportJson(), backupPassword);
  const response = await fetch(url, { method: "PUT", headers: await webdavHeaders(accountPassword), body: encrypted });
  if (!response.ok) throw new Error(`WebDAV upload failed: ${response.status}`);
  await setSetting("webdavUrl", url);
  await setSetting("webdavUser", user);
  toast("Encrypted backup uploaded");
}

async function webdavDownload() {
  const url = $("#webdavUrl").value.trim();
  const user = $("#webdavUser").value.trim();
  const accountPassword = $("#webdavPass").value;
  const backupPassword = $("#backupPass").value;
  if (!url || !user || !accountPassword || !backupPassword) throw new Error("Complete WebDAV fields first");
  const response = await fetch(url, { headers: await webdavHeaders(accountPassword) });
  if (!response.ok) throw new Error(`WebDAV download failed: ${response.status}`);
  const payload = await decryptBackup(await response.text(), backupPassword);
  await importJson(payload, true);
  await reload();
  toast("Encrypted backup restored");
}

async function installPwa() {
  if (!state.deferredInstall) return;
  state.deferredInstall.prompt();
  await state.deferredInstall.userChoice;
  state.deferredInstall = null;
  $("#installButton").hidden = true;
}

function bind() {
  $("#themeToggle").addEventListener("click", () => setTheme(state.theme === "dark" ? "light" : "dark"));
  $("#langToggle").addEventListener("click", () => {
    state.lang = state.lang === "en" ? "bn" : "en";
    localStorage.setItem("streaks-lang", state.lang);
    applyLanguage();
    reload();
  });
  $("#brandButton").addEventListener("click", () => showView("dashboardView"));
  $("#addHabitButton").addEventListener("click", () => openHabitModal());
  $("#installButton").addEventListener("click", installPwa);
  $("#moreButton").addEventListener("click", () => showView("settingsView"));
  $$(".view-tab").forEach(btn => btn.addEventListener("click", () => showView(btn.dataset.view)));
  $$(".nav-button").forEach(btn => btn.addEventListener("click", () => showView(btn.dataset.view)));
  $$("[data-home]").forEach(btn => btn.addEventListener("click", () => showView("dashboardView")));
  $("#prevMonth").addEventListener("click", () => { state.calendarDate.setMonth(state.calendarDate.getMonth() - 1); renderCalendar(); });
  $("#nextMonth").addEventListener("click", () => { state.calendarDate.setMonth(state.calendarDate.getMonth() + 1); renderCalendar(); });

  $("#exportJson").addEventListener("click", handleExportJson);
  $("#exportCsv").addEventListener("click", () => download(`streaks-${todayISO()}.csv`, csvText(), "text/csv;charset=utf-8"));
  $("#importJson").addEventListener("change", async event => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      await importJson(data, true);
      await reload();
      toast(t("imported"));
    } catch (error) {
      toast(error.message);
    }
    event.target.value = "";
  });
  $("#demoButton").addEventListener("click", async () => {
    await buildDemoData();
    await reload();
    toast(t("demoLoaded"));
  });
  $("#demoModeButton").addEventListener("click", async () => {
    await buildDemoData();
    await reload();
    showView("dashboardView");
    toast(t("demoLoaded"));
  });
  $("#clearData").addEventListener("click", async () => {
    if (!confirm("Delete all Streaks data from this device?")) return;
    await clearAll();
    await reload();
    toast(t("cleared"));
  });
  $("#saveNotify").addEventListener("click", async () => {
    if ($("#notifyEnabled").checked) {
      const permission = await requestNotificationPermission();
      if (permission !== "granted") {
        $("#notifyStatus").textContent = "Browser permission was not granted.";
        return;
      }
    }
    await saveNotificationSettings({
      enabled: $("#notifyEnabled").checked,
      time: $("#notifyTime").value || "21:00",
      chainWarning: $("#chainWarning").checked
    });
    state.settings = await getSettings();
    $("#notifyStatus").textContent = "Notification settings saved.";
  });
  $("#webdavUpload").addEventListener("click", async () => {
    try { await webdavUpload(); } catch (error) { $("#webdavStatus").textContent = error.message; }
  });
  $("#webdavDownload").addEventListener("click", async () => {
    try { await webdavDownload(); } catch (error) { $("#webdavStatus").textContent = error.message; }
  });

  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    state.deferredInstall = event;
    $("#installButton").hidden = false;
  });
  window.addEventListener("appinstalled", () => $("#installButton").hidden = true);
}

async function reload() {
  state.habits = await listHabits({ includeArchived: true });
  state.entries = await listEntries();
  state.settings = await getSettings();
  todaySummary();
  renderStatsStrip();
  renderHabits();
  renderHeatmapCard();
  renderCharts();
  renderCalendar();
  renderStatsPage();
  renderSettings();
  await maybeNotify(state.habits, state.entries, state.lang);
  await maybeChainWarning(state.habits, state.entries, state.lang);
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("./service-worker.js", { scope: "./" });
  } catch (error) {
    console.error(error);
  }
}

setTheme(state.theme);
bind();
applyLanguage();
registerServiceWorker();