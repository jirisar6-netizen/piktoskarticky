// ─── src/pages/Dashboard.tsx ─────────────────────────────────────────────
import { useState, useCallback } from "react";
import SmartBar   from "../components/SmartBar";
import SentenceBar, { type SentenceToken } from "../components/SentenceBar";
import type { SmartPictogram } from "../hooks/useTimeOfDay";

let _keyCounter = 0;
const nextKey = () => `tok-${Date.now()}-${_keyCounter++}`;

export default function Dashboard() {
  const [tokens, setTokens] = useState<SentenceToken[]>([]);

  const handleSmartSelect = useCallback((item: SmartPictogram) => {
    setTokens((prev) => [...prev, { id: item.id, label: item.label, key: nextKey() }]);
  }, []);

  const removeToken  = useCallback((key: string) => setTokens((p) => p.filter((t) => t.key !== key)), []);
  const clearTokens  = useCallback(() => setTokens([]), []);

  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column",
      gap: 14, overflow: "hidden",
      padding: "16px 14px 20px",
      fontFamily: "Ubuntu, sans-serif",
    }}>
      <SentenceBar tokens={tokens} onRemove={removeToken} onClear={clearTokens} />
      <SmartBar onSelect={handleSmartSelect} />
      <div style={{
        flex: 1, minHeight: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        borderRadius: 20, border: "1px dashed rgba(255,255,255,0.07)",
      }}>
        <p style={{ color: "rgba(255,255,255,0.15)", fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", textAlign: "center", lineHeight: 2, margin: 0 }}>
          Vyhledávání · Oblíbené · Kategorie<br/>
          <span style={{ fontSize: 10 }}>(připraveno v dalších krocích)</span>
        </p>
      </div>
    </div>
  );
}
