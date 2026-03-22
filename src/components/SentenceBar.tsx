// ─── src/components/SentenceBar.tsx ──────────────────────────────────────
//
// Komunikační řádek – skládá vybrané piktogramy do věty.
// Tlačítko reproduktoru přečte celou větu najednou.
// Jednotlivé tokeny lze odebrat klepnutím na ✕.

import { useCallback } from "react";
import { useVoiceContext } from "../hooks/useVoice";

// ── Typy ──────────────────────────────────────────────────────────────────
export interface SentenceToken {
  id:     number;
  label:  string;
  /** Unikátní klíč v seznamu (timestamp nebo uuid) */
  key:    string;
}

interface SentenceBarProps {
  tokens:    SentenceToken[];
  onRemove:  (key: string)    => void;
  onClear:   ()               => void;
  onTokenClick?: (t: SentenceToken) => void;
}

// ── Ikona reproduktoru ────────────────────────────────────────────────────
function SpeakerIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M11 5L6 9H3a1 1 0 00-1 1v4a1 1 0 001 1h3l5 4V5z"
        fill={active ? "#E95420" : "rgba(255,255,255,0.7)"}
        style={{ transition: "fill 150ms" }}
      />
      {active ? (
        // Animované vlny při přehrávání
        <>
          <path d="M15.54 8.46a5 5 0 010 7.07" stroke="#E95420" strokeWidth="2" strokeLinecap="round" style={{ animation: "fadeWave 900ms ease-in-out infinite alternate" }}/>
          <path d="M19.07 4.93a10 10 0 010 14.14" stroke="rgba(233,84,32,0.5)" strokeWidth="2" strokeLinecap="round" style={{ animation: "fadeWave 900ms ease-in-out 200ms infinite alternate" }}/>
        </>
      ) : (
        <path d="M15.54 8.46a5 5 0 010 7.07" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round"/>
      )}
    </svg>
  );
}

// ── Jeden token (piktogram ve větě) ───────────────────────────────────────
function Token({ token, onRemove, onClick, isSpeaking }: {
  token:     SentenceToken;
  onRemove:  (key: string) => void;
  onClick?:  () => void;
  isSpeaking: boolean;
}) {
  return (
    <span
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: "5px 10px 5px 12px",
        borderRadius: 999,
        background: isSpeaking
          ? "rgba(233,84,32,0.3)"
          : "rgba(233,84,32,0.13)",
        border: `1px solid ${isSpeaking ? "rgba(233,84,32,0.8)" : "rgba(233,84,32,0.3)"}`,
        color: "#E95420",
        fontSize: 13, fontWeight: 500,
        whiteSpace: "nowrap",
        cursor: "pointer",
        userSelect: "none",
        transition: "background 150ms, border-color 150ms",
        animation: isSpeaking ? "voicePulse 900ms ease-in-out infinite" : "none",
        fontFamily: "Ubuntu, sans-serif",
      }}
    >
      {token.label}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onRemove(token.key); }}
        aria-label={`Odebrat ${token.label}`}
        style={{
          width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
          background: "rgba(233,84,32,0.2)", border: "none", cursor: "pointer",
          color: "rgba(233,84,32,0.8)", fontSize: 10, fontWeight: 700,
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "background 150ms",
          fontFamily: "Ubuntu, sans-serif",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(233,84,32,0.45)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(233,84,32,0.2)")}
      >
        ✕
      </button>
    </span>
  );
}

// ── SentenceBar ───────────────────────────────────────────────────────────
export default function SentenceBar({ tokens, onRemove, onClear, onTokenClick }: SentenceBarProps) {
  const { speakAll, speak, stop, isSpeaking, speakingId, isSupported } = useVoiceContext();
  const isSentenceSpeaking = speakingId === "sentence";

  const handlePlayAll = useCallback(() => {
    if (isSentenceSpeaking) { stop(); return; }
    speakAll(tokens.map((t) => t.label));
  }, [isSentenceSpeaking, stop, speakAll, tokens]);

  const handleTokenClick = useCallback((token: SentenceToken) => {
    if (isSupported) speak(token.label, `sentence-token-${token.key}`);
    onTokenClick?.(token);
  }, [isSupported, speak, onTokenClick]);

  // Prázdný stav
  if (tokens.length === 0) {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "12px 16px",
        borderRadius: 16,
        background: "rgba(255,255,255,0.03)",
        border: "1px dashed rgba(255,255,255,0.1)",
        minHeight: 52,
      }}>
        <SpeakerIcon active={false} />
        <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 13, fontStyle: "italic", userSelect: "none" }}>
          Vyber piktogramy pro sestavení věty…
        </span>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes fadeWave {
          from { opacity: 0.4; }
          to   { opacity: 1.0; }
        }
        @keyframes voicePulse {
          0%,100% { box-shadow: 0 0 0 0   rgba(233,84,32,0.6); }
          50%      { box-shadow: 0 0 0 5px rgba(233,84,32,0);   }
        }
      `}</style>

      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "10px 12px",
        borderRadius: 16,
        background: "rgba(233,84,32,0.07)",
        border: `1px solid ${isSentenceSpeaking ? "rgba(233,84,32,0.5)" : "rgba(233,84,32,0.2)"}`,
        transition: "border-color 200ms",
        flexWrap: "wrap",
        minHeight: 52,
      }}>

        {/* Tlačítko přehrát / stop */}
        {isSupported && (
          <button
            type="button"
            onClick={handlePlayAll}
            aria-label={isSentenceSpeaking ? "Zastavit" : "Přečíst větu"}
            title={isSentenceSpeaking ? "Zastavit" : "Přečíst větu"}
            style={{
              width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
              background: isSentenceSpeaking
                ? "rgba(233,84,32,0.35)"
                : "rgba(233,84,32,0.18)",
              border: `1.5px solid ${isSentenceSpeaking ? "rgba(233,84,32,0.8)" : "rgba(233,84,32,0.4)"}`,
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 150ms",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(233,84,32,0.3)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = isSentenceSpeaking ? "rgba(233,84,32,0.35)" : "rgba(233,84,32,0.18)")}
          >
            <SpeakerIcon active={isSentenceSpeaking} />
          </button>
        )}

        {/* Tokeny */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, flexWrap: "wrap" }}>
          {tokens.map((token) => (
            <Token
              key={token.key}
              token={token}
              onRemove={onRemove}
              onClick={() => handleTokenClick(token)}
              isSpeaking={speakingId === `sentence-token-${token.key}`}
            />
          ))}
        </div>

        {/* Vymazat vše */}
        <button
          type="button"
          onClick={onClear}
          aria-label="Vymazat celou větu"
          style={{
            padding: "5px 12px", borderRadius: 999, flexShrink: 0,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.3)",
            fontSize: 11, fontWeight: 500, cursor: "pointer",
            transition: "all 150ms",
            fontFamily: "Ubuntu, sans-serif",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.6)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.3)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
        >
          vymazat
        </button>
      </div>
    </>
  );
}
