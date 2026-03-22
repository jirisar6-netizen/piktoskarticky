// ─── src/services/contentStorage.ts ──────────────────────────────────────
//
// IndexedDB hub pro veškerý custom obsah piktogramů:
//   • Vlastní obrázky (JPEG Blob, max 500px)
//   • Vlastní audio nahrávky (WebM Blob, max 3s)
//   • VOKS metadata (category, labels)
//
// DB: "piktos-content"  verze 2
// Stores:
//   "images"    – klíč: `img-{pictogramId}[-{profileId}]`
//   "audio"     – klíč: `aud-{pictogramId}[-{profileId}]`
//   "meta"      – klíč: `meta-{pictogramId}`  (VOKS kategorie)

import { logInfo, logError } from "./errorLogger";
import type { VoksCategory } from "../types/voksTypes";

// ── Typy ──────────────────────────────────────────────────────────────────
export interface ContentMeta {
  pictogramId: number;
  voksCategory: VoksCategory;
  customLabel?: string;         // přepsaný label (např. "táta" místo "muž")
  updatedAt:   string;
}

export interface ContentRecord<T = Blob> {
  key:       string;
  data:      T;
  mimeType:  string;
  sizeBytes: number;
  createdAt: string;
}

// ── Konstanty ──────────────────────────────────────────────────────────────
const DB_NAME    = "piktos-content";
const DB_VERSION = 2;
const STORES     = { images: "images", audio: "audio", meta: "meta" } as const;

// ── Klíče ─────────────────────────────────────────────────────────────────
export function imageKey(pictogramId: number, profileId?: string): string {
  return profileId ? `img-${pictogramId}-${profileId}` : `img-${pictogramId}`;
}

export function audioKey(pictogramId: number, profileId?: string): string {
  return profileId ? `aud-${pictogramId}-${profileId}` : `aud-${pictogramId}`;
}

export function metaKey(pictogramId: number): string {
  return `meta-${pictogramId}`;
}

// ── DB singleton ──────────────────────────────────────────────────────────
let _db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      for (const storeName of Object.values(STORES)) {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName);
        }
      }
    };

    req.onsuccess = (e) => {
      _db = (e.target as IDBOpenDBRequest).result;
      _db.onclose        = () => { _db = null; };
      _db.onversionchange = () => { _db?.close(); _db = null; };
      resolve(_db);
    };

    req.onerror   = () => reject(new Error(`ContentDB open failed: ${req.error?.message}`));
    req.onblocked = () => reject(new Error("ContentDB blocked"));
  });
}

// ── Generické CRUD helpers ────────────────────────────────────────────────
async function dbGet<T>(store: string, key: string): Promise<T | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(store, "readonly").objectStore(store).get(key);
    req.onsuccess = () => resolve((req.result as T) ?? null);
    req.onerror   = () => reject(req.error);
  });
}

async function dbPut<T>(store: string, key: string, value: T): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(store, "readwrite");
    const req = tx.objectStore(store).put(value, key);
    req.onsuccess   = () => resolve();
    tx.oncomplete   = () => resolve();
    req.onerror     = () => reject(req.error);
    tx.onerror      = () => reject(tx.error);
  });
}

async function dbDelete(store: string, key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(store, "readwrite").objectStore(store).delete(key);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

async function dbHas(store: string, key: string): Promise<boolean> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(store, "readonly").objectStore(store).count(key);
    req.onsuccess = () => resolve(req.result > 0);
    req.onerror   = () => reject(req.error);
  });
}

// ── Custom Image API ──────────────────────────────────────────────────────

export async function saveCustomImage(
  pictogramId: number,
  blob:        Blob,
  profileId?:  string,
): Promise<void> {
  const key    = imageKey(pictogramId, profileId);
  const record: ContentRecord = {
    key, data: blob,
    mimeType:  blob.type || "image/jpeg",
    sizeBytes: blob.size,
    createdAt: new Date().toISOString(),
  };
  await dbPut(STORES.images, key, record);
  logInfo("app", `Custom image saved: ${key} (${(blob.size / 1024).toFixed(1)}KB)`);
}

export async function loadCustomImage(
  pictogramId: number,
  profileId?:  string,
): Promise<string | null> {
  const key    = imageKey(pictogramId, profileId);
  // Zkus nejdřív profil-specifický, pak global
  let record   = await dbGet<ContentRecord>(STORES.images, key);
  if (!record && profileId) {
    record = await dbGet<ContentRecord>(STORES.images, imageKey(pictogramId));
  }
  if (!record?.data) return null;
  return URL.createObjectURL(record.data);
}

export async function hasCustomImage(
  pictogramId: number,
  profileId?:  string,
): Promise<boolean> {
  if (await dbHas(STORES.images, imageKey(pictogramId, profileId))) return true;
  if (profileId) return dbHas(STORES.images, imageKey(pictogramId));
  return false;
}

export async function deleteCustomImage(
  pictogramId: number,
  profileId?:  string,
): Promise<void> {
  await dbDelete(STORES.images, imageKey(pictogramId, profileId));
}

// ── Custom Audio API ──────────────────────────────────────────────────────

export async function saveCustomAudio(
  pictogramId: number,
  blob:        Blob,
  profileId?:  string,
): Promise<void> {
  const key    = audioKey(pictogramId, profileId);
  const record: ContentRecord = {
    key, data: blob,
    mimeType:  blob.type || "audio/webm",
    sizeBytes: blob.size,
    createdAt: new Date().toISOString(),
  };
  await dbPut(STORES.audio, key, record);
  logInfo("app", `Custom audio saved: ${key} (${(blob.size / 1024).toFixed(1)}KB)`);
}

export async function loadCustomAudio(
  pictogramId: number,
  profileId?:  string,
): Promise<string | null> {
  const key    = audioKey(pictogramId, profileId);
  let record   = await dbGet<ContentRecord>(STORES.audio, key);
  if (!record && profileId) {
    record = await dbGet<ContentRecord>(STORES.audio, audioKey(pictogramId));
  }
  if (!record?.data) return null;
  return URL.createObjectURL(record.data);
}

export async function hasCustomAudio(
  pictogramId: number,
  profileId?:  string,
): Promise<boolean> {
  if (await dbHas(STORES.audio, audioKey(pictogramId, profileId))) return true;
  if (profileId) return dbHas(STORES.audio, audioKey(pictogramId));
  return false;
}

export async function deleteCustomAudio(
  pictogramId: number,
  profileId?:  string,
): Promise<void> {
  await dbDelete(STORES.audio, audioKey(pictogramId, profileId));
}

// ── Content Meta (VOKS + custom label) ───────────────────────────────────

export async function saveMeta(
  pictogramId: number,
  patch:       Partial<Omit<ContentMeta, "pictogramId">>,
): Promise<void> {
  const key     = metaKey(pictogramId);
  const existing = await dbGet<ContentMeta>(STORES.meta, key) ?? {
    pictogramId,
    voksCategory: "misc" as VoksCategory,
    updatedAt:    new Date().toISOString(),
  };
  const updated: ContentMeta = {
    ...existing,
    ...patch,
    pictogramId,
    updatedAt: new Date().toISOString(),
  };
  await dbPut(STORES.meta, key, updated);
}

export async function loadMeta(pictogramId: number): Promise<ContentMeta | null> {
  return dbGet<ContentMeta>(STORES.meta, metaKey(pictogramId));
}

// ── Bulk cleanup ──────────────────────────────────────────────────────────

export async function deleteAllForPictogram(pictogramId: number): Promise<void> {
  await Promise.allSettled([
    dbDelete(STORES.images, imageKey(pictogramId)),
    dbDelete(STORES.audio,  audioKey(pictogramId)),
    dbDelete(STORES.meta,   metaKey(pictogramId)),
  ]);
  logInfo("app", `All custom content deleted for pictogram ${pictogramId}`);
}
