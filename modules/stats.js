import { diffDays, addDays, isScheduled, todayISO } from "./habits.js";

export function byHabit(entries, habitId) {
  return entries.filter(e => e.habitId === habitId && e.done).sort((a, b) => a.date.localeCompare(b.date));
}

export function currentStreak(habit, entries, endDate = todayISO()) {
  const done = new Set(byHabit(entries, habit.id).map(e => e.date));
  let streak = 0;
  let cursor = endDate;
  for (let guard = 0; guard < 3660; guard++) {
    if (isScheduled(habit, cursor)) {
      if (done.has(cursor)) streak++;
      else break;
    }
    cursor = addDays(cursor, -1);
    if (cursor < (habit.createdAt ? todayISO(new Date(habit.createdAt)) : cursor)) break;
  }
  return streak;
}

export function longestStreak(habit, entries) {
  const dates = new Set(byHabit(entries, habit.id).map(e => e.date));
  const allDates = [...dates].sort();
  let best = 0;
  let run = 0;
  let cursor = allDates[0];
  if (!cursor) return 0;
  const first = allDates[0];
  const last = allDates[allDates.length - 1];
  for (; cursor <= last; cursor = addDays(cursor, 1)) {
    if (isScheduled(habit, cursor)) {
      if (dates.has(cursor)) run++;
      else run = 0;
      best = Math.max(best, run);
    }
  }
  return best;
}

export function completionPercent(habit, entries, fromDate, toDate) {
  let scheduled = 0;
  let done = 0;
  for (let cursor = fromDate; cursor <= toDate; cursor = addDays(cursor, 1)) {
    if (!isScheduled(habit, cursor)) continue;
    scheduled++;
    if (entries.some(e => e.habitId === habit.id && e.date === cursor && e.done)) done++;
  }
  return scheduled ? Math.round(done / scheduled * 100) : 0;
}

export function aggregateDays(habits, entries, fromDate, toDate) {
  const map = new Map();
  for (let cursor = fromDate; cursor <= toDate; cursor = addDays(cursor, 1)) {
    let done = 0;
    let scheduled = 0;
    for (const habit of habits) {
      if (isScheduled(habit, cursor)) {
        scheduled++;
        if (entries.some(e => e.habitId === habit.id && e.date === cursor && e.done)) done++;
      }
    }
    map.set(cursor, { done, scheduled, percent: scheduled ? done / scheduled : 0 });
  }
  return map;
}

export function totals(habits, entries, fromDate, toDate) {
  const active = habits.filter(h => !h.archived);
  const aggregate = aggregateDays(active, entries, fromDate, toDate);
  let completions = 0;
  let scheduled = 0;
  let bestDay = { date: fromDate, done: 0 };
  aggregate.forEach((value, date) => {
    completions += value.done;
    scheduled += value.scheduled;
    if (value.done > bestDay.done) bestDay = { date, done: value.done };
  });
  const perHabit = active.map(habit => ({
    habit,
    current: currentStreak(habit, entries, toDate),
    longest: longestStreak(habit, entries),
    percent: completionPercent(habit, entries, fromDate, toDate),
    total: entries.filter(e => e.habitId === habit.id && e.done && e.date >= fromDate && e.date <= toDate).length
  }));
  return { completions, scheduled, percent: scheduled ? Math.round(completions / scheduled * 100) : 0, bestDay, perHabit, aggregate };
}

export function weeklySeries(habits, entries, endDate = todayISO(), days = 12) {
  const start = addDays(endDate, -(days * 7 - 1));
  const result = [];
  for (let cursor = start; cursor <= endDate; cursor = addDays(cursor, 7)) {
    const weekEnd = addDays(cursor, 6);
    const end = weekEnd > endDate ? endDate : weekEnd;
    const t = totals(habits, entries, cursor, end);
    result.push({ start: cursor, end, value: t.percent });
  }
  return result;
}

export function monthlySeries(habits, entries, year) {
  const result = [];
  for (let month = 0; month < 12; month++) {
    const start = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const last = new Date(year, month + 1, 0).getDate();
    const end = `${year}-${String(month + 1).padStart(2, "0")}-${last}`;
    const t = totals(habits, entries, start, end);
    result.push({ month, value: t.percent });
  }
  return result;
}

export function yearReview(habits, entries, year) {
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;
  const t = totals(habits, entries, start, end);
  const active = habits.filter(h => !h.archived);
  const bestHabit = [...t.perHabit].sort((a, b) => b.percent - a.percent)[0];
  return {
    ...t,
    activeHabits: active.length,
    bestHabit,
    bestDayLabel: t.bestDay.date
  };
}