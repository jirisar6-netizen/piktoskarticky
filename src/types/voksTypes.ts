// ─── src/types/voksTypes.ts ───────────────────────────────────────────────
//
// VOKS (Výměnný Obrázkový Komunikační Systém) – Augmentativní a alternativní
// komunikace. Barevné rámečky karet pomáhají dítěti rozlišit gramatické kategorie.
//
// Standardní barevné schéma:
//   Žlutá   – Lidé, jména (People / Nouns)
//   Zelená  – Slovesa, akce (Verbs / Actions)
//   Oranžová – Předměty, věci (Objects / Things)
//   Modrá   – Přídavná jména, vlastnosti (Adjectives)
//   Růžová  – Sociální interakce, emoce (Social / Emotions)
//   Bílá    – Různé, neurčeno (Misc / Uncategorized)

// ── Typy ──────────────────────────────────────────────────────────────────
export type VoksCategory =
  | "people"     // Žlutá  – lidé, jména
  | "verbs"      // Zelená – slovesa
  | "objects"    // Oranžová – předměty
  | "adjectives" // Modrá – vlastnosti
  | "social"     // Růžová – emoce, pozdravy
  | "misc";      // Bílá – neurčeno

// ── Metadata každé kategorie ──────────────────────────────────────────────
export interface VoksMeta {
  label:       string;   // Česky
  labelEn:     string;   // Anglicky (pro ARASAAC kompatibilitu)
  color:       string;   // Barva rámečku (hex)
  colorDim:    string;   // Průhledná verze pro hover/pozadí
  colorGlow:   string;   // Glow efekt (rgba)
  emoji:       string;   // Emoji ikona
  description: string;   // Popis pro UI
}

// ── Definice barev ────────────────────────────────────────────────────────
export const VOKS_META: Record<VoksCategory, VoksMeta> = {
  people: {
    label:       "Lidé",
    labelEn:     "People",
    color:       "#F5C518",          // sytá žlutá
    colorDim:    "rgba(245,197,24,0.18)",
    colorGlow:   "rgba(245,197,24,0.45)",
    emoji:       "🟡",
    description: "Jména, osoby, lidé",
  },
  verbs: {
    label:       "Slovesa",
    labelEn:     "Verbs",
    color:       "#2ECC71",          // zelená
    colorDim:    "rgba(46,204,113,0.18)",
    colorGlow:   "rgba(46,204,113,0.45)",
    emoji:       "🟢",
    description: "Akce, děje, činnosti",
  },
  objects: {
    label:       "Předměty",
    labelEn:     "Objects",
    color:       "#E95420",          // Ubuntu orange (předměty)
    colorDim:    "rgba(233,84,32,0.18)",
    colorGlow:   "rgba(233,84,32,0.45)",
    emoji:       "🟠",
    description: "Věci, předměty, jídlo",
  },
  adjectives: {
    label:       "Vlastnosti",
    labelEn:     "Adjectives",
    color:       "#3498DB",          // modrá
    colorDim:    "rgba(52,152,219,0.18)",
    colorGlow:   "rgba(52,152,219,0.45)",
    emoji:       "🔵",
    description: "Přídavná jména, barvy, velikosti",
  },
  social: {
    label:       "Sociální",
    labelEn:     "Social",
    color:       "#E91E8C",          // růžová / magenta
    colorDim:    "rgba(233,30,140,0.18)",
    colorGlow:   "rgba(233,30,140,0.45)",
    emoji:       "🩷",
    description: "Emoce, pozdravy, sociální interakce",
  },
  misc: {
    label:       "Různé",
    labelEn:     "Misc",
    color:       "rgba(255,255,255,0.45)",
    colorDim:    "rgba(255,255,255,0.06)",
    colorGlow:   "rgba(255,255,255,0.15)",
    emoji:       "⬜",
    description: "Ostatní, neurčeno",
  },
};

// ── Pomocné funkce ─────────────────────────────────────────────────────────

/** Vrátí metadata pro danou kategorii */
export function getVoksMeta(cat: VoksCategory): VoksMeta {
  return VOKS_META[cat];
}

/** Vrátí CSS border string pro PictogramCard */
export function getVoksBorder(cat: VoksCategory, width = 4): string {
  if (cat === "misc") return `${width}px solid rgba(255,255,255,0.15)`;
  return `${width}px solid ${VOKS_META[cat].color}`;
}

/** Vrátí box-shadow glow pro aktivní/selected stav */
export function getVoksGlow(cat: VoksCategory): string {
  return `0 0 0 2px ${VOKS_META[cat].color}, 0 0 16px ${VOKS_META[cat].colorGlow}`;
}

/** Heuristika: odhadne VOKS kategorii z ARASAAC keywords type */
export function inferVoksCategory(keywordType?: string): VoksCategory {
  if (!keywordType) return "misc";
  const t = keywordType.toLowerCase();
  if (t.includes("noun")    || t.includes("name"))  return "objects";
  if (t.includes("verb")    || t.includes("action")) return "verbs";
  if (t.includes("adj")     || t.includes("color"))  return "adjectives";
  if (t.includes("person")  || t.includes("people")) return "people";
  if (t.includes("emotion") || t.includes("social")) return "social";
  return "misc";
}

// ── Pořadí kategorií pro UI výběr ────────────────────────────────────────
export const VOKS_ORDER: VoksCategory[] = [
  "people", "verbs", "objects", "adjectives", "social", "misc",
];
