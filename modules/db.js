const DB_NAME = "streaks-db";
const DB_VERSION = 1;

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error("Transaction aborted"));
  });
}

export function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("habits")) {
        const store = db.createObjectStore("habits", { keyPath: "id" });
        store.createIndex("order", "order", { unique: false });
        store.createIndex("archived", "archived", { unique: false });
      }
      if (!db.objectStoreNames.contains("entries")) {
        const store = db.createObjectStore("entries", { keyPath: "id" });
        store.createIndex("habitId", "habitId", { unique: false });
        store.createIndex("date", "date", { unique: false });
        store.createIndex("habitDate", ["habitId", "date"], { unique: true });
      }
      if (!db.objectStoreNames.contains("settings")) db.createObjectStore("settings", { keyPath: "key" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAll(storeName) {
  const db = await openDB();
  const tx = db.transaction(storeName, "readonly");
  const result = await requestToPromise(tx.objectStore(storeName).getAll());
  db.close();
  return result;
}

export async function get(storeName, key) {
  const db = await openDB();
  const tx = db.transaction(storeName, "readonly");
  const result = await requestToPromise(tx.objectStore(storeName).get(key));
  db.close();
  return result;
}

export async function put(storeName, value) {
  const db = await openDB();
  const tx = db.transaction(storeName, "readwrite");
  tx.objectStore(storeName).put(value);
  await transactionDone(tx);
  db.close();
  return value;
}

export async function remove(storeName, key) {
  const db = await openDB();
  const tx = db.transaction(storeName, "readwrite");
  tx.objectStore(storeName).delete(key);
  await transactionDone(tx);
  db.close();
}

export async function clearStore(storeName) {
  const db = await openDB();
  const tx = db.transaction(storeName, "readwrite");
  tx.objectStore(storeName).clear();
  await transactionDone(tx);
  db.close();
}

export async function clearAll() {
  const db = await openDB();
  const tx = db.transaction(["habits", "entries", "settings"], "readwrite");
  tx.objectStore("habits").clear();
  tx.objectStore("entries").clear();
  tx.objectStore("settings").clear();
  await transactionDone(tx);
  db.close();
}

export async function getSettings() {
  const rows = await getAll("settings");
  return Object.fromEntries(rows.map(row => [row.key, row.value]));
}

export async function setSetting(key, value) {
  return put("settings", { key, value });
}

export async function exportData() {
  const [habits, entries, settings] = await Promise.all([getAll("habits"), getAll("entries"), getAll("settings")]);
  return {
    version: 1,
    app: "Streaks",
    exportedAt: new Date().toISOString(),
    habits,
    entries,
    settings
  };
}

export async function importData(data, replace = true) {
  const normalized = {
    habits: Array.isArray(data?.habits) ? data.habits : [],
    entries: Array.isArray(data?.entries) ? data.entries : [],
    settings: Array.isArray(data?.settings) ? data.settings : []
  };
  const db = await openDB();
  const tx = db.transaction(["habits", "entries", "settings"], "readwrite");
  if (replace) {
    tx.objectStore("habits").clear();
    tx.objectStore("entries").clear();
    tx.objectStore("settings").clear();
  }
  normalized.habits.forEach(item => tx.objectStore("habits").put(item));
  normalized.entries.forEach(item => tx.objectStore("entries").put(item));
  normalized.settings.forEach(item => tx.objectStore("settings").put(item));
  await transactionDone(tx);
  db.close();
}