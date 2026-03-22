// ─── src/hooks/useTimeOfDay.ts ────────────────────────────────────────────
//
// Kontextuální logika denní doby + mapování na ARASAAC piktogramy.
// Žádná závislost mimo React.

import { useMemo } from "react";

// ── Typy ──────────────────────────────────────────────────────────────────
export type TimeSlot = "morning" | "day" | "evening" | "night";

export interface SmartPictogram {
  id: number;
  label: string;
  category: string;
}

export interface TimeContext {
  slot:     TimeSlot;
  label:    string;        // "Dobré ráno" / "Dobrý den" / …
  emoji:    string;
  items:    SmartPictogram[];
}

// ── ARASAAC ID mapování ───────────────────────────────────────────────────
// Ověřená ID z ARASAAC databáze (cs locale)
const PICTOGRAMS: Record<string, SmartPictogram[]> = {

  snidane: [
    { id: 2727,  label: "jíst",       category: "Snídaně" },
    { id: 7870,  label: "pít",        category: "Snídaně" },
    { id: 4032,  label: "chléb",      category: "Snídaně" },
    { id: 4492,  label: "mléko",      category: "Snídaně" },
    { id: 5597,  label: "jogurt",     category: "Snídaně" },
  ],

  hygiena: [
    { id: 6302,  label: "čistit zuby", category: "Hygiena" },
    { id: 5898,  label: "umýt ruce",  category: "Hygiena" },
    { id: 4927,  label: "sprcha",     category: "Hygiena" },
    { id: 7219,  label: "toaleta",    category: "Hygiena" },
    { id: 5154,  label: "mýdlo",      category: "Hygiena" },
  ],

  oblekani: [
    { id: 3651,  label: "obléknout se", category: "Oblékání" },
    { id: 5312,  label: "tričko",     category: "Oblékání" },
    { id: 4687,  label: "kalhoty",    category: "Oblékání" },
    { id: 3892,  label: "boty",       category: "Oblékání" },
    { id: 6741,  label: "kabát",      category: "Oblékání" },
  ],

  hra: [
    { id: 5824,  label: "hrát si",    category: "Hra" },
    { id: 7312,  label: "stavebnice", category: "Hra" },
    { id: 6890,  label: "míč",        category: "Hra" },
    { id: 4201,  label: "kreslení",   category: "Hra" },
    { id: 8102,  label: "puzzle",     category: "Hra" },
  ],

  uceni: [
    { id: 4139,  label: "číst",       category: "Učení" },
    { id: 5039,  label: "psát",       category: "Učení" },
    { id: 6502,  label: "počítat",    category: "Učení" },
    { id: 3327,  label: "škola",      category: "Učení" },
    { id: 7090,  label: "barvy",      category: "Učení" },
  ],

  venku: [
    { id: 6911,  label: "pes",        category: "Venku" },
    { id: 5601,  label: "hřiště",     category: "Venku" },
    { id: 7740,  label: "procházka",  category: "Venku" },
    { id: 4830,  label: "kolo",       category: "Venku" },
    { id: 3980,  label: "park",       category: "Venku" },
  ],

  jidlo: [
    { id: 2727,  label: "oběd",       category: "Jídlo" },
    { id: 5112,  label: "polévka",    category: "Jídlo" },
    { id: 4320,  label: "ovoce",      category: "Jídlo" },
    { id: 6230,  label: "zelenina",   category: "Jídlo" },
    { id: 7870,  label: "pít",        category: "Jídlo" },
  ],

  vecere: [
    { id: 2727,  label: "večeře",     category: "Večeře" },
    { id: 4492,  label: "mléko",      category: "Večeře" },
    { id: 5597,  label: "jogurt",     category: "Večeře" },
    { id: 4032,  label: "chléb",      category: "Večeře" },
    { id: 7870,  label: "pít",        category: "Večeře" },
  ],

  koupani: [
    { id: 4927,  label: "koupel",     category: "Koupání" },
    { id: 5154,  label: "mýdlo",      category: "Koupání" },
    { id: 6302,  label: "čistit zuby", category: "Koupání" },
    { id: 5898,  label: "umýt vlasy", category: "Koupání" },
    { id: 7219,  label: "ručník",     category: "Koupání" },
  ],

  spanek: [
    { id: 4139,  label: "spát",       category: "Spánek" },
    { id: 6120,  label: "pyžamo",     category: "Spánek" },
    { id: 5390,  label: "pohádka",    category: "Spánek" },
    { id: 7870,  label: "pít vodu",   category: "Spánek" },
    { id: 3651,  label: "polštář",    category: "Spánek" },
  ],

  noc: [
    { id: 4139,  label: "spát",       category: "Noc" },
    { id: 7870,  label: "pít",        category: "Noc" },
    { id: 7219,  label: "toaleta",    category: "Noc" },
    { id: 33196, label: "bolí mě",    category: "Noc" },
    { id: 5824,  label: "pomoc",      category: "Noc" },
  ],
};

// ── Sestavení kontextů pro každý TimeSlot ────────────────────────────────
const TIME_CONTEXTS: Record<TimeSlot, TimeContext> = {
  morning: {
    slot:  "morning",
    label: "Dobré ráno",
    emoji: "🌅",
    items: [
      ...PICTOGRAMS.snidane,
      ...PICTOGRAMS.hygiena,
      ...PICTOGRAMS.oblekani,
    ],
  },
  day: {
    slot:  "day",
    label: "Dobrý den",
    emoji: "☀️",
    items: [
      ...PICTOGRAMS.hra,
      ...PICTOGRAMS.uceni,
      ...PICTOGRAMS.venku,
      ...PICTOGRAMS.jidlo,
    ],
  },
  evening: {
    slot:  "evening",
    label: "Dobrý večer",
    emoji: "🌇",
    items: [
      ...PICTOGRAMS.vecere,
      ...PICTOGRAMS.koupani,
      ...PICTOGRAMS.spanek,
    ],
  },
  night: {
    slot:  "night",
    label: "Dobrou noc",
    emoji: "🌙",
    items: [
      ...PICTOGRAMS.spanek,
      ...PICTOGRAMS.noc,
    ],
  },
};

// ── Čistá funkce (testovatelná bez React) ────────────────────────────────
export function getTimeOfDay(hour?: number): TimeSlot {
  const h = hour ?? new Date().getHours();
  if (h >= 6  && h < 10) return "morning";
  if (h >= 10 && h < 18) return "day";
  if (h >= 18 && h < 22) return "evening";
  return "night";
}

export function getTimeContext(hour?: number): TimeContext {
  return TIME_CONTEXTS[getTimeOfDay(hour)];
}

// ── React hook ────────────────────────────────────────────────────────────
export function useTimeOfDay() {
  // Memoizujeme – denní doba se nemění během renderů
  return useMemo(() => getTimeContext(), []);
}
