// ─── src/hooks/useSwipeUp.ts ──────────────────────────────────────────────
//
// Detekce gesta "swipe nahoru" pro odebrání tokenu ze sentence stripu.
//
// Logika:
//   • Detekuje pohyb prstu/myši NAHORU o MIN_DISTANCE px
//   • Musí proběhnout do MAX_TIME ms
//   • Musí být převážně vertikální (poměr Y:X > AXIS_RATIO)
//   • Nepřeruší horizontální drag (kontrola primárního směru)
//
// Vrací:
//   onSwipePointerDown  – přiřadit na element
//   onSwipePointerUp    – přiřadit na element
//   onSwipePointerMove  – přiřadit na element (pro vizuální feedback)
//   swipeProgress       – 0–1 (jak daleko prst ušel, pro animaci)

import { useState, useRef, useCallback } from "react";

export interface UseSwipeUpOptions {
  /** Callback po úspěšném swipe-up */
  onSwipeUp:    () => void;
  /** Minimální vzdálenost nahoru (px), výchozí 50 */
  minDistance?: number;
  /** Max čas gesta (ms), výchozí 600 */
  maxTime?:     number;
  /** Min poměr Y:X pro rozlišení od horizontálního dragu, výchozí 1.5 */
  axisRatio?:   number;
  /** Feedback vzdálenost pro 100% progress, výchozí 80 */
  feedbackPx?:  number;
}

export interface UseSwipeUpReturn {
  onSwipePointerDown: (e: React.PointerEvent) => void;
  onSwipePointerUp:   (e: React.PointerEvent) => void;
  onSwipePointerMove: (e: React.PointerEvent) => void;
  /** 0–1: jak moc je prst posunutý nahoru (pro vizuální feedback) */
  swipeProgress:      number;
  /** true pokud právě probíhá potenciální swipe */
  isSwiping:          boolean;
}

export function useSwipeUp({
  onSwipeUp,
  minDistance = 50,
  maxTime     = 600,
  axisRatio   = 1.5,
  feedbackPx  = 80,
}: UseSwipeUpOptions): UseSwipeUpReturn {

  const [swipeProgress, setSwipeProgress] = useState(0);
  const [isSwiping,     setIsSwiping]     = useState(false);

  const startRef = useRef<{
    x:    number;
    y:    number;
    time: number;
    id:   number;
  } | null>(null);

  const onSwipePointerDown = useCallback((e: React.PointerEvent) => {
    startRef.current = {
      x:    e.clientX,
      y:    e.clientY,
      time: Date.now(),
      id:   e.pointerId,
    };
    setSwipeProgress(0);
    setIsSwiping(false);
  }, []);

  const onSwipePointerMove = useCallback((e: React.PointerEvent) => {
    const s = startRef.current;
    if (!s || s.id !== e.pointerId) return;

    const dy = s.y - e.clientY;  // kladné = pohyb nahoru
    const dx = Math.abs(e.clientX - s.x);

    // Pouze pokud pohyb je převážně vertikální nahoru
    if (dy > 0 && (dx === 0 || dy / dx > axisRatio / 2)) {
      const progress = Math.min(dy / feedbackPx, 1);
      setSwipeProgress(progress);
      setIsSwiping(dy > 10);
    } else {
      setSwipeProgress(0);
      setIsSwiping(false);
    }
  }, [axisRatio, feedbackPx]);

  const onSwipePointerUp = useCallback((e: React.PointerEvent) => {
    const s = startRef.current;
    if (!s || s.id !== e.pointerId) {
      setSwipeProgress(0);
      setIsSwiping(false);
      return;
    }

    const dy       = s.y - e.clientY;
    const dx       = Math.abs(e.clientX - s.x);
    const elapsed  = Date.now() - s.time;
    const isUp     = dy >= minDistance;
    const isVertical = dx === 0 || dy / dx > axisRatio;
    const inTime   = elapsed <= maxTime;

    startRef.current = null;
    setSwipeProgress(0);
    setIsSwiping(false);

    if (isUp && isVertical && inTime) {
      onSwipeUp();
    }
  }, [minDistance, maxTime, axisRatio, onSwipeUp]);

  return {
    onSwipePointerDown,
    onSwipePointerUp,
    onSwipePointerMove,
    swipeProgress,
    isSwiping,
  };
}
