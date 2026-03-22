// ─── src/hooks/useDragSort.ts ─────────────────────────────────────────────
//
// Čistý Pointer Events drag-and-drop hook pro přeřazení tokenů.
// Funguje na myši i dotyku (iOS, Android) bez externích závislostí.
//
// Princip:
//   pointerdown  → zapamatuj index, spusť drag po DRAG_THRESHOLD
//   pointermove  → vypočítej nový index z pozice kurzoru, přeřaď items
//   pointerup    → commit pořadí, reset stavu
//
// Vrací:
//   items            – aktuální pole (průběžně přeřazované)
//   draggingIndex    – index prvku který se táhne (nebo null)
//   getItemProps(i)  – spread props na každý draggable element

import { useState, useRef, useCallback, useEffect } from "react";

export interface DragSortOptions<T> {
  items:     T[];
  onReorder: (newItems: T[]) => void;
  /** Minimální pohyb (px) před zahájením dragu */
  threshold?: number;
  /** Směr: "horizontal" (výchozí) nebo "vertical" */
  direction?: "horizontal" | "vertical";
}

export interface DragItemProps {
  onPointerDown:  (e: React.PointerEvent) => void;
  onPointerMove:  (e: React.PointerEvent) => void;
  onPointerUp:    (e: React.PointerEvent) => void;
  onPointerCancel:(e: React.PointerEvent) => void;
  style:          React.CSSProperties;
  "data-drag-index": number;
}

export interface UseDragSortReturn<T> {
  items:          T[];
  draggingIndex:  number | null;
  isDragging:     boolean;
  getItemProps:   (index: number) => DragItemProps;
}

// ── Výchozí hodnoty ────────────────────────────────────────────────────────
const DRAG_THRESHOLD   = 8;   // px pohybu před aktivací dragu
const SPRING_DURATION  = 200; // ms animace přesunutí

export function useDragSort<T>({
  items,
  onReorder,
  threshold  = DRAG_THRESHOLD,
  direction  = "horizontal",
}: DragSortOptions<T>): UseDragSortReturn<T> {

  const [localItems,    setLocalItems]    = useState<T[]>(items);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  // Sync lokálního stavu když se změní items zvenčí (ale ne během dragu)
  useEffect(() => {
    if (draggingIndex === null) setLocalItems(items);
  }, [items, draggingIndex]);

  // Ref stav dragu (nevyvolává re-render)
  const dragState = useRef<{
    active:      boolean;
    startIndex:  number;
    currentIndex:number;
    startX:      number;
    startY:      number;
    pointerId:   number;
    itemRects:   DOMRect[];
    containerEl: HTMLElement | null;
  }>({
    active: false, startIndex: -1, currentIndex: -1,
    startX: 0, startY: 0, pointerId: -1,
    itemRects: [], containerEl: null,
  });

  // ── Výpočet nového indexu ze souřadnic ──────────────────────────────
  const getIndexAt = useCallback((clientX: number, clientY: number): number => {
    const rects = dragState.current.itemRects;
    const coord = direction === "horizontal" ? clientX : clientY;

    for (let i = 0; i < rects.length; i++) {
      const r    = rects[i];
      const mid  = direction === "horizontal"
        ? r.left + r.width  / 2
        : r.top  + r.height / 2;

      if (coord < mid) return i;
    }
    return rects.length - 1;
  }, [direction]);

  // ── Reorder helper ───────────────────────────────────────────────────
  const reorder = useCallback((arr: T[], from: number, to: number): T[] => {
    if (from === to) return arr;
    const next = [...arr];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────────
  const onPointerDown = useCallback((e: React.PointerEvent, index: number) => {
    // Pouze primární tlačítko (myš nebo první dotek)
    if (e.button !== 0 && e.pointerType === "mouse") return;

    const ds       = dragState.current;
    ds.startIndex  = index;
    ds.currentIndex= index;
    ds.startX      = e.clientX;
    ds.startY      = e.clientY;
    ds.pointerId   = e.pointerId;
    ds.active      = false;

    // Zachyť pointer pro pohyb i mimo element
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent, index: number) => {
    const ds    = dragState.current;
    if (ds.pointerId !== e.pointerId) return;

    const dx    = e.clientX - ds.startX;
    const dy    = e.clientY - ds.startY;
    const moved = direction === "horizontal" ? Math.abs(dx) : Math.abs(dy);

    // Aktivuj drag po dosažení threshold
    if (!ds.active && moved > threshold) {
      ds.active = true;

      // Zachyť pozice všech drag itemů (jeden lookup)
      const container = (e.currentTarget as HTMLElement).closest("[data-drag-container]") as HTMLElement;
      ds.containerEl  = container;
      if (container) {
        const items = container.querySelectorAll("[data-drag-index]");
        ds.itemRects = Array.from(items).map(el => el.getBoundingClientRect());
      }

      setDraggingIndex(ds.startIndex);
    }

    if (!ds.active) return;
    e.preventDefault();

    const newIndex = getIndexAt(e.clientX, e.clientY);

    if (newIndex !== ds.currentIndex) {
      ds.currentIndex = newIndex;
      setLocalItems(prev => reorder(prev, ds.startIndex, newIndex));
      // Aktualizuj startIndex (prvek se "přesunul")
      ds.startIndex   = newIndex;
      // Znovu načti rects po přeřazení
      if (ds.containerEl) {
        const its = ds.containerEl.querySelectorAll("[data-drag-index]");
        ds.itemRects = Array.from(its).map(el => el.getBoundingClientRect());
      }
    }
  }, [direction, threshold, getIndexAt, reorder]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    const ds = dragState.current;
    if (ds.pointerId !== e.pointerId) return;
    if (ds.active) {
      onReorder(localItems);
    }
    ds.active      = false;
    ds.startIndex  = -1;
    ds.currentIndex= -1;
    setDraggingIndex(null);
  }, [localItems, onReorder]);

  const onPointerCancel = useCallback((e: React.PointerEvent) => {
    const ds  = dragState.current;
    if (ds.pointerId !== e.pointerId) return;
    // Revoke na původní pořadí
    setLocalItems(items);
    ds.active = false;
    setDraggingIndex(null);
  }, [items]);

  // ── getItemProps ─────────────────────────────────────────────────────
  const getItemProps = useCallback((index: number): DragItemProps => ({
    onPointerDown:   (e) => onPointerDown(e, index),
    onPointerMove:   (e) => onPointerMove(e, index),
    onPointerUp:     onPointerUp,
    onPointerCancel: onPointerCancel,
    "data-drag-index": index,
    style: {
      touchAction:    "none",           // zabrání scroll při dragu
      userSelect:     "none",
      WebkitUserSelect: "none",
      cursor:         draggingIndex === index ? "grabbing" : "grab",
      transform:      draggingIndex === index ? "scale(1.06)" : "scale(1)",
      opacity:        draggingIndex === index ? 0.85 : 1,
      zIndex:         draggingIndex === index ? 10 : "auto",
      transition:     draggingIndex === index
        ? "transform 80ms ease, opacity 80ms"
        : `transform ${SPRING_DURATION}ms cubic-bezier(0.34,1.56,0.64,1)`,
    } as React.CSSProperties,
  }), [draggingIndex, onPointerDown, onPointerMove, onPointerUp, onPointerCancel]);

  return {
    items:         localItems,
    draggingIndex,
    isDragging:    draggingIndex !== null,
    getItemProps,
  };
}
