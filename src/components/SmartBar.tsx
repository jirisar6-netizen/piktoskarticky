// ─── src/components/SmartBar.tsx ──────────────────────────────────────────
//
// Horizontálně scrollovatelná lišta s kontextuálními piktogramy.
// Design: průhledný panel s Ubuntu Orange okrajem.
// Scroll: nativní overflow-x-auto + skrytý scrollbar (cross-browser).

import { useRef, useState, useCallback, useEffect } from "react";
import PictogramCard from "./PictogramCard";
import { useTimeOfDay } from "../hooks/useTimeOfDay";
import type { SmartPictogram } from "../hooks/useTimeOfDay";

// ── Props ──────────────────────────────────────────────────────────────────
export interface SmartBarProps {
  /** Callback při výběru piktogramu – přidá ho do komunikační věty */
  onSelect?: (item: SmartPictogram) => void;
  /** Přepsat automatickou detekci denní doby (pro testování) */
  forceHour?: number;
}

// ── Gradient fade na okrajích (vizuální hint na scrollovatelnost) ─────────
function EdgeFade({ side }: { side: "left" | "right" }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        top: 0, bottom: 0,
        [side]: 0,
        width: 40,
        background: side === "right"
          ? "linear-gradient(to right, transparent, rgba(26,0,17,0.85))"
          : "linear-gradient(to left,  transparent, rgba(26,0,17,0.85))",
        pointerEvents: "none",
        zIndex: 2,
        transition: "opacity 200ms",
      }}
    />
  );
}

// ── Kategorie chip (malý label nad skupinou) ──────────────────────────────
function CategoryChip({ label }: { label: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 10px",
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        background: "rgba(233,84,32,0.15)",
        color: "rgba(233,84,32,0.85)",
        border: "1px solid rgba(233,84,32,0.25)",
        whiteSpace: "nowrap",
        alignSelf: "center",
        flexShrink: 0,
      }}
    >
      {label}
    </span>
  );
}

// ── Hlavní komponenta ─────────────────────────────────────────────────────
export default function SmartBar({ onSelect, forceHour }: SmartBarProps) {
  const context   = useTimeOfDay();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sledujeme pozici scrollu pro gradient fade
  const [scrollPos, setScrollPos] = useState<"start" | "middle" | "end">("start");

  const updateScrollPos = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    if (scrollLeft <= 4)                                  setScrollPos("start");
    else if (scrollLeft >= scrollWidth - clientWidth - 4) setScrollPos("end");
    else                                                  setScrollPos("middle");
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScrollPos, { passive: true });
    updateScrollPos();
    return () => el.removeEventListener("scroll", updateScrollPos);
  }, [updateScrollPos]);

  // Použijeme forceHour jen pro testování – přepočítáme context ručně
  const displayContext = forceHour !== undefined
    ? (() => {
        const { getTimeContext } = require("../hooks/useTimeOfDay");
        return getTimeContext(forceHour);
      })()
    : context;

  // Skupinujeme karty po kategoriích
  const grouped = displayContext.items.reduce<Map<string, SmartPictogram[]>>(
    (acc, item) => {
      const arr = acc.get(item.category) ?? [];
      arr.push(item);
      acc.set(item.category, arr);
      return acc;
    },
    new Map(),
  );

  return (
    <section aria-label={`Doporučené pro ${displayContext.label}`}>

      {/* ── Hlavička lišty ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-1 mb-2">
        <span className="text-base leading-none" aria-hidden="true">
          {displayContext.emoji}
        </span>
        <span
          className="text-xs font-semibold tracking-widest uppercase"
          style={{ color: "rgba(233,84,32,0.9)" }}
        >
          {displayContext.label}
        </span>
        <span
          className="text-xs"
          style={{ color: "rgba(255,255,255,0.25)" }}
        >
          — rychlé volby
        </span>
      </div>

      {/* ── Scrollovatelná lišta ────────────────────────────────────── */}
      <div
        style={{
          position: "relative",
          // Ubuntu Orange okraj – klíčový vizuální prvek
          borderRadius: 20,
          border: "1.5px solid rgba(233,84,32,0.35)",
          background: "rgba(255,255,255,0.03)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          overflow: "hidden",   // clip pro gradient fades
        }}
      >
        {/* Gradient fade – levý (skryt na startu) */}
        {(scrollPos === "middle" || scrollPos === "end") && (
          <EdgeFade side="left" />
        )}

        {/* Gradient fade – pravý (skryt na konci) */}
        {(scrollPos === "start" || scrollPos === "middle") && (
          <EdgeFade side="right" />
        )}

        {/* Scrollovatelný kontejner */}
        <div
          ref={scrollRef}
          role="list"
          aria-label="Doporučené piktogramy"
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
            overflowX: "auto",
            overflowY: "hidden",
            // Skrytí scrollbaru (cross-browser)
            scrollbarWidth: "none",          // Firefox
            msOverflowStyle: "none",         // IE / Edge legacy
            WebkitOverflowScrolling: "touch", // momentum scroll na iOS
            // Zabraň vertikálnímu scrollování při horizontálním swipu
            touchAction: "pan-x",
          }}
        >
          {/* Inline CSS pro skrytí ::-webkit-scrollbar */}
          <style>{`
            [data-smartbar-scroll]::-webkit-scrollbar { display: none; }
          `}</style>

          {/* Skupiny karet oddělené category chipem */}
          {Array.from(grouped.entries()).map(([category, items], groupIdx) => (
            <div
              key={category}
              role="group"
              aria-label={category}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexShrink: 0,
              }}
            >
              {/* Oddělovač mezi skupinami */}
              {groupIdx > 0 && (
                <div
                  aria-hidden="true"
                  style={{
                    width: 1,
                    height: 72,
                    background: "rgba(255,255,255,0.08)",
                    flexShrink: 0,
                    marginInline: 4,
                  }}
                />
              )}

              <CategoryChip label={category} />

              {items.map((item) => (
                <div key={item.id} role="listitem" style={{ flexShrink: 0 }}>
                  <PictogramCard
                    id={item.id}
                    label={item.label}
                    size="sm"
                    onClick={() => onSelect?.(item)}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
