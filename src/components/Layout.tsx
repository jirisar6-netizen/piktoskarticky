// ─── src/components/Layout.tsx  (v2) ─────────────────────────────────────
import { useState, useEffect, useRef } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import CloudStatusBadge    from "./CloudStatusBadge";
import { IconGate }        from "./ParentalGate";
import LanguageSwitcher     from "./LanguageSwitcher";
import AboutProject, { InfoButton } from "./AboutProject";
import { useLanguage }     from "../context/LanguageContext";

const NAV_ITEMS = [
  { to: "/",      label: "Dashboard",   shortLabel: "↗" },
  { to: "/app",   label: "Komunikátor", shortLabel: "◈" },
  { to: "/sos",   label: "SOS",         shortLabel: "⚡" },
  { to: "/about", label: "O projektu",  shortLabel: "?" },
] as const;

function PageTransition({ children, locationKey }: { children: React.ReactNode; locationKey: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    el.style.opacity = "0"; el.style.transform = "translateY(6px)";
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.style.transition = "opacity 280ms ease, transform 280ms ease";
      el.style.opacity = "1"; el.style.transform = "translateY(0)";
    }));
  }, [locationKey]);
  return <div ref={ref} style={{ height:"100%", width:"100%", willChange:"opacity,transform" }}>{children}</div>;
}

function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <span style={{ display:"flex", flexDirection:"column", gap:5, width:20, cursor:"pointer" }} aria-hidden="true">
      {[0,1,2].map((i) => (
        <span key={i} style={{
          display:"block", height:2, background:"white", borderRadius:2,
          transition:"all 300ms",
          transform: i===0 && open ? "translateY(7px) rotate(45deg)"
                   : i===2 && open ? "translateY(-7px) rotate(-45deg)" : "none",
          opacity: i===1 && open ? 0 : 1,
          transformOrigin: "center",
        }}/>
      ))}
    </span>
  );
}

export default function Layout() {
  const location = useLocation();
  const [menuOpen,  setMenuOpen]  = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const { t }  = useLanguage();
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  return (
    <div style={{ height:"100dvh", overflow:"hidden", display:"flex", flexDirection:"column" }}>

      {/* TOP BAR */}
      <header style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"0 16px", height:56, flexShrink:0, zIndex:20,
        background:"rgba(255,255,255,0.05)", backdropFilter:"blur(10px)",
        WebkitBackdropFilter:"blur(10px)",
        borderBottom:"1px solid rgba(255,255,255,0.12)",
        gap:12,
      }}>
        {/* Logo */}
        <NavLink to="/" style={{ display:"flex", alignItems:"center", gap:8, textDecoration:"none", userSelect:"none" }}>
          <span style={{ width:28, height:28, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, background:"#E95420", color:"#fff", letterSpacing:"-0.02em", flexShrink:0 }}>PK</span>
          <span style={{ color:"#E95420", fontWeight:700, fontSize:18, letterSpacing:"0.18em", textTransform:"uppercase", fontFamily:"Ubuntu,sans-serif" }}>PIKTOS</span>
        </NavLink>

        {/* Desktop nav – centrovaná */}
        <nav style={{ display:"flex", alignItems:"center", gap:4, flex:1, justifyContent:"center" }} aria-label="Hlavní navigace"
          className="desktop-nav">
          {NAV_ITEMS.map(({ to, label }) => (
            <NavLink key={to} to={to} end={to === "/"}
              style={({ isActive }) => ({
                padding:"6px 14px", borderRadius:999, fontSize:13, fontWeight:500,
                letterSpacing:"0.02em", textDecoration:"none",
                fontFamily:"Ubuntu,sans-serif", transition:"all 200ms",
                background: isActive ? "rgba(233,84,32,0.22)" : "transparent",
                color: isActive ? "#E95420" : "rgba(255,255,255,0.5)",
              })}
              onMouseEnter={(e) => { if (!(e.currentTarget as HTMLElement).style.background.includes("0.22")) (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.9)"; }}
              onMouseLeave={(e) => { const isActive = (e.currentTarget as HTMLElement).style.background.includes("0.22"); if (!isActive) (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.5)"; }}
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Pravá část */}
        <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
          {/* Cloud badge – vždy viditelný */}
          <CloudStatusBadge />

          {/* Info tlačítko */}
          <InfoButton onClick={() => setAboutOpen(true)} />

          {/* Přepínač jazyka */}
          <LanguageSwitcher mode="inline" display="flags" />

          {/* Rodičovská pojistka */}
          <IconGate hint="Nastavení (rodičovský přístup)" onUnlock={() => { window.location.href = "/about"; }} />

          {/* Hamburger – jen mobile */}
          <button
            className="mobile-menu-btn"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Zavřít menu" : "Otevřít menu"}
            aria-expanded={menuOpen}
            style={{ padding:8, borderRadius:8, background:"none", border:"none", cursor:"pointer", display:"none" }}
          >
            <HamburgerIcon open={menuOpen} />
          </button>
        </div>
      </header>

      <style>{`
        @media (max-width: 767px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>

      {/* MOBILE DROPDOWN */}
      <div style={{
        overflow:"hidden", zIndex:10, flexShrink:0,
        maxHeight: menuOpen ? `${NAV_ITEMS.length * 52}px` : "0px",
        opacity: menuOpen ? 1 : 0,
        transition:"max-height 300ms ease, opacity 300ms ease",
        pointerEvents: menuOpen ? "auto" : "none",
        background:"rgba(255,255,255,0.04)", backdropFilter:"blur(10px)",
        borderBottom: menuOpen ? "1px solid rgba(255,255,255,0.08)" : "none",
      }} aria-hidden={!menuOpen}>
        <nav style={{ display:"flex", flexDirection:"column", padding:"4px 0" }}>
          {NAV_ITEMS.map(({ to, label, shortLabel }) => (
            <NavLink key={to} to={to} end={to === "/"}
              style={({ isActive }) => ({
                display:"flex", alignItems:"center", gap:12,
                padding:"12px 24px", fontSize:13, fontWeight:500,
                textDecoration:"none", fontFamily:"Ubuntu,sans-serif",
                color: isActive ? "#E95420" : "rgba(255,255,255,0.6)",
                background: isActive ? "rgba(233,84,32,0.1)" : "transparent",
                transition:"all 150ms",
              })}>
              <span style={{ width:20, textAlign:"center", opacity:0.7 }}>{shortLabel}</span>
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* MAIN */}
      <main style={{ flex:1, minHeight:0, position:"relative" }}>
        <PageTransition locationKey={location.pathname}>
          <Outlet />
        </PageTransition>
      </main>

      {/* About overlay – mimo layout flow */}
      <AboutProject open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}
