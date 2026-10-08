import { getSettings, setSetting } from "./db.js";
import { todayISO, addDays, isScheduled, getEntry } from "./habits.js";

export async function getNotificationSettings() {
  const settings = await getSettings();
  return {
    enabled: Boolean(settings.notifyEnabled),
    time: settings.notifyTime || "21:00",
    chainWarning: Boolean(settings.chainWarning)
  };
}

export async function saveNotificationSettings(value) {
  await setSetting("notifyEnabled", Boolean(value.enabled));
  await setSetting("notifyTime", value.time || "21:00");
  await setSetting("chainWarning", Boolean(value.chainWarning));
  return getNotificationSettings();
}

export async function requestNotificationPermission() {
  if (!("Notification" in window)) return "unsupported";
  return Notification.requestPermission();
}

export function notificationSupported() {
  return "Notification" in window;
}

export async function maybeNotify(habits, entries, lang = "en") {
  if (!notificationSupported()) return;
  const settings = await getNotificationSettings();
  if (!settings.enabled || Notification.permission !== "granted") return;
  const now = new Date();
  const current = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const date = todayISO();
  if (current < settings.time) return;
  const pending = [];
  for (const habit of habits.filter(h => !h.archived)) {
    if (isScheduled(habit, date) && !await getEntry(habit.id, date)) pending.push(habit);
  }
  if (!pending.length) return;
  const lastCheck = (await getSettings()).lastNotificationDate;
  if (lastCheck === date) return;
  await setSetting("lastNotificationDate", date);
  const body = lang === "bn" ? `${pending.length}টি হ্যাবিট এখনও বাকি আছে।` : `${pending.length} habit${pending.length === 1 ? "" : "s"} still need attention.`;
  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({ type: "NOTIFY", title: "Streaks", body });
  } else {
    new Notification("Streaks", { body, icon: "./favicon.svg" });
  }
}

export async function maybeChainWarning(habits, entries, lang = "en") {
  if (!notificationSupported()) return;
  const settings = await getNotificationSettings();
  if (!settings.enabled || !settings.chainWarning || Notification.permission !== "granted") return;
  const date = todayISO();
  const pending = [];
  for (const habit of habits.filter(h => !h.archived)) {
    const entry = await getEntry(habit.id, date);
    if (isScheduled(habit, date) && !entry) {
      const yesterday = addDays(date, -1);
      const y = await getEntry(habit.id, yesterday);
      if (y) pending.push(habit);
    }
  }
  if (!pending.length) return;
  const lastWarning = (await getSettings()).lastChainWarningDate;
  if (lastWarning === date) return;
  await setSetting("lastChainWarningDate", date);
  const body = lang === "bn" ? `${pending.length}টি streak আজ ভাঙার পথে।` : `${pending.length} streak${pending.length === 1 ? " is" : "s are"} at risk today.`;
  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({ type: "NOTIFY", title: "Protect your streaks", body });
  } else {
    new Notification("Protect your streaks", { body, icon: "./favicon.svg" });
  }
}