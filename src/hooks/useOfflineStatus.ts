// ─── src/hooks/useOfflineStatus.ts ───────────────────────────────────────
//
// Detekuje online/offline stav zařízení.
// Zobrazuje jemný banner, pokud je aplikace offline.
//
// Použití:
//   const { isOnline, wasOffline } = useOfflineStatus();

import { useState, useEffect } from "react";

export interface OfflineStatus {
  /** true = má připojení */
  isOnline:   boolean;
  /** true = byl offline od posledního mountu (pro "znovu online" zprávu) */
  wasOffline: boolean;
}

export function useOfflineStatus(): OfflineStatus {
  const [isOnline,   setIsOnline]   = useState(() => navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline  = () => { setIsOnline(true); };
    const handleOffline = () => { setIsOnline(false); setWasOffline(true); };

    window.addEventListener("online",  handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online",  handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { isOnline, wasOffline };
}
