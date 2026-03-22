// ─── src/pages/Search.tsx ────────────────────────────────────────────────
//
// Vyhledávání v ARASAAC databázi (česky).
// Debounce 300 ms → API → responzivní grid karet.
// Výsledky lze kliknout → přidají se do komunikační věty (callback).

import { useState, useEffect, useCallback } from "react";
import SearchInput from "../components/SearchInput";
import PictogramCard from "../components/PictogramCard";
import { searchPictograms } from "../services/arasaacApi";
import { useDebounce } from "../hooks/useDebounce";
import type { Pictogram } from "../types/arasaac";

// ── Props ─────────────────────────────────────────────────────────────────
interface SearchPageProps {
  /** Callback při výběru karty – integruje se s komunikačním oknem */
  onSelect?: (id: number, label: string) => void;
}

// ── Stavy načítání ────────────────────────────────────────────────────────
type SearchStatus = "idle" | "loading" | "ok" | "empty" | "error";

// ── Prázdný stav (idle) ───────────────────────────────────────────────────
function IdleState() {
  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: 16, padding: "32px 24px", textAlign: "center",
    }}>
      {/* Velká lupa */}
      <svg width="72" height="72" viewBox="0 0 24 24" fill="none" aria-hidden="true"
        style={{ opacity: 0.18 }}>
        <circle cx="11" cy="11" r="8" stroke="white" strokeWidth="1.5"/>
        <path d="M17 17l4 4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
      <div>
        <p style={{
          color: "rgba(255,255,255,0.35)", fontSize: 15, fontWeight: 500,
          margin: 0, letterSpacing: "0.02em",
        }}>
          Zadej slovo, které hledáš
        </p>
        <p style={{
          color: "rgba(255,255,255,0.18)", fontSize: 12, margin: "8px 0 0",
          lineHeight: 1.6,
        }}>
          Zkus: <Em>jíst</Em>, <Em>pes</Em>, <Em>škola</Em>, <Em>bolest</Em>, <Em>pomoc</Em>
        </p>
      </div>
    </div>
  );
}

function Em({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      color: "rgba(233,84,32,0.7)", fontWeight: 600,
      background: "rgba(233,84,32,0.1)", padding: "1px 7px",
      borderRadius: 6, fontSize: 12,
    }}>
      {children}
    </span>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────
function EmptyState({ term }: { term: string }) {
  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: 12, padding: "32px 24px", textAlign: "center",
    }}>
      <span style={{ fontSize: 40, opacity: 0.5 }} aria-hidden="true">🔍</span>
      <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 15, margin: 0 }}>
        Nic nenalezeno pro{" "}
        <span style={{ color: "rgba(233,84,32,0.8)", fontWeight: 600 }}>
          „{term}"
        </span>
      </p>
      <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 12, margin: 0 }}>
        Zkus jiné slovo nebo kratší výraz
      </p>
    </div>
  );
}

// ── Error state ───────────────────────────────────────────────────────────
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: 14, padding: "32px 24px", textAlign: "center",
    }}>
      <span style={{ fontSize: 36, opacity: 0.6 }} aria-hidden="true">⚠️</span>
      <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, margin: 0, maxWidth: 280 }}>
        {message}
      </p>
      <button
        onClick={onRetry}
        style={{
          padding: "8px 22px", borderRadius: 999, cursor: "pointer",
          background: "rgba(233,84,32,0.15)", fontFamily: "Ubuntu, sans-serif",
          border: "1px solid rgba(233,84,32,0.35)", color: "#E95420",
          fontSize: 13, fontWeight: 500, transition: "background 150ms",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(233,84,32,0.28)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(233,84,32,0.15)")}
      >
        Zkusit znovu
      </button>
    </div>
  );
}

// ── Skeleton grid (loading placeholder) ──────────────────────────────────
function SkeletonGrid() {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
      gap: 12,
    }}>
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} style={{
          height: 140, borderRadius: 28,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.07)",
          animation: "shimmer 1.6s ease-in-out infinite",
          animationDelay: `${i * 60}ms`,
        }} aria-hidden="true" />
      ))}
    </div>
  );
}

// ── Počítadlo výsledků ────────────────────────────────────────────────────
function ResultCount({ count, term }: { count: number; term: string }) {
  return (
    <p style={{
      color: "rgba(255,255,255,0.28)", fontSize: 11,
      fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase",
      margin: 0, flexShrink: 0,
    }}>
      {count} {count === 1 ? "výsledek" : count < 5 ? "výsledky" : "výsledků"}{" "}
      pro{" "}
      <span style={{ color: "rgba(233,84,32,0.65)" }}>„{term}"</span>
    </p>
  );
}

// ── Hlavní Search stránka ─────────────────────────────────────────────────
export default function Search({ onSelect }: SearchPageProps) {
  const [inputValue, setInputValue] = useState("");
  const [results,    setResults]    = useState<Pictogram[]>([]);
  const [status,     setStatus]     = useState<SearchStatus>("idle");
  const [errorMsg,   setErrorMsg]   = useState("");
  const [selected,   setSelected]   = useState<number | null>(null);

  // Debounce – API se zavolá až 300 ms po posledním stisku klávesy
  const debouncedTerm = useDebounce(inputValue.trim(), 300);

  // ── Vyhledávání ────────────────────────────────────────────────────────
  const runSearch = useCallback(async (term: string) => {
    if (!term) { setStatus("idle"); setResults([]); return; }

    setStatus("loading");

    const result = await searchPictograms(term);

    switch (result.status) {
      case "ok":
        setResults(result.data);
        setStatus("ok");
        break;
      case "empty":
        setResults([]);
        setStatus("empty");
        break;
      case "error":
        setResults([]);
        setErrorMsg(result.message);
        setStatus("error");
        break;
    }
  }, []);

  // Spusť vyhledávání při změně debouncedTerm
  useEffect(() => {
    runSearch(debouncedTerm);
  }, [debouncedTerm, runSearch]);

  // ── Výběr karty ────────────────────────────────────────────────────────
  const handleCardClick = useCallback((id: number, label: string) => {
    setSelected((prev) => (prev === id ? null : id));
    onSelect?.(id, label);
  }, [onSelect]);

  // ── Retry ──────────────────────────────────────────────────────────────
  const handleRetry = useCallback(() => {
    runSearch(debouncedTerm);
  }, [debouncedTerm, runSearch]);

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <>
      {/* Keyframes pro skeleton shimmer */}
      <style>{`
        @keyframes shimmer {
          0%, 100% { opacity: 0.5; }
          50%       { opacity: 1;   }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        padding: "16px 14px 12px",
        gap: 14,
        fontFamily: "Ubuntu, sans-serif",
      }}>

        {/* ── Search input ─────────────────────────────────────────── */}
        <SearchInput
          value={inputValue}
          onChange={setInputValue}
          loading={status === "loading"}
          autoFocus
        />

        {/* ── Počítadlo (jen s výsledky) ───────────────────────────── */}
        {status === "ok" && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <ResultCount count={results.length} term={debouncedTerm} />
            {selected !== null && (
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", letterSpacing: "0.04em" }}>
                ✓ vybráno
              </span>
            )}
          </div>
        )}

        {/* ── Scrollovatelný obsah ─────────────────────────────────── */}
        <div style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          // Skrytý scrollbar
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}>

          {/* Idle */}
          {status === "idle" && <IdleState />}

          {/* Loading skeleton */}
          {status === "loading" && <SkeletonGrid />}

          {/* Empty */}
          {status === "empty" && <EmptyState term={debouncedTerm} />}

          {/* Error */}
          {status === "error" && (
            <ErrorState message={errorMsg} onRetry={handleRetry} />
          )}

          {/* Výsledky */}
          {status === "ok" && (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: 12,
              paddingBottom: 8,
            }}>
              {results.map((pic) => {
                // Použij první klíčové slovo jako label
                const label = pic.keywords?.[0]?.keyword ?? `#${pic._id}`;
                return (
                  <PictogramCard
                    key={pic._id}
                    id={pic._id}
                    label={label}
                    size="md"
                    selected={selected === pic._id}
                    onClick={() => handleCardClick(pic._id, label)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
