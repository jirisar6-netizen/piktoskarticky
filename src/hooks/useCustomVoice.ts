// ─── src/hooks/useCustomVoice.ts ──────────────────────────────────────────
//
// Orchestrátor zvukového výstupu:
//   1. Pokud existuje nahrávka v IndexedDB → přehraj ji
//   2. Jinak → TTS (Web Speech API, cs-CZ)
//
// Integruje se s VoiceContext ze Kroku 8 – přidává vlastní audio stopu.

import { useCallback, useRef } from "react";
import { loadAudio, audioKey } from "../services/audioStorage";

// ── Typy ──────────────────────────────────────────────────────────────────
export interface UseCustomVoiceReturn {
  /** Přehraje custom nahrávku nebo TTS, vrátí použitou metodu */
  playForPictogram: (
    pictogramId: number,
    label:       string,
    onStart?:    (method: "custom" | "tts") => void,
    onEnd?:      () => void,
  ) => Promise<void>;
  /** Zastaví přehrávání (audio i TTS) */
  stopAll: () => void;
}

// ── TTS helper (nezávislý na VoiceContext, aby byl hook autonomní) ─────────
function speakTTS(
  text:    string,
  onStart: () => void,
  onEnd:   () => void,
): () => void {
  const u       = new SpeechSynthesisUtterance(text.trim());
  u.lang        = "cs-CZ";
  u.rate        = 0.9;
  u.pitch       = 1.05;
  u.volume      = 1.0;
  const voices  = window.speechSynthesis.getVoices();
  const voice   = voices.find((v) => v.lang === "cs-CZ")
               ?? voices.find((v) => v.lang.startsWith("cs"))
               ?? null;
  if (voice) u.voice = voice;

  u.onstart = onStart;
  u.onend   = onEnd;
  u.onerror = (e) => {
    if (e.error !== "interrupted") onEnd();
  };

  window.speechSynthesis.speak(u);
  return () => window.speechSynthesis.cancel();
}

// ── Hook ──────────────────────────────────────────────────────────────────
export function useCustomVoice(): UseCustomVoiceReturn {
  const audioRef     = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const cancelTTS    = useRef<(() => void) | null>(null);

  // Uvolní Object URL z paměti
  function revokeUrl() {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }

  const stopAll = useCallback(() => {
    // Zastav HTML audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    revokeUrl();
    // Zastav TTS
    cancelTTS.current?.();
    cancelTTS.current = null;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  const playForPictogram = useCallback(async (
    pictogramId: number,
    label:       string,
    onStart?:    (method: "custom" | "tts") => void,
    onEnd?:      () => void,
  ): Promise<void> => {
    stopAll();

    try {
      // ── 1. Zkus IndexedDB ────────────────────────────────────────
      const record = await loadAudio(audioKey(pictogramId));

      if (record?.blob && record.blob.size > 0) {
        // Vlastní nahrávka existuje → přehraj ji
        return new Promise((resolve) => {
          revokeUrl();
          const url   = URL.createObjectURL(record.blob);
          objectUrlRef.current = url;

          const audio = new Audio(url);
          audioRef.current = audio;

          audio.onplay  = () => onStart?.("custom");
          audio.onended = () => { revokeUrl(); audioRef.current = null; onEnd?.(); resolve(); };
          audio.onerror = () => {
            // Custom audio selhalo → fallback na TTS
            revokeUrl();
            audioRef.current = null;
            cancelTTS.current = speakTTS(
              label,
              () => onStart?.("tts"),
              () => { onEnd?.(); resolve(); },
            );
          };

          audio.play().catch(() => {
            // autoplay blokován → TTS fallback
            revokeUrl();
            audioRef.current = null;
            cancelTTS.current = speakTTS(
              label,
              () => onStart?.("tts"),
              () => { onEnd?.(); resolve(); },
            );
          });
        });
      }
    } catch (err) {
      // IndexedDB selhala → pokračuj na TTS
      console.warn("[useCustomVoice] IndexedDB error:", err);
    }

    // ── 2. TTS fallback ──────────────────────────────────────────
    if (!("speechSynthesis" in window)) { onEnd?.(); return; }

    return new Promise((resolve) => {
      cancelTTS.current = speakTTS(
        label,
        () => onStart?.("tts"),
        () => { onEnd?.(); resolve(); },
      );
    });
  }, [stopAll]);

  return { playForPictogram, stopAll };
}
