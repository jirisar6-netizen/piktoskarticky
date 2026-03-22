// ─── src/hooks/useDebounce.ts ─────────────────────────────────────────────
//
// Generický debounce hook.
// Vrátí zpožděnou hodnotu – aktualizuje se až po uplynutí `delay` ms
// od poslední změny vstupní hodnoty.
//
// Použití:
//   const debouncedTerm = useDebounce(searchTerm, 300);
//   useEffect(() => { fetchData(debouncedTerm); }, [debouncedTerm]);

import { useState, useEffect } from "react";

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer); // cleanup při každé změně
  }, [value, delay]);

  return debounced;
}
