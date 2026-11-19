/**
 * Tiny IndexedDB layer — everything the companion stores on the device.
 * No external dependency. Each write notifies subscribers of that store so
 * hooks can refresh (same tab). A future Supabase sync can hook in here.
 */

export type StoreName = "agents" | "messages" | "activity" | "requests" | "memory" | "sandbox" | "sessions";

const DB_NAME = "nexus-seeker-compagnon";
/** v2: adds "sessions" (wallet connection log). Stores are created if missing, nothing to migrate. */
const DB_VERSION = 2;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB indisponible sur cet appareil"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("agents")) db.createObjectStore("agents", { keyPath: "id" });
      if (!db.objectStoreNames.contains("messages")) {
        db.createObjectStore("messages", { keyPath: "id" }).createIndex("conversationId", "conversationId");
      }
      if (!db.objectStoreNames.contains("activity")) {
        db.createObjectStore("activity", { keyPath: "id" }).createIndex("at", "at");
      }
      if (!db.objectStoreNames.contains("requests")) db.createObjectStore("requests", { keyPath: "id" });
      if (!db.objectStoreNames.contains("memory")) {
        db.createObjectStore("memory", { keyPath: "key" }).createIndex("agentId", "agentId");
      }
      if (!db.objectStoreNames.contains("sandbox")) {
        db.createObjectStore("sandbox", { keyPath: "key" }).createIndex("agentId", "agentId");
      }
      if (!db.objectStoreNames.contains("sessions")) db.createObjectStore("sessions", { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error ?? new Error("Ouverture IndexedDB impossible"));
    };
  });
  return dbPromise;
}

function wrap<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/* ------------------------------ pub/sub ------------------------------ */

const listeners = new Map<StoreName, Set<() => void>>();

export function subscribe(store: StoreName, callback: () => void) {
  const set = listeners.get(store) ?? new Set();
  set.add(callback);
  listeners.set(store, set);
  return () => {
    set.delete(callback);
  };
}

function notify(store: StoreName) {
  listeners.get(store)?.forEach((cb) => cb());
}

/* ------------------------------- CRUD -------------------------------- */

export async function getAll<T>(store: StoreName): Promise<T[]> {
  const db = await openDb();
  return wrap(db.transaction(store, "readonly").objectStore(store).getAll()) as Promise<T[]>;
}

export async function getByIndex<T>(store: StoreName, index: string, value: IDBValidKey): Promise<T[]> {
  const db = await openDb();
  return wrap(db.transaction(store, "readonly").objectStore(store).index(index).getAll(value)) as Promise<T[]>;
}

export async function getOne<T>(store: StoreName, key: IDBValidKey): Promise<T | undefined> {
  const db = await openDb();
  return wrap(db.transaction(store, "readonly").objectStore(store).get(key)) as Promise<T | undefined>;
}

export async function put<T>(store: StoreName, value: T): Promise<void> {
  const db = await openDb();
  await wrap(db.transaction(store, "readwrite").objectStore(store).put(value));
  notify(store);
}

export async function remove(store: StoreName, key: IDBValidKey): Promise<void> {
  const db = await openDb();
  await wrap(db.transaction(store, "readwrite").objectStore(store).delete(key));
  notify(store);
}

export async function clearStore(store: StoreName): Promise<void> {
  const db = await openDb();
  await wrap(db.transaction(store, "readwrite").objectStore(store).clear());
  notify(store);
}

export async function removeByIndex(store: StoreName, index: string, value: IDBValidKey): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(store, "readwrite");
  const keys = await wrap(tx.objectStore(store).index(index).getAllKeys(value));
  await Promise.all(keys.map((k) => wrap(tx.objectStore(store).delete(k))));
  notify(store);
}
