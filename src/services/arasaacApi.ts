// ─── src/services/arasaacApi.ts ──────────────────────────────────────────
//
// ARASAAC API Service – AKTUALIZOVÁNO v Kroku 13:
//   • Timeout 5 s přes AbortSignal
//   • In-memory cache (Map) + localStorage fallback
//   • Strukturované logování přes errorLogger
//   • Diskriminovaná unie výsledku (SearchResult)
//
// Endpointy:
//   Vyhledávání: GET https://api.arasaac.org/api/pictograms/{lang}/search/{term}
//   Obrázek CDN: https://static.arasaac.org/pictograms/{id}/{id}_{size}.png

import type { Pictogram, SearchResponse, SearchResult } from "../types/arasaac";
import { logInfo, logWarn, logError } from "./errorLogger";
import { getCurrentLang } from "../context/LanguageContext";

// ── Konstanty ──────────────────────────────────────────────────────────────
const API_BASE          = "https://api.arasaac.org/api";
const CDN_BASE          = "https://static.arasaac.org/pictograms";
const FETCH_TIMEOUT_MS  = 5_000;
const CACHE_TTL_MS      = 30 * 60 * 1_000;   // 30 minut (in-memory)
const LS_CACHE_PREFIX   = "piktos:search:";   // localStorage klíč
const LS_MAX_ENTRIES    = 50;                 // max vyhledávání v LS
const LS_INDEX_KEY      = "piktos:search-index"; // index uložených klíčů

// ── In-memory cache ────────────────────────────────────────────────────────
interface MemCacheEntry {
  data:      Pictogram[];
  expiresAt: number;
}
const memCache = new Map<string, MemCacheEntry>();

// ── Normalizace klíče ──────────────────────────────────────────────────────
export function normalizeKey(term: string): string {
  return term.trim().toLowerCase().replace(/\s+/g, " ");
}

// ── LocalStorage fallback cache ────────────────────────────────────────────
function lsRead(key: string): Pictogram[] | null {
  try {
    const raw = localStorage.getItem(LS_CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function lsWrite(key: string, data: Pictogram[]): void {
  try {
    // Rotace indexu
    const indexRaw = localStorage.getItem(LS_INDEX_KEY);
    const index: string[] = indexRaw ? JSON.parse(indexRaw) : [];

    if (!index.includes(key)) {
      index.push(key);
      // Pokud překročíme limit, smaž nejstarší
      while (index.length > LS_MAX_ENTRIES) {
        const oldest = index.shift();
        if (oldest) {
          try { localStorage.removeItem(LS_CACHE_PREFIX + oldest); } catch {}
        }
      }
      localStorage.setItem(LS_INDEX_KEY, JSON.stringify(index));
    }

    localStorage.setItem(LS_CACHE_PREFIX + key, JSON.stringify(data));
  } catch (e) {
    logWarn("api", "localStorage write failed (storage full?)", e);
  }
}

function lsClearAll(): void {
  try {
    const indexRaw = localStorage.getItem(LS_INDEX_KEY);
    const index: string[] = indexRaw ? JSON.parse(indexRaw) : [];
    for (const key of index) {
      localStorage.removeItem(LS_CACHE_PREFIX + key);
    }
    localStorage.removeItem(LS_INDEX_KEY);
  } catch {}
}

// ── In-memory cache helpers ────────────────────────────────────────────────
function memGet(key: string): Pictogram[] | null {
  const entry = memCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memCache.delete(key);
    return null;
  }
  return entry.data;
}

function memSet(key: string, data: Pictogram[]): void {
  memCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ── searchPictograms ───────────────────────────────────────────────────────
/**
 * Vyhledá piktogramy podle českého výrazu.
 *
 * Cache strategie (3 vrstvy):
 *   1. In-memory (Map) – nejrychlejší, TTL 30 min
 *   2. localStorage    – přežije reload stránky
 *   3. Síťové volání   – s timeoutem 5 s
 *
 * @param term  Hledaný výraz (česky)
 */
export async function searchPictograms(term: string): Promise<SearchResult> {
  const trimmed = term.trim();

  if (!trimmed) {
    return { status: "empty", data: [] };
  }

  const key = normalizeKey(trimmed);

  // ── Vrstva 1: In-memory cache ──────────────────────────────────────
  const mem = memGet(key);
  if (mem !== null) {
    logInfo("api", `Cache hit (memory): "${key}" → ${mem.length} výsledků`);
    return mem.length > 0
      ? { status: "ok",    data: mem }
      : { status: "empty", data: [] };
  }

  // ── Vrstva 2: localStorage cache (offline fallback) ────────────────
  const ls = lsRead(key);
  if (ls !== null) {
    // Napiš zpět do mem cache
    memSet(key, ls);
    logInfo("api", `Cache hit (localStorage): "${key}" → ${ls.length} výsledků`);
    return ls.length > 0
      ? { status: "ok",    data: ls }
      : { status: "empty", data: [] };
  }

  // ── Offline check ──────────────────────────────────────────────────
  if (!navigator.onLine) {
    logWarn("api", `Offline, žádná cache pro "${key}"`);
    return { status: "empty", data: [] };
  }

  // ── Vrstva 3: Síťové volání ────────────────────────────────────────
  const activeLang = getCurrentLang();
    const url = `${API_BASE}/pictograms/${activeLang}/search/${encodeURIComponent(trimmed)}`;

  try {
    const controller = new AbortController();
    // Dual timeout: AbortSignal.timeout (moderní) + fallback setTimeout
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let signal: AbortSignal;
    try {
      // AbortSignal.timeout dostupný v Chrome 103+, Firefox 100+
      signal = AbortSignal.any
        ? AbortSignal.any([AbortSignal.timeout(FETCH_TIMEOUT_MS), controller.signal])
        : controller.signal;
    } catch {
      signal = controller.signal;
    }

    const response = await fetch(url, {
      headers: { "Accept": "application/json" },
      signal,
    });

    clearTimeout(timeoutId);

    // 404 = ARASAAC signalizuje prázdný výsledek (ne chybu)
    if (response.status === 404) {
      memSet(key, []);
      lsWrite(key, []);
      logInfo("api", `Prázdný výsledek (404) pro "${key}"`);
      return { status: "empty", data: [] };
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const json = await response.json() as unknown;

    if (!Array.isArray(json)) {
      throw new Error(`Nevalidní odpověď API: očekáváno pole, dostáno ${typeof json}`);
    }

    const pictograms = json as Pictogram[];

    // Ulož do obou cache vrstev
    memSet(key, pictograms);
    lsWrite(key, pictograms);

    logInfo("api", `Načteno z API: "${key}" → ${pictograms.length} piktogramů`);

    return pictograms.length > 0
      ? { status: "ok",    data: pictograms }
      : { status: "empty", data: [] };

  } catch (err: unknown) {
    // ── Klasifikace chyby ────────────────────────────────────────────
    const isTimeout  = err instanceof DOMException && (err.name === "AbortError" || err.name === "TimeoutError");
    const isNetwork  = err instanceof TypeError && err.message.includes("fetch");
    const isOffline  = !navigator.onLine;

    const message = isTimeout  ? `Timeout po ${FETCH_TIMEOUT_MS / 1000}s pro "${key}"`
                  : isNetwork  ? `Síťová chyba pro "${key}"`
                  : isOffline  ? `Offline při hledání "${key}"`
                  : err instanceof Error ? err.message
                  : String(err);

    // Loguj s odpovídající závažností
    if (isTimeout || isNetwork || isOffline) {
      logWarn("api", message, err);
    } else {
      logError("api", message, err);
    }

    // ── Nouzový fallback: zkus localStorage ještě jednou ─────────────
    // (mohl být zapsán mezitím jiným tab/požadavkem)
    const lsFallback = lsRead(key);
    if (lsFallback !== null && lsFallback.length > 0) {
      logInfo("api", `Fallback z localStorage pro "${key}" po chybě`);
      return { status: "ok", data: lsFallback };
    }

    return {
      status:  "error",
      message: isTimeout ? "Požadavek vypršel – zkontroluj připojení."
             : isOffline ? "Zařízení je offline."
             : message,
    };
  }
}

// ── getPictogramUrl ────────────────────────────────────────────────────────
/**
 * Sestaví URL statického PNG obrázku z ARASAAC CDN.
 *
 * @param id    Číselné ARASAAC ID
 * @param size  Velikost: 300 | 500 | 2500 (výchozí 500)
 */
export function getPictogramUrl(id: number, size: 300 | 500 | 2500 = 500): string {
  if (!Number.isInteger(id) || id <= 0) {
    logWarn("api", `getPictogramUrl: nevalidní ID ${id}`);
    // Vrátí placeholder URL (404 na CDN = graceful fallback v <img>)
    return `${CDN_BASE}/0/0_${size}.png`;
  }
  return `${CDN_BASE}/${id}/${id}_${size}.png`;
}

// ── Cache management ───────────────────────────────────────────────────────
export function clearSearchCache(): void {
  memCache.clear();
  lsClearAll();
  logInfo("api", "Cache vymazána (memory + localStorage)");
}

export function getCacheStats(): {
  memoryEntries: number;
  localStorageEntries: number;
} {
  const indexRaw = localStorage.getItem(LS_INDEX_KEY);
  const lsCount  = indexRaw ? (JSON.parse(indexRaw) as string[]).length : 0;
  return {
    memoryEntries:       memCache.size,
    localStorageEntries: lsCount,
  };
}

// Re-export typů pro zpětnou kompatibilitu
export type { Pictogram, SearchResponse, SearchResult };
