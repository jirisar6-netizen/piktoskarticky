// ─── src/components/SentenceStrip.tsx ────────────────────────────────────
//
// Interaktivní větná lišta – náhrada za původní SentenceBar.tsx
//
// Funkce:
//   • Drag & drop přeřazení tokenů (Pointer Events, works on touch)
//   • Swipe-up pro odebrání tokenu (gesto prstem)
//   • Sekvenční přehrávání s highlight efektem
//   • Clear (vymazat vše jedním kliknutím)
//   • Animace při přidání / odebrání tokenů

import { useState, useCallback } from "react";
import { useDragSort }         from "../hooks/useDragSort";
import { useSwipeUp }          from "../hooks/useSwipeUp";
import { useSequentialSpeech } from "../hooks/useSequentialSpeech";
import { getPictogramUrl }     from "../services/arasaacApi";
import { useLanguage }         from "../context/LanguageContext";
import { VOKS_META }           from "../types/voksTypes";
import type { VoksCategory }   from "../types/voksTypes";

// ── Typy ──────────────────────────────────────────────────────────────────
export interface SentenceToken {
  key:          string;
  id:           number;
  label:        string;
  voksCategory?: VoksCategory;
}

interface SentenceStripProps {
  tokens:   SentenceToken[];
  onUpdate: (tokens: SentenceToken[]) => void;
}

// ── Reproduktor SVG ────────────────────────────────────────────────────────
function SpeakerIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M11 5L6 9H3a1 1 0 00-1 1v4a1 1 0 001 1h3l5 4V5z"
        fill={active ? "#E95420" : "rgba(255,255,255,0.7)"}
        style={{ transition: "fill 150ms" }}
      />
      {active ? (
        <>
          <path d="M15.54 8.46a5 5 0 010 7.07" stroke="#E95420" strokeWidth="2" strokeLinecap="round"
            style={{ animation: "fadeWave 600ms ease-in-out infinite alternate" }} />
          <path d="M19.07 4.93a10 10 0 010 14.14" stroke="rgba(233,84,32,0.5)" strokeWidth="2" strokeLinecap="round"
            style={{ animation: "fadeWave 600ms ease-in-out 180ms infinite alternate" }} />
        </>
      ) : (
        <path d="M15.54 8.46a5 5 0 010 7.07" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" />
      )}
    </svg>
  );
}

// ── Jeden token ────────────────────────────────────────────────────────────
function Token({
  token, index, isSpeaking, isActive,
  onRemove, dragProps,
}: {
  token:      SentenceToken;
  index:      number;
  isSpeaking: boolean;
  isActive:   boolean;
  onRemove:   () => void;
  dragProps:  ReturnType<ReturnType<typeof useDragSort>["getItemProps"]>;
}) {
  // Swipe-up pro odebrání
  const swipe = useSwipeUp({ onSwipeUp: onRemove, minDistance: 45, feedbackPx: 70 });

  const voksMeta  = token.voksCategory ? VOKS_META[token.voksCategory] : null;
  const accentColor = voksMeta?.color ?? "rgba(233,84,32,1)";
  const accentGlow  = voksMeta?.colorGlow ?? "rgba(233,84,32,0.4)";

  // Kombinace drag + swipe pointerů
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    swipe.onSwipePointerDown(e);
    dragProps.onPointerDown(e);
  }, [swipe, dragProps]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    swipe.onSwipePointerMove(e);
    dragProps.onPointerMove(e);
  }, [swipe, dragProps]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    swipe.onSwipePointerUp(e);
    dragProps.onPointerUp(e);
  }, [swipe, dragProps]);

  // Vizuální posun při swipe-up
  const swipeTranslateY = -swipe.swipeProgress * 28;

  return (
    <div
      {...dragProps}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={dragProps.onPointerCancel}
      aria-label={`${token.label}. Přetáhni pro přeřazení, přejeď nahoru pro odebrání.`}
      role="listitem"
      style={{
        ...dragProps.style,
        position: "relative",
        flexShrink: 0,
        // Swipe-up posun (feedback)
        transform: `${dragProps.style.transform ?? "scale(1)"} translateY(${swipeTranslateY}px)`,
        transition: swipe.isSwiping
          ? "transform 0ms"
          : dragProps.style.transition ?? "transform 200ms",
      }}
    >
      {/* Swipe-up trash ikona */}
      {swipe.isSwiping && (
        <div style={{
          position: "absolute",
          top: "-32px", left: "50%",
          transform: `translateX(-50%) scale(${0.7 + swipe.swipeProgress * 0.6})`,
          fontSize: 16,
          opacity: swipe.swipeProgress,
          pointerEvents: "none",
          transition: "opacity 80ms",
          filter: `drop-shadow(0 0 4px rgba(255,100,100,0.8))`,
        }} aria-hidden="true">
          🗑️
        </div>
      )}

      {/* Token pill */}
      <div
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "6px 10px 6px 8px",
          borderRadius: 16,
          background: isSpeaking
            ? `${accentColor}25`
            : swipe.isSwiping
              ? "rgba(255,80,80,0.15)"
              : "rgba(255,255,255,0.07)",
          border: `${isSpeaking ? "2px" : "1.5px"} solid ${
            isSpeaking
              ? accentColor
              : swipe.isSwiping
                ? "rgba(255,100,100,0.6)"
                : voksMeta
                  ? `${voksMeta.color}50`
                  : "rgba(255,255,255,0.15)"
          }`,
          boxShadow: isSpeaking
            ? `0 0 16px ${accentGlow}, 0 0 0 2px ${accentColor}40`
            : "none",
          transition: "all 200ms cubic-bezier(0.34,1.56,0.64,1)",
          minHeight: 48,
          whiteSpace: "nowrap",
        }}
      >
        {/* Mini piktogram */}
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: "rgba(255,255,255,0.08)",
          overflow: "hidden",
          border: voksMeta ? `2px solid ${voksMeta.color}40` : "1px solid rgba(255,255,255,0.1)",
          transition: "border-color 200ms",
        }}>
          <img
            src={getPictogramUrl(token.id, 300)}
            alt=""
            aria-hidden="true"
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
            draggable={false}
          />
        </div>

        {/* Label */}
        <span style={{
          fontSize: 13, fontWeight: isSpeaking ? 700 : 500,
          color: isSpeaking ? accentColor : "rgba(255,255,255,0.88)",
          fontFamily: "Ubuntu, sans-serif",
          transition: "color 150ms, font-weight 150ms",
          letterSpacing: isSpeaking ? "0.03em" : "normal",
        }}>
          {token.label}
        </span>

        {/* Drag handle ikona */}
        <span style={{
          fontSize: 10,
          opacity: 0.25,
          color: "white",
          paddingLeft: 2,
          lineHeight: 1,
          flexShrink: 0,
        }} aria-hidden="true">⣿</span>

        {/* Odebrat tlačítko */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          aria-label={`Odebrat ${token.label}`}
          data-compact
          style={{
            width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
            background: "rgba(255,255,255,0.1)",
            border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "rgba(255,255,255,0.5)",
            fontSize: 10, fontWeight: 700,
            transition: "all 150ms",
            minWidth: 20, minHeight: 20,
            marginLeft: 2,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "rgba(255,80,80,0.3)";
            e.currentTarget.style.color = "rgba(255,150,150,0.9)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "rgba(255,255,255,0.1)";
            e.currentTarget.style.color = "rgba(255,255,255,0.5)";
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ── Prázdný stav ──────────────────────────────────────────────────────────
function EmptyStrip({ t }: { t: (k: string) => string }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "12px 16px",
      borderRadius: 16,
      background: "rgba(255,255,255,0.03)",
      border: "1.5px dashed rgba(255,255,255,0.1)",
      minHeight: 60,
    }}>
      <SpeakerIcon active={false} />
      <span style={{
        color: "rgba(255,255,255,0.22)",
        fontSize: 13, fontStyle: "italic",
        fontFamily: "Ubuntu, sans-serif",
      }}>
        {t("dash_sentence_placeholder")}
      </span>
    </div>
  );
}

// ── Hlavní SentenceStrip ──────────────────────────────────────────────────
export default function SentenceStrip({ tokens, onUpdate }: SentenceStripProps) {
  const { t, meta } = useLanguage();
  const speech      = useSequentialSpeech();

  // Drag & drop
  const { items, getItemProps, isDragging } = useDragSort({
    items:     tokens,
    onReorder: onUpdate,
    direction: "horizontal",
  });

  const handleRemove = useCallback((key: string) => {
    onUpdate(tokens.filter(t => t.key !== key));
  }, [tokens, onUpdate]);

  const handlePlay = useCallback(() => {
    if (speech.isPlaying) {
      speech.stop();
      return;
    }
    speech.play(items.map(t => t.label), meta.ttsLang);
  }, [speech, items, meta.ttsLang]);

  const handleClear = useCallback(() => {
    speech.stop();
    onUpdate([]);
  }, [speech, onUpdate]);

  // ── Prázdný stav ────────────────────────────────────────────────────
  if (tokens.length === 0) {
    return <EmptyStrip t={t} />;
  }

  // ── Aktivní větná lišta ─────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes fadeWave { from{opacity:.3} to{opacity:1} }
        @keyframes tokenIn  {
          from { opacity:0; transform:scale(0.7) translateY(8px); }
          to   { opacity:1; transform:scale(1)   translateY(0);   }
        }
        @keyframes stripGlow {
          0%,100% { box-shadow: 0 0 0 0   rgba(233,84,32,0.4); }
          50%      { box-shadow: 0 0 0 4px rgba(233,84,32,0);   }
        }
      `}</style>

      <div
        role="group"
        aria-label="Větná lišta"
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "8px 10px",
          borderRadius: 18,
          background: speech.isPlaying
            ? "rgba(233,84,32,0.08)"
            : "rgba(255,255,255,0.04)",
          border: `1.5px solid ${speech.isPlaying ? "rgba(233,84,32,0.45)" : "rgba(255,255,255,0.1)"}`,
          animation: speech.isPlaying ? "stripGlow 1s ease-in-out infinite" : "none",
          transition: "background 200ms, border-color 200ms",
          minHeight: 64,
          overflowX: "auto",
          overflowY: "visible",
          paddingTop: 20,  // extra prostor pro swipe-up trash ikonu
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {/* PLAY tlačítko */}
        <button
          type="button"
          onClick={handlePlay}
          aria-label={speech.isPlaying ? "Zastavit" : "Přehrát větu"}
          data-compact
          style={{
            width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
            background: speech.isPlaying ? "rgba(233,84,32,0.3)" : "rgba(233,84,32,0.15)",
            border: `1.5px solid ${speech.isPlaying ? "rgba(233,84,32,0.8)" : "rgba(233,84,32,0.4)"}`,
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 200ms",
            minWidth: 44, minHeight: 44,
            boxShadow: speech.isPlaying ? "0 0 12px rgba(233,84,32,0.45)" : "none",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(233,84,32,0.25)")}
          onMouseLeave={e => (e.currentTarget.style.background = speech.isPlaying ? "rgba(233,84,32,0.3)" : "rgba(233,84,32,0.15)")}
        >
          {speech.isPlaying
            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="#E95420"><rect x="4" y="4" width="5" height="16" rx="1"/><rect x="15" y="4" width="5" height="16" rx="1"/></svg>
            : <SpeakerIcon active={false} />
          }
        </button>

        {/* Tokeny – drag container */}
        <div
          data-drag-container
          role="list"
          aria-label="Tokeny věty"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flex: 1,
            minWidth: 0,
            overflowX: "auto",
            scrollbarWidth: "none",
            paddingBottom: 2,
            paddingTop: 4,
          }}
        >
          {items.map((token, index) => (
            <Token
              key={token.key}
              token={token}
              index={index}
              isSpeaking={speech.speakingIndex === index}
              isActive={speech.speakingIndex !== null}
              onRemove={() => handleRemove(token.key)}
              dragProps={getItemProps(index)}
            />
          ))}
        </div>

        {/* CLEAR tlačítko */}
        <button
          type="button"
          onClick={handleClear}
          aria-label="Vymazat větu"
          data-compact
          style={{
            padding: "0 12px",
            height: 36, borderRadius: 12, flexShrink: 0,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "rgba(255,255,255,0.4)",
            fontSize: 11, fontWeight: 500, cursor: "pointer",
            fontFamily: "Ubuntu, sans-serif",
            transition: "all 150ms",
            minWidth: 48, minHeight: 36,
            display: "flex", alignItems: "center", gap: 4,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "rgba(255,80,80,0.12)";
            e.currentTarget.style.color      = "rgba(255,150,150,0.85)";
            e.currentTarget.style.borderColor = "rgba(255,80,80,0.3)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "rgba(255,255,255,0.05)";
            e.currentTarget.style.color      = "rgba(255,255,255,0.4)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
          }}
        >
          <span>✕</span>
          <span>{t("dash_clear_sentence")}</span>
        </button>
      </div>
    </>
  );
}
