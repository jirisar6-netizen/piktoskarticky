// ─── src/hooks/useSequentialSpeech.ts ────────────────────────────────────
//
// Sekvenční přehrávání TTS s pauzou 200ms mezi slovy.
// Vrací index právě mluvícího tokenu pro highlight efekt.
//
// Architektura:
//   speak(words[]) → zavolá speechSynthesis pro každé slovo postupně
//   Každý utterance má onend → setTimeout(200ms) → další slovo
//   Lze přerušit přes stop()

import { useState, useRef, useCallback } from "react";

export interface UseSequentialSpeechReturn {
  play:           (words: string[], lang?: string) => void;
  stop:           () => void;
  isPlaying:      boolean;
  /** Index právě mluvícího slova (pro highlight, nebo null) */
  speakingIndex:  number | null;
}

const GAP_MS     = 200;   // pauza mezi slovy

export function useSequentialSpeech(): UseSequentialSpeechReturn {
  const [isPlaying,    setIsPlaying]    = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);

  const abortRef = useRef(false);    // příznak pro zastavení
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = useCallback(() => {
    abortRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    window.speechSynthesis?.cancel();
    setIsPlaying(false);
    setSpeakingIndex(null);
  }, []);

  const play = useCallback((words: string[], lang = "cs-CZ") => {
    if (!words.length || typeof window === "undefined") return;
    if (!window.speechSynthesis) return;

    // Zastav případné předchozí přehrávání
    stop();
    abortRef.current = false;

    const voices = window.speechSynthesis.getVoices();
    const voice  = voices.find(v => v.lang === lang)
                ?? voices.find(v => v.lang.startsWith(lang.slice(0, 2)))
                ?? null;

    setIsPlaying(true);

    // Rekurzivní přehrávání jednoho slova
    function speakWord(index: number) {
      if (abortRef.current || index >= words.length) {
        setIsPlaying(false);
        setSpeakingIndex(null);
        return;
      }

      const word = words[index]?.trim();
      if (!word) {
        // Přeskoč prázdné tokeny
        timerRef.current = setTimeout(() => speakWord(index + 1), GAP_MS);
        return;
      }

      setSpeakingIndex(index);

      const u       = new SpeechSynthesisUtterance(word);
      u.lang        = lang;
      u.rate        = 0.9;
      u.pitch       = 1.05;
      u.volume      = 1.0;
      if (voice) u.voice = voice;

      u.onend = () => {
        if (abortRef.current) return;
        setSpeakingIndex(null);
        // Pauza 200ms před dalším slovem
        timerRef.current = setTimeout(() => speakWord(index + 1), GAP_MS);
      };

      u.onerror = (e) => {
        if (e.error === "interrupted") return;
        // Pokračuj i po chybě
        timerRef.current = setTimeout(() => speakWord(index + 1), GAP_MS);
      };

      window.speechSynthesis.speak(u);
    }

    speakWord(0);
  }, [stop]);

  return { play, stop, isPlaying, speakingIndex };
}
