// ─── src/components/SearchInput.tsx ──────────────────────────────────────
//
// Vyhledávací pole – Ubuntu design system.
// Glassmorphism pozadí, oranžový focus ring, animovaná lupa.

import { useRef, useCallback } from "react";

interface SearchInputProps {
  value:       string;
  onChange:    (val: string) => void;
  placeholder?: string;
  loading?:    boolean;
  autoFocus?:  boolean;
}

// ── Ikona lupy (inline SVG) ───────────────────────────────────────────────
function SearchIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      width="18" height="18" viewBox="0 0 24 24" fill="none"
      aria-hidden="true"
      style={{
        flexShrink: 0,
        transition: "opacity 200ms",
        animation: spinning ? "spin 900ms linear infinite" : "none",
      }}
    >
      {spinning ? (
        // Spinner místo lupy při načítání
        <circle
          cx="12" cy="12" r="9"
          stroke="rgba(233,84,32,0.7)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="28 56"
        />
      ) : (
        <>
          <circle cx="11" cy="11" r="7"
            stroke="rgba(233,84,32,0.7)" strokeWidth="2" fill="none"/>
          <path d="M16.5 16.5l3.5 3.5"
            stroke="rgba(233,84,32,0.7)" strokeWidth="2" strokeLinecap="round"/>
        </>
      )}
    </svg>
  );
}

// ── Komponenta ────────────────────────────────────────────────────────────
export default function SearchInput({
  value,
  onChange,
  placeholder = "Hledej piktogram… (např. jíst, pes, pomoc)",
  loading     = false,
  autoFocus   = false,
}: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClear = useCallback(() => {
    onChange("");
    inputRef.current?.focus();
  }, [onChange]);

  return (
    <div
      role="search"
      style={{
        position: "relative",
        display:  "flex",
        alignItems: "center",
        gap: 10,
        // Glassmorphism
        background: "rgba(255,255,255,0.06)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1.5px solid rgba(255,255,255,0.12)",
        borderRadius: 16,
        padding: "0 14px",
        height: 52,
        transition: "border-color 200ms ease, box-shadow 200ms ease",
      }}
      // Focus styling přes CSS custom property – nastaveno JS-em
      onFocusCapture={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor  = "rgba(233,84,32,0.65)";
        el.style.boxShadow    = "0 0 0 3px rgba(233,84,32,0.14)";
      }}
      onBlurCapture={(e) => {
        // Nezruš styling pokud focus zůstal uvnitř
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = "rgba(255,255,255,0.12)";
        el.style.boxShadow   = "none";
      }}
    >
      {/* Lupa / spinner */}
      <SearchIcon spinning={loading} />

      {/* Input */}
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        lang="cs"
        aria-label="Vyhledávání piktogramů"
        style={{
          flex: 1,
          background: "transparent",
          border: "none",
          outline: "none",
          color: "#ffffff",
          fontSize: 15,
          fontWeight: 400,
          fontFamily: "Ubuntu, sans-serif",
          letterSpacing: "0.01em",
          // Skryj nativní clear button (Safari/Chrome)
          WebkitAppearance: "none",
        }}
      />

      {/* Clear tlačítko – viditelné jen s textem */}
      {value.length > 0 && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Vymazat vyhledávání"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
            background: "rgba(255,255,255,0.1)",
            border: "none", cursor: "pointer",
            color: "rgba(255,255,255,0.5)",
            fontSize: 13, fontWeight: 600,
            transition: "background 150ms, color 150ms",
            fontFamily: "Ubuntu, sans-serif",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(233,84,32,0.25)";
            e.currentTarget.style.color      = "#E95420";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.1)";
            e.currentTarget.style.color      = "rgba(255,255,255,0.5)";
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}
