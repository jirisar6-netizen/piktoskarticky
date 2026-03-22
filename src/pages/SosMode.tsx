// ─── src/pages/SosMode.tsx ────────────────────────────────────────────────
//
// Guardian SOS – krizový komunikační modul.
//
// Design filozofie:
//   • Tmavě rudý gradient = závažnost, ale ne panika
//   • 4 velká tlačítka = jediná možná akce, žádná volba
//   • Žádná navigace, žádné distrakce, žádné animace layoutu
//   • Velký text + piktogram = čitelné i při rozmazaném vidění (slzy)
//   • Long press ochrana = dítě nevyskočí omylem

import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { BlockGate }   from "../components/ParentalGate";
import { getPictogramUrl } from "../services/arasaacApi";

// ── SOS piktogramy (ověřená ARASAAC ID) ──────────────────────────────────
const SOS_ITEMS = [
  {
    id:      33196,
    label:   "BOLÍ",
    sublabel: "Bolí mě",
    color:   { bg: "rgba(180, 30, 30, 0.35)", border: "rgba(220, 60, 60, 0.5)",  glow: "rgba(220,60,60,0.3)"  },
    icon:    "💢",
  },
  {
    id:      5824,
    label:   "STOP",
    sublabel: "Chci pryč",
    color:   { bg: "rgba(160, 40, 10, 0.35)", border: "rgba(233,84,32,0.55)",    glow: "rgba(233,84,32,0.28)" },
    icon:    "✋",
  },
  {
    id:      7219,  // sluchátka / ticho – nejbližší ARASAAC alternativa
    label:   "TICHO",
    sublabel: "Potřebuji klid",
    color:   { bg: "rgba(20, 40, 80, 0.45)",  border: "rgba(80,130,220,0.45)",   glow: "rgba(80,130,220,0.2)" },
    icon:    "🤫",
  },
  {
    id:      5824,
    label:   "POMOC",
    sublabel: "Potřebuji pomoct",
    color:   { bg: "rgba(10, 80, 40, 0.45)",  border: "rgba(50,180,100,0.45)",   glow: "rgba(50,180,100,0.2)" },
    icon:    "🙏",
  },
] as const;

// ── Typy ──────────────────────────────────────────────────────────────────
type SosItemKey = typeof SOS_ITEMS[number]["label"];

// ── Velká SOS karta ───────────────────────────────────────────────────────
interface SosCardProps {
  id:       number;
  label:    string;
  sublabel: string;
  icon:     string;
  color:    { bg: string; border: string; glow: string };
  onPress:  (label: string) => void;
  active:   boolean;
}

function SosCard({ id, label, sublabel, icon, color, onPress, active }: SosCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [pressed,   setPressed]   = useState(false);

  return (
    <button
      type="button"
      onClick={() => onPress(label)}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      aria-label={`${label} – ${sublabel}`}
      aria-pressed={active}
      style={{
        // ── Rozměry – vyplní celou grid buňku ────────────────────────
        width: "100%",
        height: "100%",
        minHeight: 0,

        // ── Vizuál ────────────────────────────────────────────────────
        borderRadius: 28,
        background: active
          ? color.bg.replace("0.35", "0.65").replace("0.45", "0.7")
          : color.bg,
        border: `2px solid ${active ? color.border : color.border.replace("0.5","0.3").replace("0.55","0.3").replace("0.45","0.25")}`,
        boxShadow: active
          ? `0 0 32px ${color.glow}, inset 0 1px 0 rgba(255,255,255,0.1)`
          : pressed
            ? `0 0 16px ${color.glow}`
            : "inset 0 1px 0 rgba(255,255,255,0.06)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",

        // ── Layout ────────────────────────────────────────────────────
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: "16px 12px",
        cursor: "pointer",

        // ── Animace ───────────────────────────────────────────────────
        transform: pressed ? "scale(0.96)" : "scale(1)",
        transition: "transform 140ms ease, box-shadow 200ms ease, background 200ms ease, border-color 200ms ease",
        userSelect: "none",
        WebkitTapHighlightColor: "transparent",

        // ── Reset button ──────────────────────────────────────────────
        outline: "none",
        fontFamily: "Ubuntu, sans-serif",
      }}
    >
      {/* Fallback ikona (emoji) – viditelná než se načte obrázek */}
      {!imgLoaded && (
        <span style={{ fontSize: "clamp(36px, 6vw, 56px)", lineHeight: 1 }} aria-hidden="true">
          {icon}
        </span>
      )}

      {/* ARASAAC piktogram */}
      <img
        src={getPictogramUrl(id, 300)}
        alt=""
        aria-hidden="true"
        onLoad={() => setImgLoaded(true)}
        draggable={false}
        style={{
          width:  "clamp(64px, 10vw, 110px)",
          height: "clamp(64px, 10vw, 110px)",
          objectFit: "contain",
          opacity: imgLoaded ? 1 : 0,
          transition: "opacity 250ms ease",
          borderRadius: 8,
          // Bílé ARASAAC pozadí – jemné odlišení od tmavé karty
          background: "rgba(255,255,255,0.08)",
          padding: 6,
          display: imgLoaded ? "block" : "none",
        }}
      />

      {/* Texty */}
      <div style={{ textAlign: "center", lineHeight: 1.2 }}>
        <div style={{
          fontSize: "clamp(20px, 3.5vw, 30px)",
          fontWeight: 700,
          letterSpacing: "0.06em",
          color: "#ffffff",
          textShadow: `0 0 20px ${color.glow}`,
        }}>
          {label}
        </div>
        <div style={{
          fontSize: "clamp(11px, 1.8vw, 15px)",
          fontWeight: 400,
          color: "rgba(255,255,255,0.55)",
          marginTop: 4,
          letterSpacing: "0.02em",
        }}>
          {sublabel}
        </div>
      </div>
    </button>
  );
}

// ── Long Press Back Button ────────────────────────────────────────────────
interface BackButtonProps {
  onBack: () => void;
}

function BackButton({ onBack }: BackButtonProps) {
  const [progress, setProgress] = useState(0);
  const [holding,  setHolding]  = useState(false);

  const handlers = useLongPress({
    duration:    1800,
    onComplete:  onBack,
    onProgress:  (p) => {
      setProgress(p);
      setHolding(p > 0 && p < 1);
    },
    onCancel: () => {
      setProgress(0);
      setHolding(false);
    },
  });

  // Obvodová progress SVG (kruhový indicator)
  const RADIUS   = 16;
  const CIRCUM   = 2 * Math.PI * RADIUS;
  const dashOffset = CIRCUM * (1 - progress);

  return (
    <button
      type="button"
      aria-label="Držte pro návrat zpět"
      {...handlers}
      style={{
        position:    "relative",
        width:       48,
        height:      48,
        borderRadius: "50%",
        background:  holding
          ? "rgba(255,255,255,0.18)"
          : "rgba(255,255,255,0.07)",
        border:      "1.5px solid rgba(255,255,255,0.2)",
        cursor:      "pointer",
        display:     "flex",
        alignItems:  "center",
        justifyContent: "center",
        transition:  "background 150ms ease",
        userSelect:  "none",
        WebkitTapHighlightColor: "transparent",
        flexShrink:  0,
        outline:     "none",
      }}
    >
      {/* SVG kruhový progress */}
      <svg
        style={{
          position: "absolute",
          inset: -3,
          width: "calc(100% + 6px)",
          height: "calc(100% + 6px)",
          transform: "rotate(-90deg)",
          pointerEvents: "none",
        }}
        viewBox="0 0 44 44"
        aria-hidden="true"
      >
        <circle
          cx="22" cy="22" r={RADIUS}
          fill="none"
          stroke="rgba(233,84,32,0.9)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={CIRCUM}
          strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 50ms linear" }}
        />
      </svg>

      {/* Šipka zpět */}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M19 12H5M12 5l-7 7 7 7"
          stroke="rgba(255,255,255,0.7)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* Tooltip pod tlačítkem */}
      <span style={{
        position:   "absolute",
        top:        "calc(100% + 6px)",
        left:       "50%",
        transform:  "translateX(-50%)",
        whiteSpace: "nowrap",
        fontSize:   9,
        fontWeight: 500,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color:      holding
          ? "rgba(233,84,32,0.9)"
          : "rgba(255,255,255,0.25)",
        fontFamily: "Ubuntu, sans-serif",
        transition: "color 150ms",
        pointerEvents: "none",
      }}>
        {holding ? `${Math.round(progress * 100)}%` : "držet"}
      </span>
    </button>
  );
}

// ── Hlavní stránka ────────────────────────────────────────────────────────
export default function SosMode() {
  const navigate = useNavigate();
  const [activeCard, setActiveCard] = useState<SosItemKey | null>(null);

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleCardPress = useCallback((label: string) => {
    setActiveCard((prev) => (prev === label ? null : label as SosItemKey));
  }, []);

  return (
    <div
      aria-label="Nouzový komunikační panel"
      style={{
        // ── Full-screen, bez scrollu ──────────────────────────────────
        height: "100%",
        width:  "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        // ── Tmavě rudý gradient – klidná závažnost ────────────────────
        background: "linear-gradient(160deg, #2a0a0a 0%, #1a0505 50%, #0f0202 100%)",
        fontFamily: "Ubuntu, sans-serif",
        position: "relative",
      }}
    >
      {/* ── Jemná textura přes pozadí ─────────────────────────────────── */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "radial-gradient(ellipse at 50% 0%, rgba(180,30,30,0.12) 0%, transparent 65%)",
          zIndex: 0,
        }}
      />

      {/* ── TOP BAR ──────────────────────────────────────────────────── */}
      <div style={{
        position: "relative", zIndex: 2,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        padding: "14px 16px 10px",
        flexShrink: 0,
      }}>
        {/* Long-press back */}
        <BlockGate onUnlock={handleBack} label="Ukončit SOS režim" />

        {/* Název režimu */}
        <div style={{ textAlign: "center", flex: 1 }}>
          <div style={{
            fontSize: "clamp(13px, 2vw, 16px)",
            fontWeight: 700,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "rgba(220,80,80,0.8)",
          }}>
            Guardian SOS
          </div>
          <div style={{
            fontSize: "clamp(10px, 1.4vw, 12px)",
            color: "rgba(255,255,255,0.25)",
            marginTop: 2,
            letterSpacing: "0.06em",
          }}>
            Vyber, co potřebuješ
          </div>
        </div>

        {/* Vyrovnání (pravá strana prázdná) */}
        <div style={{ width: 48 }} aria-hidden="true" />
      </div>

      {/* ── GRID 4 KARET ──────────────────────────────────────────────── */}
      <div
        role="group"
        aria-label="Komunikační tlačítka"
        style={{
          position: "relative", zIndex: 1,
          flex: 1,
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gridTemplateRows: "1fr 1fr",
          gap: 10,
          padding: "4px 12px 16px",
        }}
      >
        {SOS_ITEMS.map((item) => (
          <SosCard
            key={item.label}
            {...item}
            active={activeCard === item.label}
            onPress={handleCardPress}
          />
        ))}
      </div>

      {/* ── Jemný vignette na okrajích ────────────────────────────────── */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
          boxShadow: "inset 0 0 80px rgba(0,0,0,0.4)",
        }}
      />
    </div>
  );
}
