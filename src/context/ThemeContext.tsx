// ─── src/context/ThemeContext.tsx ────────────────────────────────────────
//
// Téma engine Piktos.
//
// Architektura tokenů:
//   UserTheme (hodnoty) → applyTheme() → CSS custom properties na <html>
//   PictogramCard + všechny komponenty čtou jen var(--pk-*)
//   Žádné podmíněné styly v komponentách → čisté CSS kaskádování
//
// Dostupná témata:
//   "ubuntu"        – fialová/aubergine + oranžová (výchozí)
//   "high-contrast" – černé pozadí, svítivě žluté okraje (přístupnost)
//   "soft"          – pastelová, jemná, uklidňující (pro senzitivní děti)
//   "night"         – velmi tmavé, modrá akcent (večerní použití)

import {
  createContext, useContext, useState, useCallback,
  useMemo, useEffect, type ReactNode,
} from "react";

// ── Typy ──────────────────────────────────────────────────────────────────
export type ColorMode = "ubuntu" | "high-contrast" | "soft" | "night";
export type CardSize  = "small" | "medium" | "large";
export type Spacing   = "compact" | "spacious";

export interface UserTheme {
  colorMode:   ColorMode;
  cardSize:    CardSize;
  spacing:     Spacing;
  showLabels:  boolean;
  /** Zaoblení karet 0–48 px */
  cardRadius:  number;
  /** Průhlednost glassmorphism 0–20 % */
  glassOpacity: number;
}

// ── Výchozí téma ───────────────────────────────────────────────────────────
export const DEFAULT_THEME: UserTheme = {
  colorMode:    "ubuntu",
  cardSize:     "medium",
  spacing:      "compact",
  showLabels:   true,
  cardRadius:   28,
  glassOpacity: 5,
};

// ── CSS token mapy pro každé téma ─────────────────────────────────────────
interface CSSTokens {
  // Pozadí
  "--pk-bg-from":          string;
  "--pk-bg-to":            string;
  // Karta
  "--pk-card-bg":          string;
  "--pk-card-border":      string;
  "--pk-card-shadow":      string;
  "--pk-card-hover-shadow":string;
  // Akcent (aktivní stav, hover)
  "--pk-accent":           string;
  "--pk-accent-dim":       string;
  "--pk-accent-glow":      string;
  // Text
  "--pk-text-primary":     string;
  "--pk-text-secondary":   string;
  "--pk-text-dim":         string;
  // Sklo (SmartBar, panel)
  "--pk-glass-bg":         string;
  "--pk-glass-border":     string;
  // Top bar
  "--pk-bar-bg":           string;
  "--pk-bar-border":       string;
}

export const COLOR_TOKENS: Record<ColorMode, CSSTokens> = {
  ubuntu: {
    "--pk-bg-from":           "#2C001E",
    "--pk-bg-to":             "#1A0011",
    "--pk-card-bg":           "rgba(255,255,255,0.05)",
    "--pk-card-border":       "rgba(255,255,255,0.12)",
    "--pk-card-shadow":       "0 4px 24px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.06) inset",
    "--pk-card-hover-shadow": "0 8px 32px rgba(0,0,0,0.55), 0 0 0 2px rgba(233,84,32,0.55)",
    "--pk-accent":            "#E95420",
    "--pk-accent-dim":        "rgba(233,84,32,0.22)",
    "--pk-accent-glow":       "rgba(233,84,32,0.35)",
    "--pk-text-primary":      "rgba(255,255,255,0.92)",
    "--pk-text-secondary":    "rgba(255,255,255,0.55)",
    "--pk-text-dim":          "rgba(255,255,255,0.25)",
    "--pk-glass-bg":          "rgba(255,255,255,0.04)",
    "--pk-glass-border":      "rgba(255,255,255,0.10)",
    "--pk-bar-bg":            "rgba(255,255,255,0.05)",
    "--pk-bar-border":        "rgba(255,255,255,0.12)",
  },

  "high-contrast": {
    "--pk-bg-from":           "#000000",
    "--pk-bg-to":             "#0a0a0a",
    "--pk-card-bg":           "#111111",
    "--pk-card-border":       "#FFE000",
    "--pk-card-shadow":       "0 0 0 2px #FFE000, 0 4px 20px rgba(0,0,0,0.8)",
    "--pk-card-hover-shadow": "0 0 0 3px #FFE000, 0 0 20px rgba(255,224,0,0.4)",
    "--pk-accent":            "#FFE000",
    "--pk-accent-dim":        "rgba(255,224,0,0.18)",
    "--pk-accent-glow":       "rgba(255,224,0,0.5)",
    "--pk-text-primary":      "#FFFFFF",
    "--pk-text-secondary":    "#FFE000",
    "--pk-text-dim":          "rgba(255,255,255,0.6)",
    "--pk-glass-bg":          "#111111",
    "--pk-glass-border":      "#FFE000",
    "--pk-bar-bg":            "#000000",
    "--pk-bar-border":        "#FFE000",
  },

  soft: {
    "--pk-bg-from":           "#1a1035",
    "--pk-bg-to":             "#0f0a22",
    "--pk-card-bg":           "rgba(255,255,255,0.08)",
    "--pk-card-border":       "rgba(180,160,255,0.22)",
    "--pk-card-shadow":       "0 4px 24px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.08) inset",
    "--pk-card-hover-shadow": "0 8px 28px rgba(0,0,0,0.4), 0 0 0 2px rgba(160,140,255,0.5)",
    "--pk-accent":            "#A891FF",
    "--pk-accent-dim":        "rgba(168,145,255,0.2)",
    "--pk-accent-glow":       "rgba(168,145,255,0.35)",
    "--pk-text-primary":      "rgba(255,255,255,0.94)",
    "--pk-text-secondary":    "rgba(200,190,255,0.75)",
    "--pk-text-dim":          "rgba(200,190,255,0.35)",
    "--pk-glass-bg":          "rgba(255,255,255,0.06)",
    "--pk-glass-border":      "rgba(180,160,255,0.18)",
    "--pk-bar-bg":            "rgba(180,160,255,0.07)",
    "--pk-bar-border":        "rgba(180,160,255,0.18)",
  },

  night: {
    "--pk-bg-from":           "#03060f",
    "--pk-bg-to":             "#010308",
    "--pk-card-bg":           "rgba(30,60,120,0.18)",
    "--pk-card-border":       "rgba(80,140,255,0.2)",
    "--pk-card-shadow":       "0 4px 24px rgba(0,0,0,0.6), 0 1px 0 rgba(80,140,255,0.08) inset",
    "--pk-card-hover-shadow": "0 8px 28px rgba(0,0,0,0.7), 0 0 0 2px rgba(80,140,255,0.45)",
    "--pk-accent":            "#4A9EFF",
    "--pk-accent-dim":        "rgba(74,158,255,0.18)",
    "--pk-accent-glow":       "rgba(74,158,255,0.35)",
    "--pk-text-primary":      "rgba(220,235,255,0.94)",
    "--pk-text-secondary":    "rgba(160,195,255,0.65)",
    "--pk-text-dim":          "rgba(160,195,255,0.28)",
    "--pk-glass-bg":          "rgba(30,60,120,0.12)",
    "--pk-glass-border":      "rgba(80,140,255,0.15)",
    "--pk-bar-bg":            "rgba(10,20,50,0.5)",
    "--pk-bar-border":        "rgba(80,140,255,0.15)",
  },
};

// ── Velikostní tokeny ─────────────────────────────────────────────────────
const SIZE_TOKENS: Record<CardSize, {
  "--pk-card-size":   string;
  "--pk-card-img":    string;
  "--pk-card-radius-base": string;
  "--pk-font-label":  string;
}> = {
  small: {
    "--pk-card-size":        "104px",
    "--pk-card-img":         "60px",
    "--pk-card-radius-base": "20px",
    "--pk-font-label":       "11px",
  },
  medium: {
    "--pk-card-size":        "140px",
    "--pk-card-img":         "84px",
    "--pk-card-radius-base": "28px",
    "--pk-font-label":       "13px",
  },
  large: {
    "--pk-card-size":        "176px",
    "--pk-card-img":         "108px",
    "--pk-card-radius-base": "32px",
    "--pk-font-label":       "15px",
  },
};

const SPACING_TOKENS: Record<Spacing, {
  "--pk-gap":     string;
  "--pk-pad":     string;
  "--pk-bar-pad": string;
}> = {
  compact: {
    "--pk-gap":     "10px",
    "--pk-pad":     "14px",
    "--pk-bar-pad": "10px 14px",
  },
  spacious: {
    "--pk-gap":     "16px",
    "--pk-pad":     "20px",
    "--pk-bar-pad": "14px 20px",
  },
};

// ── applyTheme: zapíše tokeny do :root ─────────────────────────────────────
function applyTheme(theme: UserTheme): void {
  const root = document.documentElement;

  // Barvy
  const colorT = COLOR_TOKENS[theme.colorMode];
  for (const [prop, val] of Object.entries(colorT)) {
    root.style.setProperty(prop, val);
  }

  // Pozadí appky
  root.style.setProperty("--pk-app-bg",
    `linear-gradient(135deg, ${colorT["--pk-bg-from"]} 0%, ${colorT["--pk-bg-to"]} 100%)`);

  // Velikost
  const sizeT = SIZE_TOKENS[theme.cardSize];
  for (const [prop, val] of Object.entries(sizeT)) {
    root.style.setProperty(prop, val);
  }

  // Zaoblení (přepíše base)
  root.style.setProperty("--pk-card-radius", `${theme.cardRadius}px`);

  // Průhlednost skla
  const op = theme.glassOpacity / 100;
  root.style.setProperty("--pk-card-bg-custom", `rgba(255,255,255,${op})`);

  // Mezery
  const spaceT = SPACING_TOKENS[theme.spacing];
  for (const [prop, val] of Object.entries(spaceT)) {
    root.style.setProperty(prop, val);
  }

  // Labels
  root.style.setProperty("--pk-label-display", theme.showLabels ? "block" : "none");

  // High-contrast body class
  if (theme.colorMode === "high-contrast") {
    document.body.classList.add("hc-mode");
  } else {
    document.body.classList.remove("hc-mode");
  }
}

// ── LocalStorage ──────────────────────────────────────────────────────────
const LS_KEY = "piktos:theme";

function loadTheme(): UserTheme {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULT_THEME;
    return { ...DEFAULT_THEME, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_THEME;
  }
}

function saveTheme(t: UserTheme): void {
  try { localStorage.setItem(LS_KEY, JSON.stringify(t)); } catch {}
}

// ── Context ───────────────────────────────────────────────────────────────
interface ThemeContextValue {
  theme:      UserTheme;
  update:     (patch: Partial<UserTheme>) => void;
  reset:      () => void;
  colorTokens: CSSTokens;
  /** Metadata pro UI (jméno, emoji, popis) */
  modeInfo:   typeof MODE_INFO;
}

export const MODE_INFO: Record<ColorMode, {
  label: string; emoji: string; desc: string;
}> = {
  ubuntu:          { label: "Ubuntu",         emoji: "🟣", desc: "Fialová s oranžovým akcentem" },
  "high-contrast": { label: "Vysoký kontrast", emoji: "⚡", desc: "Černé pozadí, žluté okraje" },
  soft:            { label: "Jemné",           emoji: "💜", desc: "Pastelová fialová, uklidňující" },
  night:           { label: "Noční",           emoji: "🌙", desc: "Tmavá modrá, šetří oči" },
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, _setTheme] = useState<UserTheme>(() => {
    const t = loadTheme();
    // Aplikuj okamžitě (synchronně před prvním renderem)
    if (typeof document !== "undefined") applyTheme(t);
    return t;
  });

  const update = useCallback((patch: Partial<UserTheme>) => {
    _setTheme(prev => {
      const next = { ...prev, ...patch };
      applyTheme(next);
      saveTheme(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    applyTheme(DEFAULT_THEME);
    saveTheme(DEFAULT_THEME);
    _setTheme(DEFAULT_THEME);
  }, []);

  // Znovu aplikuj po mount (SSR guard)
  useEffect(() => { applyTheme(theme); }, []);

  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    update,
    reset,
    colorTokens: COLOR_TOKENS[theme.colorMode],
    modeInfo: MODE_INFO,
  }), [theme, update, reset]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme musí být uvnitř <ThemeProvider>");
  return ctx;
}
