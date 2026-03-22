// ─── src/context/PrintQueueContext.tsx ───────────────────────────────────
//
// Globální fronta karet k tisku.
// Uživatel "hodí" kartu do fronty odkudkoli v appce.
// Fronta se zachová v localStorage – přetrvá reload.

import {
  createContext, useContext, useState, useCallback,
  useMemo, type ReactNode,
} from "react";

// ── Typy ──────────────────────────────────────────────────────────────────
export interface PrintCard {
  id:           number;
  label:        string;
  /** URL obrázku (custom nebo ARASAAC CDN) */
  imageUrl:     string;
  /** VOKS barva rámečku (hex nebo undefined) */
  voksColor?:   string;
  /** Přidáno do fronty */
  addedAt:      string;
}

interface PrintQueueContextValue {
  queue:         PrintCard[];
  /** Přidá kartu do fronty (ignoruje duplicity) */
  enqueue:       (card: Omit<PrintCard, "addedAt">) => void;
  /** Odebere kartu z fronty */
  dequeue:       (id: number) => void;
  /** Přesune kartu o pozici výše */
  moveUp:        (id: number) => void;
  /** Přesune kartu o pozici níže */
  moveDown:      (id: number) => void;
  /** Vyprázdní celou frontu */
  clearQueue:    () => void;
  /** true pokud je karta ve frontě */
  isInQueue:     (id: number) => boolean;
}

const PrintQueueContext = createContext<PrintQueueContextValue | null>(null);

// ── Persistence ────────────────────────────────────────────────────────────
const LS_KEY = "piktos:print-queue";

function loadQueue(): PrintCard[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveQueue(q: PrintCard[]): void {
  try { localStorage.setItem(LS_KEY, JSON.stringify(q)); } catch {}
}

// ── Provider ──────────────────────────────────────────────────────────────
export function PrintQueueProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<PrintCard[]>(loadQueue);

  const setAndPersist = useCallback((updater: (prev: PrintCard[]) => PrintCard[]) => {
    setQueue(prev => {
      const next = updater(prev);
      saveQueue(next);
      return next;
    });
  }, []);

  const enqueue = useCallback((card: Omit<PrintCard, "addedAt">) => {
    setAndPersist(prev => {
      if (prev.some(c => c.id === card.id)) return prev; // dedup
      return [...prev, { ...card, addedAt: new Date().toISOString() }];
    });
  }, [setAndPersist]);

  const dequeue = useCallback((id: number) => {
    setAndPersist(prev => prev.filter(c => c.id !== id));
  }, [setAndPersist]);

  const moveUp = useCallback((id: number) => {
    setAndPersist(prev => {
      const idx = prev.findIndex(c => c.id === id);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  }, [setAndPersist]);

  const moveDown = useCallback((id: number) => {
    setAndPersist(prev => {
      const idx = prev.findIndex(c => c.id === id);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  }, [setAndPersist]);

  const clearQueue = useCallback(() => {
    setAndPersist(() => []);
  }, [setAndPersist]);

  const isInQueue = useCallback((id: number) => {
    return queue.some(c => c.id === id);
  }, [queue]);

  const value = useMemo<PrintQueueContextValue>(() => ({
    queue, enqueue, dequeue, moveUp, moveDown, clearQueue, isInQueue,
  }), [queue, enqueue, dequeue, moveUp, moveDown, clearQueue, isInQueue]);

  return (
    <PrintQueueContext.Provider value={value}>
      {children}
    </PrintQueueContext.Provider>
  );
}

export function usePrintQueue(): PrintQueueContextValue {
  const ctx = useContext(PrintQueueContext);
  if (!ctx) throw new Error("usePrintQueue musí být uvnitř <PrintQueueProvider>");
  return ctx;
}
