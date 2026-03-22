// ─── src/context/SettingsContext.tsx ──────────────────────────────────────
//
// Globální store nastavení Piktos.
// Persistence: localStorage ("piktos:settings")
// Sdílení: React Context → useSettings() hook
//
// Nastavení jsou aplikována v reálném čase (bez reloadu):
//   voiceRate    → useCustomVoice / useVoice
//   voiceName    → výběr TTS hlasu
//   cardSize     → PictogramCard, SmartBar, Search grid
//   highContrast → CSS proměnná na :root

import {
  createContext, useContext, useState, useCallback,
  useMemo, useEffect, type ReactNode,
} from "react";

// ── Typy ──────────────────────────────────────────────────────────────────
export type CardSize = "md" | "lg";

export interface AppSettings {
  // Hlas
  voiceRate:       number;      // 0.5–2.0, výchozí 0.9
  voicePitch:      number;      // 0.5–2.0, výchozí 1.05
  voiceName:       string;      // prázdné = systémový výchozí
  voiceVolume:     number;      // 0–1, výchozí 1.0

  // Vizuál
  cardSize:        CardSize;    // "md" | "lg"
  highContrast:    boolean;     // zvýšený kontrast
  reducedMotion:   boolean;     // méně animací
  gridCols:        GridCols;    // počet sloupců gridu: 1|2|3|4
  capitalLetters:  boolean;     // velká písmena v popisech karet

  // Komunikátor
  autoSpeak:       boolean;     // automaticky přečte kliknutou kartu
  sentenceAutoPlay:boolean;     // automaticky přečte větu po přidání

  // Sync
  appsScriptUrl:   string;      // Google Apps Script URL

  // Verze (read-only, nelze přepsat uživatelem)
  readonly appVersion: string;
  readonly buildDate:  string;
}

// ── Výchozí hodnoty ────────────────────────────────────────────────────────
export const DEFAULT_SETTINGS: AppSettings = {
  voiceRate:        0.9,
  voicePitch:       1.05,
  voiceName:        "",
  voiceVolume:      1.0,

  cardSize:         "md",
  highContrast:     false,
  reducedMotion:    false,
  gridCols:         3,
  capitalLetters:   false,

  autoSpeak:        true,
  sentenceAutoPlay: false,

  appsScriptUrl:    "",

  appVersion:       "0.1.7-beta",
  buildDate:        "2025-01-15",
};

// ── Konstanty ──────────────────────────────────────────────────────────────
const LS_KEY = "piktos:settings";

// ── Persistence ────────────────────────────────────────────────────────────
function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const saved = JSON.parse(raw) as Partial<AppSettings>;
    // Merge se defaults (nová klíče ze updates se přidají)
    return { ...DEFAULT_SETTINGS, ...saved,
      // Read-only hodnoty vždy z constants
      appVersion: DEFAULT_SETTINGS.appVersion,
      buildDate:  DEFAULT_SETTINGS.buildDate,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function persistSettings(s: AppSettings): void {
  try {
    // Nevkládej read-only hodnoty do localStorage
    const { appVersion: _av, buildDate: _bd, ...rest } = s;
    localStorage.setItem(LS_KEY, JSON.stringify(rest));
  } catch {}
}

// ── Context typy ──────────────────────────────────────────────────────────
interface SettingsContextValue {
  settings: AppSettings;
  /** Aktualizuj jedno nebo více nastavení */
  update:   (patch: Partial<Omit<AppSettings, "appVersion" | "buildDate">>) => void;
  /** Reset na výchozí hodnoty */
  reset:    () => void;
  /** Dostupné TTS hlasy (načteny ze speechSynthesis) */
  availableVoices: SpeechSynthesisVoice[];
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Načti TTS hlasy (asynchronní v Chrome)
  useEffect(() => {
    const load = () => {
      const voices = window.speechSynthesis?.getVoices() ?? [];
      if (voices.length > 0) setAvailableVoices(voices);
    };
    load();
    window.speechSynthesis?.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis?.removeEventListener("voiceschanged", load);
  }, []);

  // Aplikuj nastavení na :root CSS proměnné
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--settings-card-size",
      settings.cardSize === "lg" ? "176px" : "140px");
    root.style.setProperty("--settings-contrast",
      settings.highContrast ? "1.2" : "1");
    // Grid columns
    root.style.setProperty("--grid-cols", String(settings.gridCols ?? 3));
    // Capitals
    root.style.setProperty("--label-transform",
      settings.capitalLetters ? "uppercase" : "none");
    if (settings.reducedMotion || settings.highContrast) {
      root.classList.add("piktos-reduced-motion");
    } else {
      root.classList.remove("piktos-reduced-motion");
    }
  }, [settings.cardSize, settings.highContrast, settings.reducedMotion, settings.gridCols, settings.capitalLetters]);

  const update = useCallback((patch: Partial<Omit<AppSettings, "appVersion" | "buildDate">>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      persistSettings(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    const fresh = { ...DEFAULT_SETTINGS };
    setSettings(fresh);
    persistSettings(fresh);
  }, []);

  const value = useMemo<SettingsContextValue>(() => ({
    settings, update, reset, availableVoices,
  }), [settings, update, reset, availableVoices]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────
export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings musí být uvnitř <SettingsProvider>");
  return ctx;
}
