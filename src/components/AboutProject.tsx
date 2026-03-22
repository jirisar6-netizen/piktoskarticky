// ─── src/components/AboutProject.tsx ─────────────────────────────────────
//
// Identitní stránka Piktosu – scrollovatelný overlay.
// Otevírá se přes "ⓘ" ikonku v top baru.
//
// Struktura:
//   1. Hero – logo, verze, slogan
//   2. Příběh – proč Piktos vznikl
//   3. Technický manifest – 4 pilíře
//   4. Stack & poděkování

import { useEffect, useRef, useCallback } from "react";
import { useLanguage } from "../context/LanguageContext";

// ── Verze ──────────────────────────────────────────────────────────────────
const VERSION = "0.2.1 Beta";

// ── Manifest items ─────────────────────────────────────────────────────────
interface ManifestItem {
  icon:  string;
  title: string;
  body:  string;
  color: string;
}

const MANIFEST: ManifestItem[] = [
  {
    icon:  "🌐",
    title: "Open Source",
    body:  "Postaveno na otevřené databázi ARASAAC – více než 12 000 symbolů volně dostupných celé komunitě.",
    color: "#2ECC71",
  },
  {
    icon:  "📴",
    title: "Offline First",
    body:  "Plná funkčnost bez internetu. Piktogramy jsou uloženy v cache – krizové situace nečekají na WiFi.",
    color: "#4A9EFF",
  },
  {
    icon:  "🔒",
    title: "Privacy Focus",
    body:  "Žádné sledování, žádná analytika. Fotky, hlasy i data zůstávají ve tvém zařízení nebo na tvém Google Disku.",
    color: "#A891FF",
  },
  {
    icon:  "🎨",
    title: "VOKS Ready",
    body:  "Plná podpora Výměnného Obrázkového Komunikačního Systému – barevné kategorie, strukturované věty.",
    color: "#F5C518",
  },
];

// ── Tech stack ─────────────────────────────────────────────────────────────
const TECH_STACK = [
  { name: "React 18",     desc: "UI framework" },
  { name: "TypeScript",   desc: "Typová bezpečnost" },
  { name: "Vite",         desc: "Build & HMR" },
  { name: "Tailwind CSS", desc: "Design systém" },
  { name: "jsPDF",        desc: "Tisk kartiček" },
  { name: "IndexedDB",    desc: "Lokální storage" },
];

// ── Komponenta ────────────────────────────────────────────────────────────
interface AboutProjectProps {
  open:    boolean;
  onClose: () => void;
}

export default function AboutProject({ open, onClose }: AboutProjectProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  // Zamkni scroll pozadí
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Scroll na vrch při otevření
  useEffect(() => {
    if (open) setTimeout(() => contentRef.current?.scrollTo({ top: 0 }), 50);
  }, [open]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(0,0,0,0.72)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          animation: "aboutFadeIn 300ms ease both",
        }}
      />

      {/* Overlay panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="O projektu Piktos"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 201,
          overflowY: "auto",
          overflowX: "hidden",
          scrollbarWidth: "none",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "20px 16px 40px",
          pointerEvents: "none",
        }}
      >
        <div
          ref={contentRef}
          onClick={e => e.stopPropagation()}
          style={{
            width: "100%",
            maxWidth: 640,
            display: "flex",
            flexDirection: "column",
            gap: 16,
            pointerEvents: "auto",
            animation: "aboutSlideUp 360ms cubic-bezier(0.34,1.56,0.64,1) both",
          }}
        >
          <style>{`
            @keyframes aboutFadeIn  { from{opacity:0} to{opacity:1} }
            @keyframes aboutSlideUp {
              from { opacity:0; transform: translateY(32px) scale(0.97); }
              to   { opacity:1; transform: none; }
            }
            @keyframes manifestIn {
              from { opacity:0; transform: translateY(12px); }
              to   { opacity:1; transform: none; }
            }
            @keyframes heartbeat {
              0%,100% { transform: scale(1); }
              14%      { transform: scale(1.2); }
              28%      { transform: scale(1); }
              42%      { transform: scale(1.1); }
              56%      { transform: scale(1); }
            }
            @keyframes shimmerText {
              0%   { background-position: -200% center; }
              100% { background-position:  200% center; }
            }
            .about-scroll::-webkit-scrollbar { display: none; }
          `}</style>

          {/* ── ZAVŘÍT ───────────────────────────────────────────── */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              aria-label="Zavřít"
              data-compact
              style={{
                width: 40, height: 40, borderRadius: "50%",
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "rgba(255,255,255,0.7)",
                fontSize: 18, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                backdropFilter: "blur(8px)",
                transition: "all 150ms",
                minWidth: 40, minHeight: 40,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.18)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
            >
              ✕
            </button>
          </div>

          {/* ═══════════════════════════════════════════════════════
              HERO – Logo + Slogan
          ═══════════════════════════════════════════════════════ */}
          <div style={{
            borderRadius: 28,
            background: "rgba(255,255,255,0.04)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(255,255,255,0.1)",
            padding: "40px 28px 32px",
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
          }}>
            {/* Radial glow pozadí */}
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              background: "radial-gradient(ellipse at 50% 0%, rgba(233,84,32,0.18) 0%, transparent 65%)",
            }} />

            {/* Logo */}
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 80, height: 80, borderRadius: 22,
              background: "linear-gradient(135deg, #E95420 0%, #FF6B3D 100%)",
              fontSize: 32, marginBottom: 20,
              boxShadow: "0 0 40px rgba(233,84,32,0.5), 0 8px 24px rgba(0,0,0,0.3)",
              position: "relative",
            }}>
              🗣️
              {/* Verze badge */}
              <span style={{
                position: "absolute",
                bottom: -8, right: -8,
                padding: "2px 7px",
                borderRadius: 999,
                background: "#1A0011",
                border: "1.5px solid rgba(233,84,32,0.6)",
                color: "#E95420",
                fontSize: 8, fontWeight: 800,
                letterSpacing: "0.06em",
                fontFamily: "Ubuntu, sans-serif",
                whiteSpace: "nowrap",
              }}>
                v{VERSION}
              </span>
            </div>

            {/* Název */}
            <h1 style={{
              fontSize: "clamp(28px, 6vw, 42px)",
              fontWeight: 800,
              margin: "0 0 10px",
              fontFamily: "Ubuntu, sans-serif",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              // Shimmer gradient text
              background: "linear-gradient(90deg, #E95420 0%, #FF9970 40%, #E95420 60%, #FF6B3D 100%)",
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              animation: "shimmerText 3s linear infinite",
            }}>
              Piktos Portal
            </h1>

            {/* Slogan */}
            <p style={{
              fontSize: "clamp(15px, 3.5vw, 19px)",
              color: "rgba(255,255,255,0.65)",
              margin: "0 0 6px",
              fontFamily: "Ubuntu, sans-serif",
              fontStyle: "italic",
              letterSpacing: "0.01em",
              lineHeight: 1.4,
            }}>
              „Hlas pro ty, kteří ho hledají."
            </p>
          </div>

          {/* ═══════════════════════════════════════════════════════
              PŘÍBĚH – Mise a původ
          ═══════════════════════════════════════════════════════ */}
          <div style={{
            borderRadius: 24,
            background: "rgba(255,255,255,0.04)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.09)",
            padding: "28px",
            position: "relative",
            overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: 2,
              background: "linear-gradient(90deg, transparent, rgba(233,84,32,0.6), transparent)",
            }} />

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <span style={{
                fontSize: 28,
                animation: "heartbeat 2.5s ease-in-out 1s infinite",
                display: "inline-block",
              }}>❤️</span>
              <h2 style={{
                fontSize: 17, fontWeight: 700, margin: 0,
                color: "#fff", fontFamily: "Ubuntu, sans-serif",
                letterSpacing: "0.02em",
              }}>
                Proč Piktos vznikl
              </h2>
            </div>

            <p style={{
              fontSize: 14, lineHeight: 1.85,
              color: "rgba(255,255,255,0.75)",
              margin: "0 0 16px",
              fontFamily: "Ubuntu, sans-serif",
            }}>
              Piktos vznikl z{" "}
              <span style={{ color: "#E95420", fontWeight: 600 }}>tátovské lásky</span>
              {" "}a potřeby komunikovat. Je navržen pro{" "}
              <strong style={{ color: "#fff" }}>Jiříka a Štěpánka</strong>,
              ale otevřen všem dětem, které ke komunikaci potřebují piktogramy, barvy a strukturu.
            </p>

            <p style={{
              fontSize: 14, lineHeight: 1.85,
              color: "rgba(255,255,255,0.75)",
              margin: 0,
              fontFamily: "Ubuntu, sans-serif",
            }}>
              Naším cílem je{" "}
              <span style={{
                background: "rgba(233,84,32,0.2)",
                borderBottom: "1.5px solid rgba(233,84,32,0.6)",
                padding: "1px 4px",
                borderRadius: 4,
                color: "rgba(255,255,255,0.9)",
              }}>
                odbourat frustraci z neporozumění
              </span>
              {" "}a nahradit ji{" "}
              <span style={{
                background: "rgba(46,204,113,0.15)",
                borderBottom: "1.5px solid rgba(46,204,113,0.5)",
                padding: "1px 4px",
                borderRadius: 4,
                color: "rgba(255,255,255,0.9)",
              }}>
                radostí ze sdílení
              </span>.
            </p>
          </div>

          {/* ═══════════════════════════════════════════════════════
              TECHNICKÝ MANIFEST – 4 pilíře
          ═══════════════════════════════════════════════════════ */}
          <div style={{
            borderRadius: 24,
            background: "rgba(255,255,255,0.04)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.09)",
            padding: "28px",
          }}>
            <h2 style={{
              fontSize: 13, fontWeight: 700,
              letterSpacing: "0.1em", textTransform: "uppercase",
              color: "rgba(255,255,255,0.4)",
              margin: "0 0 18px",
              fontFamily: "Ubuntu, sans-serif",
            }}>
              Technický manifest
            </h2>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: 12,
            }}>
              {MANIFEST.map((item, i) => (
                <div
                  key={item.title}
                  style={{
                    padding: "16px",
                    borderRadius: 18,
                    background: `${item.color}10`,
                    border: `1px solid ${item.color}30`,
                    animation: `manifestIn 400ms ease ${i * 80}ms both`,
                    transition: "transform 150ms, box-shadow 150ms",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                    (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px ${item.color}25`;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.transform = "none";
                    (e.currentTarget as HTMLElement).style.boxShadow = "none";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <span style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: `${item.color}20`,
                      border: `1px solid ${item.color}40`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 18, flexShrink: 0,
                    }}>
                      {item.icon}
                    </span>
                    <span style={{
                      fontSize: 13, fontWeight: 700,
                      color: item.color,
                      fontFamily: "Ubuntu, sans-serif",
                      letterSpacing: "0.02em",
                    }}>
                      {item.title}
                    </span>
                  </div>
                  <p style={{
                    fontSize: 12, lineHeight: 1.65,
                    color: "rgba(255,255,255,0.55)",
                    margin: 0,
                    fontFamily: "Ubuntu, sans-serif",
                  }}>
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════
              TECH STACK
          ═══════════════════════════════════════════════════════ */}
          <div style={{
            borderRadius: 24,
            background: "rgba(255,255,255,0.03)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.08)",
            padding: "22px 28px",
          }}>
            <h2 style={{
              fontSize: 12, fontWeight: 700,
              letterSpacing: "0.1em", textTransform: "uppercase",
              color: "rgba(255,255,255,0.3)",
              margin: "0 0 14px",
              fontFamily: "Ubuntu, sans-serif",
            }}>
              Technologie
            </h2>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {TECH_STACK.map(({ name, desc }) => (
                <span
                  key={name}
                  title={desc}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "rgba(255,255,255,0.65)",
                    fontSize: 12, fontWeight: 500,
                    fontFamily: "Ubuntu, sans-serif",
                    letterSpacing: "0.02em",
                    cursor: "default",
                    transition: "all 150ms",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)";
                    (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.9)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)";
                    (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.65)";
                  }}
                >
                  {name}
                </span>
              ))}
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════
              PODĚKOVÁNÍ & AUTORSTVÍ
          ═══════════════════════════════════════════════════════ */}
          <div style={{
            borderRadius: 24,
            background: "rgba(255,255,255,0.03)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.08)",
            padding: "24px 28px",
          }}>
            {/* Autor */}
            <div style={{
              display: "flex", alignItems: "center", gap: 14,
              paddingBottom: 18,
              borderBottom: "1px solid rgba(255,255,255,0.07)",
              marginBottom: 18,
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                background: "linear-gradient(135deg, rgba(233,84,32,0.4), rgba(233,84,32,0.15))",
                border: "1.5px solid rgba(233,84,32,0.4)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 24,
              }}>
                👨‍💻
              </div>
              <div>
                <div style={{
                  fontSize: 15, fontWeight: 700,
                  color: "#fff", fontFamily: "Ubuntu, sans-serif",
                  marginBottom: 3,
                }}>
                  Jiří Šár
                </div>
                <div style={{
                  fontSize: 12, color: "rgba(255,255,255,0.4)",
                  fontFamily: "Ubuntu, sans-serif",
                }}>
                  Autor · Synthesis Studio · Táta Jiříka a Štěpánka
                </div>
              </div>
            </div>

            {/* Poděkování */}
            <div>
              <h3 style={{
                fontSize: 11, fontWeight: 700,
                letterSpacing: "0.08em", textTransform: "uppercase",
                color: "rgba(255,255,255,0.3)",
                margin: "0 0 12px",
                fontFamily: "Ubuntu, sans-serif",
              }}>
                Speciální poděkování
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  {
                    emoji: "🖼️",
                    title: "ARASAAC",
                    desc: "Aragonské centrum augmentativní a alternativní komunikace. Více než 12 000 symbolů volně dostupných světu.",
                    color: "#4A9EFF",
                    url: "https://arasaac.org",
                  },
                  {
                    emoji: "🤝",
                    title: "AAC komunita",
                    desc: "Pedagogům, logopedům a rodičům, kteří každý den hledají cesty ke komunikaci s dětmi.",
                    color: "#2ECC71",
                  },
                  {
                    emoji: "💜",
                    title: "Jiřík a Štěpánek",
                    desc: "Kteří mě každý den učí, že komunikace má mnoho forem – a každá z nich je cenná.",
                    color: "#E91E8C",
                  },
                ].map(({ emoji, title, desc, color, url }) => (
                  <div
                    key={title}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: 12,
                      padding: "12px 14px",
                      borderRadius: 14,
                      background: `${color}08`,
                      border: `1px solid ${color}20`,
                    }}
                  >
                    <span style={{
                      fontSize: 20, lineHeight: 1,
                      marginTop: 1, flexShrink: 0,
                    }}>
                      {emoji}
                    </span>
                    <div>
                      <div style={{
                        fontSize: 13, fontWeight: 600,
                        color: color,
                        fontFamily: "Ubuntu, sans-serif",
                        marginBottom: 3,
                      }}>
                        {url ? (
                          <a href={url} target="_blank" rel="noopener noreferrer"
                            style={{ color: "inherit", textDecoration: "none" }}
                            onMouseEnter={e => ((e.target as HTMLElement).style.textDecoration = "underline")}
                            onMouseLeave={e => ((e.target as HTMLElement).style.textDecoration = "none")}
                          >
                            {title} ↗
                          </a>
                        ) : title}
                      </div>
                      <div style={{
                        fontSize: 11, color: "rgba(255,255,255,0.45)",
                        fontFamily: "Ubuntu, sans-serif", lineHeight: 1.55,
                      }}>
                        {desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════
              PATIČKA
          ═══════════════════════════════════════════════════════ */}
          <div style={{
            textAlign: "center",
            padding: "16px 0 8px",
          }}>
            <p style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.2)",
              margin: "0 0 6px",
              fontFamily: "Ubuntu, sans-serif",
              letterSpacing: "0.04em",
            }}>
              Piktos Portal v{VERSION} · {new Date().getFullYear()} · Synthesis Studio
            </p>
            <p style={{
              fontSize: 10,
              color: "rgba(255,255,255,0.12)",
              margin: 0,
              fontFamily: "Ubuntu, sans-serif",
            }}>
              Symboly ARASAAC © Gobierno de Aragón – licencováno pod CC BY-NC-SA 4.0
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

// ── InfoButton – malá "ⓘ" ikonka pro top bar ──────────────────────────────
interface InfoButtonProps {
  onClick: () => void;
}

export function InfoButton({ onClick }: InfoButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="O projektu Piktos"
      data-compact
      style={{
        width: 36, height: 36, borderRadius: "50%",
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.12)",
        color: "rgba(255,255,255,0.45)",
        fontSize: 15, cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        minWidth: 36, minHeight: 36,
        transition: "all 180ms",
        fontFamily: "Ubuntu, sans-serif",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = "rgba(233,84,32,0.15)";
        e.currentTarget.style.color      = "rgba(233,84,32,0.8)";
        e.currentTarget.style.borderColor = "rgba(233,84,32,0.35)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background  = "rgba(255,255,255,0.06)";
        e.currentTarget.style.color       = "rgba(255,255,255,0.45)";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
      }}
    >
      ⓘ
    </button>
  );
}
