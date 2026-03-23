// ─── src/pages/Settings.tsx ───────────────────────────────────────────────
//
// Rodičovský admin panel.
// Přístup chráněn ParentalGate (long press 3s nebo math challenge).
// Po ověření se zobrazí 4 sekce nastavení.

import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate }  from "react-router-dom";
import { useSettings }  from "../context/SettingsContext";
import { useLanguage }  from "../context/LanguageContext";
import { useSyncStore } from "../context/SyncProvider";
import { useParentalLock } from "../hooks/useParentalLock";
import { BlockGate }    from "../components/ParentalGate";
import LanguageSwitcher from "../components/LanguageSwitcher";
import type { CardSize, GridCols } from "../context/SettingsContext";

// ── Sub-komponenty UI ─────────────────────────────────────────────────────

// Sekce s nadpisem
function Section({ title, icon, children }: {
  title: string; icon: string; children: React.ReactNode;
}) {
  return (
    <div style={{
      borderRadius: 20,
      background:   "rgba(255,255,255,0.04)",
      border:       "1px solid rgba(255,255,255,0.09)",
      overflow:     "hidden",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "14px 18px",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        background: "rgba(255,255,255,0.03)",
      }}>
        <span style={{ fontSize: 18 }} aria-hidden="true">{icon}</span>
        <h2 style={{
          fontSize: 13, fontWeight: 700, margin: 0,
          letterSpacing: "0.06em", textTransform: "uppercase",
          color: "rgba(255,255,255,0.55)",
        }}>
          {title}
        </h2>
      </div>
      <div style={{ padding: "4px 0 8px" }}>
        {children}
      </div>
    </div>
  );
}

// Řádek nastavení
function Row({ label, sub, children }: {
  label: string; sub?: string; children: React.ReactNode;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "12px 18px", gap: 16,
      borderBottom: "1px solid rgba(255,255,255,0.04)",
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.8)" }}>
          {label}
        </div>
        {sub && (
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2, lineHeight: 1.4 }}>
            {sub}
          </div>
        )}
      </div>
      <div style={{ flexShrink: 0 }}>
        {children}
      </div>
    </div>
  );
}

// Toggle switch
function Toggle({ value, onChange, disabled }: {
  value: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      style={{
        width: 48, height: 28, borderRadius: 999, border: "none",
        background: value ? "#E95420" : "rgba(255,255,255,0.15)",
        position: "relative", cursor: disabled ? "default" : "pointer",
        transition: "background 250ms",
        opacity: disabled ? 0.4 : 1,
        flexShrink: 0,
        minWidth: 48, minHeight: 28,
      }}
    >
      <span style={{
        position: "absolute",
        top: 3, left: value ? 23 : 3,
        width: 22, height: 22, borderRadius: "50%",
        background: "#fff",
        boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
        transition: "left 220ms cubic-bezier(0.34,1.56,0.64,1)",
      }} aria-hidden="true"/>
    </button>
  );
}

// Posuvník (slider)
function Slider({
  value, min, max, step = 0.1, onChange, formatValue, color = "#E95420",
}: {
  value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void; formatValue?: (v: number) => string;
  color?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 180 }}>
      <div style={{ position: "relative", flex: 1, height: 20, display: "flex", alignItems: "center" }}>
        {/* Track */}
        <div style={{
          position: "absolute", inset: 0, top: "50%", transform: "translateY(-50%)",
          height: 4, borderRadius: 999,
          background: `linear-gradient(to right, ${color} ${pct}%, rgba(255,255,255,0.15) ${pct}%)`,
        }}/>
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{
            width: "100%", height: 20, opacity: 0,
            position: "relative", zIndex: 1, cursor: "pointer",
            margin: 0, padding: 0,
          }}
          aria-valuemin={min} aria-valuemax={max} aria-valuenow={value}
        />
        {/* Thumb */}
        <div style={{
          position: "absolute",
          left: `calc(${pct}% - 10px)`,
          top: "50%", transform: "translateY(-50%)",
          width: 20, height: 20, borderRadius: "50%",
          background: color,
          boxShadow: `0 0 8px ${color}60, 0 2px 4px rgba(0,0,0,0.4)`,
          pointerEvents: "none",
          transition: "left 0ms",
        }} aria-hidden="true"/>
      </div>
      <span style={{
        fontSize: 13, fontWeight: 700, color: color,
        minWidth: 36, textAlign: "right",
        fontVariantNumeric: "tabular-nums",
      }}>
        {formatValue ? formatValue(value) : value.toFixed(1)}
      </span>
    </div>
  );
}

// Card size selector
function CardSizeSelector({ value, onChange }: {
  value: CardSize; onChange: (v: CardSize) => void;
}) {
  const OPTIONS: { v: CardSize; label: string; sub: string; size: number }[] = [
    { v: "md", label: "Standardní",  sub: "140 × 140 px", size: 36 },
    { v: "lg", label: "Extra velké", sub: "176 × 176 px", size: 48 },
  ];
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {OPTIONS.map(({ v, label, sub, size }) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          aria-pressed={value === v}
          style={{
            padding: "10px 14px", borderRadius: 14, cursor: "pointer",
            background: value === v ? "rgba(233,84,32,0.18)" : "rgba(255,255,255,0.05)",
            border: `1.5px solid ${value === v ? "rgba(233,84,32,0.6)" : "rgba(255,255,255,0.1)"}`,
            color: value === v ? "#E95420" : "rgba(255,255,255,0.5)",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
            transition: "all 200ms", minHeight: 72, minWidth: 100,
            fontFamily: "Ubuntu, sans-serif",
          }}
        >
          {/* Mini karta ikona */}
          <div style={{
            width: size, height: size, borderRadius: size / 4,
            background: value === v ? "rgba(233,84,32,0.3)" : "rgba(255,255,255,0.1)",
            border: `1px solid ${value === v ? "rgba(233,84,32,0.5)" : "rgba(255,255,255,0.15)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: size * 0.45,
            transition: "all 200ms",
          }}>🖼️</div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.2 }}>{label}</div>
            <div style={{ fontSize: 10, opacity: 0.6, marginTop: 2 }}>{sub}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

// ── Sekce Hlasová syntéza ─────────────────────────────────────────────────
function VoiceSection() {
  const { settings, update, availableVoices } = useSettings();
  const { t, meta } = useLanguage();

  // Test syntézy
  const testVoice = useCallback(() => {
    window.speechSynthesis?.cancel();
    const u = new SpeechSynthesisUtterance(
      meta.ttsLang.startsWith("cs") ? "Ahoj, toto je test hlasu."
      : meta.ttsLang.startsWith("sk") ? "Ahoj, toto je test hlasu."
      : "Hello, this is a voice test."
    );
    u.lang   = meta.ttsLang;
    u.rate   = settings.voiceRate;
    u.pitch  = settings.voicePitch;
    u.volume = settings.voiceVolume;
    const preferred = availableVoices.find(v =>
      settings.voiceName ? v.name === settings.voiceName : v.lang === meta.ttsLang
    );
    if (preferred) u.voice = preferred;
    window.speechSynthesis?.speak(u);
  }, [settings, meta, availableVoices]);

  const langVoices = availableVoices.filter(v =>
    v.lang.startsWith(meta.ttsLang.slice(0, 2))
  );

  return (
    <Section title="Hlas" icon="🔊">
      <Row label="Rychlost řeči" sub={`${settings.voiceRate.toFixed(1)}× — doporučeno: 0.8–1.0 pro děti`}>
        <Slider
          value={settings.voiceRate} min={0.5} max={1.5} step={0.05}
          onChange={v => update({ voiceRate: v })}
          formatValue={v => `${v.toFixed(2)}×`}
        />
      </Row>

      <Row label="Výška hlasu" sub="Příliš vysoký hlas může být nepříjemný">
        <Slider
          value={settings.voicePitch} min={0.5} max={1.5} step={0.05}
          onChange={v => update({ voicePitch: v })}
          formatValue={v => v.toFixed(2)}
          color="rgba(100,180,255,0.9)"
        />
      </Row>

      <Row label="Hlasitost">
        <Slider
          value={settings.voiceVolume} min={0} max={1} step={0.05}
          onChange={v => update({ voiceVolume: v })}
          formatValue={v => `${Math.round(v * 100)}%`}
          color="rgba(76,175,80,0.9)"
        />
      </Row>

      {langVoices.length > 1 && (
        <Row
          label="Hlas"
          sub={langVoices.length === 0 ? "Žádné hlasy pro tento jazyk" : `${langVoices.length} hlasů dostupných`}
        >
          <select
            value={settings.voiceName}
            onChange={e => update({ voiceName: e.target.value })}
            style={{
              padding: "8px 12px", borderRadius: 10, maxWidth: 200,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "rgba(255,255,255,0.85)",
              fontSize: 12, fontFamily: "Ubuntu, sans-serif",
              cursor: "pointer", outline: "none",
            }}
          >
            <option value="">Výchozí systémový</option>
            {langVoices.map(v => (
              <option key={v.name} value={v.name}>{v.name}</option>
            ))}
          </select>
        </Row>
      )}

      <Row label="Automaticky číst při kliknutí" sub="Každý klik na piktogram přečte jeho label">
        <Toggle value={settings.autoSpeak} onChange={v => update({ autoSpeak: v })} />
      </Row>

      {/* Test tlačítko */}
      <div style={{ padding: "12px 18px 6px" }}>
        <button
          type="button"
          onClick={testVoice}
          style={{
            padding: "10px 20px", borderRadius: 12,
            background: "rgba(233,84,32,0.15)",
            border: "1px solid rgba(233,84,32,0.35)",
            color: "#E95420", fontSize: 13, fontWeight: 500,
            cursor: "pointer", fontFamily: "Ubuntu, sans-serif",
            transition: "all 150ms", minHeight: 44,
            display: "flex", alignItems: "center", gap: 8,
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(233,84,32,0.25)")}
          onMouseLeave={e => (e.currentTarget.style.background = "rgba(233,84,32,0.15)")}
        >
          <span>▶</span> Test hlasu
        </button>
      </div>
    </Section>
  );
}

// ── Sekce Vizuál ──────────────────────────────────────────────────────────
// ── Grid Columns Selector ────────────────────────────────────────────────
function GridColsSelector({ value, onChange }: { value: GridCols; onChange: (v: GridCols) => void }) {
  const OPTIONS: { v: GridCols; label: string; icon: string }[] = [
    { v: 1, label: "1×1", icon: "⬛" },
    { v: 2, label: "2×2", icon: "⊞" },
    { v: 3, label: "3×3", icon: "⊟" },
    { v: 4, label: "4×4", icon: "⊠" },
  ];
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {OPTIONS.map(({ v, label, icon }) => {
        const active = value === v;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            aria-pressed={active}
            style={{
              width: 52, height: 48, borderRadius: 12, cursor: "pointer",
              background: active ? "rgba(233,84,32,0.2)" : "rgba(255,255,255,0.05)",
              border: `1.5px solid ${active ? "rgba(233,84,32,0.6)" : "rgba(255,255,255,0.1)"}`,
              color: active ? "#E95420" : "rgba(255,255,255,0.5)",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 2, fontFamily: "Ubuntu, sans-serif", transition: "all 180ms",
              minWidth: 48, minHeight: 48,
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>{icon}</span>
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 400 }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

function VisualSection() {
  const { settings, update } = useSettings();

  return (
    <Section title="Vizuál" icon="👁️">
      <Row
        label="Velikost karet"
        sub="Extra velké usnadňují klikání pro menší děti"
      >
        <CardSizeSelector
          value={settings.cardSize}
          onChange={v => update({ cardSize: v })}
        />
      </Row>

      <Row label="Zvýšený kontrast" sub="Ostřejší okraje a silnější barvy">
        <Toggle value={settings.highContrast} onChange={v => update({ highContrast: v })} />
      </Row>

      <Row label="Omezit animace" sub="Méně pohybu – vhodné při přecitlivělosti">
        <Toggle value={settings.reducedMotion} onChange={v => update({ reducedMotion: v })} />
      </Row>

      <Row label="Velikost mřížky" sub="Počet sloupců v gridu piktogramů">
        <GridColsSelector
          value={(settings.gridCols ?? 3) as GridCols}
          onChange={v => update({ gridCols: v })}
        />
      </Row>

      <Row label="Velká písmena" sub="Všechny popisky karet budou VERZÁLKAMI">
        <Toggle value={settings.capitalLetters ?? false} onChange={v => update({ capitalLetters: v })} />
      </Row>
    </Section>
  );
}

// ── Sekce Jazyk ──────────────────────────────────────────────────────────
function LanguageSection() {
  const { lang, allMeta, setLang } = useLanguage();

  return (
    <Section title="Jazyk" icon="🌍">
      <Row label="Jazyk aplikace a ARASAAC databáze" sub="Ovlivní vyhledávání piktogramů a hlasovou syntézu">
        <LanguageSwitcher mode="inline" display="both" />
      </Row>
      <div style={{ padding: "8px 18px 10px" }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", lineHeight: 1.7 }}>
          Aktivní: <strong style={{ color: "rgba(255,255,255,0.5)" }}>{allMeta[lang].flag} {allMeta[lang].name}</strong>
          {" "}· ARASAAC: <code style={{ color: "rgba(233,84,32,0.6)" }}>{allMeta[lang].arasaac}</code>
          {" "}· TTS: <code style={{ color: "rgba(233,84,32,0.6)" }}>{allMeta[lang].ttsLang}</code>
        </div>
      </div>
    </Section>
  );
}

// ── Sekce Synchronizace ───────────────────────────────────────────────────
function SyncSection() {
  const { settings, update }                               = useSettings();
  const { status, lastSyncedAt, isDirty, pullFromCloud, pushToCloud } = useSyncStore();
  const [syncing, setSyncing] = useState(false);
  const [urlVal,  setUrlVal]  = useState(settings.appsScriptUrl);
  const [urlSaved, setUrlSaved] = useState(false);

  const STATUS_COLOR: Record<string, string> = {
    synced: "#4CAF50", offline: "#E95420",
    syncing: "#4A9EFF", error: "#FF5252", idle: "rgba(255,255,255,0.3)",
  };

  const handleSync = async () => {
    setSyncing(true);
    if (isDirty) await pushToCloud();
    else         await pullFromCloud();
    setSyncing(false);
  };

  const handleSaveUrl = () => {
    update({ appsScriptUrl: urlVal.trim() });
    setUrlSaved(true);
    setTimeout(() => setUrlSaved(false), 2000);
  };

  const relTime = (iso: string | null) => {
    if (!iso) return "nikdy";
    const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    return m < 1 ? "právě teď" : m < 60 ? `před ${m} min` : `před ${Math.floor(m/60)} hod`;
  };

  return (
    <Section title="Synchronizace" icon="☁️">
      {/* Status */}
      <Row label="Stav synchronizace" sub={lastSyncedAt ? `Poslední sync: ${relTime(lastSyncedAt)}` : "Nikdy nesynchronizováno"}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            width: 8, height: 8, borderRadius: "50%",
            background: STATUS_COLOR[status] ?? "rgba(255,255,255,0.3)",
            flexShrink: 0,
            boxShadow: `0 0 6px ${STATUS_COLOR[status] ?? "transparent"}`,
          }} aria-hidden="true"/>
          <span style={{ fontSize: 12, color: STATUS_COLOR[status] ?? "rgba(255,255,255,0.5)", fontWeight: 500 }}>
            {status === "synced"  ? "Synchronizováno"
           : status === "offline" ? "Offline"
           : status === "syncing" ? "Synchronizuje…"
           : status === "error"   ? "Chyba"
           : "Čeká"}
          </span>
        </div>
      </Row>

      {/* Sync tlačítko */}
      <Row label="Ruční synchronizace" sub={isDirty ? "Máš neuložené lokální změny" : "Data jsou aktuální"}>
        <button
          type="button"
          onClick={handleSync}
          disabled={syncing}
          style={{
            padding: "8px 16px", borderRadius: 12, minHeight: 44,
            background: isDirty ? "rgba(233,84,32,0.2)" : "rgba(76,175,80,0.15)",
            border: `1px solid ${isDirty ? "rgba(233,84,32,0.4)" : "rgba(76,175,80,0.3)"}`,
            color: isDirty ? "#E95420" : "#4CAF50",
            fontSize: 12, fontWeight: 600, cursor: syncing ? "default" : "pointer",
            opacity: syncing ? 0.6 : 1, fontFamily: "Ubuntu, sans-serif",
            transition: "all 150ms",
          }}
        >
          {syncing ? "Synchronizuje…" : isDirty ? "⬆ Nahrát změny" : "↻ Aktualizovat"}
        </button>
      </Row>

      {/* Apps Script URL */}
      <div style={{ padding: "12px 18px" }}>
        <label style={{
          display: "block", fontSize: 11, fontWeight: 600,
          letterSpacing: "0.06em", textTransform: "uppercase",
          color: "rgba(255,255,255,0.3)", marginBottom: 8,
        }}>
          Google Apps Script URL
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="url"
            value={urlVal}
            onChange={e => setUrlVal(e.target.value)}
            placeholder="https://script.google.com/macros/s/…"
            style={{
              flex: 1, padding: "10px 12px", borderRadius: 12,
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.85)",
              fontSize: 12, fontFamily: "Ubuntu, sans-serif",
              outline: "none", transition: "border-color 200ms",
              userSelect: "text", WebkitUserSelect: "text",
            }}
            onFocus={e => (e.target.style.borderColor = "rgba(233,84,32,0.5)")}
            onBlur={e  => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
          />
          <button
            type="button"
            onClick={handleSaveUrl}
            style={{
              padding: "10px 14px", borderRadius: 12, minHeight: 44,
              background: urlSaved ? "rgba(76,175,80,0.2)" : "rgba(233,84,32,0.18)",
              border: `1px solid ${urlSaved ? "rgba(76,175,80,0.4)" : "rgba(233,84,32,0.35)"}`,
              color: urlSaved ? "#4CAF50" : "#E95420",
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              fontFamily: "Ubuntu, sans-serif", transition: "all 150ms",
            }}
          >
            {urlSaved ? "✓ Uloženo" : "Uložit"}
          </button>
        </div>
        <p style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 6