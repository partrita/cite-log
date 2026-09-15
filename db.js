// cite-log - High Performance IndexedDB Layer

const CITE_DB_NAME = "CiteLogDB";
const CITE_DB_VERSION = 1;
const CITE_STORE = "citations";

let _dbConnection = null;

function getDB() {
  if (_dbConnection) return Promise.resolve(_dbConnection);

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(CITE_DB_NAME, CITE_DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(CITE_STORE)) {
        const store = db.createObjectStore(CITE_STORE, { keyPath: "id" });
        store.createIndex("timestamp", "timestamp", { unique: false });
        store.createIndex("project", "project", { unique: false });
        store.createIndex("dateOnly", "dateOnly", { unique: false });
      }
    };

    req.onsuccess = (e) => {
      _dbConnection = e.target.result;
      resolve(_dbConnection);
    };

    req.onerror = (e) => reject(e.target.error);
  });
}

// Add or update citation
async function dbSaveCitation(item) {
  const db = await getDB();
  // Ensure dateOnly field exists (e.g. "2026-09-15")
  if (!item.dateOnly) {
    const d = item.datetime ? item.datetime.split(" ")[0] : new Date().toISOString().slice(0, 10);
    item.dateOnly = d;
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CITE_STORE, "readwrite");
    const store = tx.objectStore(CITE_STORE);
    const req = store.put(item);
    req.onsuccess = () => resolve(item);
    req.onerror = (e) => reject(e.target.error);
  });
}

// Get all citations sorted by timestamp (newest first)
async function dbGetAllCitations() {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CITE_STORE, "readonly");
    const store = tx.objectStore(CITE_STORE);
    const index = store.index("timestamp");
    const items = [];
    const req = index.openCursor(null, "prev"); // newest first

    req.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        items.push(cursor.value);
        cursor.continue();
      } else {
        resolve(items);
      }
    };

    req.onerror = (e) => reject(e.target.error);
  });
}

// Get citations for a specific date (for Daily Log mode)
async function dbGetCitationsByDate(dateOnly) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CITE_STORE, "readonly");
    const store = tx.objectStore(CITE_STORE);
    const index = store.index("dateOnly");
    const req = index.getAll(dateOnly);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = (e) => reject(e.target.error);
  });
}

// Get total count
async function dbGetCount() {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CITE_STORE, "readonly");
    const store = tx.objectStore(CITE_STORE);
    const req = store.count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

// Delete citation by ID
async function dbDeleteCitation(id) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CITE_STORE, "readwrite");
    const store = tx.objectStore(CITE_STORE);
    const req = store.delete(id);
    req.onsuccess = () => resolve(true);
    req.onerror = (e) => reject(e.target.error);
  });
}

// Clear all citations
async function dbClearAll() {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CITE_STORE, "readwrite");
    const store = tx.objectStore(CITE_STORE);
    const req = store.clear();
    req.onsuccess = () => resolve(true);
    req.onerror = (e) => reject(e.target.error);
  });
}

// Import bulk citations (for backup restore or migration)
async function dbBulkInsert(items) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CITE_STORE, "readwrite");
    const store = tx.objectStore(CITE_STORE);
    for (const item of items) {
      if (!item.dateOnly) {
        item.dateOnly = item.datetime ? item.datetime.split(" ")[0] : new Date().toISOString().slice(0, 10);
      }
      store.put(item);
    }
    tx.oncomplete = () => resolve(true);
    tx.onerror = (e) => reject(e.target.error);
  });
}

// Seamless migration from chrome.storage.local to IndexedDB
async function migrateFromStorageIfNeeded() {
  try {
    const data = await chrome.storage.local.get("citations");
    if (data && Array.isArray(data.citations) && data.citations.length > 0) {
      console.log(`[cite-log] Migrating ${data.citations.length} items from storage.local to IndexedDB...`);
      await dbBulkInsert(data.citations);
      // Clean up legacy heavy array to free memory
      await chrome.storage.local.remove("citations");
      console.log("[cite-log] Migration to IndexedDB completed!");
    }
  } catch (err) {
    console.error("[cite-log] Migration error:", err);
  }
}
