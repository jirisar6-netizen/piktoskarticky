// ─── src/components/ErrorBoundary.tsx ────────────────────────────────────
//
// React Error Boundary – zachytí JS chyby v podstromu komponent.
// Zobrazí Ubuntu-styled crash screen místo prázdné bílé obrazovky.
//
// Funkce:
//   • Restart tlačítko (window.location.reload)
//   • "Zpět na Dashboard" tlačítko
//   • Rozbalitelný detail chyby pro vývojáře
//   • Automatické logování do errorLogger

import { Component, type ErrorInfo, type ReactNode } from "react";
import { logFatal, getLog, clearLog, type LogEntry } from "../services/errorLogger";

// ── Props / State ──────────────────────────────────────────────────────────
interface Props {
  children:    ReactNode;
  /** Volitelný fallback místo výchozí crash screen */
  fallback?:   ReactNode;
  /** Název oblasti pro lepší diagnostiku (např. "SmartBar", "Grid") */
  name?:       string;
}

interface State {
  hasError:      boolean;
  error:         Error | null;
  errorInfo:     ErrorInfo | null;
  showDetail:    boolean;
  showLog:       boolean;
  logEntries:    LogEntry[];
  logCleared:    boolean;
}

// ── Crash Screen komponenta ────────────────────────────────────────────────
// Oddělená pro čitelnost – renderuje se mimo class komponentu
function CrashScreen({
  error, errorInfo, name, showDetail, showLog, logEntries, logCleared,
  onToggleDetail, onToggleLog, onRestart, onHome, onClearLog,
}: {
  error:         Error | null;
  errorInfo:     ErrorInfo | null;
  name?:         string;
  showDetail:    boolean;
  showLog:       boolean;
  logEntries:    LogEntry[];
  logCleared:    boolean;
  onToggleDetail: () => void;
  onToggleLog:   () => void;
  onRestart:     () => void;
  onHome:        () => void;
  onClearLog:    () => void;
}) {
  const areaLabel = name ? `(${name})` : "";

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        position:    "fixed", inset: 0,
        background:  "linear-gradient(160deg, #2a0a0a 0%, #1a0505 50%, #0f0202 100%)",
        display:     "flex", flexDirection: "column",
        alignItems:  "center", justifyContent: "center",
        fontFamily:  "Ubuntu, ui-sans-serif, sans-serif",
        color:       "#fff",
        padding:     24,
        overflowY:   "auto",
        zIndex:      9999,
      }}
    >
      {/* Radial glow */}
      <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse at 50% 0%,rgba(180,30,30,0.15) 0%,transparent 65%)", pointerEvents:"none" }}/>

      {/* Obsah */}
      <div style={{ position:"relative", width:"100%", maxWidth:480, display:"flex", flexDirection:"column", gap:20 }}>

        {/* Ikona + název */}
        <div style={{ textAlign:"center" }}>
          {/* PK badge */}
          <div style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:56, height:56, borderRadius:14, background:"#E95420", fontSize:18, fontWeight:700, letterSpacing:"-0.02em", marginBottom:16 }}>
            PK
          </div>
          <h1 style={{ fontSize:22, fontWeight:700, margin:"0 0 6px", letterSpacing:"0.02em" }}>
            Něco se pokazilo {areaLabel}
          </h1>
          <p style={{ fontSize:13, color:"rgba(255,255,255,0.45)", margin:0, lineHeight:1.6 }}>
            Aplikace narazila na neočekávanou chybu.<br/>
            Tvoje data jsou v bezpečí – restart pomůže.
          </p>
        </div>

        {/* Chybová zpráva */}
        {error && (
          <div style={{ padding:"12px 16px", borderRadius:12, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,80,80,0.25)" }}>
            <span style={{ fontSize:11, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:"rgba(255,100,100,0.7)", display:"block", marginBottom:4 }}>
              Chyba
            </span>
            <code style={{ fontSize:12, color:"rgba(255,200,200,0.85)", lineHeight:1.5, fontFamily:"monospace", wordBreak:"break-all" }}>
              {error.name}: {error.message}
            </code>
          </div>
        )}

        {/* Akční tlačítka */}
        <div style={{ display:"flex", gap:10 }}>
          {/* Restart – primární */}
          <button
            type="button"
            onClick={onRestart}
            style={{
              flex:2, padding:"14px 0", borderRadius:14,
              background:"#E95420", border:"none",
              color:"#fff", fontSize:15, fontWeight:700,
              letterSpacing:"0.04em", cursor:"pointer",
              boxShadow:"0 0 24px rgba(233,84,32,0.4)",
              transition:"opacity 150ms",
              minHeight:52,
            }}
            onMouseEnter={e=>(e.currentTarget.style.opacity=".85")}
            onMouseLeave={e=>(e.currentTarget.style.opacity="1")}
          >
            ↻ Restartovat aplikaci
          </button>

          {/* Zpět na Dashboard */}
          <button
            type="button"
            onClick={onHome}
            style={{
              flex:1, padding:"14px 0", borderRadius:14,
              background:"rgba(255,255,255,0.07)",
              border:"1px solid rgba(255,255,255,0.15)",
              color:"rgba(255,255,255,0.7)", fontSize:13, fontWeight:500,
              cursor:"pointer", transition:"all 150ms",
              minHeight:52,
            }}
            onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.12)"; e.currentTarget.style.color="#fff";}}
            onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.07)"; e.currentTarget.style.color="rgba(255,255,255,0.7)";}}
          >
            ← Dashboard
          </button>
        </div>

        {/* Detail pro vývojáře */}
        <div>
          <button
            type="button"
            onClick={onToggleDetail}
            style={{
              width:"100%", padding:"10px 16px", borderRadius:10, cursor:"pointer",
              background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)",
              color:"rgba(255,255,255,0.4)", fontSize:11, fontWeight:500,
              letterSpacing:"0.05em", textTransform:"uppercase",
              display:"flex", alignItems:"center", justifyContent:"space-between",
              transition:"background 150ms", minHeight:44,
            }}
            onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,255,255,0.08)")}
            onMouseLeave={e=>(e.currentTarget.style.background="rgba(255,255,255,0.04)")}
          >
            <span>Stack trace</span>
            <span style={{ transition:"transform 200ms", display:"inline-block", transform: showDetail ? "rotate(180deg)" : "none" }}>▾</span>
          </button>

          {showDetail && errorInfo && (
            <pre style={{
              marginTop:8, padding:"12px 14px", borderRadius:10, overflowX:"auto",
              background:"rgba(0,0,0,0.4)", border:"1px solid rgba(255,255,255,0.08)",
              fontSize:10, lineHeight:1.6, color:"rgba(255,200,200,0.65)",
              fontFamily:"monospace", whiteSpace:"pre-wrap", wordBreak:"break-all",
              maxHeight:200, overflowY:"auto",
            }}>
              {error?.stack}
              {"\n\nComponent Stack:"}
              {errorInfo.componentStack}
            </pre>
          )}
        </div>

        {/* Log viewer */}
        <div>
          <div style={{ display:"flex", gap:8 }}>
            <button
              type="button"
              onClick={onToggleLog}
              style={{
                flex:1, padding:"10px 16px", borderRadius:10, cursor:"pointer",
                background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)",
                color:"rgba(255,255,255,0.4)", fontSize:11, fontWeight:500,
                letterSpacing:"0.05em", textTransform:"uppercase",
                display:"flex", alignItems:"center", justifyContent:"space-between",
                transition:"background 150ms", minHeight:44,
              }}
              onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,255,255,0.08)")}
              onMouseLeave={e=>(e.currentTarget.style.background="rgba(255,255,255,0.04)")}
            >
              <span>Chybový log ({logEntries.length})</span>
              <span style={{ display:"inline-block", transform: showLog ? "rotate(180deg)" : "none", transition:"transform 200ms" }}>▾</span>
            </button>
            {showLog && logEntries.length > 0 && (
              <button
                type="button"
                onClick={onClearLog}
                style={{ padding:"10px 14px", borderRadius:10, cursor:"pointer", background:"rgba(255,50,50,0.1)", border:"1px solid rgba(255,50,50,0.2)", color:"rgba(255,100,100,0.7)", fontSize:11, fontWeight:500, minHeight:44, transition:"all 150ms" }}
                onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,50,50,0.2)")}
                onMouseLeave={e=>(e.currentTarget.style.background="rgba(255,50,50,0.1)")}
              >
                {logCleared ? "✓ Smazán" : "Smazat"}
              </button>
            )}
          </div>

          {showLog && (
            <div style={{ marginTop:8, borderRadius:10, overflow:"hidden", border:"1px solid rgba(255,255,255,0.08)", maxHeight:240, overflowY:"auto", background:"rgba(0,0,0,0.35)" }}>
              {logEntries.length === 0 ? (
                <div style={{ padding:"16px", textAlign:"center", color:"rgba(255,255,255,0.25)", fontSize:12 }}>
                  {logCleared ? "Log byl vymazán." : "Log je prázdný."}
                </div>
              ) : logEntries.map((entry) => (
                <div key={entry.id} style={{
                  padding:"8px 12px", borderBottom:"1px solid rgba(255,255,255,0.05)",
                  display:"flex", gap:8, alignItems:"flex-start",
                }}>
                  <span style={{
                    fontSize:9, fontWeight:700, letterSpacing:"0.06em",
                    padding:"2px 6px", borderRadius:4, flexShrink:0, marginTop:1,
                    background: entry.level==="fatal"||entry.level==="error" ? "rgba(255,80,80,0.2)"
                              : entry.level==="warn" ? "rgba(255,180,50,0.2)" : "rgba(100,180,255,0.15)",
                    color: entry.level==="fatal"||entry.level==="error" ? "rgba(255,120,120,0.9)"
                         : entry.level==="warn" ? "rgba(255,200,80,0.9)" : "rgba(130,200,255,0.8)",
                  }}>
                    {entry.level.toUpperCase()}
                  </span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:11, color:"rgba(255,255,255,0.6)", lineHeight:1.4, wordBreak:"break-word" }}>
                      <span style={{ color:"rgba(255,255,255,0.3)", marginRight:4 }}>[{entry.category}]</span>
                      {entry.message}
                    </div>
                    <div style={{ fontSize:9, color:"rgba(255,255,255,0.2)", marginTop:2 }}>
                      {new Date(entry.timestamp).toLocaleTimeString("cs-CZ")} · {entry.url}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── ErrorBoundary class ────────────────────────────────────────────────────
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError:   false,
      error:      null,
      errorInfo:  null,
      showDetail: false,
      showLog:    false,
      logEntries: [],
      logCleared: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Zaloguj fatální chybu
    logFatal("render", `[${this.props.name ?? "App"}] ${error.message}`, {
      stack:          error.stack,
      componentStack: errorInfo.componentStack,
    });

    this.setState({
      errorInfo,
      logEntries: getLog({ limit: 30 }),
    });
  }

  handleRestart = (): void => {
    window.location.reload();
  };

  handleHome = (): void => {
    // Zachovej URL hash, naviguj na root
    window.location.href = "/";
  };

  handleToggleDetail = (): void => {
    this.setState((s) => ({ showDetail: !s.showDetail }));
  };

  handleToggleLog = (): void => {
    this.setState((s) => ({
      showLog:    !s.showLog,
      logEntries: !s.showLog ? getLog({ limit: 30 }) : s.logEntries,
    }));
  };

  handleClearLog = (): void => {
    clearLog();
    this.setState({ logEntries: [], logCleared: true });
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    // Vlastní fallback
    if (this.props.fallback) {
      return this.props.fallback;
    }

    return (
      <CrashScreen
        error={this.state.error}
        errorInfo={this.state.errorInfo}
        name={this.props.name}
        showDetail={this.state.showDetail}
        showLog={this.state.showLog}
        logEntries={this.state.logEntries}
        logCleared={this.state.logCleared}
        onToggleDetail={this.handleToggleDetail}
        onToggleLog={this.handleToggleLog}
        onRestart={this.handleRestart}
        onHome={this.handleHome}
        onClearLog={this.handleClearLog}
      />
    );
  }
}

// ── HOC wrapper pro funkcionální komponenty ────────────────────────────────
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  name?: string,
): React.ComponentType<P> {
  const Wrapped = (props: P) => (
    <ErrorBoundary name={name ?? Component.displayName ?? Component.name}>
      <Component {...props} />
    </ErrorBoundary>
  );
  Wrapped.displayName = `withErrorBoundary(${name ?? Component.name})`;
  return Wrapped;
}

export default ErrorBoundary;
