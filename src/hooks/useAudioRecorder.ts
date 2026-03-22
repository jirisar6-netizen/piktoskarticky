// ─── src/hooks/useAudioRecorder.ts ───────────────────────────────────────
//
// Hook pro nahrávání zvuku přes MediaRecorder API.
//
// Stavy:
//   "idle"        – čeká na spuštění
//   "requesting"  – žádá o povolení mikrofonu
//   "recording"   – aktivně nahrává
//   "processing"  – zpracovává Blob po stopRecording
//   "done"        – nahrávka hotová, blob k dispozici
//   "error"       – chyba (zamítnuté povolení, HW chyba)

import { useState, useRef, useCallback, useEffect } from "react";

// ── Typy ──────────────────────────────────────────────────────────────────
export type RecorderState =
  | "idle"
  | "requesting"
  | "recording"
  | "processing"
  | "done"
  | "error";

export interface UseAudioRecorderReturn {
  state:          RecorderState;
  blob:           Blob | null;        // výsledná nahrávka
  durationMs:     number;             // délka v ms (nastaveno po stopRecording)
  elapsedMs:      number;             // aktuální délka nahrávání (live)
  errorMessage:   string | null;
  startRecording: () => Promise<void>;
  stopRecording:  () => void;
  resetRecorder:  () => void;
  isSupported:    boolean;
}

// ── Preferovaný MIME type (pořadí dle podpory) ───────────────────────────
function getSupportedMimeType(): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return ""; // prohlížeč vybere sám
}

// ── Hook ──────────────────────────────────────────────────────────────────
export function useAudioRecorder(): UseAudioRecorderReturn {
  const isSupported = typeof window !== "undefined" && "MediaRecorder" in window;

  const [state,        setState]        = useState<RecorderState>("idle");
  const [blob,         setBlob]         = useState<Blob | null>(null);
  const [durationMs,   setDurationMs]   = useState(0);
  const [elapsedMs,    setElapsedMs]    = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder  | null>(null);
  const streamRef        = useRef<MediaStream    | null>(null);
  const chunksRef        = useRef<BlobPart[]>([]);
  const startTimeRef     = useRef<number>(0);
  const elapsedTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Cleanup streams při unmount ────────────────────────────────────
  useEffect(() => {
    return () => {
      stopStream();
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    };
  }, []);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  // ── startRecording ────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (!isSupported) {
      setErrorMessage("Nahrávání není podporováno v tomto prohlížeči.");
      setState("error");
      return;
    }

    setState("requesting");
    setBlob(null);
    setErrorMessage(null);
    chunksRef.current = [];
    setElapsedMs(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
          channelCount: 1,    // mono – šetří místo
        },
      });
      streamRef.current = stream;

      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        setState("processing");
        const finalBlob = new Blob(chunksRef.current, {
          type: mimeType || "audio/webm",
        });
        const duration = Date.now() - startTimeRef.current;
        setBlob(finalBlob);
        setDurationMs(duration);
        setElapsedMs(duration);
        setState("done");
        stopStream();
        if (elapsedTimerRef.current) {
          clearInterval(elapsedTimerRef.current);
          elapsedTimerRef.current = null;
        }
      };

      recorder.onerror = (e) => {
        console.error("[useAudioRecorder] MediaRecorder error:", e);
        setErrorMessage("Chyba nahrávání – zkus to znovu.");
        setState("error");
        stopStream();
      };

      // Sbírej data každých 250 ms (plynulejší Blob)
      recorder.start(250);
      startTimeRef.current = Date.now();
      setState("recording");

      // Live elapsed timer
      elapsedTimerRef.current = setInterval(() => {
        setElapsedMs(Date.now() - startTimeRef.current);
      }, 100);

    } catch (err: unknown) {
      stopStream();
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
      const msg = err instanceof DOMException
        ? err.name === "NotAllowedError"
          ? "Přístup k mikrofonu byl zamítnut."
          : err.name === "NotFoundError"
            ? "Mikrofon nenalezen."
            : `Chyba: ${err.message}`
        : "Neočekávaná chyba mikrofonu.";
      setErrorMessage(msg);
      setState("error");
    }
  }, [isSupported]);

  // ── stopRecording ─────────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
    }
  }, []);

  // ── resetRecorder ─────────────────────────────────────────────────
  const resetRecorder = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    stopStream();
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    chunksRef.current        = [];
    mediaRecorderRef.current = null;
    setState("idle");
    setBlob(null);
    setDurationMs(0);
    setElapsedMs(0);
    setErrorMessage(null);
  }, []);

  return {
    state, blob, durationMs, elapsedMs,
    errorMessage,
    startRecording, stopRecording, resetRecorder,
    isSupported,
  };
}
