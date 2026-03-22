// ─── src/components/ContentManager.tsx ───────────────────────────────────
//
// Unified editor obsahu pro jeden piktogram.
// Sekce:
//   1. Vlastní obrázek – nahrání souboru nebo kamera
//   2. Vlastní audio   – nahrávání hlasu (max 3 sekundy)
//   3. VOKS kategorie  – barevný rámeček
//   4. Vlastní label   – přepsání textu pod obrázkem

import {
  useState, useRef, useEffect, useCallback,
  type ChangeEvent,
} from "react";
import {
  saveCustomImage, loadCustomImage, deleteCustomImage,
  saveCustomAudio, loadCustomAudio, deleteCustomAudio,
  saveMeta, loadMeta,
} from "../services/contentStorage";
import { processImage, captureFromVideo, validateImageFile } from "../services/imageProcessor";
import { VOKS_META, VOKS_ORDER, type VoksCategory } from "../types/voksTypes";
import { logInfo, logError, logWarn } from "../services/errorLogger";

// ── Props ──────────────────────────────────────────────────────────────────
export interface ContentManagerProps {
  pictogramId:  number;
  defaultLabel: string;
  profileId?:   string;
  onClose:      () => void;
  onSaved?:     () => void;   // callback po uložení (pro re-render karty)
}

// ── Sekce tab ─────────────────────────────────────────────────────────────
type Tab = "image" | "audio" | "voks";

// ── Komponenta ────────────────────────────────────────────────────────────
export default function ContentManager({
  pictogramId, defaultLabel, profileId, onClose, onSaved,
}: ContentManagerProps) {

  // ── State ──────────────────────────────────────────────────────────────
  const [tab,          setTab]          = useState<Tab>("image");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [hasImage,     setHasImage]     = useState(false);
  const [imageError,   setImageError]   = useState<string | null>(null);
  const [imageSaving,  setImageSaving]  = useState(false);

  const [audioUrl,     setAudioUrl]     = useState<string | null>(null);
  const [hasAudio,     setHasAudio]     = useState(false);
  const [recState,     setRecState]     = useState<"idle"|"recording"|"done"|"error">("idle");
  const [recElapsed,   setRecElapsed]   = useState(0);

  const [voksCategory, setVoksCategory] = useState<VoksCategory>("misc");
  const [customLabel,  setCustomLabel]  = useState(defaultLabel);
  const [metaSaving,   setMetaSaving]   = useState(false);
  const [metaSaved,    setMetaSaved]    = useState(false);

  const [cameraMode,   setCameraMode]   = useState(false);
  const [cameraReady,  setCameraReady]  = useState(false);
  const [cameraError,  setCameraError]  = useState<string | null>(null);

  // ── Refs ───────────────────────────────────────────────────────────────
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const videoRef       = useRef<HTMLVideoElement>(null);
  const streamRef      = useRef<MediaStream | null>(null);
  const recorderRef    = useRef<MediaRecorder | null>(null);
  const chunksRef      = useRef<BlobPart[]>([]);
  const recTimerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const recStartRef    = useRef(0);

  // ── Načtení existujícího obsahu ────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const [imgUrl, audUrl, meta] = await Promise.all([
        loadCustomImage(pictogramId, profileId),
        loadCustomAudio(pictogramId, profileId),
        loadMeta(pictogramId),
      ]);
      if (imgUrl) { setImagePreview(imgUrl); setHasImage(true); }
      if (audUrl) { setAudioUrl(audUrl); setHasAudio(true); }
      if (meta) {
        setVoksCategory(meta.voksCategory ?? "misc");
        setCustomLabel(meta.customLabel ?? defaultLabel);
      }
    })();
  }, [pictogramId, profileId, defaultLabel]);

  // ── Cleanup kamera při unmount ─────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopCamera();
      if (recTimerRef.current) clearInterval(recTimerRef.current);
    };
  }, []);

  // ════════════════════════════════════════════════════════════════════════
  // IMAGE
  // ════════════════════════════════════════════════════════════════════════

  const handleFileSelect = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = validateImageFile(file);
    if (!validation.ok) { setImageError(validation.error!); return; }

    setImageError(null);
    setImageSaving(true);
    try {
      const preview = URL.createObjectURL(file);
      setImagePreview(preview);
      const processed = await processImage(file);
      await saveCustomImage(pictogramId, processed, profileId);
      setHasImage(true);
      logInfo("app", `Custom image saved for pictogram ${pictogramId}`);
    } catch (err) {
      setImageError("Zpracování obrázku selhalo. Zkus jiný soubor.");
      logError("app", "handleFileSelect failed", err);
    } finally {
      setImageSaving(false);
      e.target.value = "";   // reset input
    }
  }, [pictogramId, profileId]);

  const handleDeleteImage = useCallback(async () => {
    await deleteCustomImage(pictogramId, profileId);
    setImagePreview(null);
    setHasImage(false);
    logInfo("app", `Custom image deleted for pictogram ${pictogramId}`);
  }, [pictogramId, profileId]);

  // ── Kamera ──────────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setCameraError(null);
    setCameraMode(true);
    setCameraReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCameraReady(true);
        };
      }
    } catch (err: any) {
      const msg = err.name === "NotAllowedError"
        ? "Přístup ke kameře zamítnut."
        : "Kamera není dostupná.";
      setCameraError(msg);
      logWarn("app", "startCamera failed", err);
      setCameraMode(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraMode(false);
    setCameraReady(false);
  }, []);

  const handleCapture = useCallback(async () => {
    if (!videoRef.current || !cameraReady) return;
    setImageSaving(true);
    try {
      const blob    = await captureFromVideo(videoRef.current);
      const preview = URL.createObjectURL(blob);
      setImagePreview(preview);
      await saveCustomImage(pictogramId, blob, profileId);
      setHasImage(true);
      stopCamera();
      logInfo("app", `Camera capture saved for pictogram ${pictogramId}`);
    } catch (err) {
      setCameraError("Zachycení snímku selhalo.");
      logError("app", "handleCapture failed", err);
    } finally {
      setImageSaving(false);
    }
  }, [pictogramId, profileId, cameraReady, stopCamera]);

  // ════════════════════════════════════════════════════════════════════════
  // AUDIO (max 3 sekundy)
  // ════════════════════════════════════════════════════════════════════════

  const MAX_REC_MS = 3000;

  const startRecording = useCallback(async () => {
    setRecState("idle");
    chunksRef.current = [];
    setRecElapsed(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: {
        echoCancellation: true, noiseSuppression: true, channelCount: 1,
      }});

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (recTimerRef.current) { clearInterval(recTimerRef.current); recTimerRef.current = null; }

        const blob = new Blob(chunksRef.current, { type: mimeType });
        try {
          await saveCustomAudio(pictogramId, blob, profileId);
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);
          setHasAudio(true);
          setRecState("done");
        } catch (err) {
          setRecState("error");
          logError("app", "saveCustomAudio failed", err);
        }
      };

      recorder.onerror = () => { setRecState("error"); stream.getTracks().forEach(t => t.stop()); };

      recorder.start(100);
      recStartRef.current = Date.now();
      setRecState("recording");

      // Live elapsed
      recTimerRef.current = setInterval(() => {
        const elapsed = Date.now() - recStartRef.current;
        setRecElapsed(elapsed);
        if (elapsed >= MAX_REC_MS) stopRecording();
      }, 100);

      // Auto-stop po 3s
      setTimeout(() => { if (recorderRef.current?.state === "recording") stopRecording(); }, MAX_REC_MS);

    } catch (err: any) {
      const msg = err.name === "NotAllowedError" ? "Mikrofon zamítnut." : "Mikrofon není dostupný.";
      setRecState("error");
      logWarn("app", "startRecording failed", err);
    }
  }, [pictogramId, profileId]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
    if (recTimerRef.current) { clearInterval(recTimerRef.current); recTimerRef.current = null; }
  }, []);

  const handleDeleteAudio = useCallback(async () => {
    await deleteCustomAudio(pictogramId, profileId);
    setAudioUrl(null);
    setHasAudio(false);
    setRecState("idle");
  }, [pictogramId, profileId]);

  // ════════════════════════════════════════════════════════════════════════
  // META (VOKS + custom label)
  // ════════════════════════════════════════════════════════════════════════

  const handleSaveMeta = useCallback(async () => {
    setMetaSaving(true);
    try {
      await saveMeta(pictogramId, {
        voksCategory: voksCategory,
        customLabel:  customLabel.trim() || undefined,
      });
      setMetaSaved(true);
      setTimeout(() => setMetaSaved(false), 2000);
      onSaved?.();
    } catch (err) {
      logError("app", "saveMeta failed", err);
    } finally {
      setMetaSaving(false);
    }
  }, [pictogramId, voksCategory, customLabel, onSaved]);

  // ════════════════════════════════════════════════════════════════════════
  // UI helpers
  // ════════════════════════════════════════════════════════════════════════

  const recProgress = Math.min(recElapsed / MAX_REC_MS, 1);
  const R = 28, C = 2 * Math.PI * R;

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position:"fixed", inset:0, zIndex:90, background:"rgba(0,0,0,0.65)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)" }}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Editor obsahu: ${defaultLabel}`}
        style={{
          position: "fixed",
          bottom: 0, left: 0, right: 0,
          zIndex: 91,
          maxHeight: "90dvh",
          borderRadius: "24px 24px 0 0",
          background: "rgba(18,2,12,0.98)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderBottom: "none",
          boxShadow: "0 -16px 40px rgba(0,0,0,0.6)",
          display: "flex", flexDirection: "column",
          fontFamily: "Ubuntu, sans-serif",
          animation: "slideUp 280ms cubic-bezier(0.34,1.56,0.64,1) both",
        }}
      >
        <style>{`
          @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: none; opacity: 1; } }
          @keyframes recPulse { 0%,100%{opacity:1} 50%{opacity:.4} }
          input[type=range] { -webkit-appearance: none; appearance: none; }
        `}</style>

        {/* Header */}
        <div style={{ padding:"16px 20px 12px", borderBottom:"1px solid rgba(255,255,255,0.08)", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <h2 style={{ fontSize:16, fontWeight:700, margin:0, color:"#fff" }}>✏️ Editor obsahu</h2>
            <p style={{ fontSize:11, color:"rgba(255,255,255,0.35)", margin:"3px 0 0" }}>{defaultLabel} · ID {pictogramId}</p>
          </div>
          <button
            type="button" onClick={onClose} data-compact
            style={{ width:34, height:34, borderRadius:"50%", background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)", color:"rgba(255,255,255,0.6)", fontSize:15, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", minWidth:34, minHeight:34, transition:"background 150ms" }}
            onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,255,255,0.14)")}
            onMouseLeave={e=>(e.currentTarget.style.background="rgba(255,255,255,0.07)")}
          >✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", padding:"10px 20px 0", gap:4, flexShrink:0 }}>
          {([
            ["image", "🖼️", "Obrázek"],
            ["audio", "🎙️", "Hlas"],
            ["voks",  "🎨", "VOKS"],
          ] as [Tab, string, string][]).map(([t, icon, label]) => (
            <button
              key={t} type="button" onClick={() => setTab(t)}
              style={{
                flex: 1, padding:"9px 0", borderRadius:"12px 12px 0 0",
                background: tab===t ? "rgba(255,255,255,0.06)" : "transparent",
                border: tab===t ? "1px solid rgba(255,255,255,0.1)" : "1px solid transparent",
                borderBottom: tab===t ? "1px solid rgba(18,2,12,1)" : "1px solid transparent",
                color: tab===t ? "#E95420" : "rgba(255,255,255,0.4)",
                fontSize:12, fontWeight: tab===t ? 700 : 400, cursor:"pointer",
                display:"flex", alignItems:"center", justifyContent:"center", gap:5,
                transition:"all 180ms", fontFamily:"Ubuntu, sans-serif", minHeight:42,
              }}
            >
              <span>{icon}</span> {label}
            </button>
          ))}
        </div>

        {/* Obsah */}
        <div style={{ flex:1, overflowY:"auto", padding:"16px 20px 24px", scrollbarWidth:"none" }}>

          {/* ── TAB: OBRÁZEK ───────────────────────────────────────── */}
          {tab === "image" && (
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

              {/* Preview nebo kamera */}
              {cameraMode ? (
                <div style={{ position:"relative", borderRadius:16, overflow:"hidden", background:"#000", aspectRatio:"1", maxWidth:320, margin:"0 auto" }}>
                  <video ref={videoRef} playsInline muted style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}/>
                  {!cameraReady && (
                    <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.6)" }}>
                      <span style={{ color:"rgba(255,255,255,0.5)", fontSize:13 }}>Načítání kamery…</span>
                    </div>
                  )}
                  {/* Mřížka */}
                  <div style={{ position:"absolute", inset:0, pointerEvents:"none", border:"1px solid rgba(255,255,255,0.2)", background:"linear-gradient(rgba(255,255,255,0.05) 1px,transparent 1px) 0 33.33%/100% 33.33%, linear-gradient(90deg,rgba(255,255,255,0.05) 1px,transparent 1px) 33.33% 0/33.33% 100%" }}/>
                </div>
              ) : imagePreview ? (
                <div style={{ position:"relative", borderRadius:16, overflow:"hidden", maxWidth:200, margin:"0 auto" }}>
                  <img src={imagePreview} alt="Náhled" style={{ width:"100%", aspectRatio:"1", objectFit:"cover", display:"block", borderRadius:16 }}/>
                  <div style={{ position:"absolute", top:8, right:8, display:"flex", gap:6 }}>
                    <span style={{ padding:"3px 8px", borderRadius:999, background:"rgba(0,0,0,0.6)", color:"#4CAF50", fontSize:10, fontWeight:700 }}>✓ Uloženo</span>
                  </div>
                </div>
              ) : (
                <div style={{ borderRadius:16, background:"rgba(255,255,255,0.04)", border:"2px dashed rgba(255,255,255,0.12)", aspectRatio:"1", maxWidth:200, margin:"0 auto", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10, color:"rgba(255,255,255,0.3)" }}>
                  <span style={{ fontSize:36 }}>🖼️</span>
                  <span style={{ fontSize:12, textAlign:"center", lineHeight:1.4 }}>Zatím žádný<br/>vlastní obrázek</span>
                </div>
              )}

              {/* Chyba */}
              {(imageError || cameraError) && (
                <div style={{ padding:"10px 14px", borderRadius:12, background:"rgba(255,50,50,0.1)", border:"1px solid rgba(255,80,80,0.3)", color:"rgba(255,120,120,0.9)", fontSize:12 }}>
                  ⚠️ {imageError || cameraError}
                </div>
              )}

              {/* Akce */}
              {cameraMode ? (
                <div style={{ display:"flex", gap:10 }}>
                  <button
                    type="button" onClick={handleCapture} disabled={!cameraReady || imageSaving}
                    style={{ flex:2, padding:"13px 0", borderRadius:14, background:"#E95420", border:"none", color:"#fff", fontSize:14, fontWeight:700, cursor:cameraReady?"pointer":"default", opacity:cameraReady?1:.5, fontFamily:"Ubuntu,sans-serif", transition:"opacity 150ms", minHeight:52, boxShadow:"0 0 20px rgba(233,84,32,0.4)" }}
                  >
                    📷 Vyfotit
                  </button>
                  <button
                    type="button" onClick={stopCamera}
                    style={{ flex:1, padding:"13px 0", borderRadius:14, background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.15)", color:"rgba(255,255,255,0.6)", fontSize:13, cursor:"pointer", fontFamily:"Ubuntu,sans-serif", minHeight:52 }}
                  >
                    Zrušit
                  </button>
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {/* Nahrát soubor */}
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} style={{ display:"none" }}/>
                  <button
                    type="button" onClick={() => fileInputRef.current?.click()} disabled={imageSaving}
                    style={{ padding:"13px 0", borderRadius:14, background:imageSaving?"rgba(255,255,255,0.05)":"rgba(233,84,32,0.15)", border:"1px solid rgba(233,84,32,0.35)", color:"#E95420", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"Ubuntu,sans-serif", minHeight:48, display:"flex", alignItems:"center", justifyContent:"center", gap:8, transition:"all 150ms" }}
                  >
                    {imageSaving ? "Ukládám…" : "📁 Nahrát ze souboru"}
                  </button>

                  {/* Kamera */}
                  {"mediaDevices" in navigator && (
                    <button
                      type="button" onClick={startCamera} disabled={imageSaving}
                      style={{ padding:"13px 0", borderRadius:14, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.15)", color:"rgba(255,255,255,0.7)", fontSize:13, cursor:"pointer", fontFamily:"Ubuntu,sans-serif", minHeight:48, display:"flex", alignItems:"center", justifyContent:"center", gap:8, transition:"all 150ms" }}
                    >
                      📷 Použít kameru
                    </button>
                  )}

                  {/* Smazat */}
                  {hasImage && (
                    <button
                      type="button" onClick={handleDeleteImage}
                      style={{ padding:"10px 0", borderRadius:14, background:"rgba(255,50,50,0.08)", border:"1px solid rgba(255,80,80,0.25)", color:"rgba(255,120,120,0.8)", fontSize:12, cursor:"pointer", fontFamily:"Ubuntu,sans-serif", minHeight:44, transition:"all 150ms" }}
                    >
                      🗑️ Smazat vlastní obrázek
                    </button>
                  )}
                </div>
              )}

              <p style={{ fontSize:10, color:"rgba(255,255,255,0.25)", lineHeight:1.6, margin:0 }}>
                Obrázek bude automaticky oříznut na čtverec a zmenšen na max 500px.
              </p>
            </div>
          )}

          {/* ── TAB: AUDIO ─────────────────────────────────────────── */}
          {tab === "audio" && (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:20 }}>

              {/* Kruhový progress nahrávání */}
              <div style={{ position:"relative", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <svg width={72} height={72} viewBox="0 0 72 72" style={{ transform:"rotate(-90deg)" }} aria-hidden="true">
                  <circle cx="36" cy="36" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4"/>
                  {recState === "recording" && (
                    <circle cx="36" cy="36" r={R} fill="none" stroke="#E95420" strokeWidth="4" strokeLinecap="round"
                      strokeDasharray={C} strokeDashoffset={C * (1 - recProgress)}
                      style={{ transition:"stroke-dashoffset 80ms linear" }}
                    />
                  )}
                  {recState === "done" && (
                    <circle cx="36" cy="36" r={R} fill="none" stroke="#4CAF50" strokeWidth="4" strokeDasharray={C} strokeDashoffset={0}/>
                  )}
                </svg>
                <div style={{ position:"absolute", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  {recState === "idle"      && <span style={{ fontSize:28 }}>🎙️</span>}
                  {recState === "recording" && <span style={{ fontSize:20, animation:"recPulse 800ms ease infinite", color:"#E95420" }}>⏺</span>}
                  {recState === "done"      && <span style={{ fontSize:24 }}>✅</span>}
                  {recState === "error"     && <span style={{ fontSize:24 }}>⚠️</span>}
                </div>
              </div>

              {/* Status text */}
              <div style={{ textAlign:"center" }}>
                {recState === "idle" && (
                  <p style={{ fontSize:14, color:"rgba(255,255,255,0.6)", margin:0 }}>
                    {hasAudio ? "Existuje nahrávka – nahraj novou nebo smaž" : "Připraven k nahrávání"}
                  </p>
                )}
                {recState === "recording" && (
                  <p style={{ fontSize:14, fontWeight:700, color:"#E95420", margin:0, animation:"recPulse 800ms ease infinite" }}>
                    NAHRÁVÁM {(recElapsed / 1000).toFixed(1)}s / 3.0s
                  </p>
                )}
                {recState === "done" && (
                  <p style={{ fontSize:14, color:"#4CAF50", margin:0, fontWeight:600 }}>
                    Uloženo! Délka: {(recElapsed / 1000).toFixed(1)}s
                  </p>
                )}
                {recState === "error" && (
                  <p style={{ fontSize:13, color:"rgba(255,100,100,0.9)", margin:0 }}>
                    Chyba nahrávání – zkontroluj povolení mikrofonu
                  </p>
                )}
              </div>

              {/* Přehrát existující */}
              {audioUrl && recState !== "recording" && (
                <audio controls src={audioUrl} style={{ width:"100%", borderRadius:12, opacity:0.9 }}/>
              )}

              {/* Akce */}
              <div style={{ display:"flex", flexDirection:"column", gap:10, width:"100%" }}>
                {recState === "recording" ? (
                  <button
                    type="button" onClick={stopRecording}
                    style={{ padding:"13px 0", borderRadius:14, background:"rgba(233,84,32,0.2)", border:"2px solid #E95420", color:"#E95420", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"Ubuntu,sans-serif", minHeight:52 }}
                  >
                    ⏹ Zastavit
                  </button>
                ) : (
                  <button
                    type="button" onClick={startRecording}
                    style={{ padding:"13px 0", borderRadius:14, background:"#E95420", border:"none", color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"Ubuntu,sans-serif", minHeight:52, boxShadow:"0 0 20px rgba(233,84,32,0.4)", transition:"opacity 150ms" }}
                  >
                    🎙️ {hasAudio ? "Přenahrát (3s)" : "Nahrát hlas (3s)"}
                  </button>
                )}
                {hasAudio && recState !== "recording" && (
                  <button
                    type="button" onClick={handleDeleteAudio}
                    style={{ padding:"10px 0", borderRadius:14, background:"rgba(255,50,50,0.08)", border:"1px solid rgba(255,80,80,0.25)", color:"rgba(255,120,120,0.8)", fontSize:12, cursor:"pointer", fontFamily:"Ubuntu,sans-serif", minHeight:44 }}
                  >
                    🗑️ Smazat nahrávku
                  </button>
                )}
              </div>

              <p style={{ fontSize:10, color:"rgba(255,255,255,0.25)", lineHeight:1.6, margin:0, textAlign:"center" }}>
                Max 3 sekundy · mono · WebM/Opus<br/>
                Uloženo v IndexedDB tohoto zařízení
              </p>
            </div>
          )}

          {/* ── TAB: VOKS ──────────────────────────────────────────── */}
          {tab === "voks" && (
            <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

              {/* Vlastní label */}
              <div>
                <label style={{ display:"block", fontSize:11, fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", color:"rgba(255,255,255,0.35)", marginBottom:8 }}>
                  Popisek karty
                </label>
                <input
                  type="text"
                  value={customLabel}
                  onChange={e => setCustomLabel(e.target.value.slice(0, 40))}
                  maxLength={40}
                  placeholder={defaultLabel}
                  style={{ width:"100%", padding:"11px 14px", borderRadius:12, background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.15)", color:"#fff", fontSize:14, fontFamily:"Ubuntu,sans-serif", outline:"none", userSelect:"text", WebkitUserSelect:"text", transition:"border-color 200ms" }}
                  onFocus={e => (e.target.style.borderColor = "rgba(233,84,32,0.5)")}
                  onBlur={e  => (e.target.style.borderColor = "rgba(255,255,255,0.15)")}
                />
                {customLabel !== defaultLabel && (
                  <button type="button" onClick={() => setCustomLabel(defaultLabel)}
                    style={{ marginTop:6, fontSize:10, color:"rgba(255,255,255,0.3)", background:"none", border:"none", cursor:"pointer", fontFamily:"Ubuntu,sans-serif" }}>
                    ↩ Obnovit původní
                  </button>
                )}
              </div>

              {/* VOKS kategorie */}
              <div>
                <label style={{ display:"block", fontSize:11, fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", color:"rgba(255,255,255,0.35)", marginBottom:10 }}>
                  VOKS kategorie (barva rámečku)
                </label>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  {VOKS_ORDER.map(cat => {
                    const meta   = VOKS_META[cat];
                    const active = voksCategory === cat;
                    return (
                      <button
                        key={cat} type="button" onClick={() => setVoksCategory(cat)}
                        style={{
                          padding:"12px 10px", borderRadius:14, cursor:"pointer",
                          background: active ? meta.colorDim : "rgba(255,255,255,0.04)",
                          border: `${active ? "3px" : "1px"} solid ${active ? meta.color : "rgba(255,255,255,0.1)"}`,
                          boxShadow: active ? `0 0 14px ${meta.colorGlow}` : "none",
                          display:"flex", alignItems:"center", gap:10,
                          transition:"all 200ms", fontFamily:"Ubuntu,sans-serif",
                          minHeight:56,
                        }}
                      >
                        <div style={{ width:24, height:24, borderRadius:"50%", background:meta.color, flexShrink:0, boxShadow: active ? `0 0 8px ${meta.colorGlow}` : "none" }}/>
                        <div style={{ textAlign:"left" }}>
                          <div style={{ fontSize:12, fontWeight: active ? 700 : 500, color: active ? meta.color : "rgba(255,255,255,0.75)", lineHeight:1.2 }}>
                            {meta.label}
                          </div>
                          <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)", marginTop:2 }}>
                            {meta.description}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Preview borderu */}
              <div style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 16px", borderRadius:14, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)" }}>
                <div style={{
                  width:60, height:60, borderRadius:16, flexShrink:0,
                  background:"rgba(255,255,255,0.06)",
                  border: voksCategory === "misc"
                    ? "4px solid rgba(255,255,255,0.15)"
                    : `4px solid ${VOKS_META[voksCategory].color}`,
                  boxShadow: voksCategory !== "misc" ? `0 0 12px ${VOKS_META[voksCategory].colorGlow}` : "none",
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:24,
                  transition:"all 250ms",
                }}>
                  🖼️
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:"#fff", marginBottom:3 }}>{customLabel || defaultLabel}</div>
                  <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)" }}>
                    VOKS: <span style={{ color:VOKS_META[voksCategory].color, fontWeight:600 }}>{VOKS_META[voksCategory].label}</span>
                    {" · "}{VOKS_META[voksCategory].emoji}
                  </div>
                </div>
              </div>

              {/* Uložit */}
              <button
                type="button" onClick={handleSaveMeta} disabled={metaSaving}
                style={{
                  padding:"13px 0", borderRadius:14, minHeight:52,
                  background: metaSaved ? "rgba(76,175,80,0.2)" : "rgba(233,84,32,0.18)",
                  border: `1px solid ${metaSaved ? "rgba(76,175,80,0.5)" : "rgba(233,84,32,0.4)"}`,
                  color: metaSaved ? "#4CAF50" : "#E95420",
                  fontSize:14, fontWeight:700, cursor:"pointer",
                  fontFamily:"Ubuntu,sans-serif", transition:"all 200ms",
                  boxShadow: metaSaved ? "0 0 16px rgba(76,175,80,0.3)" : "0 0 16px rgba(233,84,32,0.25)",
                }}
              >
                {metaSaving ? "Ukládám…" : metaSaved ? "✓ Uloženo" : "Uložit VOKS a popisek"}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
