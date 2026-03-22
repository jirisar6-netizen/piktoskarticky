// ─── src/services/googleSheets.ts ────────────────────────────────────────
//
// Synchronizace s Google Sheets přes Apps Script webovou aplikaci (proxy).
//
// Proč Apps Script proxy?
//   Google Sheets API vyžaduje OAuth2. Apps Script "Web App" lze publikovat
//   jako veřejný nebo přístupný endpoint bez CORS problémů – ideální řešení
//   pro PWA bez vlastního backendu.
//
// ── Jak nastavit Apps Script proxy ───────────────────────────────────────
// 1. Otevři Google Sheets → Rozšíření → Apps Script
// 2. Vlož kód z: docs/apps-script-proxy.js  (generuje se níže)
// 3. Nasaď: Nasadit → Nové nasazení → Typ: Webová aplikace
//    - Spustit jako: Já
//    - Přístup: Kdokoli
// 4. Zkopíruj URL do VITE_APPS_SCRIPT_URL v .env
//
// ── Schéma tabulky ────────────────────────────────────────────────────────
// List "Grid" – sloupce:
//   A: id         (číslo, ARASAAC ID)
//   B: label      (text)
//   C: category   (text)
//   D: audioUrl   (URL nebo prázdné)
//   E: pinned     (TRUE/FALSE)
//   F: updatedAt  (ISO timestamp)

// ── Typy ──────────────────────────────────────────────────────────────────
export interface GridRow {
  id:         number;
  label:      string;
  category:   string;
  audioUrl:   string | null;
  pinned:     boolean;
  updatedAt:  string;         // ISO 8601
}

export type SyncStatus =
  | "idle"
  | "syncing"
  | "synced"
  | "offline"
  | "error";

export interface SyncResult {
  status:    "ok" | "offline" | "error";
  rows?:     GridRow[];
  message?:  string;
  syncedAt?: string;          // ISO timestamp
}

// ── Konfigurace ────────────────────────────────────────────────────────────
// URL se nastavuje přes Vite env proměnnou, nebo manuálně po nasazení
const APPS_SCRIPT_URL =
  typeof import.meta !== "undefined"
    ? (import.meta as any).env?.VITE_APPS_SCRIPT_URL ?? ""
    : "";

const FETCH_TIMEOUT_MS  = 8_000;
const LOCAL_STORAGE_KEY = "piktos:grid-cache";
const SYNC_META_KEY     = "piktos:sync-meta";

// ── Lokální cache helpers ──────────────────────────────────────────────────
interface SyncMeta {
  syncedAt:    string;
  rowCount:    number;
  scriptUrl?:  string;
}

export function getCachedGrid(): GridRow[] | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GridRow[];
  } catch {
    return null;
  }
}

export function setCachedGrid(rows: GridRow[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(rows));
    const meta: SyncMeta = {
      syncedAt: new Date().toISOString(),
      rowCount: rows.length,
    };
    localStorage.setItem(SYNC_META_KEY, JSON.stringify(meta));
  } catch (e) {
    console.warn("[googleSheets] localStorage write failed:", e);
  }
}

export function getSyncMeta(): SyncMeta | null {
  try {
    const raw = localStorage.getItem(SYNC_META_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearCache(): void {
  localStorage.removeItem(LOCAL_STORAGE_KEY);
  localStorage.removeItem(SYNC_META_KEY);
}

// ── Normalizace dat z Apps Script ──────────────────────────────────────────
function parseRow(raw: unknown[]): GridRow | null {
  if (!Array.isArray(raw) || raw.length < 2) return null;
  const id = Number(raw[0]);
  if (!id || isNaN(id)) return null;
  return {
    id,
    label:     String(raw[1] ?? ""),
    category:  String(raw[2] ?? ""),
    audioUrl:  raw[3] ? String(raw[3]) : null,
    pinned:    String(raw[4]).toUpperCase() === "TRUE",
    updatedAt: raw[5] ? String(raw[5]) : new Date().toISOString(),
  };
}

// ── fetchUserGrid ──────────────────────────────────────────────────────────
/**
 * Stáhne aktuální grid ze Google Sheets přes Apps Script proxy.
 * Při chybě nebo offline vrátí cached data z localStorage.
 *
 * @param scriptUrl  URL Apps Script webové aplikace (přepíše env proměnnou)
 */
export async function fetchUserGrid(
  scriptUrl: string = APPS_SCRIPT_URL,
): Promise<SyncResult> {
  // Offline check
  if (!navigator.onLine) {
    const cached = getCachedGrid();
    return cached
      ? { status: "offline", rows: cached, message: "Offline – zobrazena cache" }
      : { status: "offline", rows: [],     message: "Offline a cache je prázdná" };
  }

  // Chybí URL → návod bez error stavu
  if (!scriptUrl) {
    const cached = getCachedGrid();
    return {
      status:  "error",
      rows:    cached ?? [],
      message: "VITE_APPS_SCRIPT_URL není nastavena. Viz README → Cloud Sync.",
    };
  }

  try {
    const url = `${scriptUrl}?action=getGrid`;
    const resp = await fetch(url, {
      signal:  AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { "Accept": "application/json" },
    });

    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    }

    const json = await resp.json();

    // Apps Script vrací: { rows: [[id, label, ...], ...] }
    if (!json?.rows || !Array.isArray(json.rows)) {
      throw new Error("Nevalidní formát odpovědi Apps Script.");
    }

    const rows: GridRow[] = (json.rows as unknown[][])
      .map(parseRow)
      .filter((r): r is GridRow => r !== null);

    setCachedGrid(rows);

    return {
      status:   "ok",
      rows,
      syncedAt: new Date().toISOString(),
    };

  } catch (err: unknown) {
    const isTimeout  = err instanceof DOMException && err.name === "AbortError";
    const isOffline  = err instanceof TypeError     && err.message.includes("fetch");

    if (isTimeout || isOffline || !navigator.onLine) {
      const cached = getCachedGrid();
      return {
        status:  "offline",
        rows:    cached ?? [],
        message: isTimeout ? "Vypršel časový limit připojení." : "Síťová chyba.",
      };
    }

    const cached = getCachedGrid();
    return {
      status:  "error",
      rows:    cached ?? [],
      message: err instanceof Error ? err.message : "Neznámá chyba synchronizace.",
    };
  }
}

// ── syncToCloud ────────────────────────────────────────────────────────────
/**
 * Odešle řádky zpět do Google Sheets (PATCH – přepíše celý list Grid).
 *
 * @param rows       Data k odeslání
 * @param scriptUrl  URL Apps Script webové aplikace
 */
export async function syncToCloud(
  rows:      GridRow[],
  scriptUrl: string = APPS_SCRIPT_URL,
): Promise<SyncResult> {
  if (!navigator.onLine) {
    // Ulož do cache – při příštím připojení sync proběhne
    setCachedGrid(rows);
    return { status: "offline", message: "Uloženo lokálně – sync při příštím připojení." };
  }

  if (!scriptUrl) {
    setCachedGrid(rows);
    return { status: "error", message: "VITE_APPS_SCRIPT_URL není nastavena." };
  }

  try {
    const payload = {
      action: "setGrid",
      rows:   rows.map((r) => [
        r.id,
        r.label,
        r.category,
        r.audioUrl ?? "",
        r.pinned ? "TRUE" : "FALSE",
        r.updatedAt,
      ]),
    };

    const resp = await fetch(scriptUrl, {
      method:  "POST",
      signal:  AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    });

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const json = await resp.json();
    if (json?.status !== "ok") throw new Error(json?.message ?? "Sync odmítnut.");

    setCachedGrid(rows);
    return { status: "ok", syncedAt: new Date().toISOString() };

  } catch (err: unknown) {
    setCachedGrid(rows);       // vždy ulož lokálně
    const msg = err instanceof Error ? err.message : "Chyba při odesílání.";
    return { status: "error", message: msg };
  }
}

// ── Generátor Apps Script kódu ─────────────────────────────────────────────
/**
 * Vrátí zdrojový kód pro Google Apps Script proxy.
 * Zkopíruj ho do Apps Script editoru a nasaď jako Web App.
 */
export function generateAppsScriptCode(sheetId: string): string {
  return `// ── Piktos Portal – Apps Script Proxy ────────────────────────
// Vlož do: script.google.com  |  Nasadit jako: Webová aplikace
// Spustit jako: Já  |  Přístup: Kdokoli

const SHEET_ID   = "${sheetId || "VLOZ_ID_SVE_TABULKY"}";
const SHEET_NAME = "Grid";

function doGet(e) {
  const action = e?.parameter?.action;
  if (action === "getGrid") return getGrid();
  return ContentService
    .createTextOutput(JSON.stringify({ error: "Unknown action" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.action === "setGrid") return setGrid(data.rows);
    throw new Error("Unknown action");
  } catch(err) {
    return jsonResponse({ status: "error", message: err.message });
  }
}

function getGrid() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  const data  = sheet.getDataRange().getValues();
  // Přeskoč hlavičkový řádek (řádek 1)
  const rows  = data.slice(1).filter(r => r[0]);
  return jsonResponse({ rows });
}

function setGrid(rows) {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  let sheet   = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(["id","label","category","audioUrl","pinned","updatedAt"]);
  }
  // Smaž staré řádky (zachovej hlavičku)
  const last = sheet.getLastRow();
  if (last > 1) sheet.deleteRows(2, last - 1);
  // Přidej nové
  if (rows.length > 0) sheet.getRange(2, 1, rows.length, 6).setValues(rows);
  return jsonResponse({ status: "ok", count: rows.length });
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}`;
}
