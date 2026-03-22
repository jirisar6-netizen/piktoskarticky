// ─── src/components/PictogramCard.tsx  (v3) ──────────────────────────────
//
// Přidáno v Kroku 10:
//   • Long press → Edit mód (ikona mikrofonu)
//   • Edit mód → RecordingOverlay (nahrávání / smazání)
//   • Přehrávání: custom nahrávka (IndexedDB) → TTS fallback
//   • Indikátor: 🎙️ badge pokud má vlastní nahrávku

import { useState, useCallback, useEffect } from "react";
import { getPictogramUrl }       from "../services/arasaacApi";
import { hasAudio, audioKey }    from "../services/audioStorage";
import { useCustomVoice }        from "../hooks/useCustomVoice";
import { useLongPress }          from "../hooks/useLongPress";
import RecordingOverlay          from "./RecordingOverlay";
import { useTheme }              from "../context/ThemeContext";
import { loadCustomImage, loadMeta } from "../services/contentStorage";
import { VOKS_META, getVoksBorder, getVoksGlow } from "../types/voksTypes";
import type { VoksCategory }         from "../types/voksTypes";

// ── Props ──────────────────────────────────────────────────────────────────
export interface PictogramCardProps {
  id:        number;
  label:     string;
  onClick?:  () => void;
  size?:     "sm" | "md" | "lg";
  selected?: boolean;
  silent?:   boolean;
  /** Callback z rodiče (PictogramGrid) pro FullScreenOverlay */
  onLongPressExternal?: () => void;
}

const SIZE_MAP = {
  sm: { card: 104, img: 60,  fontSize: 11, borderRadius: 20 },
  md: { card: 140, img: 84,  fontSize: 13, borderRadius: 28 },
  lg: { card: 176, img: 108, fontSize: 15, borderRadius: 32 },
} as const;

// Mapování ThemeContext cardSize -> local size
const THEME_SIZE_MAP: Record<string, keyof typeof SIZE_MAP> = {
  small: "sm", medium: "md", large: "lg",
};

// ── Drobné podkomponenty ───────────────────────────────────────────────────
function BrokenIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect width="24" height="24" rx="4" fill="rgba(233,84,32,0.12)"/>
      <path d="M21 15l-5-5L5 21" stroke="rgba(233,84,32,0.6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="8.5" cy="8.5" r="1.5" fill="rgba(233,84,32,0.5)"/>
      <rect x="3" y="3" width="18" height="18" rx="3" stroke="rgba(233,84,32,0.3)" strokeWidth="1.5" fill="none"/>
    </svg>
  );
}

function LoadingDot({ size }: { size: number }) {
  return (
    <div style={{ position:"relative", display:"flex", alignItems:"center", justifyContent:"center", width:size, height:size }} aria-hidden="true">
      <div style={{ position:"absolute", width:size*0.55, height:size*0.55, borderRadius:"50%", background:"rgba(233,84,32,0.2)", animation:"ping 1.4s ease infinite" }}/>
      <div style={{ width:size*0.32, height:size*0.32, borderRadius:"50%", background:"rgba(233,84,32,0.45)" }}/>
    </div>
  );
}

function SpeakingBars() {
  return (
    <span aria-hidden="true" style={{ position:"absolute", top:8, right:8, display:"flex", alignItems:"flex-end", gap:2, height:14 }}>
      {[10,14,8].map((h,i) => (
        <span key={i} style={{ width:3, height:h, borderRadius:2, background:"#E95420",
          animation:`speakBar 600ms ease-in-out ${i*130}ms infinite alternate` }}/>
      ))}
    </span>
  );
}

// ── Long-press progress ring ───────────────────────────────────────────────
function LongPressRing({ progress }: { progress: number }) {
  const size = 100, R = 44, C = 2 * Math.PI * R;
  return (
    <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none", zIndex:5 }}
         viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r={R} fill="none"
        stroke="rgba(233,84,32,0.9)" strokeWidth="3" strokeLinecap="round"
        strokeDasharray={C} strokeDashoffset={C*(1-progress)}
        style={{ transform:"rotate(-90deg)", transformOrigin:"50% 50%", transition:"stroke-dashoffset 40ms linear" }}
      />
    </svg>
  );
}

// ── Hlavní komponenta ──────────────────────────────────────────────────────
export default function PictogramCard({
  id, label, onClick, size = "md", selected = false, silent = false, onLongPressExternal,
}: PictogramCardProps) {
  const [imgState,    setImgState]    = useState<"loading"|"loaded"|"error">("loading");
  const [pressed,     setPressed]     = useState(false);
  const [editMode,    setEditMode]    = useState(false);
  const [isSpeaking,  setIsSpeaking]  = useState(false);
  const [hasCustom,   setHasCustom]   = useState(false);
  const [lpProgress,  setLpProgress]  = useState(0);
  const [voksCategory, setVoksCategory] = useState<VoksCategory>("misc");
  const [customImgUrl, setCustomImgUrl] = useState<string | null>(null);

  // Téma – přepíše "size" prop pokud je nastaveno ThemeContext
  const { theme, colorTokens } = useTheme();
  const isHC   = theme.colorMode === "high-contrast";
  const themeSize = THEME_SIZE_MAP[theme.cardSize] ?? size;
  const { card, img, fontSize, borderRadius: baseRadius } = SIZE_MAP[themeSize];
  const borderRadius = Math.min(Math.max(theme.cardRadius, 4), 48);
  const { playForPictogram, stopAll } = useCustomVoice();

  // ── Zjisti, zda existuje custom nahrávka ──────────────────────────
  useEffect(() => {
    hasAudio(audioKey(id))
      .then(setHasCustom)
      .catch(() => setHasCustom(false));
  }, [id]);

  // ── Načti VOKS kategorii a custom obrázek ──────────────────────────
  useEffect(() => {
    loadMeta(id).then(m => { if (m?.voksCategory) setVoksCategory(m.voksCategory); }).catch(() => {});
    loadCustomImage(id).then(url => { if (url) setCustomImgUrl(url); }).catch(() => {});
  }, [id]);

  // ── Long press → edit mód ─────────────────────────────────────────
  const lpHandlers = useLongPress({
    duration:   800,
    onComplete: () => {
      setLpProgress(0);
      if (onLongPressExternal) {
        onLongPressExternal();
      } else {
        setEditMode(true);
      }
    },
    onProgress: setLpProgress,
    onCancel:   () => setLpProgress(0),
  });

  // ── Click → přehrát ───────────────────────────────────────────────
  const handleClick = useCallback(() => {
    if (editMode) return;
    if (!silent) {
      setIsSpeaking(true);
      playForPictogram(
        id, label,
        () => setIsSpeaking(true),
        () => setIsSpeaking(false),
      );
    }
    onClick?.();
  }, [editMode, silent, playForPictogram, id, label, onClick]);

  // ── Po uložení nahrávky aktualizuj badge ──────────────────────────
  const handleRecordingDone = useCallback((saved: boolean) => {
    setEditMode(false);
    if (saved) {
      hasAudio(audioKey(id)).then(setHasCustom).catch(() => {});
    }
  }, [id]);

  // ── Border / shadow stav ──────────────────────────────────────────
  // High-contrast overrides
  const accentColor = isHC ? "#FFE000" : "#E95420";

  // VOKS border (přebíjí výchozí border, pokud není editMode/speaking/selected)
  const voksBorderBase = getVoksBorder(voksCategory, 4);

  const cardBorder = editMode
    ? "2px solid rgba(180,100,255,0.7)"
    : isSpeaking
      ? `2px solid ${accentColor}`
      : selected
        ? `2px solid ${accentColor}`
        : isHC
          ? "2px solid #FFE000"
          : voksBorderBase;

  const cardShadow = editMode
    ? "0 0 18px rgba(180,100,255,0.35)"
    : isSpeaking
      ? undefined
      : selected
        ? isHC ? "0 0 0 3px #FFE000, 0 0 20px rgba(255,224,0,0.4)" : "0 0 18px rgba(233,84,32,0.4)"
        : isHC ? "none"
        : voksCategory !== "misc" ? `0 4px 24px rgba(0,0,0,0.45), 0 0 0 0 ${VOKS_META[voksCategory].color}, 0 1px 0 rgba(255,255,255,0.06) inset`
        : "0 4px 24px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.06) inset";

  return (
    <>
      <style>{`
        @keyframes ping{75%,100%{transform:scale(2);opacity:0}}
        @keyframes voicePulse{0%,100%{box-shadow:0 0 0 0 rgba(233,84,32,.65)}50%{box-shadow:0 0 0 7px rgba(233,84,32,0)}}
        @keyframes speakBar{from{transform:scaleY(.4);opacity:.5}to{transform:scaleY(1);opacity:1}}
        @keyframes editPulse{0%,100%{opacity:.7}50%{opacity:1}}
      `}</style>

      <button
        type="button"
        onClick={handleClick}
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => setPressed(false)}
        onMouseLeave={() => setPressed(false)}
        onTouchStart={() => setPressed(true)}
        onTouchEnd={() => setPressed(false)}
        {...lpHandlers}
        aria-label={`${label}${hasCustom?" (vlastní hlas)":""}${editMode?" – edit mód":""}`}
        aria-pressed={selected}
        style={{
          position: "relative",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "space-between",
          width: card, height: card, borderRadius,
          background: editMode
            ? "rgba(60,20,80,0.6)"
            : isHC
              ? "#111111"
              : `rgba(255,255,255,${theme.glassOpacity/100})`,
          backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
          border: cardBorder,
          boxShadow: cardShadow,
          animation: isSpeaking ? "voicePulse 900ms ease-in-out infinite" : "none",
          padding: "12px 8px 8px", gap: 8, cursor: "pointer",
          userSelect: "none", WebkitTapHighlightColor: "transparent",
          outline: "none", fontFamily: "Ubuntu, sans-serif",
          transform: pressed ? "scale(0.95)" : "scale(1)",
          transition: "transform 140ms ease, border-color 200ms ease, background 200ms ease",
          overflow: "hidden",
        }}
      >
        {/* Long-press progress ring */}
        {lpProgress > 0 && <LongPressRing progress={lpProgress} />}

        {/* Edit mód overlay */}
        {editMode && (
          <RecordingOverlay
            pictogramId={id}
            label={label}
            hasExisting={hasCustom}
            onDone={handleRecordingDone}
            onClose={() => setEditMode(false)}
          />
        )}

        {/* Obrázek */}
        <div style={{ position:"relative", display:"flex", alignItems:"center", justifyContent:"center", flex:1, width:"100%", minHeight:img }}>
          {imgState === "loading" && (
            <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <LoadingDot size={img}/>
            </div>
          )}
          {imgState === "error" && (
            <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <BrokenIcon size={img}/>
            </div>
          )}
          <img
            src={customImgUrl ?? getPictogramUrl(id)} alt={label}
            width={img} height={img}
            onLoad={() => setImgState("loaded")}
            onError={() => setImgState("error")}
            draggable={false}
            style={{ opacity: imgState==="loaded"?1:0, transition:"opacity 220ms", objectFit:"contain",
              maxWidth:img, maxHeight:img, borderRadius:6,
              display: imgState==="loaded"?"block":"none",
              filter: editMode ? "brightness(0.5)" : "none",
            }}
          />
        </div>

        {/* Label – skrytý pokud showLabels === false */}
        <span style={{
          fontSize, fontWeight: isHC ? 700 : 500, textAlign:"center", width:"100%",
          overflow:"hidden", display: theme.showLabels ? "-webkit-box" : "none",
            textTransform: "var(--label-transform, none)" as any,
          WebkitLineClamp:2, WebkitBoxOrient:"vertical", lineHeight:1.3,
          color: editMode ? "rgba(200,150,255,0.9)"
               : (isSpeaking||selected) ? accentColor
               : isHC ? "#FFE000"
               : "rgba(255,255,255,0.9)",
          textTransform: isHC ? "uppercase" : "none",
          letterSpacing: isHC ? "0.04em" : "normal",
          transition:"color 200ms", wordBreak:"break-word",
        }} lang="cs">
          {label}
        </span>

        {/* Rohové indikátory */}
        {isSpeaking && !editMode && <SpeakingBars/>}

        {/* 🎙️ Custom audio badge */}
        {hasCustom && !editMode && !isSpeaking && (
          <span aria-label="vlastní nahrávka" style={{
            position:"absolute", top:6, left:7,
            fontSize:10, lineHeight:1,
            opacity:0.75,
          }}>🎙️</span>
        )}

        {/* Selected dot */}
        {!isSpeaking && !editMode && selected && (
          <span style={{ position:"absolute", top:8, right:8, width:10, height:10,
            borderRadius:"50%", background:"#E95420",
            boxShadow:"0 0 6px rgba(233,84,32,0.8)" }} aria-hidden="true"/>
        )}

        {/* Edit mode hint */}
        {!editMode && lpProgress === 0 && (
          <span style={{
            position:"absolute", bottom:4, left:"50%", transform:"translateX(-50%)",
            fontSize:8, color:"rgba(255,255,255,0.13)", letterSpacing:"0.05em",
            whiteSpace:"nowrap", pointerEvents:"none", userSelect:"none",
          }} aria-hidden="true">
            podržet = upravit
          </span>
        )}
      </button>
    </>
  );
}
