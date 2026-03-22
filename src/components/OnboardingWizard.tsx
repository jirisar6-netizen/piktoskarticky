// ─── src/components/OnboardingWizard.tsx ─────────────────────────────────
//
// Interaktivní průvodce prvním spuštěním.
// Spustí se automaticky, pokud chybí localStorage["piktos:onboarded"].
// Přeskočitelný kdykoli tlačítkem "Přeskočit".
//
// Kroky:
//   1. Vítejte – jméno dítěte
//   2. Jazyk – CZ / SK / EN
//   3. Mřížka – začátečník vs pokročilý
//   4. Povolení – mikrofon + kamera
//   5. Hotovo – spustit Piktos

import {
  useState, useCallback, useEffect, useRef,
  type ReactNode,
} from "react";
import { useLanguage }   from "../context/LanguageContext";
import { useSettings }   from "../context/SettingsContext";
import type { GridCols } from "../context/SettingsContext";
import type { LangCode } from "../i18n/translations";
import { LANG_META }     from "../i18n/translations";

// ── Konstanty ──────────────────────────────────────────────────────────────
const LS_KEY        = "piktos:onboarded";
const LS_CHILD_NAME = "piktos:child-name";
const TOTAL_STEPS   = 5;

// ── Maskot bubble ──────────────────────────────────────────────────────────
const MASCOT_TIPS = [
  "Ahoj! Jsem tu, abych ti pomohl nastavit Piktos za pár vteřin. 🎉",
  "Vyber jazyk a já překládám celou aplikaci – okamžitě!",
  "Větší karty = snazší klikání. Pro začátek doporučuji větší.",
  "Mikrofon a kamera jsou čistě volitelné – data zůstanou jen v tabletu.",
  "To je vše! Piktos je připraven. Hodně zdaru! 🚀",
];

function Mascot({ tip, step }: { tip: string; step: number }) {
  return (
    <div
      style={{
        display:    "flex",
        alignItems: "flex-end",
        gap:        12,
        marginBottom: 24,
      }}
    >
      {/* Postavička */}
      <div
        style={{
          width: 64, height: 64, borderRadius: "50%",
          background:  "linear-gradient(135deg, rgba(233,84,32,0.3), rgba(233,84,32,0.1))",
          border:      "2px solid rgba(233,84,32,0.5)",
          display:     "flex", alignItems: "center", justifyContent: "center",
          fontSize:    32, flexShrink: 0,
          animation:   "mascotBob 2s ease-in-out infinite",
          boxShadow:   "0 0 20px rgba(233,84,32,0.2)",
        }}
        aria-hidden="true"
      >
        🗣️
      </div>

      {/* Bublina */}
      <div
        style={{
          flex:         1,
          padding:      "12px 16px",
          borderRadius: "18px 18px 18px 4px",
          background:   "rgba(255,255,255,0.08)",
          border:       "1px solid rgba(255,255,255,0.15)",
          backdropFilter: "blur(8px)",
          position:     "relative",
          animation:    "bubbleIn 300ms cubic-bezier(0.34,1.56,0.64,1) both",
        }}
      >
        <p
          style={{
            fontSize:   13, lineHeight: 1.55,
            color:      "rgba(255,255,255,0.85)",
            margin:     0,
            fontFamily: "Ubuntu, sans-serif",
          }}
        >
          {tip}
        </p>
      </div>
    </div>
  );
}

// ── Progress bar ───────────────────────────────────────────────────────────
function ProgressBar({ step }: { step: number }) {
  const pct = ((step) / TOTAL_STEPS) * 100;
  return (
    <div style={{ marginBottom: 28 }}>
      <div
        style={{
          width: "100%", height: 4, borderRadius: 999,
          background: "rgba(255,255,255,0.1)",
          overflow:   "hidden",
        }}
        role="progressbar"
        aria-valuenow={step}
        aria-valuemin={0}
        aria-valuemax={TOTAL_STEPS}
        aria-label={`Krok ${step} z ${TOTAL_STEPS}`}
      >
        <div
          style={{
            height:     "100%",
            width:      `${pct}%`,
            borderRadius: 999,
            background: "linear-gradient(90deg, #E95420, #FF7043)",
            boxShadow:  "0 0 6px rgba(233,84,32,0.7)",
            transition: "width 400ms cubic-bezier(0.34,1.56,0.64,1)",
          }}
        />
      </div>
      <div
        style={{
          display:        "flex",
          justifyContent: "space-between",
          marginTop:      6,
        }}
      >
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <div
            key={i}
            style={{
              width:      8, height: 8, borderRadius: "50%",
              background: i < step
                ? "#E95420"
                : i === step - 1
                  ? "#FF7043"
                  : "rgba(255,255,255,0.15)",
              transition: "background 300ms, transform 300ms",
              transform:  i === step - 1 ? "scale(1.4)" : "scale(1)",
              boxShadow:  i < step ? "0 0 4px rgba(233,84,32,0.6)" : "none",
            }}
            aria-hidden="true"
          />
        ))}
      </div>
    </div>
  );
}

// ── Step wrapper – slide animace ───────────────────────────────────────────
function StepSlide({
  children, direction, stepKey,
}: {
  children: ReactNode; direction: "left" | "right"; stepKey: number;
}) {
  return (
    <div
      key={stepKey}
      style={{
        animation: `slideIn${direction === "left" ? "Right" : "Left"} 340ms cubic-bezier(0.34,1.56,0.64,1) both`,
      }}
    >
      {children}
    </div>
  );
}

// ── KROK 1: Vítejte ────────────────────────────────────────────────────────
function Step1Welcome({ onNext }: { onNext: (name: string) => void }) {
  const [name, setName] = useState(() => {
    try { return localStorage.getItem(LS_CHILD_NAME) ?? ""; } catch { return ""; }
  });

  const handleNext = () => {
    const trimmed = name.trim();
    try { localStorage.setItem(LS_CHILD_NAME, trimmed); } catch {}
    onNext(trimmed);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
        <div
          style={{
            display:     "inline-flex",
            alignItems:  "center", justifyContent: "center",
            width: 80, height: 80, borderRadius: 22,
            background:  "linear-gradient(135deg, #E95420, #FF6B3D)",
            fontSize:    36, marginBottom: 16,
            boxShadow:   "0 0 40px rgba(233,84,32,0.4)",
            animation:   "logoPop 600ms cubic-bezier(0.34,1.56,0.64,1) both",
          }}
        >
          🗣️
        </div>
        <h1
          style={{
            fontSize:      "clamp(22px, 5vw, 32px)",
            fontWeight:    800,
            margin:        "0 0 8px",
            fontFamily:    "Ubuntu, sans-serif",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color:         "#E95420",
          }}
        >
          Vítejte v Piktos!
        </h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", margin: 0, fontFamily: "Ubuntu, sans-serif" }}>
          Průvodce prvním spuštěním · asi 30 sekund
        </p>
      </div>

      <div>
        <label
          style={{
            display:       "block",
            fontSize:      11, fontWeight: 700,
            letterSpacing: "0.08em", textTransform: "uppercase",
            color:         "rgba(255,255,255,0.4)",
            marginBottom:  10,
            fontFamily:    "Ubuntu, sans-serif",
          }}
        >
          Jak se jmenuje hlavní uživatel?
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value.slice(0, 24))}
          onKeyDown={e => e.key === "Enter" && handleNext()}
          placeholder="např. Jiřík"
          maxLength={24}
          autoFocus
          style={{
            width:      "100%",
            padding:    "14px 16px",
            borderRadius: 16,
            background: "rgba(255,255,255,0.08)",
            border:     "1.5px solid rgba(255,255,255,0.2)",
            color:      "#fff",
            fontSize:   18, fontWeight: 600,
            fontFamily: "Ubuntu, sans-serif",
            outline:    "none",
            transition: "border-color 200ms",
            // Input musí mít user-select text
            userSelect:       "text",
            WebkitUserSelect: "text",
          }}
          onFocus={e => (e.target.style.borderColor = "rgba(233,84,32,0.7)")}
          onBlur={e  => (e.target.style.borderColor = "rgba(255,255,255,0.2)")}
        />
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", margin: "8px 0 0", fontFamily: "Ubuntu, sans-serif" }}>
          Toto jméno se zobrazí v profilu (lze změnit v nastavení).
        </p>
      </div>

      <PrimaryButton onClick={handleNext} disabled={false}>
        Pokračovat →
      </PrimaryButton>
    </div>
  );
}

// ── KROK 2: Jazyk ──────────────────────────────────────────────────────────
function Step2Language({ onNext }: { onNext: () => void }) {
  const { lang, setLang } = useLanguage();

  const langs: { code: LangCode; flag: string; name: string; native: string }[] = [
    { code: "cs", flag: "🇨🇿", name: "Čeština",    native: "Čeština" },
    { code: "sk", flag: "🇸🇰", name: "Slovenčina", native: "Slovenčina" },
    { code: "en", flag: "🇬🇧", name: "English",    native: "English" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "#fff", fontFamily: "Ubuntu, sans-serif" }}>
        Vyber jazyk aplikace
      </h2>
      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", margin: 0, lineHeight: 1.6, fontFamily: "Ubuntu, sans-serif" }}>
        Nastaví jazyk piktogramů, hlasové syntézy i rozhraní. Lze změnit kdykoli.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {langs.map(({ code, flag, name, native }) => {
          const active = lang === code;
          return (
            <button
              key={code}
              type="button"
              onClick={() => setLang(code)}
              aria-pressed={active}
              style={{
                display:       "flex",
                alignItems:    "center",
                gap:           16,
                padding:       "16px 20px",
                borderRadius:  18,
                background:    active ? "rgba(233,84,32,0.18)" : "rgba(255,255,255,0.05)",
                border:        `${active ? "2px" : "1px"} solid ${active ? "rgba(233,84,32,0.7)" : "rgba(255,255,255,0.12)"}`,
                cursor:        "pointer",
                transition:    "all 200ms cubic-bezier(0.34,1.56,0.64,1)",
                transform:     active ? "scale(1.02)" : "scale(1)",
                boxShadow:     active ? "0 0 20px rgba(233,84,32,0.25)" : "none",
                minHeight:     64,
                fontFamily:    "Ubuntu, sans-serif",
              }}
            >
              <span style={{ fontSize: 32, lineHeight: 1, flexShrink: 0 }}>{flag}</span>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 16, fontWeight: active ? 700 : 500, color: active ? "#E95420" : "rgba(255,255,255,0.85)" }}>
                  {native}
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
                  {code === "cs" ? "Hlasová syntéza cs-CZ · ARASAAC cs"
                 : code === "sk" ? "Hlasová syntéza sk-SK · ARASAAC sk"
                 : "Voice synthesis en-GB · ARASAAC en"}
                </div>
              </div>
              {active && (
                <span style={{ marginLeft: "auto", fontSize: 18, color: "#E95420", flexShrink: 0 }}>✓</span>
              )}
            </button>
          );
        })}
      </div>

      <PrimaryButton onClick={onNext}>
        Pokračovat →
      </PrimaryButton>
    </div>
  );
}

// ── KROK 3: Mřížka ────────────────────────────────────────────────────────
function Step3Grid({ onNext }: { onNext: () => void }) {
  const { settings, update } = useSettings();
  const cols = settings.gridCols ?? 3;

  const OPTIONS = [
    {
      cols:  2 as GridCols,
      label: "Začínáme",
      sub:   "Velké karty, méně najednou",
      icon:  "🟧🟧",
      desc:  "2 sloupce · ideální pro začátek",
      hint:  "Doporučeno pro Jiříka a Štěpánka",
      hintColor: "#4CAF50",
    },
    {
      cols:  3 as GridCols,
      label: "Standardní",
      sub:   "Vyvážené pro denní použití",
      icon:  "⬛⬛⬛",
      desc:  "3 sloupce · nejpoužívanější nastavení",
      hint:  "Doporučeno pro většinu uživatelů",
      hintColor: "#E95420",
    },
    {
      cols:  4 as GridCols,
      label: "Pokročilý",
      sub:   "Více karet, menší velikost",
      icon:  "▪️▪️▪️▪️",
      desc:  "4 sloupce · pro zkušenější uživatele",
      hint:  "Pro větší tablety nebo pokročilé",
      hintColor: "#4A9EFF",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px", color: "#fff", fontFamily: "Ubuntu, sans-serif" }}>
          Velikost mřížky karet
        </h2>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", margin: 0, lineHeight: 1.6, fontFamily: "Ubuntu, sans-serif" }}>
          Větší karty = snazší klikání. Lze změnit v nastavení kdykoli.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {OPTIONS.map(({ cols: c, label, sub, icon, desc, hint, hintColor }) => {
          const active = cols === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => update({ gridCols: c })}
              aria-pressed={active}
              style={{
                display:       "flex",
                alignItems:    "center",
                gap:           14,
                padding:       "14px 18px",
                borderRadius:  18,
                background:    active ? `${hintColor}14` : "rgba(255,255,255,0.05)",
                border:        `${active ? "2px" : "1px"} solid ${active ? hintColor : "rgba(255,255,255,0.12)"}`,
                cursor:        "pointer",
                transition:    "all 200ms cubic-bezier(0.34,1.56,0.64,1)",
                transform:     active ? "scale(1.01)" : "scale(1)",
                boxShadow:     active ? `0 0 16px ${hintColor}30` : "none",
                minHeight:     68,
                textAlign:     "left",
                fontFamily:    "Ubuntu, sans-serif",
              }}
            >
              {/* Grid vizualizace */}
              <div style={{
                display:        "grid",
                gridTemplateColumns: `repeat(${c}, 1fr)`,
                gap:            3,
                flexShrink:     0,
                width:          56, // fixní šířka pro konzistenci
              }}>
                {Array.from({ length: c * Math.min(c, 2) }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      aspectRatio: "1",
                      borderRadius: 4,
                      background:  active ? hintColor : "rgba(255,255,255,0.2)",
                      transition:  "background 250ms",
                    }}
                  />
                ))}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: active ? 700 : 500, color: active ? hintColor : "rgba(255,255,255,0.85)", marginBottom: 2 }}>
                  {label}
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>
                  {desc}
                </div>
                {active && (
                  <div style={{ fontSize: 10, color: hintColor, marginTop: 3, fontWeight: 600 }}>
                    ✓ {hint}
                  </div>
                )}
              </div>

              {active && (
                <span style={{ fontSize: 18, color: hintColor, flexShrink: 0 }}>✓</span>
              )}
            </button>
          );
        })}
      </div>

      <PrimaryButton onClick={onNext}>
        Pokračovat →
      </PrimaryButton>
    </div>
  );
}

// ── KROK 4: Povolení ──────────────────────────────────────────────────────
type PermState = "idle" | "granted" | "denied" | "requesting";

function Step4Permissions({ onNext }: { onNext: () => void }) {
  const [mic,    setMic]    = useState<PermState>("idle");
  const [camera, setCamera] = useState<PermState>("idle");

  const requestMic = async () => {
    setMic("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      setMic("granted");
    } catch {
      setMic("denied");
    }
  };

  const requestCamera = async () => {
    setCamera("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(t => t.stop());
      setCamera("granted");
    } catch {
      setCamera("denied");
    }
  };

  const PermButton = ({
    state, onRequest, icon, label, desc,
  }: {
    state: PermState; onRequest: () => void;
    icon: string; label: string; desc: string;
  }) => {
    const colors = {
      idle:       { bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.12)", text: "rgba(255,255,255,0.7)", badge: "" },
      requesting: { bg: "rgba(233,84,32,0.1)",   border: "rgba(233,84,32,0.4)",   text: "#E95420", badge: "…" },
      granted:    { bg: "rgba(76,175,80,0.1)",   border: "rgba(76,175,80,0.5)",   text: "#4CAF50", badge: "✓" },
      denied:     { bg: "rgba(255,80,80,0.08)",  border: "rgba(255,80,80,0.3)",   text: "rgba(255,120,120,0.8)", badge: "✕" },
    };
    const c = colors[state];

    return (
      <button
        type="button"
        onClick={state === "idle" ? onRequest : undefined}
        disabled={state !== "idle"}
        style={{
          display:    "flex", alignItems: "center", gap: 14,
          padding:    "16px 18px",
          borderRadius: 18,
          background: c.bg, border: `1.5px solid ${c.border}`,
          cursor:     state === "idle" ? "pointer" : "default",
          transition: "all 200ms",
          minHeight:  68, textAlign: "left",
          fontFamily: "Ubuntu, sans-serif",
          width:      "100%",
          boxShadow:  state === "granted" ? "0 0 12px rgba(76,175,80,0.2)" : "none",
        }}
      >
        <span style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>{icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: c.text, marginBottom: 2 }}>
            {label}
            {state === "denied" && <span style={{ marginLeft: 8, fontSize: 11, opacity: 0.7 }}>(zamítnuto – nastav ručně)</span>}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{desc}</div>
        </div>
        <span style={{ fontSize: 20, color: c.text, flexShrink: 0, fontWeight: 700 }}>
          {c.badge || (state === "idle" ? "→" : "")}
        </span>
      </button>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px", color: "#fff", fontFamily: "Ubuntu, sans-serif" }}>
          Povolení pro plný zážitek
        </h2>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", margin: 0, lineHeight: 1.6, fontFamily: "Ubuntu, sans-serif" }}>
          Obě povolení jsou volitelná. Data z kamery a mikrofonu{" "}
          <strong style={{ color: "rgba(255,255,255,0.8)" }}>nikdy neopustí tvůj tablet</strong>.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <PermButton
          state={mic} onRequest={requestMic}
          icon="🎙️" label="Mikrofon"
          desc="Nahrávání vlastního hlasu pro piktogramy"
        />
        <PermButton
          state={camera} onRequest={requestCamera}
          icon="📷" label="Kamera"
          desc="Fotografování hraček a osobních předmětů"
        />
      </div>

      <div style={{
        padding:      "12px 16px", borderRadius: 14,
        background:   "rgba(255,255,255,0.04)",
        border:       "1px solid rgba(255,255,255,0.08)",
        fontSize:     11, color: "rgba(255,255,255,0.35)",
        lineHeight:   1.7, fontFamily: "Ubuntu, sans-serif",
      }}>
        🔒 Privacy: záznamy jsou uloženy v IndexedDB tohoto zařízení.
        Žádný cloud, žádné servery, žádné sledování.
      </div>

      <PrimaryButton onClick={onNext}>
        Pokračovat →
      </PrimaryButton>
      <SecondaryButton onClick={onNext}>
        Přeskočit tuto část
      </SecondaryButton>
    </div>
  );
}

// ── KROK 5: Hotovo ────────────────────────────────────────────────────────
function Step5Done({
  childName, onFinish,
}: {
  childName: string; onFinish: () => void;
}) {
  const { settings } = useSettings();
  const gridLabel = settings.gridCols === 2 ? "2 sloupce (Začínáme)"
                  : settings.gridCols === 3 ? "3 sloupce (Standardní)"
                  : "4 sloupce (Pokročilý)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, textAlign: "center" }}>
      {/* Konfety emoji */}
      <div
        style={{
          fontSize: 56,
          animation: "confettiBounce 600ms cubic-bezier(0.34,1.56,0.64,1) both",
        }}
        aria-hidden="true"
      >
        🎉
      </div>

      <div>
        <h2
          style={{
            fontSize:   "clamp(22px, 5vw, 30px)",
            fontWeight: 800, margin: "0 0 10px",
            color:      "#fff", fontFamily: "Ubuntu, sans-serif",
          }}
        >
          {childName ? `Vše je připraveno pro ${childName}!` : "Piktos je připraven!"}
        </h2>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", margin: 0, lineHeight: 1.7, fontFamily: "Ubuntu, sans-serif" }}>
          Nastavení uloženo. Kdykoli ho změníš v rodičovském nastavení.
        </p>
      </div>

      {/* Shrnutí */}
      <div style={{
        padding:      "18px 20px",
        borderRadius: 18,
        background:   "rgba(255,255,255,0.05)",
        border:       "1px solid rgba(255,255,255,0.1)",
        textAlign:    "left",
        display:      "flex", flexDirection: "column", gap: 10,
      }}>
        {[
          { icon: "👤", label: "Uživatel",  value: childName || "Nenastaveno" },
          { icon: "🌍", label: "Jazyk",     value: LANG_META[useLanguage().lang as LangCode].name },
          { icon: "⊞",  label: "Mřížka",   value: gridLabel },
        ].map(({ icon, label, value }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "Ubuntu, sans-serif", minWidth: 70 }}>
              {label}:
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#E95420", fontFamily: "Ubuntu, sans-serif" }}>
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* Spustit tlačítko */}
      <button
        type="button"
        onClick={onFinish}
        style={{
          padding:      "18px 0",
          borderRadius: 18, minHeight: 60,
          background:   "#E95420",
          border:       "none",
          color:        "#fff",
          fontSize:     17, fontWeight: 800,
          cursor:       "pointer",
          fontFamily:   "Ubuntu, sans-serif",
          letterSpacing:"0.04em",
          boxShadow:    "0 0 32px rgba(233,84,32,0.5), 0 4px 16px rgba(0,0,0,0.3)",
          transition:   "all 150ms",
          display:      "flex", alignItems: "center", justifyContent: "center", gap: 10,
          animation:    "finishPulse 1.5s ease-in-out 800ms infinite",
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
        onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
      >
        🚀 Spustit Piktos
      </button>

      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", margin: 0, fontFamily: "Ubuntu, sans-serif" }}>
        Vytvořeno s ❤️ pro Jiříka a Štěpánka · Synthesis Studio
      </p>
    </div>
  );
}

// ── Pomocné tlačítka ───────────────────────────────────────────────────────
function PrimaryButton({
  children, onClick, disabled = false,
}: {
  children: ReactNode; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding:      "14px 0", borderRadius: 16, minHeight: 52,
        background:   "#E95420", border: "none",
        color:        "#fff", fontSize: 15, fontWeight: 700,
        cursor:       disabled ? "default" : "pointer",
        fontFamily:   "Ubuntu, sans-serif",
        opacity:      disabled ? 0.4 : 1,
        boxShadow:    "0 0 20px rgba(233,84,32,0.4)",
        transition:   "opacity 150ms, transform 150ms",
        width:        "100%",
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.opacity = "0.88"; }}
      onMouseLeave={e => { e.currentTarget.style.opacity = disabled ? "0.4" : "1"; }}
    >
      {children}
    </button>
  );
}

function SecondaryButton({
  children, onClick,
}: {
  children: ReactNode; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding:      "10px 0", borderRadius: 14, minHeight: 44,
        background:   "transparent", border: "1px solid rgba(255,255,255,0.12)",
        color:        "rgba(255,255,255,0.45)", fontSize: 13,
        cursor:       "pointer", fontFamily: "Ubuntu, sans-serif",
        transition:   "all 150ms", width: "100%",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)";
        e.currentTarget.style.color       = "rgba(255,255,255,0.7)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
        e.currentTarget.style.color       = "rgba(255,255,255,0.45)";
      }}
    >
      {children}
    </button>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// HLAVNÍ WIZARD KOMPONENTA
// ══════════════════════════════════════════════════════════════════════════
interface OnboardingWizardProps {
  onComplete: () => void;
}

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step,      setStep]      = useState(1);
  const [direction, setDirection] = useState<"left" | "right">("left");
  const [childName, setChildName] = useState("");

  const goNext = useCallback((name?: string) => {
    if (name !== undefined) setChildName(name);
    setDirection("left");
    setStep(s => s + 1);
  }, []);

  const complete = useCallback(() => {
    try { localStorage.setItem(LS_KEY, "1"); } catch {}
    onComplete();
  }, [onComplete]);

  const skip = useCallback(() => {
    try { localStorage.setItem(LS_KEY, "1"); } catch {}
    onComplete();
  }, [onComplete]);

  return (
    <div
      style={{
        position:   "fixed", inset: 0, zIndex: 500,
        background: "linear-gradient(160deg, #2C001E 0%, #1A0011 60%, #0f000a 100%)",
        display:    "flex", alignItems: "center", justifyContent: "center",
        padding:    "20px 16px",
        overflowY:  "auto",
        fontFamily: "Ubuntu, sans-serif",
      }}
    >
      <style>{`
        /* ── Slide animace ─────────────────────────────────────────── */
        @keyframes slideInRight {
          from { opacity:0; transform: translateX(60px) scale(0.97); }
          to   { opacity:1; transform: none; }
        }
        @keyframes slideInLeft {
          from { opacity:0; transform: translateX(-60px) scale(0.97); }
          to   { opacity:1; transform: none; }
        }

        /* ── Ostatní ────────────────────────────────────────────────── */
        @keyframes mascotBob {
          0%,100% { transform: translateY(0); }
          50%      { transform: translateY(-5px); }
        }
        @keyframes bubbleIn {
          from { opacity:0; transform: scale(0.9) translateX(-8px); }
          to   { opacity:1; transform: none; }
        }
        @keyframes logoPop {
          from { opacity:0; transform: scale(0.5) rotate(-10deg); }
          to   { opacity:1; transform: scale(1) rotate(0deg); }
        }
        @keyframes confettiBounce {
          from { opacity:0; transform: scale(0.3) translateY(-20px); }
          60%  { transform: scale(1.25) translateY(4px); }
          to   { opacity:1; transform: scale(1) translateY(0); }
        }
        @keyframes finishPulse {
          0%,100% { box-shadow: 0 0 32px rgba(233,84,32,0.5); }
          50%      { box-shadow: 0 0 48px rgba(233,84,32,0.75); }
        }
        /* Disable user-select globally v onboardingu, povolit pro input */
        input { -webkit-user-select: text !important; user-select: text !important; }
      `}</style>

      {/* Vnější karta */}
      <div
        style={{
          width:        "100%",
          maxWidth:     480,
          borderRadius: 28,
          background:   "rgba(255,255,255,0.05)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border:       "1px solid rgba(255,255,255,0.12)",
          boxShadow:    "0 32px 80px rgba(0,0,0,0.5)",
          padding:      "28px 28px 24px",
          position:     "relative",
          animation:    "slideInRight 400ms cubic-bezier(0.34,1.56,0.64,1) both",
        }}
      >
        {/* Přeskočit */}
        {step < 5 && (
          <button
            type="button"
            onClick={skip}
            style={{
              position:  "absolute", top: 16, right: 16,
              padding:   "5px 12px", borderRadius: 999,
              background:"rgba(255,255,255,0.06)",
              border:    "1px solid rgba(255,255,255,0.12)",
              color:     "rgba(255,255,255,0.35)",
              fontSize:  11, cursor: "pointer",
              fontFamily:"Ubuntu, sans-serif",
              transition:"all 150ms",
              minHeight: 32,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color       = "rgba(255,255,255,0.65)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color       = "rgba(255,255,255,0.35)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
            }}
          >
            Přeskočit
          </button>
        )}

        {/* Progress bar */}
        <ProgressBar step={step} />

        {/* Maskot */}
        <Mascot tip={MASCOT_TIPS[step - 1]} step={step} />

        {/* Obsah kroku */}
        <StepSlide direction={direction} stepKey={step}>
          {step === 1 && <Step1Welcome  onNext={goNext} />}
          {step === 2 && <Step2Language onNext={() => goNext()} />}
          {step === 3 && <Step3Grid     onNext={() => goNext()} />}
          {step === 4 && <Step4Permissions onNext={() => goNext()} />}
          {step === 5 && <Step5Done childName={childName} onFinish={complete} />}
        </StepSlide>
      </div>
    </div>
  );
}

// ── Hook: automatické spuštění ─────────────────────────────────────────────
export function useOnboarding() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      const done = localStorage.getItem(LS_KEY);
      if (!done) setShow(true);
    } catch {
      setShow(true);
    }
  }, []);

  const complete = useCallback(() => {
    try { localStorage.setItem(LS_KEY, "1"); } catch {}
    setShow(false);
  }, []);

  const reset = useCallback(() => {
    try { localStorage.removeItem(LS_KEY); } catch {}
    setShow(true);
  }, []);

  return { show, complete, reset };
}
