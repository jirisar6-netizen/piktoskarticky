// ─── src/components/CloudStatusBadge.tsx ─────────────────────────────────
//
// Ikonka mráčku v top baru s real-time sync statusem.
// Klik → popover s detaily a nastavením Apps Script URL.
//
// Barvy:
//   Zelená   (#4CAF50)  = synced
//   Oranžová (#E95420)  = offline / dirty
//   Šedá                = idle
//   Modrá               = syncing (rotace)
//   Červená             = error

import { useState, useRef, useEffect, useCallback } from "react";
import { useSyncStore } from "../context/SyncProvider";
import type { SyncStatus } from "../services/googleSheets";

// ── Barvy stavů ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<SyncStatus, { color: string; label: string; glow: string }> = {
  idle:    { color: "rgba(255,255,255,0.3)", label: "Čeká",              glow: "none"                         },
  syncing: { color: "#4A9EFF",              label: "Synchronizuje…",     glow: "0 0 8px rgba(74,158,255,0.5)" },
  synced:  { color: "#4CAF50",              label: "Synchronizováno",    glow: "0 0 8px rgba(76,175,80,0.4)"  },
  offline: { color: "#E95420",              label: "Offline",            glow: "0 0 8px rgba(233,84,32,0.4)"  },
  error:   { color: "#FF5252",              label: "Chyba synchronizace",glow: "0 0 8px rgba(255,82,82,0.4)"  },
};

// ── Cloud SVG ikona ────────────────────────────────────────────────────────
function CloudIcon({ color, spinning }: { color: string; spinning: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      style={{ animation: spinning ? "cloudSpin 1.2s linear infinite" : "none",
               transformOrigin: "50% 50%" }}>
      {spinning ? (
        <circle cx="12" cy="12" r="9"
          stroke={color} strokeWidth="2"
          strokeLinecap="round" strokeDasharray="18 38"/>
      ) : (
        <path
          d="M18 10a6 6 0 00-11.28-2A5 5 0 007 18h11a4 4 0 000-8z"
          fill={color} opacity="0.9"
        />
      )}
    </svg>
  );
}

// ── Dirty dot (oranžová tečka indikující neuložené změny) ─────────────────
function DirtyDot() {
  return (
    <span style={{
      position: "absolute", top: -2, right: -2,
      width: 8, height: 8, borderRadius: "50%",
      background: "#E95420",
      border: "1.5px solid #1A0011",
      boxShadow: "0 0 4px rgba(233,84,32,0.8)",
    }} aria-hidden="true"/>
  );
}

// ── Relative time formatter ────────────────────────────────────────────────
function relativeTime(iso: string | null): string {
  if (!iso) return "nikdy";
  const diff = Date.now() - new Date(iso).getTime();
  const m    = Math.floor(diff / 60_000);
  if (m < 1)  return "právě teď";
  if (m < 60) return `před ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `před ${h} hod`;
  return `před ${Math.floor(h / 24)} dny`;
}

// ── Hlavní komponenta ──────────────────────────────────────────────────────
export default function CloudStatusBadge() {
  const [open, setOpen] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [urlSaved, setUrlSaved] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const btnRef     = useRef<HTMLButtonElement>(null);

  const {
    status, lastSyncedAt, errorMessage, isDirty, rows,
    pullFromCloud, pushToCloud,
    scriptUrl, setScriptUrl,
  } = useSyncStore();

  const cfg = STATUS_CONFIG[isDirty && status === "synced" ? "offline" : status];
  // Efektivní status pro zobrazení
  const effectiveStatus: SyncStatus =
    isDirty && (status === "synced" || status === "idle") ? "offline" : status;
  const effectiveCfg = STATUS_CONFIG[effectiveStatus];

  // Inicializace URL inputu
  useEffect(() => { setUrlInput(scriptUrl); }, [scriptUrl]);

  // Zavři popover při kliknutí mimo
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        btnRef.current    && !btnRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleSaveUrl = useCallback(() => {
    setScriptUrl(urlInput.trim());
    setUrlSaved(true);
    setTimeout(() => setUrlSaved(false), 2000);
  }, [urlInput, setScriptUrl]);

  const handleSync = useCallback(async () => {
    if (isDirty) await pushToCloud();
    else         await pullFromCloud();
  }, [isDirty, pushToCloud, pullFromCloud]);

  return (
    <div style={{ position: "relative" }}>
      <style>{`
        @keyframes cloudSpin { to { transform: rotate(360deg); } }
        @keyframes popIn { from { opacity:0; transform: scale(0.92) translateY(-4px); } to { opacity:1; transform: scale(1) translateY(0); } }
      `}</style>

      {/* ── Tlačítko mráčku ─────────────────────────────────────── */}
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Synchronizace – ${effectiveCfg.label}`}
        aria-expanded={open}
        style={{
          position: "relative",
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 34, height: 34, borderRadius: "50%",
          background: open ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.05)",
          border: `1px solid ${effectiveCfg.color}40`,
          boxShadow: effectiveCfg.glow,
          cursor: "pointer",
          transition: "all 200ms ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = open ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.05)")}
      >
        <CloudIcon color={effectiveCfg.color} spinning={status === "syncing"} />
        {(isDirty || effectiveStatus === "offline" || effectiveStatus === "error") && (
          <DirtyDot />
        )}
      </button>

      {/* ── Popover ──────────────────────────────────────────────── */}
      {open && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Nastavení synchronizace"
          style={{
            position: "absolute",
            top: "calc(100% + 10px)",
            right: 0,
            width: 280,
            borderRadius: 16,
            background: "rgba(26,0,17,0.97)",
            border: "1px solid rgba(255,255,255,0.12)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
            padding: "14px 16px 16px",
            zIndex: 50,
            animation: "popIn 180ms ease forwards",
            fontFamily: "Ubuntu, sans-serif",
          }}
        >
          {/* Hlavička */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
            <span style={{ fontSize:12, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:"rgba(255,255,255,0.5)" }}>
              Cloud Sync
            </span>
            <button onClick={()=>setOpen(false)} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.3)", cursor:"pointer", fontSize:14, padding:"0 2px", lineHeight:1, fontFamily:"Ubuntu,sans-serif" }}>✕</button>
          </div>

          {/* Status řádek */}
          <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 12px", borderRadius:10, background:"rgba(255,255,255,0.04)", marginBottom:12 }}>
            <span style={{ width:8, height:8, borderRadius:"50%", background:effectiveCfg.color, flexShrink:0, boxShadow:effectiveCfg.glow }} aria-hidden="true"/>
            <div>
              <div style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,0.85)" }}>{effectiveCfg.label}</div>
              {lastSyncedAt && (
                <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", marginTop:1 }}>
                  Poslední sync: {relativeTime(lastSyncedAt)} · {rows.length} položek
                </div>
              )}
              {errorMessage && !["synced","offline"].includes(effectiveStatus) && (
                <div style={{ fontSize:10, color:"rgba(255,100,100,0.8)", marginTop:2 }}>{errorMessage}</div>
              )}
            </div>
          </div>

          {/* Sync tlačítko */}
          <button
            type="button"
            onClick={handleSync}
            disabled={status === "syncing"}
            style={{
              width:"100%", padding:"9px 0", borderRadius:10, marginBottom:14,
              background: isDirty ? "rgba(233,84,32,0.2)" : "rgba(76,175,80,0.15)",
              border: `1px solid ${isDirty ? "rgba(233,84,32,0.4)" : "rgba(76,175,80,0.3)"}`,
              color: isDirty ? "#E95420" : "#4CAF50",
              fontSize:12, fontWeight:600, cursor: status==="syncing" ? "default" : "pointer",
              opacity: status==="syncing" ? 0.6 : 1,
              fontFamily:"Ubuntu,sans-serif", letterSpacing:"0.04em",
              transition:"all 150ms",
            }}
          >
            {status === "syncing" ? "Synchronizuji…" : isDirty ? "⬆ Nahrát změny" : "↻ Aktualizovat"}
          </button>

          {/* Oddělovač */}
          <div style={{ borderTop:"1px solid rgba(255,255,255,0.07)", marginBottom:12 }}/>

          {/* Apps Script URL nastavení */}
          <div>
            <label style={{ fontSize:10, fontWeight:600, letterSpacing:"0.07em", textTransform:"uppercase", color:"rgba(255,255,255,0.35)", display:"block", marginBottom:6 }}>
              Apps Script URL
            </label>
            <div style={{ display:"flex", gap:6 }}>
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://script.google.com/macros/s/..."
                style={{
                  flex:1, padding:"7px 10px", borderRadius:8, fontSize:11,
                  background:"rgba(255,255,255,0.06)",
                  border:"1px solid rgba(255,255,255,0.12)",
                  color:"rgba(255,255,255,0.8)",
                  fontFamily:"Ubuntu,sans-serif",
                  outline:"none",
                }}
                onFocus={(e) => (e.target.style.borderColor = "rgba(233,84,32,0.5)")}
                onBlur={(e)  => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
              />
              <button
                type="button"
                onClick={handleSaveUrl}
                style={{
                  padding:"7px 10px", borderRadius:8, flexShrink:0,
                  background: urlSaved ? "rgba(76,175,80,0.25)" : "rgba(233,84,32,0.2)",
                  border: `1px solid ${urlSaved ? "rgba(76,175,80,0.4)" : "rgba(233,84,32,0.35)"}`,
                  color: urlSaved ? "#4CAF50" : "#E95420",
                  fontSize:11, fontWeight:600, cursor:"pointer",
                  fontFamily:"Ubuntu,sans-serif", transition:"all 150ms",
                }}
              >
                {urlSaved ? "✓" : "Uložit"}
              </button>
            </div>
            <p style={{ fontSize:9, color:"rgba(255,255,255,0.2)", marginTop:6, lineHeight:1.6 }}>
              Nasaď Apps Script z Google Sheets → Rozšíření → Apps Script.
              Kód najdeš v <code style={{color:"rgba(233,84,32,0.6)"}}>docs/apps-script-proxy.js</code>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
