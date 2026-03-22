// ─── src/components/PrintQueue.tsx ───────────────────────────────────────
//
// Panel správy tiskové fronty.
// Otevírá se z horní lišty nebo rodičovského nastavení.
// Zobrazuje miniatury karet, umožňuje přeřazení a export PDF.

import { useState, useCallback } from "react";
import { usePrintQueue }         from "../context/PrintQueueContext";
import { exportToPDF, LAYOUT_INFO, DEFAULT_EXPORT_OPTIONS } from "../services/pdfExporter";
import type { ExportOptions }    from "../services/pdfExporter";
import { logError }              from "../services/errorLogger";

// ── Toggle helper ──────────────────────────────────────────────────────────
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      style={{
        width: 40, height: 24, borderRadius: 999, border: "none",
        background: value ? "#E95420" : "rgba(255,255,255,0.15)",
        position: "relative", cursor: "pointer",
        transition: "background 220ms",
        minWidth: 40, minHeight: 24,
        flexShrink: 0,
      }}
    >
      <span style={{
        position: "absolute", top: 2, left: value ? 18 : 2,
        width: 20, height: 20, borderRadius: "50%", background: "#fff",
        boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
        transition: "left 200ms cubic-bezier(0.34,1.56,0.64,1)",
      }} />
    </button>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────
function ProgressBar({ value }: { value: number }) {
  return (
    <div style={{
      width: "100%", height: 6, borderRadius: 999,
      background: "rgba(255,255,255,0.1)", overflow: "hidden",
    }}>
      <div style={{
        height: "100%", borderRadius: 999,
        background: "linear-gradient(90deg, #E95420, #FF7043)",
        width: `${Math.round(value * 100)}%`,
        transition: "width 200ms ease",
        boxShadow: "0 0 6px rgba(233,84,32,0.6)",
      }} />
    </div>
  );
}

// ── Miniatura karty ve frontě ─────────────────────────────────────────────
function QueueCard({
  card, index, total,
  onRemove, onMoveUp, onMoveDown,
}: {
  card:       ReturnType<typeof usePrintQueue>["queue"][0];
  index:      number;
  total:      number;
  onRemove:   () => void;
  onMoveUp:   () => void;
  onMoveDown: () => void;
}) {
  return (
    <div style={{
      display:        "flex",
      alignItems:     "center",
      gap:            10,
      padding:        "8px 10px",
      borderRadius:   12,
      background:     "rgba(255,255,255,0.05)",
      border:         `1px solid ${card.voksColor ? card.voksColor + "40" : "rgba(255,255,255,0.1)"}`,
      transition:     "all 150ms",
      animation:      "fadeIn 200ms ease both",
    }}>
      {/* Číslo */}
      <span style={{
        width: 22, height: 22, borderRadius: "50%",
        background: "rgba(255,255,255,0.08)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)",
        flexShrink: 0,
      }}>
        {index + 1}
      </span>

      {/* Miniatura obrázku */}
      <div style={{
        width: 40, height: 40, borderRadius: 8, flexShrink: 0,
        background: "rgba(255,255,255,0.08)",
        border: card.voksColor ? `2px solid ${card.voksColor}` : "1px solid rgba(255,255,255,0.12)",
        overflow: "hidden",
      }}>
        <img
          src={card.imageUrl}
          alt={card.label}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
          loading="lazy"
          draggable={false}
        />
      </div>

      {/* Label */}
      <span style={{
        flex: 1, fontSize: 13, fontWeight: 500,
        color: "rgba(255,255,255,0.85)",
        fontFamily: "Ubuntu, sans-serif",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {card.label}
      </span>

      {/* VOKS tečka */}
      {card.voksColor && (
        <span style={{
          width: 8, height: 8, borderRadius: "50%",
          background: card.voksColor, flexShrink: 0,
          boxShadow: `0 0 4px ${card.voksColor}`,
        }} aria-hidden="true" />
      )}

      {/* Přeřazení */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 }}>
        <button
          type="button"
          onClick={onMoveUp}
          disabled={index === 0}
          aria-label="Přesunout výš"
          data-compact
          style={{
            width: 22, height: 22, borderRadius: 6,
            background: "rgba(255,255,255,0.06)",
            border: "none", cursor: index === 0 ? "default" : "pointer",
            color: "rgba(255,255,255,0.4)",
            fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center",
            opacity: index === 0 ? 0.3 : 1,
            minWidth: 22, minHeight: 22, transition: "opacity 150ms",
          }}
        >▲</button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={index >= total - 1}
          aria-label="Přesunout níž"
          data-compact
          style={{
            width: 22, height: 22, borderRadius: 6,
            background: "rgba(255,255,255,0.06)",
            border: "none", cursor: index >= total - 1 ? "default" : "pointer",
            color: "rgba(255,255,255,0.4)",
            fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center",
            opacity: index >= total - 1 ? 0.3 : 1,
            minWidth: 22, minHeight: 22, transition: "opacity 150ms",
          }}
        >▼</button>
      </div>

      {/* Odebrat */}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Odebrat ${card.label}`}
        data-compact
        style={{
          width: 28, height: 28, borderRadius: 8,
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "rgba(255,255,255,0.4)", fontSize: 12,
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          minWidth: 28, minHeight: 28, transition: "all 150ms",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = "rgba(255,80,80,0.15)";
          e.currentTarget.style.color      = "rgba(255,130,130,0.9)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = "rgba(255,255,255,0.05)";
          e.currentTarget.style.color      = "rgba(255,255,255,0.4)";
        }}
      >✕</button>
    </div>
  );
}

// ── Hlavní panel ──────────────────────────────────────────────────────────
interface PrintQueueProps {
  open:    boolean;
  onClose: () => void;
}

export default function PrintQueue({ open, onClose }: PrintQueueProps) {
  const {
    queue, dequeue, moveUp, moveDown, clearQueue,
  } = usePrintQueue();

  const [opts,     setOpts]     = useState<ExportOptions>(DEFAULT_EXPORT_OPTIONS);
  const [progress, setProgress] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [done,     setDone]     = useState(false);

  const totalPages = Math.ceil(queue.length / LAYOUT_INFO.cardsPerPage);

  const handleExport = useCallback(async () => {
    if (!queue.length) return;
    setExporting(true);
    setProgress(0);
    setError(null);
    setDone(false);
    try {
      await exportToPDF(queue, {
        ...opts,
        onProgress: setProgress,
      });
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Export selhal.";
      setError(msg);
      logError("app", "PDF export failed", err);
    } finally {
      setExporting(false);
    }
  }, [queue, opts]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 85,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
        }}
        aria-hidden="true"
      />

      {/* Drawer – vpravo */}
      <aside
        role="complementary"
        aria-label="Tisková fronta"
        style={{
          position: "fixed",
          right: 0, top: 0, bottom: 0,
          width: "min(400px, 100vw)",
          zIndex: 86,
          background: "rgba(16, 2, 11, 0.98)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderLeft: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "-12px 0 40px rgba(0,0,0,0.6)",
          display: "flex", flexDirection: "column",
          fontFamily: "Ubuntu, sans-serif",
          animation: "slideRight 240ms cubic-bezier(0.34,1.56,0.64,1) both",
        }}
      >
        <style>{`
          @keyframes slideRight {
            from { transform: translateX(100%); }
            to   { transform: translateX(0); }
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateX(8px); }
            to   { opacity: 1; transform: none; }
          }
        `}</style>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 18px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          flexShrink: 0,
        }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "#fff" }}>
              🖨️ Tisk karet
            </h2>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", margin: "3px 0 0" }}>
              {queue.length} {queue.length === 1 ? "karta" : queue.length < 5 ? "karty" : "karet"} ·
              {" "}{totalPages} {totalPages === 1 ? "strana" : "strany"} A4
            </p>
          </div>
          <button
            type="button" onClick={onClose} data-compact
            style={{
              width: 34, height: 34, borderRadius: "50%",
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.6)", fontSize: 15,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              minWidth: 34, minHeight: 34,
            }}
          >✕</button>
        </div>

        {/* Scrollovatelný obsah */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 18px", scrollbarWidth: "none" }}>

          {/* Prázdná fronta */}
          {queue.length === 0 ? (
            <div style={{
              textAlign: "center", padding: "40px 20px",
              color: "rgba(255,255,255,0.25)",
            }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🖨️</div>
              <p style={{ fontSize: 13, margin: 0, lineHeight: 1.6 }}>
                Fronta je prázdná.<br/>
                Přidej karty z komunikátoru nebo vyhledávání.
              </p>
            </div>
          ) : (
            <>
              {/* Info layout */}
              <div style={{
                padding: "10px 12px", borderRadius: 12,
                background: "rgba(233,84,32,0.08)",
                border: "1px solid rgba(233,84,32,0.2)",
                marginBottom: 14,
                fontSize: 11, color: "rgba(255,255,255,0.45)", lineHeight: 1.7,
              }}>
                📄 Formát: A4 · {LAYOUT_INFO.cols}×{LAYOUT_INFO.rows} = {LAYOUT_INFO.cardsPerPage} karet/strana
                {" · "}{LAYOUT_INFO.cardW_mm}×{LAYOUT_INFO.cardH_mm} mm každá
              </div>

              {/* Seznam karet */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                {queue.map((card, i) => (
                  <QueueCard
                    key={card.id}
                    card={card}
                    index={i}
                    total={queue.length}
                    onRemove={() => dequeue(card.id)}
                    onMoveUp={() => moveUp(card.id)}
                    onMoveDown={() => moveDown(card.id)}
                  />
                ))}
              </div>

              {/* Smazat vše */}
              <button
                type="button"
                onClick={clearQueue}
                style={{
                  width: "100%", padding: "8px 0", borderRadius: 10, marginBottom: 16,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.3)", fontSize: 11, cursor: "pointer",
                  fontFamily: "Ubuntu, sans-serif", minHeight: 36, transition: "all 150ms",
                }}
                onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,150,150,0.7)")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
              >
                Vyprázdnit frontu
              </button>

              {/* Oddělovač */}
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", marginBottom: 14 }} />

              {/* Export možnosti */}
              <p style={{
                fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                textTransform: "uppercase", color: "rgba(255,255,255,0.3)",
                margin: "0 0 10px",
              }}>
                Nastavení exportu
              </p>

              {[
                { key: "showVoksColors",  label: "VOKS barevné rámečky",    sub: "Barevné ohraničení dle kategorie" },
                { key: "showCropMarks",   label: "Ořezové značky",           sub: "Tečkované čáry pro nůžky" },
                { key: "showLabels",      label: "Textové popisky",          sub: "Název pod každou kartou" },
                { key: "uppercase",       label: "VERZÁLKY",                 sub: "Popisky velkými písmeny" },
              ].map(({ key, label, sub }) => (
                <div
                  key={key}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "9px 0",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)" }}>{label}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 1 }}>{sub}</div>
                  </div>
                  <Toggle
                    value={opts[key as keyof ExportOptions] as boolean}
                    onChange={v => setOpts(p => ({ ...p, [key]: v }))}
                  />
                </div>
              ))}

              {/* Název souboru */}
              <div style={{ marginTop: 12, marginBottom: 4 }}>
                <label style={{
                  display: "block", fontSize: 10, fontWeight: 700,
                  letterSpacing: "0.07em", textTransform: "uppercase",
                  color: "rgba(255,255,255,0.3)", marginBottom: 6,
                }}>
                  Název souboru
                </label>
                <input
                  type="text"
                  value={opts.filename}
                  onChange={e => setOpts(p => ({ ...p, filename: e.target.value }))}
                  style={{
                    width: "100%", padding: "9px 12px", borderRadius: 10,
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "rgba(255,255,255,0.8)", fontSize: 12,
                    fontFamily: "Ubuntu, sans-serif",
                    outline: "none", userSelect: "text", WebkitUserSelect: "text",
                  }}
                  onFocus={e => (e.target.style.borderColor = "rgba(233,84,32,0.5)")}
                  onBlur={e  => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer – export tlačítko */}
        {queue.length > 0 && (
          <div style={{
            padding: "12px 18px 16px",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            flexShrink: 0,
            display: "flex", flexDirection: "column", gap: 10,
          }}>
            {/* Progress */}
            {exporting && (
              <div>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", margin: "0 0 6px", textAlign: "center" }}>
                  Generuji PDF… {Math.round(progress * 100)}%
                </p>
                <ProgressBar value={progress} />
              </div>
            )}

            {/* Chyba */}
            {error && (
              <p style={{
                fontSize: 11, color: "rgba(255,100,100,0.9)",
                padding: "8px 12px", borderRadius: 10,
                background: "rgba(255,50,50,0.08)",
                border: "1px solid rgba(255,80,80,0.2)",
                margin: 0,
              }}>
                ⚠️ {error}
              </p>
            )}

            {/* Export button */}
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting || queue.length === 0}
              style={{
                padding: "14px 0", borderRadius: 14, minHeight: 52,
                background: done
                  ? "rgba(76,175,80,0.2)"
                  : exporting
                    ? "rgba(233,84,32,0.1)"
                    : "rgba(233,84,32,0.2)",
                border: `1.5px solid ${done ? "rgba(76,175,80,0.6)" : exporting ? "rgba(233,84,32,0.3)" : "rgba(233,84,32,0.55)"}`,
                color: done ? "#4CAF50" : exporting ? "rgba(255,255,255,0.4)" : "#E95420",
                fontSize: 14, fontWeight: 700, cursor: exporting ? "default" : "pointer",
                fontFamily: "Ubuntu, sans-serif",
                transition: "all 200ms",
                boxShadow: done
                  ? "0 0 16px rgba(76,175,80,0.35)"
                  : exporting
                    ? "none"
                    : "0 0 16px rgba(233,84,32,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              {done
                ? "✓ PDF staženo!"
                : exporting
                  ? "⏳ Generuji…"
                  : `📥 Exportovat PDF (${queue.length} karet)`
              }
            </button>

            <p style={{
              fontSize: 10, color: "rgba(255,255,255,0.2)",
              textAlign: "center", margin: 0,
            }}>
              Vyžaduje instalaci: <code style={{ color: "rgba(233,84,32,0.5)" }}>npm install jspdf</code>
            </p>
          </div>
        )}
      </aside>
    </>
  );
}
