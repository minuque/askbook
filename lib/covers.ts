"use client";

/**
 * Painted covers in the browser: kept in their own IndexedDB store, fetched
 * from the local server when one is already there. Nothing is painted on
 * this build — covers drawn on the shelf are placeholders.
 */

const DB = "gloss-covers";
const STORE = "covers";

let opening: Promise<IDBDatabase> | null = null;
function idb(): Promise<IDBDatabase> {
  return (opening ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  try {
    const db = await idb();
    return await new Promise<T>((resolve, reject) => {
      const r = fn(db.transaction(STORE, mode).objectStore(STORE));
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  } catch {
    return null;
  }
}

const urls = new Map<string, string>();

/** A painted cover's picture, as an object URL: this device first, then the server. */
export async function paintedUrl(id: string): Promise<string | null> {
  const hit = urls.get(id);
  if (hit) return hit;
  let blob = (await tx<Blob>("readonly", (s) => s.get(id))) ?? null;
  if (!blob) {
    try {
      const res = await fetch(`/api/covers/${encodeURIComponent(id)}`);
      if (res.ok) {
        blob = await res.blob();
        await tx("readwrite", (s) => s.put(blob, id));
      }
    } catch {}
  }
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  urls.set(id, url);
  return url;
}

export const forgetCover = (id: string) => tx("readwrite", (s) => s.delete(id));
