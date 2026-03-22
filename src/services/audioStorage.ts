// ─── src/services/audioStorage.ts ────────────────────────────────────────
//
// Nativní IndexedDB wrapper pro ukládání vlastních audio nahrávek.
// Bez závislostí (žádná knihovna idb).
//
// Schéma:
//   DB:    "piktos-audio"  verze 1
//   Store: "recordings"
//   Klíč:  string  →  `picto-${id}`  nebo libovolný custom klíč
//   Hodnota: { blob: Blob, createdAt: number, durationMs: number }

// ── Typy ──────────────────────────────────────────────────────────────────
export interface AudioRecord {
  blob:       Blob;
  createdAt:  number;   // Date.now()
  durationMs: number;   // délka nahrávky v ms
}

// ── Konstanty ─────────────────────────────────────────────────────────────
const DB_NAME    = "piktos-audio";
const DB_VERSION = 1;
const STORE_NAME = "recordings";

// ── Singleton připojení k DB ──────────────────────────────────────────────
let _db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME); // keyPath = explicitní klíč při put()
      }
    };

    req.onsuccess = (e) => {
      _db = (e.target as IDBOpenDBRequest).result;

      // Reaguj na neočekávané zavření (browser GC, tab je skryt)
      _db.onclose      = () => { _db = null; };
      _db.onerror      = (ev) => console.warn("[audioStorage] DB error", ev);
      _db.onversionchange = () => { _db?.close(); _db = null; };

      resolve(_db);
    };

    req.onerror   = () => reject(new Error(`IndexedDB open failed: ${req.error?.message}`));
    req.onblocked = () => reject(new Error("IndexedDB blocked – zavři ostatní záložky s Piktos"));
  });
}

// ── Klíč pro piktogram ────────────────────────────────────────────────────
export function audioKey(pictogramId: number): string {
  return `picto-${pictogramId}`;
}

// ── save ──────────────────────────────────────────────────────────────────
export async function saveAudio(key: string, record: AudioRecord): Promise<void> {
  const db    = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req   = store.put(record, key);
    req.onsuccess   = () => resolve();
    req.onerror     = () => reject(new Error(`Uložení selhalo: ${req.error?.message}`));
    tx.oncomplete   = () => resolve();
    tx.onerror      = () => reject(new Error(`Transakce selhala: ${tx.error?.message}`));
  });
}

// ── load ──────────────────────────────────────────────────────────────────
export async function loadAudio(key: string): Promise<AudioRecord | null> {
  const db    = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req   = store.get(key);
    req.onsuccess = () => resolve((req.result as AudioRecord) ?? null);
    req.onerror   = () => reject(new Error(`Načítání selhalo: ${req.error?.message}`));
  });
}

// ── remove ────────────────────────────────────────────────────────────────
export async function removeAudio(key: string): Promise<void> {
  const db    = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req   = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(new Error(`Mazání selhalo: ${req.error?.message}`));
  });
}

// ── hasAudio ──────────────────────────────────────────────────────────────
export async function hasAudio(key: string): Promise<boolean> {
  const db    = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    // count() je rychlejší než get() – nenačítá Blob do paměti
    const req   = store.count(key);
    req.onsuccess = () => resolve(req.result > 0);
    req.onerror   = () => reject(new Error(`Kontrola existence selhala: ${req.error?.message}`));
  });
}

// ── listKeys ─────────────────────────────────────────────────────────────
export async function listAudioKeys(): Promise<string[]> {
  const db    = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req   = store.getAllKeys();
    req.onsuccess = () => resolve(req.result as string[]);
    req.onerror   = () => reject(new Error(`Výpis klíčů selhal: ${req.error?.message}`));
  });
}

// ── clearAll ──────────────────────────────────────────────────────────────
export async function clearAllAudio(): Promise<void> {
  const db    = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req   = store.clear();
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(new Error(`Mazání všeho selhalo: ${req.error?.message}`));
  });
}
