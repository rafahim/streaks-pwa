import { getAll, get, put, remove, exportData, importData } from "./db.js";

export function makeId(prefix = "id") {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function todayISO(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
}

export function addDays(date, amount) {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + amount);
  return todayISO(d);
}

export function diffDays(a, b) {
  const x = new Date(`${a}T00:00:00`);
  const y = new Date(`${b}T00:00:00`);
  return Math.round((y - x) / 86400000);
}

export function formatFrequency(frequency, lang = "en") {
  const t = lang === "bn" ? {
    daily: "প্রতিদিন",
    weekly: "প্রতি সপ্তাহে",
    days: "নির্ধারিত দিন",
    every: "প্রতি"
  } : {
    daily: "Daily",
    weekly: "Weekly",
    days: "Selected days",
    every: "Every"
  };
  if (!frequency) return t.daily;
  if (frequency.type === "weekly") return `${frequency.value || 1} ${t.weekly.toLowerCase()}`;
  if (frequency.type === "days") return t.days;
  if (frequency.type === "interval") return `${t.every} ${frequency.value || 1} day${frequency.value === 1 ? "" : "s"}`;
  return t.daily;
}

export function defaultHabit(order = 0) {
  return {
    id: makeId("habit"),
    name: "New habit",
    emoji: "✨",
    color: "#8b5cf6",
    frequency: { type: "daily", value: 1, days: [] },
    tags: [],
    archived: false,
    order,
    quantityEnabled: false,
    quantityUnit: "",
    quantityTarget: 1,
    negative: false,
    createdAt: new Date().toISOString()
  };
}

export async function listHabits({ includeArchived = false } = {}) {
  const habits = await getAll("habits");
  return habits
    .filter(h => includeArchived || !h.archived)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export async function saveHabit(habit) {
  return put("habits", {
    ...defaultHabit(habit.order),
    ...habit,
    id: habit.id || makeId("habit")
  });
}

export async function deleteHabit(id) {
  return remove("habits", id);
}

export async function toggleArchive(id) {
  const habit = await get("habits", id);
  if (!habit) return;
  habit.archived = !habit.archived;
  await put("habits", habit);
  return habit;
}

export function isScheduled(habit, date) {
  if (habit.archived) return false;
  const day = new Date(`${date}T00:00:00`).getDay();
  const created = habit.createdAt ? todayISO(new Date(habit.createdAt)) : date;
  if (date < created) return false;
  const frequency = habit.frequency || { type: "daily", value: 1, days: [] };
  if (frequency.type === "daily") return true;
  if (frequency.type === "weekly") {
    const weeks = Math.floor(diffDays(created, date) / 7);
    return weeks % Math.max(1, Number(frequency.value || 1)) === 0;
  }
  if (frequency.type === "days") return Array.isArray(frequency.days) && frequency.days.includes(day);
  if (frequency.type === "interval") return diffDays(created, date) % Math.max(1, Number(frequency.value || 1)) === 0;
  return true;
}

export async function getEntry(habitId, date) {
  return get("entries", `${habitId}:${date}`);
}

export async function saveEntry(habitId, date, values = {}) {
  const current = await getEntry(habitId, date);
  const entry = {
    id: `${habitId}:${date}`,
    habitId,
    date,
    done: values.done ?? current?.done ?? true,
    quantity: values.quantity ?? current?.quantity ?? 1,
    note: values.note ?? current?.note ?? "",
    updatedAt: new Date().toISOString()
  };
  return put("entries", entry);
}

export async function deleteEntry(habitId, date) {
  return remove("entries", `${habitId}:${date}`);
}

export async function listEntries() {
  return getAll("entries");
}

export async function reorderHabits(ids) {
  const habits = await listHabits({ includeArchived: true });
  const map = new Map(habits.map(h => [h.id, h]));
  ids.forEach((id, index) => {
    if (map.has(id)) {
      map.get(id).order = index;
      map.get(id).updatedAt = new Date().toISOString();
    }
  });
  await Promise.all([...map.values()].map(h => put("habits", h)));
}

export async function exportJson() {
  return exportData();
}

export async function importJson(data, replace = true) {
  return importData(data, replace);
}

export async function buildDemoData() {
  const start = new Date();
  start.setDate(start.getDate() - 180);
  const colors = ["#8b5cf6", "#06b6d4", "#f97316", "#22c55e", "#ec4899"];
  const demoHabits = [
    { name: "Deep work", emoji: "🧠", color: colors[0], frequency: { type: "daily", value: 1, days: [] }, tags: ["focus", "work"], quantityEnabled: true, quantityUnit: "minutes", quantityTarget: 60, negative: false },
    { name: "Walk", emoji: "🚶", color: colors[1], frequency: { type: "daily", value: 1, days: [] }, tags: ["health"], quantityEnabled: true, quantityUnit: "steps", quantityTarget: 5000, negative: false },
    { name: "Read", emoji: "📚", color: colors[2], frequency: { type: "days", value: 1, days: [0, 2, 4, 6] }, tags: ["learning"], quantityEnabled: true, quantityUnit: "pages", quantityTarget: 10, negative: false },
    { name: "No late-night snacks", emoji: "🌙", color: colors[3], frequency: { type: "daily", value: 1, days: [] }, tags: ["wellness"], quantityEnabled: false, quantityUnit: "", quantityTarget: 1, negative: true }
  ];
  for (let i = 0; i < demoHabits.length; i++) {
    const h = await saveHabit({ ...defaultHabit(i), ...demoHabits[i], id: makeId("demo-habit"), order: i, createdAt: start.toISOString() });
    for (let cursor = new Date(start); cursor <= new Date(); cursor.setDate(cursor.getDate() + 1)) {
      const date = todayISO(cursor);
      if (!isScheduled(h, date)) continue;
      const chance = i === 2 ? .62 : .78;
      if (Math.random() < chance) {
        const quantity = h.quantityEnabled ? Math.max(1, Math.round((h.quantityTarget || 1) * (0.7 + Math.random() * .8))) : 1;
        const note = Math.random() < .08 ? "Demo note" : "";
        await saveEntry(h.id, date, { done: true, quantity, note });
      }
    }
  }
  return true;
}