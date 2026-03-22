// ─── src/components/ThemeEditor.tsx ──────────────────────────────────────
//
// Interaktivní editor tématu s živým náhledem.
// Zobrazuje se jako modální drawer (bottom sheet na mobilu, side panel na desktopu).
// Každá změna se okamžitě projeví v celé aplikaci přes CSS custom properties.

import { useState, useCallback } from "react";
import {
  useTheme,
  MODE_INFO,
  COLOR_TOKENS,
  DEFAULT_THEME,
  type ColorMode,
  type CardSize,
  type Spacing,
} from "../context/ThemeContext";
import { getPictogramUrl } from "../services/arasaacApi";

// ── Props ──────────────────────────────────────────────────────────────────
interface ThemeEditorProps {
  /** Zda je editor viditelný */
  open:     boolean;
  /** Callback pro zavření */
  onClose:  () => void;
}

// ── Živá náhledová karta ──────────────────────────────────────────────────
// Renderuje piktogram přesně tak, jak bude vypadat v aplikaci
// (čte tokeny přímo ze stavu, ne z CSS – aby preview bylo okamžité)
function PreviewCard({ theme }: { theme: ReturnType<typeof useTheme>["theme"] }) {
  const tokens = COLOR_TOKENS[theme.colorMode];
  const SIZE_MAP = {
    small:  { card: 104, img: 60, fs: 11, r: 20 },
    medium: { card: 140, img: 84, fs: 13, r: 28 },
    large:  { card: 176, img: 108, fs: 15, r: 32 },
  };
  const { card, img, fs, r } = SIZE_MAP[theme.cardSize];
  const radius = Math.min(Math.max(theme.cardRadius, 0), 48);

  // Demo piktogram: "jíst" (ARASAAC ID 2727)
  const DEMO_ID    = 2727;
  const DEMO_LABEL = "jíst";

  // Speciální styly pro high-contrast
  const isHC = theme.colorMode === "high-contrast";

  return (
    <div
      style={{
        width:  card,
        height: card,
        borderRadius: radius,
        background: isHC
          ? "#111111"
          : `rgba(255,255,255,${theme.glassOpacity / 100})`,
        border: `${isHC ? "2.5px" : "1px"} solid ${tokens["--pk-card-border"]}`,
        boxShadow: tokens["--pk-card-shadow"],
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "space-between",
        padding: "12px 8px 10px",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        transition: "all 280ms cubic-bezier(0.34,1.56,0.64,1)",
        position: "relative",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {/* Inset highlight */}
      {!isHC && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 1,
          background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent)",
          pointerEvents: "none",
        }} />
      )}

      {/* Obrázek */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
        <img
          src={getPictogramUrl(DEMO_ID, 300)}
          alt={DEMO_LABEL}
          width={img} height={img}
          style={{
            objectFit: "contain",
            borderRadius: 6,
            // High-contrast: lehký žlutý tint na obrázek
            filter: isHC ? "brightness(1) contrast(1.1)" : "none",
          }}
        />
      </div>

      {/* Label */}
      {theme.showLabels && (
        <span style={{
          fontSize: fs,
          fontWeight: isHC ? 700 : 500,
          color: isHC ? "#FFE000" : tokens["--pk-text-primary"],
          textAlign: "center",
          width: "100%",
          letterSpacing: isHC ? "0.06em" : "normal",
          textTransform: isHC ? "uppercase" : "none",
          lineHeight: 1.3,
          fontFamily: "Ubuntu, sans-serif",
        }}>
          {DEMO_LABEL}
        </span>
      )}
    </div>
  );
}

// ── Barevný mode výběr ────────────────────────────────────────────────────
function ModeGrid({ value, onChange }: { value: ColorMode; onChange: (v: ColorMode) => void }) {
  const modes = Object.entries(MODE_INFO) as [ColorMode, typeof MODE_INFO[ColorMode]][];
  const TOKENS = COLOR_TOKENS;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      {modes.map(([mode, info]) => {
        const active  = value === mode;
        const t       = TOKENS[mode];
        return (
          <button
            key={mode}
            type="button"
            onClick={() => onChange(mode)}
            aria-pressed={active}
            style={{
              padding: "12px 10px",
              borderRadius: 14,
              background: active
                ? `${t["--pk-accent-dim"]}`
                : "rgba(255,255,255,0.04)",
              border: `${active ? "1.5px" : "1px"} solid ${active ? t["--pk-accent"] : "rgba(255,255,255,0.1)"}`,
              cursor: "pointer",
              display: "flex", alignItems: "center", gap: 10,
              transition: "all 200ms",
              textAlign: "left",
              fontFamily: "Ubuntu, sans-serif",
              minHeight: 56,
            }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
          >
            {/* Barevný dot */}
            <span style={{
              width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
              background: t["--pk-accent"],
              border: `2px solid ${t["--pk-card-border"]}`,
              boxShadow: active ? `0 0 10px ${t["--pk-accent-glow"]}` : "none",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13,
            }}>
              {info.emoji}
            </span>
            <div>
              <div style={{
                fontSize: 12, fontWeight: active ? 700 : 500,
                color: active ? t["--pk-accent"] : "rgba(255,255,255,0.75)",
                lineHeight: 1.2,
              }}>
                {info.label}
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2, lineHeight: 1.3 }}>
                {info.desc}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── Segment control (3 možnosti) ──────────────────────────────────────────
function SegmentControl<T extends string>({
  value, options, onChange,
}: {
  value: T;
  options: { v: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div style={{
      display: "flex", borderRadius: 12, overflow: "hidden",
      background: "rgba(255,255,255,0.05)",
      border: "1px solid rgba(255,255,255,0.1)",
    }}>
      {options.map(({ v, label }) => {
        const active = value === v;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            aria-pressed={active}
            style={{
              flex: 1, padding: "9px 0",
              background: active ? "rgba(233,84,32,0.22)" : "transparent",
              border: "none",
              borderRight: "1px solid rgba(255,255,255,0.08)",
              color: active ? "#E95420" : "rgba(255,255,255,0.5)",
              fontSize: 12, fontWeight: active ? 700 : 400,
              cursor: "pointer",
              transition: "all 180ms",
              fontFamily: "Ubuntu, sans-serif",
              minHeight: 44,
            }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.color = "rgba(255,255,255,0.8)"; }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ── Slider s tokenovanou barvou ───────────────────────────────────────────
function ThemedSlider({
  value, min, max, step = 1, onChange, fmt, label, accent = "var(--pk-accent)",
}: {
  value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void; fmt?: (v: number) => string;
  label: string; accent?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", fontFamily: "Ubuntu, sans-serif" }}>
          {label}
        </span>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--pk-accent)", fontVariantNumeric: "tabular-nums", fontFamily: "Ubuntu, sans-serif" }}>
          {fmt ? fmt(value) : value}
        </span>
      </div>
      <div style={{ position: "relative", height: 20, display: "flex", alignItems: "center" }}>
        <div style={{
          position: "absolute", inset: 0, top: "50%", transform: "translateY(-50%)",
          height: 4, borderRadius: 999,
          background: `linear-gradient(to right, ${accent} ${pct}%, rgba(255,255,255,0.15) ${pct}%)`,
        }} />
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{ width: "100%", height: 20, opacity: 0, position: "relative", zIndex: 1, cursor: "pointer", margin: 0, padding: 0 }}
        />
        <div style={{
          position: "absolute", left: `calc(${pct}% - 10px)`, top: "50%",
          transform: "translateY(-50%)", width: 20, height: 20, borderRadius: "50%",
          background: accent, boxShadow: `0 0 8px ${accent}80, 0 2px 4px rgba(0,0,0,0.4)`,
          pointerEvents: "none", transition: "left 0ms",
        }} />
      </div>
    </div>
  );
}

// ── Toggle ─────────────────────────────────────────────────────────────────
function Toggle({ value, onChange, label, sub }: {
  value: boolean; onChange: (v: boolean) => void; label: string; sub?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 0", background: "none", border: "none", cursor: "pointer",
        minHeight: 44,
      }}
    >
      <div style={{ textAlign: "left" }}>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", fontFamily: "Ubuntu, sans-serif" }}>{label}</div>
        {sub && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2, fontFamily: "Ubuntu, sans-serif" }}>{sub}</div>}
      </div>
      <div style={{
        width: 44, height: 26, borderRadius: 999, flexShrink: 0,
        background: value ? "var(--pk-accent)" : "rgba(255,255,255,0.15)",
        position: "relative", transition: "background 250ms",
      }}>
        <span style={{
          position: "absolute", top: 3, left: value ? 21 : 3,
          width: 20, height: 20, borderRadius: "50%", background: "#fff",
          boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
          transition: "left 220ms cubic-bezier(0.34,1.56,0.64,1)",
        }} />
      </div>
    </button>
  );
}

// ── Section label ─────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
      textTransform: "uppercase", color: "rgba(255,255,255,0.3)",
      fontFamily: "Ubuntu, sans-serif",
      marginBottom: 10, marginTop: 4,
    }}>
      {children}
    </div>
  );
}

// ── Hlavní ThemeEditor ────────────────────────────────────────────────────
export default function ThemeEditor({ open, onClose }: ThemeEditorProps) {
  const { theme, update, reset } = useTheme();
  const [confirmReset, setConfirmReset] = useState(false);

  const handleReset = useCallback(() => {
    if (!confirmReset) { setConfirmReset(true); setTimeout(() => setConfirmReset(false), 2500); return; }
    reset(); setConfirmReset(false);
  }, [confirmReset, reset]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 80,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
        }}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Editor tématu"
        style={{
          position: "fixed",
          right: 0, top: 0, bottom: 0,
          width: "min(380px, 100vw)",
          zIndex: 81,
          background: "rgba(18,2,12,0.98)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderLeft: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "-16px 0 48px rgba(0,0,0,0.6)",
          display: "flex", flexDirection: "column",
          fontFamily: "Ubuntu, sans-serif",
          animation: "slideInRight 260ms cubic-bezier(0.34,1.56,0.64,1) both",
        }}
      >
        <style>{`
          @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to   { transform: translateX(0);    opacity: 1; }
          }
          input[type=range] { -webkit-appearance: none; appearance: none; }
        `}</style>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          flexShrink: 0,
        }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#fff" }}>🎨 Editor tématu</h2>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", margin: "3px 0 0" }}>
              Změny se aplikují okamžitě
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            data-compact
            aria-label="Zavřít editor"
            style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.6)",
              fontSize: 16, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 150ms",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.14)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
          >
            ✕
          </button>
        </div>

        {/* Scrollovatelný obsah */}
        <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "16px 20px 24px", scrollbarWidth: "none" }}>

          {/* ── ŽIVÝ NÁHLED ───────────────────────────────────────── */}
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
            padding: "20px 16px",
            borderRadius: 20,
            background: `linear-gradient(135deg, ${COLOR_TOKENS[theme.colorMode]["--pk-bg-from"]} 0%, ${COLOR_TOKENS[theme.colorMode]["--pk-bg-to"]} 100%)`,
            border: "1px solid rgba(255,255,255,0.08)",
            marginBottom: 20,
            transition: "background 400ms ease",
          }}>
            <PreviewCard theme={theme} />
            <span style={{
              fontSize: 10, color: "rgba(255,255,255,0.3)",
              letterSpacing: "0.06em", textTransform: "uppercase",
            }}>
              Živý náhled
            </span>
          </div>

          {/* ── BAREVNÝ REŽIM ─────────────────────────────────────── */}
          <SectionLabel>Barevný režim</SectionLabel>
          <ModeGrid
            value={theme.colorMode}
            onChange={v => update({ colorMode: v as ColorMode })}
          />

          <div style={{ height: 20 }} />

          {/* ── VELIKOST KARET ────────────────────────────────────── */}
          <SectionLabel>Velikost karet</SectionLabel>
          <SegmentControl
            value={theme.cardSize}
            options={[
              { v: "small",  label: "Malé" },
              { v: "medium", label: "Střední" },
              { v: "large",  label: "Velké" },
            ] as { v: CardSize; label: string }[]}
            onChange={v => update({ cardSize: v })}
          />

          <div style={{ height: 20 }} />

          {/* ── MEZERY ────────────────────────────────────────────── */}
          <SectionLabel>Mezery v gridu</SectionLabel>
          <SegmentControl
            value={theme.spacing}
            options={[
              { v: "compact",  label: "Kompaktní" },
              { v: "spacious", label: "Vzdušné" },
            ] as { v: Spacing; label: string }[]}
            onChange={v => update({ spacing: v })}
          />

          <div style={{ height: 20 }} />

          {/* ── DETAILNÍ OVLÁDÁNÍ ─────────────────────────────────── */}
          <SectionLabel>Tvar a průhlednost</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <ThemedSlider
              label="Zaoblení rohů"
              value={theme.cardRadius}
              min={4} max={48} step={2}
              onChange={v => update({ cardRadius: v })}
              fmt={v => `${v}px`}
            />
            {theme.colorMode !== "high-contrast" && (
              <ThemedSlider
                label="Průhlednost skla"
                value={theme.glassOpacity}
                min={0} max={20} step={1}
                onChange={v => update({ glassOpacity: v })}
                fmt={v => `${v}%`}
                accent="rgba(100,200,255,0.9)"
              />
            )}
          </div>

          <div style={{ height: 20 }} />

          {/* ── PŘEPÍNAČE ─────────────────────────────────────────── */}
          <SectionLabel>Zobrazení</SectionLabel>
          <div style={{
            borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)", padding: "0 14px",
          }}>
            <Toggle
              label="Zobrazovat popisky"
              sub="Text pod každým piktogramem"
              value={theme.showLabels}
              onChange={v => update({ showLabels: v })}
            />
          </div>

          <div style={{ height: 28 }} />

          {/* ── RESET ─────────────────────────────────────────────── */}
          <button
            type="button"
            onClick={handleReset}
            style={{
              width: "100%", padding: "12px 0", borderRadius: 14, minHeight: 48,
              background: confirmReset ? "rgba(255,50,50,0.15)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${confirmReset ? "rgba(255,80,80,0.4)" : "rgba(255,255,255,0.1)"}`,
              color: confirmReset ? "rgba(255,120,120,0.9)" : "rgba(255,255,255,0.3)",
              fontSize: 12, fontWeight: 500, cursor: "pointer",
              fontFamily: "Ubuntu, sans-serif", transition: "all 200ms",
            }}
          >
            {confirmReset ? "⚠️ Potvrdit reset tématu" : "Obnovit výchozí téma"}
          </button>
        </div>
      </div>
    </>
  );
}
