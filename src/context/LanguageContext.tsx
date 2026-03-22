// ─── src/context/LanguageContext.tsx ─────────────────────────────────────
//
// Globální kontext jazyka.
// Persistence: localStorage ("piktos:lang")
// Re-render: jen při změně jazyka – t() funkce je stabilní reference
//
// Použití:
//   const { t, lang, setLang, meta } = useLanguage();
//   t("nav_dashboard")  →  "Dashboard" / "Dashboard" / "Dashboard"
//   t("time_morning")   →  "Dobré ráno" / "Dobré ráno" / "Good morning"

import {
  createContext, useContext, useState, useCallback,
  useMemo, type ReactNode,
} from "react";
import {
  TRANSLATIONS, LANG_META, DEFAULT_LANG,
  type LangCode, type TranslationSchema,
} from "../i18n/translations";

// ── Konstanty ──────────────────────────────────────────────────────────────
const LS_KEY = "piktos:lang";

// ── Typy ──────────────────────────────────────────────────────────────────
interface LanguageContextValue {
  /** Aktuální kód jazyka */
  lang:    LangCode;
  /** Nastav jazyk (uloží do localStorage) */
  setLang: (code: LangCode) => void;
  /** Překladová funkce */
  t:       (key: keyof TranslationSchema) => string;
  /** Metadata aktuálního jazyka (flag, ttsLang, arasaac kód) */
  meta:    typeof LANG_META[LangCode];
  /** Všechna dostupná metadata jazyků */
  allMeta: typeof LANG_META;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

// ── Načti jazyk z localStorage ─────────────────────────────────────────────
function loadSavedLang(): LangCode {
  try {
    const saved = localStorage.getItem(LS_KEY) as LangCode | null;
    if (saved && saved in TRANSLATIONS) return saved;
  } catch {}
  // Detekce systémového jazyka prohlížeče
  try {
    const nav = navigator.language.slice(0, 2).toLowerCase();
    if (nav === "cs") return "cs";
    if (nav === "sk") return "sk";
    if (nav === "en") return "en";
  } catch {}
  return DEFAULT_LANG;
}

// ── Provider ──────────────────────────────────────────────────────────────
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, _setLang] = useState<LangCode>(loadSavedLang);

  const setLang = useCallback((code: LangCode) => {
    if (!(code in TRANSLATIONS)) return;
    _setLang(code);
    try { localStorage.setItem(LS_KEY, code); } catch {}
    // Nastav html lang atribut pro správnou TTS a přístupnost
    document.documentElement.lang = LANG_META[code].ttsLang;
  }, []);

  // t() je stabilní funkce – mění se jen při změně lang
  const t = useCallback(
    (key: keyof TranslationSchema): string =>
      TRANSLATIONS[lang][key] ?? TRANSLATIONS[DEFAULT_LANG][key] ?? key,
    [lang],
  );

  const value = useMemo<LanguageContextValue>(() => ({
    lang,
    setLang,
    t,
    meta:    LANG_META[lang],
    allMeta: LANG_META,
  }), [lang, setLang, t]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────
export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage musí být uvnitř <LanguageProvider>");
  return ctx;
}

// ── Přímý přístup bez hooku (pro non-React kód, např. arasaacApi.ts) ──────
let _currentLang: LangCode = loadSavedLang();

export function getCurrentLang(): LangCode {
  return _currentLang;
}

export function setCurrentLang(lang: LangCode): void {
  _currentLang = lang;
}

// Synchronizace mezi kontextem a imperativním přístupem
export function syncLangToGlobal(lang: LangCode): void {
  _currentLang = lang;
}
