// ─── src/components/OfflineBanner.tsx ────────────────────────────────────
//
// Jemný stavový proužek nahoře indikující offline režim.
// Piktogramy z cache fungují normálně – upozornění je informativní, ne alarmující.

import { useState, useEffect } from "react";
import { useOfflineStatus } from "../hooks/useOfflineStatus";

export default function OfflineBanner() {
  const { isOnline, wasOffline } = useOfflineStatus();
  const [visible, setVisible]   = useState(false);
  const [msg, setMsg]           = useState<"offline" | "back-online">("offline");

  useEffect(() => {
    if (!isOnline) {
      setMsg("offline");
      setVisible(true);
    } else if (wasOffline) {
      setMsg("back-online");
      setVisible(true);
      // "Znovu online" zmizí po 3 s
      const t = setTimeout(() => setVisible(false), 3000);
      return () => clearTimeout(t);
    }
  }, [isOnline, wasOffline]);

  if (!visible) return null;

  const isOfflineMsg = msg === "offline";

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position:    "fixed",
        top:         0,
        left:        0,
        right:       0,
        zIndex:      1000,
        padding:     "6px 16px",
        textAlign:   "center",
        fontSize:    12,
        fontWeight:  500,
        letterSpacing: "0.04em",
        fontFamily:  "Ubuntu, sans-serif",
        background:  isOfflineMsg
          ? "rgba(100, 60, 10, 0.92)"
          : "rgba(20, 100, 50, 0.92)",
        color:       isOfflineMsg
          ? "rgba(255, 200, 100, 0.95)"
          : "rgba(100, 240, 150, 0.95)",
        backdropFilter:       "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        borderBottom: `1px solid ${isOfflineMsg ? "rgba(255,180,50,0.2)" : "rgba(50,200,100,0.2)"}`,
        transition:  "background 300ms ease",
        // Safe area pro iPhone notch
        paddingTop: "calc(6px + env(safe-area-inset-top))",
      }}
    >
      {isOfflineMsg
        ? "📶 Offline – načtené piktogramy jsou k dispozici z cache"
        : "✓ Připojení obnoveno"}
    </div>
  );
}
