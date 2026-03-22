// ─── src/components/RecordingOverlay.tsx ─────────────────────────────────
//
// Modální overlay uvnitř PictogramCard v edit módu.
// Řídí celý průběh nahrávání:
//   idle → countdown 3s → recording 3s → done → uložení

import { useState, useEffect, useCallback } from "react";
import { useAudioRecorder }  from "../hooks/useAudioRecorder";
import { saveAudio, removeAudio, audioKey } from "../services/audioStorage";

// ── Props ──────────────────────────────────────────────────────────────────
interface RecordingOverlayProps {
  pictogramId:   number;
  label:         string;
  hasExisting:   boolean;       // existuje již nahrávka?
  onDone:        (saved: boolean) => void;  // true = nahrávka uložena/smazána
  onClose:       () => void;
}

// ── Fáze UI ────────────────────────────────────────────────────────────────
type Phase = "menu" | "countdown" | "recording" | "saving" | "done" | "error";

const MAX_RECORD_MS = 4000; // max 4 sekundy

// ── Kruhový progress indikátor ────────────────────────────────────────────
function CircleProgress({ progress, size = 72, color = "#E95420" }: {
  progress: number; size?: number; color?: string;
}) {
  const R = (size - 6) / 2;
  const C = 2 * Math.PI * R;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
         style={{ transform: "rotate(-90deg)" }} aria-hidden="true">
      <circle cx={size/2} cy={size/2} r={R}
        fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4"/>
      <circle cx={size/2} cy={size/2} r={R}
        fill="none" stroke={color} strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={C}
        strokeDashoffset={C * (1 - Math.min(progress, 1))}
        style={{ transition: "stroke-dashoffset 80ms linear" }}
      />
    </svg>
  );
}

// ── Overlay ────────────────────────────────────────────────────────────────
export default function RecordingOverlay({
  pictogramId, label, hasExisting, onDone, onClose,
}: RecordingOverlayProps) {
  const [phase,     setPhase]     = useState<Phase>(hasExisting ? "menu" : "countdown");
  const [countdown, setCountdown] = useState(3);
  const [saveError, setSaveError] = useState<string | null>(null);

  const recorder = useAudioRecorder();

  // ── Auto-countdown před nahráváním ──────────────────────────────────
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) {
      startRecordingFlow();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  // ── Spusť nahrávání ─────────────────────────────────────────────────
  const startRecordingFlow = useCallback(async () => {
    setPhase("recording");
    await recorder.startRecording();

    // Auto-stop po MAX_RECORD_MS
    const autoStop = setTimeout(() => {
      recorder.stopRecording();
    }, MAX_RECORD_MS);

    return () => clearTimeout(autoStop);
  }, [recorder]);

  // ── Sleduj dokončení nahrávky ────────────────────────────────────────
  useEffect(() => {
    if (recorder.state !== "done" || !recorder.blob) return;
    handleSave(recorder.blob, recorder.durationMs);
  }, [recorder.state, recorder.blob]);

  // ── Ulož do IndexedDB ───────────────────────────────────────────────
  const handleSave = useCallback(async (blob: Blob, durationMs: number) => {
    setPhase("saving");
    try {
      await saveAudio(audioKey(pictogramId), { blob, createdAt: Date.now(), durationMs });
      setPhase("done");
      setTimeout(() => onDone(true), 1200);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Uložení selhalo.");
      setPhase("error");
    }
  }, [pictogramId, onDone]);

  // ── Smaž existující nahrávku ────────────────────────────────────────
  const handleDelete = useCallback(async () => {
    try {
      await removeAudio(audioKey(pictogramId));
      onDone(true);
    } catch {
      onDone(false);
    }
  }, [pictogramId, onDone]);

  // ── Ručně zastav nahrávání ──────────────────────────────────────────
  const handleStopEarly = useCallback(() => {
    recorder.stopRecording();
  }, [recorder]);

  // ── Render ──────────────────────────────────────────────────────────
  const recordProgress = Math.min(recorder.elapsedMs / MAX_RECORD_MS, 1);

  return (
    <div
      style={{
        position: "absolute", inset: 0,
        borderRadius: "inherit",
        background: "rgba(10,0,8,0.93)",
        backdropFilter: "blur(4px)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 8, zIndex: 10, padding: 10,
        fontFamily: "Ubuntu, sans-serif",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Zavřít */}
      <button onClick={onClose} aria-label="Zavřít"
        style={{ position:"absolute", top:6, right:8, background:"none", border:"none",
          color:"rgba(255,255,255,0.3)", fontSize:16, cursor:"pointer", padding:4,
          lineHeight:1, fontFamily:"Ubuntu,sans-serif" }}>✕</button>

      {/* ── MENU: existující nahrávka ────────────────────────────── */}
      {phase === "menu" && (
        <>
          <span style={{ fontSize:20 }}>🎙️</span>
          <span style={{ fontSize:10, color:"rgba(255,255,255,0.5)", textAlign:"center", lineHeight:1.3 }}>
            Nahrávka existuje
          </span>
          <button onClick={() => { setCountdown(3); setPhase("countdown"); }}
            style={btnStyle("#E95420", "rgba(233,84,32,0.2)")}>
            Přenahrát
          </button>
          <button onClick={handleDelete}
            style={btnStyle("rgba(255,80,80,0.8)", "rgba(255,50,50,0.1)")}>
            Smazat
          </button>
        </>
      )}

      {/* ── COUNTDOWN ────────────────────────────────────────────── */}
      {phase === "countdown" && (
        <>
          <span style={{ fontSize: 32, fontWeight:700, color:"#E95420",
            lineHeight:1, animation:"countPulse 1s ease infinite" }}>
            {countdown}
          </span>
          <span style={{ fontSize:10, color:"rgba(255,255,255,0.45)", textAlign:"center" }}>
            připrav se…
          </span>
        </>
      )}

      {/* ── NAHRÁVÁNÍ ─────────────────────────────────────────────── */}
      {phase === "recording" && (
        <>
          <div style={{ position:"relative", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <CircleProgress progress={recordProgress} size={56} color="#E95420"/>
            <span style={{ position:"absolute", fontSize:20 }}>🎙️</span>
          </div>
          <span style={{ fontSize:10, fontWeight:600, color:"#E95420",
            letterSpacing:"0.06em", textTransform:"uppercase",
            animation:"recBlink 800ms ease-in-out infinite" }}>
            Nahrávám
          </span>
          <button onClick={handleStopEarly}
            style={btnStyle("rgba(255,255,255,0.7)", "rgba(255,255,255,0.08)")}>
            Hotovo
          </button>
        </>
      )}

      {/* ── UKLÁDÁNÍ ────────────────────────────────────────────────── */}
      {(phase === "saving" || phase === "processing") && (
        <span style={{ fontSize:10, color:"rgba(255,255,255,0.5)" }}>Ukládám…</span>
      )}

      {/* ── HOTOVO ──────────────────────────────────────────────────── */}
      {phase === "done" && (
        <>
          <span style={{ fontSize:28 }}>✅</span>
          <span style={{ fontSize:10, color:"rgba(100,220,120,0.9)", fontWeight:600 }}>
            Uloženo!
          </span>
        </>
      )}

      {/* ── CHYBA ───────────────────────────────────────────────────── */}
      {(phase === "error" || recorder.state === "error") && (
        <>
          <span style={{ fontSize:20 }}>⚠️</span>
          <span style={{ fontSize:9, color:"rgba(255,150,100,0.85)", textAlign:"center",
            lineHeight:1.4, maxWidth:120 }}>
            {saveError ?? recorder.errorMessage ?? "Chyba nahrávání"}
          </span>
          <button onClick={onClose}
            style={btnStyle("rgba(255,255,255,0.5)", "rgba(255,255,255,0.07)")}>
            Zavřít
          </button>
        </>
      )}

      <style>{`
        @keyframes countPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.15)} }
        @keyframes recBlink   { 0%,100%{opacity:1}          50%{opacity:0.45}           }
      `}</style>
    </div>
  );
}

function btnStyle(color: string, bg: string): React.CSSProperties {
  return {
    padding: "4px 12px", borderRadius: 999, fontSize: 11, fontWeight: 600,
    cursor: "pointer", border: `1px solid ${color}40`,
    background: bg, color, fontFamily: "Ubuntu, sans-serif",
    letterSpacing: "0.03em", transition: "opacity 150ms",
    marginTop: 2,
  };
}
