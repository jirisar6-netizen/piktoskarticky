// ─── src/components/ParentalGate.tsx ─────────────────────────────────────
//
// Vizuální komponenta rodičovské pojistky.
//
// Dvě varianty:
//   "icon"    – kruhové tlačítko se zámkem (pro top bar)
//   "block"   – celoplošný blocker s textem (pro SOS exit)
//
// Po odemčení volá onUnlock() – rodič může pokračovat.

import { useState, useRef, useEffect, useCallback } from "react";
import { useParentalLock } from "../hooks/useParentalLock";

// ── Props ──────────────────────────────────────────────────────────────────
interface ParentalGateProps {
  /** Voláno po úspěšném odemčení */
  onUnlock:   () => void;
  /** Vizuální varianta */
  variant?:   "icon" | "block";
  /** Popis akce (zobrazí se v blocku) */
  label?:     string;
  /** Tooltip / aria-label */
  hint?:      string;
  /** Barva oranžového kruhu (výchozí: #E95420) */
  color?:     string;
}

// ── SVG progress kruh ─────────────────────────────────────────────────────
function ProgressRing({
  progress, size, stroke, color,
}: { progress: number; size: number; stroke: number; color: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg
      width={size} height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ transform: "rotate(-90deg)", position: "absolute", inset: 0, pointerEvents: "none" }}
      aria-hidden="true"
    >
      {/* Dráha kruhu (šedá) */}
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={stroke}
      />
      {/* Progress (oranžová) */}
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.min(progress, 1))}
        style={{ transition: "stroke-dashoffset 40ms linear" }}
      />
    </svg>
  );
}

// ── Ikona zámku ────────────────────────────────────────────────────────────
function LockIcon({ unlocked, size = 16 }: { unlocked: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {unlocked ? (
        // Otevřený zámek
        <>
          <rect x="3" y="11" width="18" height="11" rx="2" fill="rgba(255,255,255,0.7)"/>
          <path d="M7 11V7a5 5 0 019.9-1" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round"/>
        </>
      ) : (
        // Zavřený zámek
        <>
          <rect x="3" y="11" width="18" height="11" rx="2" fill="rgba(255,255,255,0.65)"/>
          <path d="M7 11V7a5 5 0 0110 0v4" stroke="rgba(255,255,255,0.65)" strokeWidth="2" strokeLinecap="round"/>
        </>
      )}
    </svg>
  );
}

// ── Math Challenge Modal ───────────────────────────────────────────────────
function MathModal({
  question, error, onSubmit, onClose,
}: {
  question:  string;
  error:     boolean;
  onSubmit:  (ans: string) => void;
  onClose:   () => void;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Autofocus po animaci
    const t = setTimeout(() => inputRef.current?.focus(), 180);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = useCallback(() => {
    if (value.trim()) onSubmit(value);
  }, [value, onSubmit]);

  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
    if (e.key === "Escape") onClose();
  }, [handleSubmit, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
        }}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Rodičovské ověření"
        style={{
          position: "fixed",
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 101,
          width: "min(340px, calc(100vw - 32px))",
          borderRadius: 24,
          background: "rgba(26, 0, 17, 0.98)",
          border: "1px solid rgba(255,255,255,0.15)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(233,84,32,0.15)",
          padding: "28px 24px 24px",
          fontFamily: "Ubuntu, sans-serif",
          animation: "mathPop 220ms cubic-bezier(0.34,1.56,0.64,1) both",
        }}
      >
        <style>{`@keyframes mathPop { from{opacity:0;transform:translate(-50%,-50%) scale(.88)} to{opacity:1;transform:translate(-50%,-50%) scale(1)} }`}</style>

        {/* Hlavička */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🔒</div>
          <h2 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 6px", color: "#fff" }}>
            Rodičovské ověření
          </h2>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: 0, lineHeight: 1.5 }}>
            Vyřeš příklad pro přístup do nastavení
          </p>
        </div>

        {/* Math příklad */}
        <div style={{
          textAlign: "center",
          padding: "18px 0",
          marginBottom: 16,
          borderRadius: 16,
          background: "rgba(233,84,32,0.08)",
          border: "1px solid rgba(233,84,32,0.2)",
        }}>
          <span style={{
            fontSize: 32, fontWeight: 700,
            color: "#fff", letterSpacing: "0.04em",
            fontVariantNumeric: "tabular-nums",
          }}>
            {question} = ?
          </span>
        </div>

        {/* Input */}
        <div style={{ marginBottom: 14 }}>
          <input
            ref={inputRef}
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            value={value}
            onChange={(e) => { setValue(e.target.value); }}
            onKeyDown={handleKey}
            placeholder="Tvá odpověď"
            aria-label="Odpověď na matematický příklad"
            aria-invalid={error}
            style={{
              width: "100%",
              padding: "14px 16px",
              borderRadius: 14,
              background: "rgba(255,255,255,0.07)",
              border: `1.5px solid ${error ? "rgba(255,80,80,0.7)" : "rgba(255,255,255,0.15)"}`,
              color: "#fff",
              fontSize: 20,
              fontWeight: 700,
              textAlign: "center",
              fontFamily: "Ubuntu, sans-serif",
              outline: "none",
              transition: "border-color 200ms",
              appearance: "textfield",
              WebkitAppearance: "none",
            }}
          />
          {error && (
            <p style={{
              textAlign: "center", fontSize: 12,
              color: "rgba(255,100,100,0.9)", margin: "8px 0 0",
              animation: "shake 300ms ease",
            }}>
              Špatná odpověď – zkus nový příklad
            </p>
          )}
        </div>

        {/* Tlačítka */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!value.trim()}
            style={{
              flex: 2, padding: "13px 0", borderRadius: 14,
              background: "#E95420", border: "none",
              color: "#fff", fontSize: 14, fontWeight: 700,
              cursor: value.trim() ? "pointer" : "default",
              opacity: value.trim() ? 1 : 0.45,
              boxShadow: "0 0 20px rgba(233,84,32,0.35)",
              transition: "opacity 150ms",
              minHeight: 48,
              fontFamily: "Ubuntu, sans-serif",
            }}
          >
            Potvrdit
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1, padding: "13px 0", borderRadius: 14,
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "rgba(255,255,255,0.6)", fontSize: 13,
              cursor: "pointer", minHeight: 48,
              fontFamily: "Ubuntu, sans-serif",
              transition: "background 150ms",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
          >
            Zrušit
          </button>
        </div>

        {/* Hint na long press */}
        <p style={{
          textAlign: "center", fontSize: 10,
          color: "rgba(255,255,255,0.2)", margin: "14px 0 0",
          letterSpacing: "0.04em",
        }}>
          Nebo podržte tlačítko zámku 3 sekundy
        </p>
      </div>
      <style>{`@keyframes shake{0%,100%{transform:translate(-50%,-50%) translateX(0)}25%{transform:translate(-50%,-50%) translateX(-6px)}75%{transform:translate(-50%,-50%) translateX(6px)}}`}</style>
    </>
  );
}

// ── ParentalGate – icon varianta ──────────────────────────────────────────
function IconGate({ onUnlock, hint = "Nastavení", color = "#E95420" }: ParentalGateProps) {
  const lock = useParentalLock(onUnlock);
  const btnRef = useRef<HTMLButtonElement>(null);

  // Pokud je odemčeno, zavolej onUnlock okamžitě při dalším kliknutí
  const handleClick = useCallback(() => {
    if (lock.unlocked) {
      onUnlock();
    } else {
      lock.openMath();
    }
  }, [lock, onUnlock]);

  const SIZE   = 40;
  const STROKE = 3;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={handleClick}
        onPointerDown={lock.onHoldStart}
        onPointerUp={lock.onHoldEnd}
        onPointerLeave={lock.onHoldEnd}
        onPointerCancel={lock.onHoldEnd}
        onContextMenu={(e) => e.preventDefault()}
        aria-label={`${hint} (${lock.unlocked ? "odemčeno" : "zamčeno"})`}
        aria-pressed={lock.unlocked}
        style={{
          position: "relative",
          width: SIZE, height: SIZE,
          borderRadius: "50%",
          background: lock.unlocked
            ? "rgba(76,175,80,0.2)"
            : lock.isHolding
              ? "rgba(233,84,32,0.15)"
              : "rgba(255,255,255,0.06)",
          border: `1px solid ${lock.unlocked ? "rgba(76,175,80,0.5)" : "rgba(255,255,255,0.15)"}`,
          boxShadow: lock.unlocked ? "0 0 12px rgba(76,175,80,0.3)" : "none",
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "background 200ms, border-color 200ms, box-shadow 200ms",
          userSelect: "none",
          WebkitUserSelect: "none",
          touchAction: "none",
          outline: "none",
        }}
      >
        {/* Progress ring při dlouhém stisku */}
        {lock.isHolding && (
          <ProgressRing
            progress={lock.holdProgress}
            size={SIZE + 6}
            stroke={STROKE}
            color={color}
          />
        )}

        <LockIcon unlocked={lock.unlocked} size={16} />

        {/* Sekunda countdown při long pressu */}
        {lock.isHolding && (
          <span style={{
            position: "absolute",
            bottom: -18,
            left: "50%", transform: "translateX(-50%)",
            fontSize: 9, fontWeight: 700,
            color: color, whiteSpace: "nowrap",
            letterSpacing: "0.04em",
            fontFamily: "Ubuntu, sans-serif",
            pointerEvents: "none",
          }}>
            {Math.ceil(3 - lock.holdProgress * 3)}s
          </span>
        )}
      </button>

      {/* Math modal */}
      {lock.mathOpen && lock.challenge && (
        <MathModal
          question={lock.challenge.question}
          error={lock.mathError}
          onSubmit={lock.submitMath}
          onClose={lock.closeMath}
        />
      )}
    </>
  );
}

// ── ParentalGate – block varianta (pro SOS exit) ──────────────────────────
function BlockGate({ onUnlock, label = "Opustit SOS režim", color = "#E95420" }: ParentalGateProps) {
  const lock   = useParentalLock(onUnlock);
  const SIZE   = 72;
  const STROKE = 4;

  return (
    <>
      <div style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", gap: 10,
        userSelect: "none",
        WebkitUserSelect: "none",
      }}>
        {/* Velké hold tlačítko */}
        <button
          type="button"
          onPointerDown={lock.onHoldStart}
          onPointerUp={lock.onHoldEnd}
          onPointerLeave={lock.onHoldEnd}
          onPointerCancel={lock.onHoldEnd}
          onContextMenu={(e) => e.preventDefault()}
          aria-label={`${label} (podržte 3 sekundy)`}
          style={{
            position: "relative",
            width: SIZE, height: SIZE,
            borderRadius: "50%",
            background: lock.isHolding
              ? "rgba(255,255,255,0.15)"
              : "rgba(255,255,255,0.07)",
            border: `1.5px solid rgba(255,255,255,0.2)`,
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background 150ms",
            touchAction: "none",
            outline: "none",
          }}
        >
          {/* Progress ring */}
          <ProgressRing
            progress={lock.holdProgress}
            size={SIZE + 8}
            stroke={STROKE}
            color={color}
          />

          <LockIcon unlocked={false} size={24} />
        </button>

        {/* Popis */}
        <div style={{ textAlign: "center" }}>
          <span style={{
            fontSize: 11, fontWeight: 600,
            letterSpacing: "0.08em", textTransform: "uppercase",
            color: lock.isHolding ? color : "rgba(255,255,255,0.3)",
            transition: "color 200ms",
            fontFamily: "Ubuntu, sans-serif",
          }}>
            {lock.isHolding
              ? `${Math.ceil(3 - lock.holdProgress * 3)}s…`
              : "držet"}
          </span>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", marginTop: 2, letterSpacing: "0.04em", fontFamily: "Ubuntu, sans-serif" }}>
            {label}
          </div>
        </div>

        {/* Math alternativa */}
        <button
          type="button"
          onClick={lock.openMath}
          style={{
            padding: "5px 14px", borderRadius: 999,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.3)",
            fontSize: 10, cursor: "pointer",
            fontFamily: "Ubuntu, sans-serif",
            letterSpacing: "0.04em",
            transition: "all 150ms",
            minHeight: 32,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.6)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.3)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
        >
          Zadat výpočet
        </button>
      </div>

      {/* Math modal */}
      {lock.mathOpen && lock.challenge && (
        <MathModal
          question={lock.challenge.question}
          error={lock.mathError}
          onSubmit={lock.submitMath}
          onClose={lock.closeMath}
        />
      )}
    </>
  );
}

// ── Export ─────────────────────────────────────────────────────────────────
export { IconGate, BlockGate };
export default IconGate;
