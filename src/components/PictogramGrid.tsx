// ─── src/components/PictogramGrid.tsx ────────────────────────────────────
//
// Responzivní grid piktogramů.
// Počet sloupců řízen CSS proměnnou --grid-cols (1–4).
// Karta automaticky přizpůsobí svou velikost gridu.
// Podporuje staggered card-reveal animaci.

import { useRef, useCallback } from "react";
import PictogramCard, { type PictogramCardProps } from "./PictogramCard";
import { useSettings } from "../context/SettingsContext";

// ── Typy ──────────────────────────────────────────────────────────────────
interface GridItem {
  id:     number;
  label:  string;
}

interface PictogramGridProps {
  items:      GridItem[];
  selectedId?: number | null;
  onSelect:   (id: number, label: string) => void;
  /** Přepíše výchozí velikost karty z nastavení */
  sizeOverride?: PictogramCardProps["size"];
  /** Zobrazí skeleton při načítání */
  loading?:   boolean;
  skeletonCount?: number;
  /** Callback při long-press (pro FullScreenOverlay) */
  onLongPress?: (id: number, label: string) => void;
}

// ── Skeleton karta ────────────────────────────────────────────────────────
function SkeletonCard({ delay }: { delay: number }) {
  return (
    <div
      aria-hidden="true"
      style={{
        aspectRatio: "1",
        borderRadius: "var(--pk-card-radius, 28px)",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.07)",
        animation: `shimmer 1.6s ease-in-out ${delay}ms infinite`,
      }}
    />
  );
}

// ── Hlavní grid ────────────────────────────────────────────────────────────
export default function PictogramGrid({
  items,
  selectedId,
  onSelect,
  sizeOverride,
  loading   = false,
  skeletonCount = 12,
  onLongPress,
}: PictogramGridProps) {
  const { settings } = useSettings();
  const cols         = settings.gridCols ?? 3;

  // Velikost karty z gridu: 1 sl = lg, 2 sl = lg, 3 sl = md, 4 sl = sm
  const autoSize: PictogramCardProps["size"] =
    sizeOverride ?? (cols <= 2 ? "lg" : cols === 3 ? "md" : "sm");

  return (
    <>
      <style>{`
        @keyframes shimmer { 0%,100%{opacity:.4} 50%{opacity:.85} }
        @keyframes cardReveal {
          from { opacity:0; transform: translateY(12px) scale(0.95); }
          to   { opacity:1; transform: none; }
        }
        .pikto-grid {
          display: grid;
          grid-template-columns: repeat(var(--grid-cols, 3), 1fr);
          gap: var(--pk-gap, 10px);
        }
        /* Grid item: karta roztáhne celou buňku */
        .pikto-grid-item {
          display: flex;
          align-items: stretch;
        }
        .pikto-grid-item > * {
          width: 100% !important;
          height: auto !important;
          min-height: 88px;
        }
        /* Labels: respektuje --label-transform */
        .pikto-label {
          text-transform: var(--label-transform, none);
        }
      `}</style>

      <div
        className="pikto-grid"
        role="list"
        aria-label="Grid piktogramů"
        aria-busy={loading}
      >
        {loading ? (
          Array.from({ length: skeletonCount }).map((_, i) => (
            <div key={i} className="pikto-grid-item" role="listitem" aria-hidden="true">
              <SkeletonCard delay={i * 60} />
            </div>
          ))
        ) : (
          items.map((item, i) => (
            <div
              key={item.id}
              className="pikto-grid-item"
              role="listitem"
              style={{
                animation: `cardReveal 380ms cubic-bezier(0.22,1,0.36,1) ${Math.min(i, 11) * 40}ms both`,
              }}
            >
              <PictogramCard
                id={item.id}
                label={item.label}
                size={autoSize}
                selected={selectedId === item.id}
                onClick={() => onSelect(item.id, item.label)}
                onLongPressExternal={
                  onLongPress
                    ? () => onLongPress(item.id, item.label)
                    : undefined
                }
              />
            </div>
          ))
        )}
      </div>
    </>
  );
}
