// ─── src/hooks/useLongPress.ts ────────────────────────────────────────────
//
// Generický hook pro detekci dlouhého stisku (Long Press).
// Funguje pro myš i dotyk (touch).
//
// Použití:
//   const handlers = useLongPress({ onComplete: () => navigate("/"), duration: 1500 });
//   <button {...handlers}>Držet pro návrat</button>

import { useRef, useCallback, useEffect } from "react";

export interface UseLongPressOptions {
  /** Callback volaný po úspěšném dokončení dlouhého stisku */
  onComplete: () => void;
  /** Callback volaný při každém ticku (0–1) – pro animaci progress baru */
  onProgress?: (progress: number) => void;
  /** Callback volaný při přerušení stisku */
  onCancel?: () => void;
  /** Délka stisku v ms (výchozí: 1500) */
  duration?: number;
}

export interface LongPressHandlers {
  onMouseDown:   React.MouseEventHandler;
  onMouseUp:     React.MouseEventHandler;
  onMouseLeave:  React.MouseEventHandler;
  onTouchStart:  React.TouchEventHandler;
  onTouchEnd:    React.TouchEventHandler;
  onTouchCancel: React.TouchEventHandler;
  onContextMenu: React.MouseEventHandler; // zabrání context menu na long-press mobilech
}

export function useLongPress({
  onComplete,
  onProgress,
  onCancel,
  duration = 1500,
}: UseLongPressOptions): LongPressHandlers {
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef    = useRef<number>(0);
  const activeRef   = useRef(false);
  const rafRef      = useRef<number>(0);

  // Vyčistí vše
  const cancel = useCallback((triggerCallback = true) => {
    if (!activeRef.current) return;
    activeRef.current = false;
    if (timerRef.current)  clearTimeout(timerRef.current);
    if (rafRef.current)    cancelAnimationFrame(rafRef.current);
    onProgress?.(0);
    if (triggerCallback) onCancel?.();
  }, [onCancel, onProgress]);

  // Animační smyčka pro progress
  const tick = useCallback(() => {
    if (!activeRef.current) return;
    const elapsed  = Date.now() - startRef.current;
    const progress = Math.min(elapsed / duration, 1);
    onProgress?.(progress);
    if (progress < 1) {
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [duration, onProgress]);

  const start = useCallback(() => {
    activeRef.current = true;
    startRef.current  = Date.now();
    onProgress?.(0);
    rafRef.current = requestAnimationFrame(tick);
    timerRef.current = setTimeout(() => {
      if (activeRef.current) {
        activeRef.current = false;
        onProgress?.(1);
        onComplete();
      }
    }, duration);
  }, [duration, onComplete, onProgress, tick]);

  // Cleanup při unmount
  useEffect(() => () => cancel(false), [cancel]);

  return {
    onMouseDown:   () => start(),
    onMouseUp:     () => cancel(),
    onMouseLeave:  () => cancel(),
    onTouchStart:  (e) => { e.preventDefault(); start(); },
    onTouchEnd:    () => cancel(),
    onTouchCancel: () => cancel(),
    onContextMenu: (e) => e.preventDefault(), // zabrání vibrate menu na Androidu
  };
}
