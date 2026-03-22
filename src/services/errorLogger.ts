// ─── src/services/errorLogger.ts ─────────────────────────────────────────
//
// Jednoduchý strukturovaný logovací systém do localStorage.
// Záznamy jsou čitelné v DevTools: Application → Local Storage → piktos:error-log
//
// Rotace: max 200 záznamů (FIFO) – starší se zahazují
// Formát záznamu: { level, category, message, detail?, timestamp, ua }

// ── Typy ──────────────────────────────────────────────────────────────────
export type LogLevel    = "info" | "warn" | "error" | "fatal";
export type LogCategory =
  | "api"           // ARASAAC API volání
  | "audio"         // nahrávání / přehrávání
  | "db"            // IndexedDB operace
  | "sync"          // Google Sheets sync
  | "render"        // React error boundary
  | "network"       // síťové stavy
  | "app";          // ostatní

export interface LogEntry {
  id:         string;           // unikátní ID záznamu
  level:      LogLevel;
  category:   LogCategory;
  message:    string;
  detail?:    string;           // stack trace nebo JSON detailu
  timestamp:  string;          // ISO 8601
  url?:       string;           // URL která způsobila chybu
  ua?:        string;           // User-Agent (pro diagnostiku zařízení)
  appVersion: string;
}

// ── Konfigurace ────────────────────────────────────────────────────────────
const STORAGE_KEY  = "piktos:error-log";
const MAX_ENTRIES  = 200;
const APP_VERSION  = "1.0.0";             // aktualizuj při buildu

// ── Interní helpers ────────────────────────────────────────────────────────
function readLog(): LogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as LogEntry[];
  } catch {
    return [];
  }
}

function writeLog(entries: LogEntry[]): void {
  try {
    // Rotace: zachovej jen posledních MAX_ENTRIES
    const trimmed = entries.slice(-MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage plný – smaž starší polovinu a zkus znovu
    try {
      const half = entries.slice(-Math.floor(MAX_ENTRIES / 2));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(half));
    } catch {
      // zcela selhalo – ignoruj (logování nesmí shodit appku)
    }
  }
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function getUA(): string {
  try { return navigator.userAgent.slice(0, 120); } catch { return "unknown"; }
}

// ── Hlavní log funkce ──────────────────────────────────────────────────────
export function log(
  level:    LogLevel,
  category: LogCategory,
  message:  string,
  detail?:  unknown,
): LogEntry {
  const entry: LogEntry = {
    id:         generateId(),
    level,
    category,
    message,
    detail:     detail != null
      ? typeof detail === "string"
        ? detail
        : detail instanceof Error
          ? `${detail.name}: ${detail.message}\n${detail.stack ?? ""}`
          : (() => { try { return JSON.stringify(detail, null, 2); } catch { return String(detail); } })()
      : undefined,
    timestamp:  new Date().toISOString(),
    url:        (() => { try { return window.location.pathname; } catch { return undefined; } })(),
    ua:         getUA(),
    appVersion: APP_VERSION,
  };

  const existing = readLog();
  writeLog([...existing, entry]);

  // Také vypiš do konzole pro okamžitou diagnostiku
  const consoleFn =
    level === "fatal" || level === "error" ? console.error
    : level === "warn"                     ? console.warn
    : console.info;

  consoleFn(
    `[Piktos ${level.toUpperCase()}] [${category}] ${message}`,
    detail ?? "",
  );

  return entry;
}

// ── Zkratky ────────────────────────────────────────────────────────────────
export const logInfo  = (cat: LogCategory, msg: string, detail?: unknown) => log("info",  cat, msg, detail);
export const logWarn  = (cat: LogCategory, msg: string, detail?: unknown) => log("warn",  cat, msg, detail);
export const logError = (cat: LogCategory, msg: string, detail?: unknown) => log("error", cat, msg, detail);
export const logFatal = (cat: LogCategory, msg: string, detail?: unknown) => log("fatal", cat, msg, detail);

// ── Čtení logu (pro debug UI) ──────────────────────────────────────────────
export function getLog(options?: {
  level?:    LogLevel;
  category?: LogCategory;
  limit?:    number;
}): LogEntry[] {
  let entries = readLog();

  if (options?.level)    entries = entries.filter(e => e.level    === options.level);
  if (options?.category) entries = entries.filter(e => e.category === options.category);

  // Nejnovější první
  entries = entries.reverse();

  if (options?.limit) entries = entries.slice(0, options.limit);

  return entries;
}

export function getLogStats(): {
  total: number;
  byLevel: Record<LogLevel, number>;
  byCategory: Partial<Record<LogCategory, number>>;
  oldestEntry?: string;
  newestEntry?: string;
} {
  const entries = readLog();
  const byLevel: Record<LogLevel, number> = { info:0, warn:0, error:0, fatal:0 };
  const byCategory: Partial<Record<LogCategory, number>> = {};

  for (const e of entries) {
    byLevel[e.level]++;
    byCategory[e.category] = (byCategory[e.category] ?? 0) + 1;
  }

  return {
    total:      entries.length,
    byLevel,
    byCategory,
    oldestEntry: entries.at(0)?.timestamp,
    newestEntry: entries.at(-1)?.timestamp,
  };
}

export function clearLog(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

// ── Globální uncaught error handler ───────────────────────────────────────
// Zaregistruj jednou v main.tsx
export function registerGlobalErrorHandlers(): void {
  if (typeof window === "undefined") return;

  window.addEventListener("error", (e) => {
    logFatal("render", e.message ?? "Uncaught error", {
      filename: e.filename,
      lineno:   e.lineno,
      colno:    e.colno,
      stack:    e.error?.stack,
    });
  });

  window.addEventListener("unhandledrejection", (e) => {
    const reason = e.reason;
    logError("app", "Unhandled Promise rejection", reason);
  });
}
