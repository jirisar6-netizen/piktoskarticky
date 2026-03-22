// ─── src/components/FullScreenOverlay.tsx ────────────────────────────────
//
// Modální lupa – zobrazí piktogram přes celou obrazovku.
// Aktivace: long-press na kartě nebo ikona lupy.
// Zavření:  tap kdekoli | swipe dolů | tlačítko ✕ | Escape
//
// Obsah:
//   • Velký obrázek (max 80vmin)
//   • Velký popisek nahoře (s respektem na --label-transform)
//   • VOKS barevný rámeček
//   • Tlačítko "Přidat do věty" + "Přehrát"

import { useEffect, useRef, useCallback, useState } from "react";
import { getPictogramUrl }     from "../services/arasaacApi";
import { loadMeta }            from "../services/contentStorage";
import { loadCustomImage }     from "../services/contentStorage";
import { VOKS_META }           from "../types/voksTypes";
import type { VoksCategory }   from "../types/voksTypes";
import { useLanguage }         from "../context/LanguageContext";

// ── Props ──────────────────────────────────────────────────────────────────
interface FullScreenOverlayProps {
  id:          number;
  label:       string;
  onClose:     () => void;
  onAddToSentence?: (id: number, label: string) => void;
  /** VOKS kategorie (pokud není, načte se z DB) */
  voksCategory?: VoksCategory;
}

// ── Swipe-down gesto ───────────────────────────────────────────────────────
function useSwipeDown(onSwipe: () => void) {
  const start = useRef<{ y: number; t: number } | null>(null);

  return {
    onTouchStart: (e: React.TouchEvent) => {
      start.current = { y: e.touches[0].clientY, t: Date.now() };
    },
    onTouchEnd: (e: React.TouchEvent) => {
      if (!start.current) return;
      const dy = e.changedTouches[0].clientY - start.current.y;
      const dt = Date.now() - start.current.t;
      if (dy > 60 && dt < 600) onSwipe();
      start.current = null;
    },
  };
}

// ── Komponenta ────────────────────────────────────────────────────────────
export default function FullScreenOverlay({
  id, label, onClose, onAddToSentence, voksCategory: voksProp,
}: FullScreenOverlayProps) {
  const { meta }        = useLanguage();
  const [imgUrl,   setImgUrl]   = useState<string>(getPictogramUrl(id, 500));
  const [voks,     setVoks]     = useState<VoksCategory>(voksProp ?? "misc");
  const [speaking, setSpeaking] = useState(false);
  const [added,    setAdded]    = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // ── Načti custom image + VOKS z DB ────────────────────────────────────
  useEffect(() => {
    loadCustomImage(id).then(url => { if (url) setImgUrl(url); }).catch(() => {});
    if (!voksProp) {
      loadMeta(id).then(m => { if (m?.voksCategory) setVoks(m.voksCategory); }).catch(() => {});
    }
  }, [id, voksProp]);

  // ── Escape key ───────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  // ── Zamkni scroll pozadí ─────────────────────────────────────────────
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // ── Focus trap ────────────────────────────────────────────────────────
  useEffect(() => { overlayRef.current?.focus(); }, []);

  // ── Swipe-down ───────────────────────────────────────────────────────
  const swipe = useSwipeDown(onClose);

  // ── TTS ─────────────────────────────────────────────────────────────
  const speak = useCallback(() => {
    if (!window.speechSynthesis || speaking) { window.speechSynthesis?.cancel(); setSpeaking(false); return; }
    const u      = new SpeechSynthesisUtterance(label);
    u.lang       = meta.ttsLang;
    u.rate       = 0.85;
    u.pitch      = 1.05;
    const voices = window.speechSynthesis.getVoices();
    const voice  = voices.find(v => v.lang === meta.ttsLang)
                ?? voices.find(v => v.lang.startsWith(meta.ttsLang.slice(0, 2)))
                ?? null;
    if (voice) u.voice = voice;
    u.onstart = () => setSpeaking(true);
    u.onend   = () => setSpeaking(false);
    u.onerror = (e) => { if (e.error !== "interrupted") setSpeaking(false); };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }, [label, meta.ttsLang, speaking]);

  // ── Přidat do věty ────────────────────────────────────────────────────
  const handleAdd = useCallback(() => {
    onAddToSentence?.(id, label);
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  }, [id, label, onAddToSentence]);

  // VOKS metadata
  const voksMeta = VOKS_META[voks];

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Velký náhled: ${label}`}
      tabIndex={-1}
      onClick={onClose}
      {...swipe}
      style={{
        position:   "fixed", inset: 0, zIndex: 300,
        background: "rgba(0,0,0,0.88)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        display:    "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "24px 20px",
        animation: "overlayIn 260ms cubic-bezier(0.22,1,0.36,1) both",
        outline:    "none",
      }}
    >
      <style>{`
        @keyframes overlayIn {
          from { opacity:0; backdrop-filter:blur(0px); }
          to   { opacity:1; backdrop-filter:blur(20px); }
        }
        @keyframes cardIn {
          from { opacity:0; transform: scale(0.85) translateY(20px); }
          to   { opacity:1; transform: none; }
        }
        @keyframes speakPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(233,84,32,0.7); }
          50%      { box-shadow: 0 0 0 10px rgba(233,84,32,0); }
        }
      `}</style>

      {/* Zavřít X */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        aria-label="Zavřít náhled"
        data-compact
        style={{
          position:  "absolute", top: 20, right: 20,
          width: 44, height: 44, borderRadius: "50%",
          background: "rgba(255,255,255,0.1)",
          border:     "1px solid rgba(255,255,255,0.2)",
          color:      "rgba(255,255,255,0.7)",
          fontSize: 18, cursor: "pointer",
          display:  "flex", alignItems: "center", justifyContent: "center",
          transition: "all 150ms", minWidth: 44, minHeight: 44,
          backdropFilter: "blur(8px)",
        }}
        onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.2)")}
        onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
      >
        ✕
      </button>

      {/* Swipe hint */}
      <p style={{
        position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)",
        fontSize: 11, color: "rgba(255,255,255,0.25)",
        letterSpacing: "0.06em", textTransform: "uppercase",
        fontFamily: "Ubuntu, sans-serif", pointerEvents: "none",
      }}>
        ↓ přejeď dolů pro zavření
      </p>

      {/* Centrální karta */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          display:       "flex", flexDirection: "column",
          alignItems:    "center", gap: 20,
          maxWidth:      "min(460px, 90vw)",
          width:         "100%",
          animation:     "cardIn 300ms cubic-bezier(0.34,1.56,0.64,1) both",
        }}
      >
        {/* Popisek nahoře – velký, respektuje --label-transform */}
        <h1 style={{
          fontSize:      "clamp(28px, 7vw, 52px)",
          fontWeight:    700,
          color:         speaking ? voksMeta.color : "#ffffff",
          textAlign:     "center",
          margin:        0,
          fontFamily:    "Ubuntu, sans-serif",
          textTransform: "var(--label-transform, none)" as any,
          letterSpacing: "0.03em",
          lineHeight:    1.15,
          transition:    "color 200ms",
          textShadow:    speaking ? `0 0 24px ${voksMeta.colorGlow}` : "none",
        }}>
          {label}
        </h1>

        {/* Obrázek s VOKS rámečkem */}
        <div style={{
          position:      "relative",
          padding:       12,
          borderRadius:  "clamp(24px, 5vw, 40px)",
          background:    "rgba(255,255,255,0.07)",
          backdropFilter:"blur(8px)",
          border:        `${voks === "misc" ? "3px solid rgba(255,255,255,0.15)" : `4px solid ${voksMeta.color}`}`,
          boxShadow:     speaking
            ? `0 0 0 0 ${voksMeta.color}, 0 20px 60px rgba(0,0,0,0.5)`
            : `0 20px 60px rgba(0,0,0,0.5), 0 0 20px ${voks !== "misc" ? voksMeta.colorGlow : "transparent"}`,
          animation:     speaking ? "speakPulse 900ms ease-in-out infinite" : "none",
          transition:    "border-color 250ms, box-shadow 250ms",
        }}>
          <img
            src={imgUrl}
            alt={label}
            style={{
              width:     "min(60vmin, 320px)",
              height:    "min(60vmin, 320px)",
              objectFit: "contain",
              display:   "block",
              borderRadius: 12,
            }}
          />

          {/* VOKS badge */}
          {voks !== "misc" && (
            <div style={{
              position:   "absolute",
              bottom: -14, left: "50%", transform: "translateX(-50%)",
              padding:    "4px 14px",
              borderRadius: 999,
              background: voksMeta.color,
              color:      "#000",
              fontSize:   11, fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontFamily: "Ubuntu, sans-serif",
              boxShadow:  `0 0 12px ${voksMeta.colorGlow}`,
              whiteSpace: "nowrap",
            }}>
              {voksMeta.emoji} {voksMeta.label}
            </div>
          )}
        </div>

        {/* Akční tlačítka */}
        <div style={{
          display: "flex", gap: 12, width: "100%",
          justifyContent: "center", marginTop: voks !== "misc" ? 10 : 0,
        }}>
          {/* Přehrát */}
          <button
            type="button"
            onClick={speak}
            aria-label={speaking ? "Zastavit" : `Přečíst: ${label}`}
            style={{
              flex: 1, padding: "16px 0",
              borderRadius: 18, minHeight: 56,
              background: speaking ? `${voksMeta.color}30` : "rgba(255,255,255,0.1)",
              border: `2px solid ${speaking ? voksMeta.color : "rgba(255,255,255,0.25)"}`,
              color: speaking ? voksMeta.color : "rgba(255,255,255,0.85)",
              fontSize: 15, fontWeight: 700, cursor: "pointer",
              fontFamily: "Ubuntu, sans-serif",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "all 200ms",
              boxShadow: speaking ? `0 0 20px ${voksMeta.colorGlow}` : "none",
            }}
          >
            {speaking ? "⏹" : "🔊"} {speaking ? "Zastavit" : "Přehrát"}
          </button>

          {/* Přidat do věty */}
          {onAddToSentence && (
            <button
              type="button"
              onClick={handleAdd}
              aria-label={`Přidat ${label} do věty`}
              style={{
                flex: 1, padding: "16px 0",
                borderRadius: 18, minHeight: 56,
                background: added
                  ? "rgba(76,175,80,0.25)"
                  : "rgba(233,84,32,0.2)",
                border: `2px solid ${added ? "rgba(76,175,80,0.7)" : "rgba(233,84,32,0.6)"}`,
                color: added ? "#4CAF50" : "#E95420",
                fontSize: 15, fontWeight: 700, cursor: "pointer",
                fontFamily: "Ubuntu, sans-serif",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "all 200ms",
                boxShadow: added
                  ? "0 0 16px rgba(76,175,80,0.4)"
                  : "0 0 16px rgba(233,84,32,0.3)",
              }}
            >
              {added ? "✓ Přidáno" : "＋ Do věty"}
            </button>
          )}
        </div>

        {/* Klávesová nápověda */}
        <p style={{
          fontSize: 11, color: "rgba(255,255,255,0.2)",
          textAlign: "center", margin: 0,
          fontFamily: "Ubuntu, sans-serif",
          letterSpacing: "0.04em",
        }}>
          Klikni kdekoli mimo pro zavření · Esc
        </p>
      </div>
    </div>
  );
}
