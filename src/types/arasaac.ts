// ─── ARASAAC API – TypeScript typy ────────────────────────────────────────
//
// Dokumentace API: https://api.arasaac.org/
// Jazyk: "cs" (čeština) – použit v endpointech služby

// ── Jeden klíčové slovo vrácené API ───────────────────────────────────────
export interface Keyword {
  /** Klíčové slovo v daném jazyce */
  keyword: string;
  /** Typ: podstatné jméno, sloveso, … (volitelné – API ho někdy vynechá) */
  type?: string;
  /** Plural forma klíčového slova (pokud existuje) */
  plural?: string;
}

// ── Jeden piktogram vrácený endpointem /search ────────────────────────────
export interface Pictogram {
  /** Unikátní číselné ID piktogramu v ARASAAC databázi */
  _id: number;

  /** Seznam klíčových slov přiřazených k piktogramu */
  keywords: Keyword[];

  /**
   * Kategorie, do kterých piktogram patří.
   * API vrací buď pole stringů, nebo může chybět.
   */
  categories: string[];

  /**
   * Dostupné jazyky pro tento piktogram.
   * Volitelné pole – ne vždy přítomné.
   */
  languages?: string[];

  /**
   * Příznak, zda je piktogram násilný / nevhodný.
   * Použij pro filtrování v UI.
   */
  violence?: boolean;

  /** Příznak sexuálního obsahu */
  sex?: boolean;
}

// ── Odpověď endpointu /search ─────────────────────────────────────────────
// API vrací přímo pole piktogramů (ne obalený objekt)
export type SearchResponse = Pictogram[];

// ── Výsledek volání naší služby (s rozlišením chybových stavů) ─────────────
export type SearchResult =
  | { status: "ok";       data: Pictogram[] }
  | { status: "empty";    data: [] }
  | { status: "error";    message: string };
