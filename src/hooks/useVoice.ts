// ─── src/hooks/useVoice.ts ────────────────────────────────────────────────
//
// Globální hook pro hlasovou syntézu (Web Speech API).
// Funkce:
//   • speak(text)      – přečte text česky (cs-CZ), rate 0.9
//   • speakAll(texts)  – přečte pole textů jako jednu větu
//   • stop()           – přeruší mluvení
//   • isSpeaking       – true pokud právě mluví
//   • speakingId       – ID aktuálně mluvícího piktogramu (pro pulse efekt)
//   • isSupported      – false pokud prohlížeč API nepodporuje

import { useState, useCallback, useEffect, useRef } from "react";

// ── Typy ──────────────────────────────────────────────────────────────────
export interface UseVoiceReturn {
  speak:      (text: string, id?: string) => void;
  speakAll:   (texts: string[])           => void;
  stop:       ()                          => void;
  isSpeaking: boolean;
  speakingId: string | null;   // ID mluvícího prvku (pro animaci)
  isSupported: boolean;
}

// ── Konfigurace hlasu ─────────────────────────────────────────────────────
const VOICE_CONFIG = {
  lang:   "cs-CZ",
  rate:   0.9,    // pomalejší = lepší srozumitelnost pro děti
  pitch:  1.05,   // mírně vyšší tón = přirozenější cs hlas
  volume: 1.0,
} as const;

// ── Výběr nejlepšího dostupného hlasu ────────────────────────────────────
function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined") return null;
  const voices = window.speechSynthesis.getVoices();

  // 1. Přesná shoda cs-CZ
  const exact = voices.find((v) => v.lang === "cs-CZ");
  if (exact) return exact;

  // 2. Jakýkoliv cs hlas
  const cs = voices.find((v) => v.lang.startsWith("cs"));
  if (cs) return cs;

  // 3. Fallback – systémový výchozí (alespoň přečte text)
  return null;
}

// ── Hook ──────────────────────────────────────────────────────────────────
export function useVoice(): UseVoiceReturn {
  const isSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  // Uložíme aktuální utterance pro možnost přerušení
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // ── Cleanup při unmount ─────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (isSupported) window.speechSynthesis.cancel();
    };
  }, [isSupported]);

  // ── Některé prohlížeče načítají hlasy asynchronně ──────────────────
  // Zajistíme, že hlasy jsou k dispozici při prvním volání
  useEffect(() => {
    if (!isSupported) return;
    // Chrome načítá hlasy přes event
    const handleVoicesChanged = () => {};
    window.speechSynthesis.addEventListener("voiceschanged", handleVoicesChanged);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", handleVoicesChanged);
    };
  }, [isSupported]);

  // ── stop() ─────────────────────────────────────────────────────────
  const stop = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setSpeakingId(null);
    utteranceRef.current = null;
  }, [isSupported]);

  // ── Interní _speak – vytvoří a přehraje utterance ──────────────────
  const _speak = useCallback((
    text:     string,
    id:       string | null = null,
    onEnd?:   () => void,
  ) => {
    if (!isSupported || !text.trim()) return;

    // Přeruš předchozí mluvení
    window.speechSynthesis.cancel();

    const utterance        = new SpeechSynthesisUtterance(text.trim());
    utterance.lang         = VOICE_CONFIG.lang;
    utterance.rate         = VOICE_CONFIG.rate;
    utterance.pitch        = VOICE_CONFIG.pitch;
    utterance.volume       = VOICE_CONFIG.volume;

    // Přiřaď hlas (pokud dostupný)
    const voice = pickVoice();
    if (voice) utterance.voice = voice;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setSpeakingId(id);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setSpeakingId(null);
      utteranceRef.current = null;
      onEnd?.();
    };

    utterance.onerror = (e) => {
      // "interrupted" = normální stav při stop() – nereportuj jako chybu
      if (e.error === "interrupted") return;
      console.warn("[useVoice] SpeechSynthesis error:", e.error);
      setIsSpeaking(false);
      setSpeakingId(null);
      utteranceRef.current = null;
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [isSupported]);

  // ── speak(text, id?) – přečte jeden text ──────────────────────────
  const speak = useCallback((text: string, id?: string) => {
    _speak(text, id ?? null);
  }, [_speak]);

  // ── speakAll(texts) – přečte pole jako větu ────────────────────────
  // Spoj texty mezerou → jeden utterance = plynulá intonace
  const speakAll = useCallback((texts: string[]) => {
    const sentence = texts
      .map((t) => t.trim())
      .filter(Boolean)
      .join(" ");
    _speak(sentence, "sentence");
  }, [_speak]);

  return { speak, speakAll, stop, isSpeaking, speakingId, isSupported };
}

// ── Singleton kontext pro sdílení stavu napříč komponentami ──────────────
// (volitelné – použij pokud nechceš předávat hook přes props drilling)
import { createContext, useContext } from "react";

export const VoiceContext = createContext<UseVoiceReturn | null>(null);

export function useVoiceContext(): UseVoiceReturn {
  const ctx = useContext(VoiceContext);
  if (!ctx) throw new Error("useVoiceContext musí být uvnitř <VoiceProvider>");
  return ctx;
}
