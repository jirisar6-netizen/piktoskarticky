// ─── src/context/VoiceProvider.tsx ───────────────────────────────────────
//
// Context provider – sdílí jeden useVoice() stav pro celou aplikaci.
// Zabraňuje tomu, aby každá karta měla vlastní instanci speechSynthesis.
//
// Použití:
//   <VoiceProvider>
//     <App />
//   </VoiceProvider>
//
//   // v komponentě:
//   const { speak, isSpeaking, speakingId } = useVoiceContext();

import { useMemo } from "react";
import { VoiceContext, useVoice } from "../hooks/useVoice";

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const voice = useVoice();

  // Memoizujeme objekt aby se zabránilo zbytečným re-renderům
  const value = useMemo(() => voice, [
    voice.isSpeaking,
    voice.speakingId,
    voice.isSupported,
    // speak/speakAll/stop jsou stable callbacks (useCallback) – nepotřebují být v deps
  ]);

  return (
    <VoiceContext.Provider value={value}>
      {children}
    </VoiceContext.Provider>
  );
}
