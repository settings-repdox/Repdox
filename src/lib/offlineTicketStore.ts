// Thin native-IndexedDB wrapper for the scanner PWA's offline storage
// (requirement 6). No wrapper library (e.g. `idb`) — the surface area
// needed here (two small object stores, simple key lookups) doesn't
// justify a new dependency, per the task's "no unnecessary dependencies"
// instruction. See src/lib/offlineScanLogic.ts for the pure
// lookup/merge/conflict-resolution logic this store persists — keeping
// that logic out of this file is what makes it unit-testable without a
// browser.

import type { OfflineManifest } from "@/domains/tickets/dtos/ticket.dto";
import type { QueuedScan } from "./offlineScanLogic";

const DB_NAME = "repdox-scanner";
const DB_VERSION = 1;
const MANIFEST_STORE = "manifest";
const QUEUE_STORE = "scanQueue";
const RECENT_STORE = "recentScans";
const MAX_RECENT = 50;

export interface RecentScanRecord {
  clientScanId: string;
  eventId: string;
  qrToken: string;
  result: string;
  participantName?: string;
  scannedAt: string;
  synced: boolean;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available in this browser"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(MANIFEST_STORE)) {
        db.createObjectStore(MANIFEST_STORE, { keyPath: "eventId" });
      }
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: "clientScanId" });
      }
      if (!db.objectStoreNames.contains(RECENT_STORE)) {
        const store = db.createObjectStore(RECENT_STORE, { keyPath: "clientScanId" });
        store.createIndex("eventId", "eventId", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const req = fn(store);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export async function saveManifest(manifest: OfflineManifest): Promise<void> {
  await withStore(MANIFEST_STORE, "readwrite", (store) => store.put(manifest));
}

export async function getManifest(eventId: string): Promise<OfflineManifest | null> {
  try {
    const result = await withStore<OfflineManifest | undefined>(MANIFEST_STORE, "readonly", (store) =>
      store.get(eventId),
    );
    return result ?? null;
  } catch {
    return null;
  }
}

export async function listCachedEventIds(): Promise<string[]> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(MANIFEST_STORE, "readonly");
      const req = tx.objectStore(MANIFEST_STORE).getAllKeys();
      req.onsuccess = () => resolve(req.result as string[]);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  } catch {
    return [];
  }
}

export async function queueScan(scan: QueuedScan): Promise<void> {
  await withStore(QUEUE_STORE, "readwrite", (store) => store.put(scan));
}

export async function getQueuedScans(eventId?: string): Promise<QueuedScan[]> {
  try {
    const all = await withStore<QueuedScan[]>(QUEUE_STORE, "readonly", (store) => store.getAll());
    const pending = all.filter((s) => !s.synced);
    return eventId ? pending.filter((s) => s.eventId === eventId) : pending;
  } catch {
    return [];
  }
}

export async function markScanSynced(clientScanId: string, result: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, "readwrite");
    const store = tx.objectStore(QUEUE_STORE);
    const getReq = store.get(clientScanId);
    getReq.onsuccess = () => {
      const record: QueuedScan | undefined = getReq.result;
      if (record) {
        store.put({ ...record, synced: true, syncedResult: result });
      }
      resolve();
    };
    getReq.onerror = () => reject(getReq.error);
    tx.oncomplete = () => db.close();
  });
}

export async function recordRecentScan(record: RecentScanRecord): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(RECENT_STORE, "readwrite");
      tx.objectStore(RECENT_STORE).put(record);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
    await pruneRecentScans(record.eventId);
  } catch {
    // Recent-scan history is a nice-to-have display feature — never let a
    // storage error here interrupt actual scanning.
  }
}

export async function getRecentScans(eventId: string, limit = 20): Promise<RecentScanRecord[]> {
  try {
    const db = await openDb();
    const all = await new Promise<RecentScanRecord[]>((resolve, reject) => {
      const tx = db.transaction(RECENT_STORE, "readonly");
      const index = tx.objectStore(RECENT_STORE).index("eventId");
      const req = index.getAll(eventId);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
    return all.sort((a, b) => b.scannedAt.localeCompare(a.scannedAt)).slice(0, limit);
  } catch {
    return [];
  }
}

async function pruneRecentScans(eventId: string): Promise<void> {
  const all = await getRecentScans(eventId, 10_000);
  if (all.length <= MAX_RECENT) return;
  const toRemove = all.slice(MAX_RECENT);
  const db = await openDb();
  const tx = db.transaction(RECENT_STORE, "readwrite");
  const store = tx.objectStore(RECENT_STORE);
  for (const rec of toRemove) store.delete(rec.clientScanId);
  await new Promise<void>((resolve) => {
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
  });
}
