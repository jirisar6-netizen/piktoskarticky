// ─── src/components/LanguageSwitcher.tsx ─────────────────────────────────
//
// Kompaktní přepínač jazyka pro top bar.
// Varianty: "flags" (🇨🇿 🇸🇰 🇬🇧) nebo "text" (CS SK EN)
// Výchozí: flags na mobilech, text na desktopu

import { useRef, useEffect, useCallback, useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import { syncLangToGlobal } from "../context/LanguageContext";
import type { LangCode } from "../i18n/translations";

// ── Props ──────────────────────────────────────────────────────────────────
interface LanguageSwitcherProps {
  /** Zobrazení: inline tři tlačítka, nebo dropdown */
  mode?: "inline" | "dropdown";
  /** Jak zobrazit jazyk */
  display?: "flags" | "text" | "both";
}

// ── Inline přepínač ────────────────────────────────────────────────────────
function InlineSwitcher({ display = "flags" }: { display?: "flags" | "text" | "both" }) {
  const { lang, setLang, allMeta } = useLanguage();
  const langs = Object.values(allMeta) as typeof allMeta[LangCode][];

  const handleChange = useCallback((code: LangCode) => {
    setLang(code);
    syncLangToGlobal(code);
  }, [setLang]);

  return (
    <div
      role="group"
      aria-label="Výběr jazyka"
      style={{
        display:       "flex",
        alignItems:    "center",
        gap:           2,
        padding:       "3px",
        borderRadius:  999,
        background:    "rgba(255,255,255,0.05)",
        border:        "1px solid rgba(255,255,255,0.1)",
      }}
    >
      {langs.map(({ code, flag, name }) => {
        const active = lang === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => handleChange(code)}
            aria-label={name}
            aria-pressed={active}
            data-compact
            style={{
              padding:      display === "text" ? "4px 8px" : "4px 7px",
              borderRadius: 999,
              background:   active ? "rgba(233,84,32,0.25)" : "transparent",
              border:       `1px solid ${active ? "rgba(233,84,32,0.5)" : "transparent"}`,
              color:        active ? "#E95420" : "rgba(255,255,255,0.45)",
              fontSize:     display === "flags" ? 15
                          : display === "text"  ? 11
                          : 12,
              fontWeight:   active ? 700 : 400,
              cursor:       "pointer",
              minWidth:     32,
              minHeight:    32,
              display:      "flex",
              alignItems:   "center",
              justifyContent: "center",
              gap:          4,
              transition:   "all 180ms ease",
              fontFamily:   "Ubuntu, sans-serif",
              letterSpacing: display === "text" ? "0.04em" : "normal",
              lineHeight:   1,
            }}
            onMouseEnter={(e) => {
              if (!active) e.currentTarget.style.color = "rgba(255,255,255,0.8)";
            }}
            onMouseLeave={(e) => {
              if (!active) e.currentTarget.style.color = "rgba(255,255,255,0.45)";
            }}
          >
            {display === "flags" && (
              <span style={{ fontSize: 15, lineHeight: 1 }} aria-hidden="true">{flag}</span>
            )}
            {display === "text" && (
              <span style={{ textTransform: "uppercase" }}>{code}</span>
            )}
            {display === "both" && (
              <>
                <span style={{ fontSize: 13, lineHeight: 1 }} aria-hidden="true">{flag}</span>
                <span style={{ fontSize: 10, textTransform: "uppercase", fontWeight: 700 }}>{code}</span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Dropdown přepínač ──────────────────────────────────────────────────────
function DropdownSwitcher() {
  const { lang, setLang, allMeta } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const langs = Object.values(allMeta) as typeof allMeta[LangCode][];
  const current = allMeta[lang];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleChange = useCallback((code: LangCode) => {
    setLang(code);
    syncLangToGlobal(code);
    setOpen(false);
  }, [setLang]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Jazyk: ${current.name}`}
        aria-expanded={open}
        data-compact
        style={{
          display:        "flex",
          alignItems:     "center",
          gap:            6,
          padding:        "5px 10px",
          borderRadius:   999,
          background:     open ? "rgba(233,84,32,0.15)" : "rgba(255,255,255,0.06)",
          border:         `1px solid ${open ? "rgba(233,84,32,0.4)" : "rgba(255,255,255,0.12)"}`,
          color:          open ? "#E95420" : "rgba(255,255,255,0.7)",
          cursor:         "pointer",
          minHeight:      34,
          minWidth:       64,
          fontSize:       13,
          fontFamily:     "Ubuntu, sans-serif",
          fontWeight:     500,
          transition:     "all 180ms",
          userSelect:     "none",
          letterSpacing:  "0.02em",
        }}
      >
        <span style={{ fontSize: 15 }} aria-hidden="true">{current.flag}</span>
        <span style={{ textTransform: "uppercase", fontSize: 11, fontWeight: 700 }}>{lang}</span>
        <span style={{
          fontSize: 8, lineHeight: 1,
          transform: open ? "rotate(180deg)" : "none",
          transition: "transform 180ms",
          opacity: 0.5,
          marginLeft: 1,
        }}>▾</span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Dostupné jazyky"
          style={{
            position:    "absolute",
            top:         "calc(100% + 6px)",
            right:       0,
            minWidth:    140,
            borderRadius: 14,
            background:  "rgba(22,0,14,0.97)",
            border:      "1px solid rgba(255,255,255,0.12)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            boxShadow:   "0 12px 32px rgba(0,0,0,0.5)",
            overflow:    "hidden",
            animation:   "popIn 160ms cubic-bezier(0.34,1.56,0.64,1) both",
            zIndex:      50,
          }}
        >
          <style>{`@keyframes popIn{from{opacity:0;transform:scale(.9) translateY(-4px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
          {langs.map(({ code, flag, name }) => {
            const active = lang === code;
            return (
              <button
                key={code}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => handleChange(code)}
                style={{
                  width:       "100%",
                  display:     "flex",
                  alignItems:  "center",
                  gap:         10,
                  padding:     "10px 14px",
                  background:  active ? "rgba(233,84,32,0.12)" : "transparent",
                  border:      "none",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                  color:       active ? "#E95420" : "rgba(255,255,255,0.7)",
                  fontSize:    13,
                  fontWeight:  active ? 600 : 400,
                  cursor:      "pointer",
                  textAlign:   "left",
                  fontFamily:  "Ubuntu, sans-serif",
                  transition:  "background 150ms",
                  minHeight:   44,
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
              >
                <span style={{ fontSize: 18 }}>{flag}</span>
                <span>{name}</span>
                {active && (
                  <span style={{ marginLeft: "auto", fontSize: 12, color: "#E95420" }}>✓</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Export ─────────────────────────────────────────────────────────────────
export default function LanguageSwitcher({
  mode    = "inline",
  display = "flags",
}: LanguageSwitcherProps) {
  if (mode === "dropdown") return <DropdownSwitcher />;
  return <InlineSwitcher display={display} />;
}

export { InlineSwitcher, DropdownSwitcher };
