// ─── src/hooks/useParentalLock.ts ─────────────────────────────────────────
//
// Rodičovská pojistka – dvě metody ověření:
//   1. Long press (3 sekundy) – rychlý přístup, vhodný pro jednoduché akce
//   2. Math challenge (součet/rozdíl) – pro hlubší nastavení
//
// Filozofie:
//   • Dítě nemůže omylem vstoupit do nastavení
//   • Rodič může odemknout jednou rukou (long press)
//   • Žádné heslo → žádné zapomínání

import { useState, useRef, useCallback, useEffect } from "react";

// ── Typy ──────────────────────────────────────────────────────────────────
export type LockMethod = "longpress" | "math";

export interface MathChallenge {
  question:  string;    // "14 + 5 ="
  answer:    number;    // 19
}

export interface ParentalLockState {
  /** Je zámek aktuálně otevřen? */
  unlocked:     boolean;
  /** Probíhá long press? */
  isHolding:    boolean;
  /** Postup long pressu 0–1 */
  holdProgress: number;
  /** Je otevřen math challenge modal? */
  mathOpen:     boolean;
  /** Aktuální matematický příklad */
  challenge:    MathChallenge | null;
  /** Chybná odpověď na math challenge */
  mathError:    boolean;
}

export interface ParentalLockHandlers {
  /** Spusť long press (onPointerDown nebo onTouchStart) */
  onHoldStart:  (e: React.PointerEvent | React.TouchEvent) => void;
  /** Ukonči long press (onPointerUp/Leave nebo onTouchEnd) */
  onHoldEnd:    () => void;
  /** Otevři math challenge modal */
  openMath:     () => void;
  /** Ověř odpověď na math challenge */
  submitMath:   (answer: string) => boolean;
  /** Zavři math challenge modal */
  closeMath:    () => void;
  /** Zamkni znovu (po odchodu z nastavení) */
  lock:         () => void;
}

export interface UseParentalLockReturn extends ParentalLockState, ParentalLockHandlers {}

// ── Konfigurace ────────────────────────────────────────────────────────────
const HOLD_DURATION_MS   = 3000;    // 3 sekundy long press
const HOLD_TICK_MS       = 50;      // 50ms = 20 fps progress update
const AUTO_LOCK_MS       = 5 * 60 * 1000; // auto-zamknutí po 5 minutách nečinnosti

// ── Math challenge generátor ───────────────────────────────────────────────
function generateChallenge(): MathChallenge {
  const ops  = ["+", "-", "+"] as const;   // +, -, + (záměrně více sčítání)
  const op   = ops[Math.floor(Math.random() * ops.length)];
  let a: number, b: number;

  if (op === "+") {
    a = 10 + Math.floor(Math.random() * 20);  // 10–29
    b = 2  + Math.floor(Math.random() * 15);  // 2–16
  } else {
    a = 15 + Math.floor(Math.random() * 20);  // 15–34
    b = 2  + Math.floor(Math.random() * 10);  // 2–11
  }

  const answer  = op === "+" ? a + b : a - b;
  const question = `${a} ${op} ${b}`;

  return { question, answer };
}

// ── Hook ──────────────────────────────────────────────────────────────────
export function useParentalLock(
  onUnlock?: () => void,
): UseParentalLockReturn {
  const [unlocked,     setUnlocked]     = useState(false);
  const [isHolding,    setIsHolding]    = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [mathOpen,     setMathOpen]     = useState(false);
  const [challenge,    setChallenge]    = useState<MathChallenge | null>(null);
  const [mathError,    setMathError]    = useState(false);

  const holdTimerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdStartRef   = useRef<number>(0);
  const autoLockRef    = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Auto-lock po nečinnosti ────────────────────────────────────────────
  const resetAutoLock = useCallback(() => {
    if (autoLockRef.current) clearTimeout(autoLockRef.current);
    autoLockRef.current = setTimeout(() => {
      setUnlocked(false);
    }, AUTO_LOCK_MS);
  }, []);

  // ── Cleanup ────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearInterval(holdTimerRef.current);
      if (autoLockRef.current)  clearTimeout(autoLockRef.current);
    };
  }, []);

  // ── Zastavení long pressu ──────────────────────────────────────────────
  const cancelHold = useCallback(() => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setIsHolding(false);
    setHoldProgress(0);
  }, []);

  // ── Spuštění long pressu ───────────────────────────────────────────────
  const onHoldStart = useCallback((e: React.PointerEvent | React.TouchEvent) => {
    // Zabraň výchozímu chování (context menu na mobilu)
    e.preventDefault?.();

    if (unlocked) return;  // already unlocked – no need to hold

    holdStartRef.current = Date.now();
    setIsHolding(true);
    setHoldProgress(0);

    holdTimerRef.current = setInterval(() => {
      const elapsed  = Date.now() - holdStartRef.current;
      const progress = Math.min(elapsed / HOLD_DURATION_MS, 1);
      setHoldProgress(progress);

      if (progress >= 1) {
        clearInterval(holdTimerRef.current!);
        holdTimerRef.current = null;
        setIsHolding(false);
        setHoldProgress(0);
        setUnlocked(true);
        resetAutoLock();
        onUnlock?.();
      }
    }, HOLD_TICK_MS);
  }, [unlocked, onUnlock, resetAutoLock]);

  // ── Ukončení long pressu ───────────────────────────────────────────────
  const onHoldEnd = useCallback(() => {
    cancelHold();
  }, [cancelHold]);

  // ── Otevři math challenge ──────────────────────────────────────────────
  const openMath = useCallback(() => {
    if (unlocked) return;
    setChallenge(generateChallenge());
    setMathError(false);
    setMathOpen(true);
  }, [unlocked]);

  // ── Ověř odpověď ──────────────────────────────────────────────────────
  const submitMath = useCallback((answer: string): boolean => {
    if (!challenge) return false;

    const num = parseInt(answer.trim(), 10);
    if (isNaN(num) || num !== challenge.answer) {
      setMathError(true);
      // Vygeneruj nový příklad po chybě (anti-guessing)
      setTimeout(() => {
        setChallenge(generateChallenge());
        setMathError(false);
      }, 1200);
      return false;
    }

    setMathOpen(false);
    setChallenge(null);
    setMathError(false);
    setUnlocked(true);
    resetAutoLock();
    onUnlock?.();
    return true;
  }, [challenge, onUnlock, resetAutoLock]);

  // ── Zavři modal ────────────────────────────────────────────────────────
  const closeMath = useCallback(() => {
    setMathOpen(false);
    setChallenge(null);
    setMathError(false);
  }, []);

  // ── Zamkni ────────────────────────────────────────────────────────────
  const lock = useCallback(() => {
    cancelHold();
    setUnlocked(false);
    setMathOpen(false);
    if (autoLockRef.current) clearTimeout(autoLockRef.current);
  }, [cancelHold]);

  return {
    // State
    unlocked, isHolding, holdProgress, mathOpen, challenge, mathError,
    // Handlers
    onHoldStart, onHoldEnd, openMath, submitMath, closeMath, lock,
  };
}
