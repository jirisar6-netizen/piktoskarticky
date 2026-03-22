// ─── src/context/SyncProvider.tsx ────────────────────────────────────────
//
// Globální offline-first sync store.
//
// Životní cyklus:
//   mount → online? → fetchUserGrid → cache → state
//              ↓ offline
//          getCachedGrid → state
//
// Změny dat → markDirty() → při reconnect → autoSync

import {
  createContext, useContext, useState, useEffect,
  useCallback, useRef, useMemo,
} from "react";
import {
  fetchUserGrid, syncToCloud, getCachedGrid, getSyncMeta,
  type GridRow, type SyncStatus,
} from "../services/googleSheets";

// ── Typy ──────────────────────────────────────────────────────────────────
export interface SyncState {
  status:        SyncStatus;
  rows:          GridRow[];
  lastSyncedAt:  string | null;  // ISO
  errorMessage:  string | null;
  isDirty:       boolean;        // jsou neuložené lokální změny?
}

interface SyncContextValue extends SyncState {
  /** Manuální sync (pull) */
  pullFromCloud:  () => Promise<void>;
  /** Manuální sync (push) */
  pushToCloud:    () => Promise<void>;
  /** Označ lokální změny jako neuložené */
  markDirty:      () => void;
  /** Aktualizuj řádky lokálně (dirty = true) */
  updateRows:     (rows: GridRow[]) => void;
  /** URL Apps Script – lze nastavit za běhu z nastavení */
  scriptUrl:      string;
  setScriptUrl:   (url: string) => void;
}

const SyncContext = createContext<SyncContextValue | null>(null);

export function useSyncStore(): SyncContextValue {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error("useSyncStore musí být uvnitř <SyncProvider>");
  return ctx;
}

// ── SCRIPT URL persistence ─────────────────────────────────────────────────
const SCRIPT_URL_KEY = "piktos:script-url";

function loadScriptUrl(): string {
  try { return localStorage.getItem(SCRIPT_URL_KEY) ?? ""; } catch { return ""; }
}
function saveScriptUrl(url: string): void {
  try { localStorage.setItem(SCRIPT_URL_KEY, url); } catch {}
}

// ── Provider ──────────────────────────────────────────────────────────────
export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SyncState>(() => {
    // Inicializuj ze synchronní cache
    const cached = getCachedGrid();
    const meta   = getSyncMeta();
    return {
      status:       cached ? "synced" : "idle",
      rows:         cached ?? [],
      lastSyncedAt: meta?.syncedAt ?? null,
      errorMessage: null,
      isDirty:      false,
    };
  });

  const [scriptUrl, _setScriptUrl] = useState<string>(loadScriptUrl);
  const isSyncingRef = useRef(false);

  const setScriptUrl = useCallback((url: string) => {
    _setScriptUrl(url);
    saveScriptUrl(url);
  }, []);

  // ── pull: stáhni z cloudu ───────────────────────────────────────────
  const pullFromCloud = useCallback(async () => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    setState((s) => ({ ...s, status: "syncing" }));

    const result = await fetchUserGrid(scriptUrl);

    setState((s) => ({
      ...s,
      status:       result.status === "ok"      ? "synced"
                  : result.status === "offline" ? "offline"
                  : "error",
      rows:         result.rows ?? s.rows,
      lastSyncedAt: result.syncedAt ?? s.lastSyncedAt,
      errorMessage: result.message ?? null,
      isDirty:      false,
    }));

    isSyncingRef.current = false;
  }, [scriptUrl]);

  // ── push: odešli do cloudu ──────────────────────────────────────────
  const pushToCloud = useCallback(async () => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    setState((s) => ({ ...s, status: "syncing" }));

    const result = await syncToCloud(state.rows, scriptUrl);

    setState((s) => ({
      ...s,
      status:       result.status === "ok"      ? "synced"
                  : result.status === "offline" ? "offline"
                  : "error",
      lastSyncedAt: result.syncedAt ?? s.lastSyncedAt,
      errorMessage: result.message ?? null,
      isDirty:      result.status !== "ok",
    }));

    isSyncingRef.current = false;
  }, [state.rows, scriptUrl]);

  // ── markDirty ───────────────────────────────────────────────────────
  const markDirty = useCallback(() => {
    setState((s) => ({ ...s, isDirty: true, status: "idle" }));
  }, []);

  // ── updateRows ──────────────────────────────────────────────────────
  const updateRows = useCallback((rows: GridRow[]) => {
    setState((s) => ({ ...s, rows, isDirty: true }));
  }, []);

  // ── Mount: auto-pull ────────────────────────────────────────────────
  useEffect(() => {
    pullFromCloud();
  // Jen při mountu – scriptUrl záměrně vynechán (nechceme re-pull při každé změně URL)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Online event: auto-sync dirty dat ──────────────────────────────
  useEffect(() => {
    const handleOnline = () => {
      if (state.isDirty) {
        pushToCloud();
      } else {
        pullFromCloud();
      }
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [state.isDirty, pushToCloud, pullFromCloud]);

  // ── Offline event: aktualizuj status ───────────────────────────────
  useEffect(() => {
    const handleOffline = () => {
      setState((s) => ({
        ...s,
        status:       "offline",
        errorMessage: "Zařízení je offline.",
      }));
    };
    window.addEventListener("offline", handleOffline);
    return () => window.removeEventListener("offline", handleOffline);
  }, []);

  const value = useMemo<SyncContextValue>(() => ({
    ...state,
    pullFromCloud,
    pushToCloud,
    markDirty,
    updateRows,
    scriptUrl,
    setScriptUrl,
  }), [state, pullFromCloud, pushToCloud, markDirty, updateRows, scriptUrl, setScriptUrl]);

  return (
    <SyncContext.Provider value={value}>
      {children}
    </SyncContext.Provider>
  );
}
