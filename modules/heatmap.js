import { addDays } from "./habits.js";

export function renderHeatmap(container, habits, entries, year) {
  const entryMap = new Map();
  for (const entry of entries) {
    if (!entry.done || !entry.date.startsWith(String(year))) continue;
    entryMap.set(entry.date, (entryMap.get(entry.date) || 0) + 1);
  }
  const start = new Date(`${year}-01-01T00:00:00`);
  const end = new Date(`${year}-12-31T00:00:00`);
  const startDay = start.getDay();
  const gridStart = new Date(start);
  gridStart.setDate(gridStart.getDate() - startDay);
  const cells = [];
  for (let i = 0; i < 371; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    const date = d.toISOString().slice(0, 10);
    if (d > end && d.getDay() === 6) break;
    const count = entryMap.get(date) || 0;
    const level = count >= Math.max(3, habits.length) ? 4 : count >= 3 ? 3 : count === 2 ? 2 : count === 1 ? 1 : 0;
    cells.push(`<div class="heat-cell l${level}" title="${date}: ${count}" data-date="${date}"></div>`);
  }
  container.innerHTML = `
    <div class="heatmap-head">
      <div><strong>${year} activity</strong><div class="muted small">${entryMap.size} active days</div></div>
      <div class="muted small">Less · More</div>
    </div>
    <div class="heatmap-scroll"><div class="heatmap">${cells.join("")}</div></div>`;
}