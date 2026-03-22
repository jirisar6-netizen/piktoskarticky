// ─── src/services/profileService.ts ──────────────────────────────────────
//
// CRUD operace pro uživatelské profily.
// Storage: localStorage (metadata) + IndexedDB (avatary jako Blob)
//
// Schéma profilu:
//   id          – nanoid-like unikátní klíč
//   name        – zobrazované jméno (max 24 znaků)
//   emoji       – fallback avatar (pokud není fotka)
//   colorAccent – hex barva pro kruh avataru
//   themeId     – odkaz na ColorMode z ThemeContext
//   cardSize    – preferovaná velikost karet
//   favPictograms – pole { id, label, category } (oblíbené, max 50)
//   pinCategories – kategorie zobrazené prioritně ve SmartBaru
//   createdAt   – ISO timestamp
//   lastUsedAt  – ISO timestamp

import type { ColorMode, CardSize, UserTheme } from "../context/ThemeContext";
import { DEFAULT_THEME } from "../context/ThemeContext";
import { logInfo, logError, logWarn } from "./errorLogger";

// ── Typy ──────────────────────────────────────────────────────────────────
export interface FavPictogram {
  id:       number;
  label:    string;
  category: string;
}

export type PinCategory =
  | "Snídaně" | "Hygiena" | "Oblékání" | "Hra" | "Učení"
  | "Venku"   | "Jídlo"   | "Večeře"   | "Koupání" | "Spánek" | "Noc"
  | "SOS";

export const ALL_CATEGORIES: PinCategory[] = [
  "Snídaně", "Hygiena", "Oblékání", "Hra", "Učení",
  "Venku", "Jídlo", "Večeře", "Koupání", "Spánek", "Noc", "SOS",
];

export interface UserProfile {
  id:            string;
  name:          string;
  emoji:         string;           // fallback ikona
  colorAccent:   string;           // hex barva kruhu
  themeMode:     ColorMode;
  cardSize:      CardSize;
  showLabels:    boolean;
  favPictograms: FavPictogram[];   // max 50
  pinCategories: PinCategory[];    // prioritní kategorie
  createdAt:     string;
  lastUsedAt:    string;
}

// ── Výchozí hodnoty ────────────────────────────────────────────────────────
const AVATAR_EMOJIS = [
  "🦁","🐻","🐼","🦊","🐸","🐧","🦋","🌟","🌈","🎈",
  "🚀","🌺","🐬","🦄","🐙","🍀","⭐","🎯","🏄","🎸",
];

export const ACCENT_COLORS = [
  "#E95420", // Ubuntu orange
  "#A891FF", // soft purple
  "#4A9EFF", // night blue
  "#4CAF50", // green
  "#FF6B9D", // pink
  "#FFB300", // amber
  "#00BCD4", // cyan
  "#FF7043", // deep orange
];

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createDefaultProfile(overrides?: Partial<Pick<UserProfile, "name" | "emoji" | "colorAccent" | "themeMode">>): UserProfile {
  const now = new Date().toISOString();
  return {
    id:            generateId(),
    name:          overrides?.name        ?? "Nový profil",
    emoji:         overrides?.emoji       ?? AVATAR_EMOJIS[Math.floor(Math.random() * AVATAR_EMOJIS.length)],
    colorAccent:   overrides?.colorAccent ?? ACCENT_COLORS[0],
    themeMode:     overrides?.themeMode   ?? "ubuntu",
    cardSize:      "medium",
    showLabels:    true,
    favPictograms: [],
    pinCategories: ["Snídaně", "Hygiena", "Hra", "Jídlo", "Spánek"],
    createdAt:     now,
    lastUsedAt:    now,
  };
}

// ── Konstanty ──────────────────────────────────────────────────────────────
const LS_PROFILES_KEY  = "piktos:profiles";
const LS_ACTIVE_KEY    = "piktos:active-profile";
const DB_NAME          = "piktos-avatars";
const DB_STORE         = "avatars";
const MAX_FAVS         = 50;

// ── localStorage CRUD ─────────────────────────────────────────────────────
export function loadProfiles(): UserProfile[] {
  try {
    const raw = localStorage.getItem(LS_PROFILES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as UserProfile[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    logError("app", "loadProfiles failed", e);
    return [];
  }
}

export function saveProfiles(profiles: UserProfile[]): void {
  try {
    localStorage.setItem(LS_PROFILES_KEY, JSON.stringify(profiles));
  } catch (e) {
    logWarn("app", "saveProfiles failed (storage full?)", e);
  }
}

export function loadActiveProfileId(): string | null {
  try { return localStorage.getItem(LS_ACTIVE_KEY); } catch { return null; }
}

export function saveActiveProfileId(id: string): void {
  try { localStorage.setItem(LS_ACTIVE_KEY, id); } catch {}
}

// ── Profil CRUD ───────────────────────────────────────────────────────────

/** Vytvoří nový profil a uloží ho */
export function createProfile(data: Partial<Pick<UserProfile, "name" | "emoji" | "colorAccent" | "themeMode">>): UserProfile {
  const profile  = createDefaultProfile(data);
  const profiles = loadProfiles();
  saveProfiles([...profiles, profile]);
  logInfo("app", `Profil vytvořen: ${profile.name} (${profile.id})`);
  return profile;
}

/** Aktualizuje existující profil */
export function updateProfile(id: string, patch: Partial<Omit<UserProfile, "id" | "createdAt">>): UserProfile | null {
  const profiles = loadProfiles();
  const idx      = profiles.findIndex(p => p.id === id);
  if (idx === -1) { logWarn("app", `updateProfile: profil ${id} nenalezen`); return null; }
  const updated = { ...profiles[idx], ...patch, lastUsedAt: new Date().toISOString() };
  profiles[idx] = updated;
  saveProfiles(profiles);
  return updated;
}

/** Smaže profil a jeho avatar */
export function deleteProfile(id: string): boolean {
  const profiles = loadProfiles();
  const filtered = profiles.filter(p => p.id !== id);
  if (filtered.length === profiles.length) return false;
  saveProfiles(filtered);
  deleteAvatar(id).catch(() => {});  // async, nevadí při chybě
  logInfo("app", `Profil smazán: ${id}`);
  return true;
}

/** Označí profil jako naposledy použitý */
export function touchProfile(id: string): void {
  updateProfile(id, { lastUsedAt: new Date().toISOString() });
  saveActiveProfileId(id);
}

/** Vrátí profil podle ID */
export function getProfile(id: string): UserProfile | null {
  return loadProfiles().find(p => p.id === id) ?? null;
}

// ── Oblíbené piktogramy ───────────────────────────────────────────────────

export function addFavorite(profileId: string, pict: FavPictogram): boolean {
  const profile = getProfile(profileId);
  if (!profile) return false;
  if (profile.favPictograms.some(f => f.id === pict.id)) return false;  // už existuje
  if (profile.favPictograms.length >= MAX_FAVS) {
    logWarn("app", `addFavorite: max ${MAX_FAVS} oblíbených dosaženo`);
    return false;
  }
  updateProfile(profileId, {
    favPictograms: [...profile.favPictograms, pict],
  });
  return true;
}

export function removeFavorite(profileId: string, pictId: number): void {
  const profile = getProfile(profileId);
  if (!profile) return;
  updateProfile(profileId, {
    favPictograms: profile.favPictograms.filter(f => f.id !== pictId),
  });
}

export function isFavorite(profileId: string, pictId: number): boolean {
  return getProfile(profileId)?.favPictograms.some(f => f.id === pictId) ?? false;
}

// ── Pin Categories ────────────────────────────────────────────────────────

export function setPinCategories(profileId: string, cats: PinCategory[]): void {
  updateProfile(profileId, { pinCategories: cats });
}

// ── Avatar IndexedDB ──────────────────────────────────────────────────────

let _avatarDb: IDBDatabase | null = null;

function openAvatarDb(): Promise<IDBDatabase> {
  if (_avatarDb) return Promise.resolve(_avatarDb);
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = e => {
      (e.target as IDBOpenDBRequest).result.createObjectStore(DB_STORE);
    };
    req.onsuccess = e => {
      _avatarDb = (e.target as IDBOpenDBRequest).result;
      _avatarDb.onclose = () => { _avatarDb = null; };
      res(_avatarDb);
    };
    req.onerror = () => rej(req.error);
  });
}

export async function saveAvatar(profileId: string, blob: Blob): Promise<void> {
  const db = await openAvatarDb();
  return new Promise((res, rej) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    const req = tx.objectStore(DB_STORE).put(blob, profileId);
    req.onsuccess = () => res();
    req.onerror   = () => rej(req.error);
  });
}

export async function loadAvatar(profileId: string): Promise<string | null> {
  try {
    const db = await openAvatarDb();
    return new Promise((res, rej) => {
      const req = db.transaction(DB_STORE, "readonly").objectStore(DB_STORE).get(profileId);
      req.onsuccess = () => {
        const blob = req.result as Blob | undefined;
        res(blob ? URL.createObjectURL(blob) : null);
      };
      req.onerror = () => rej(req.error);
    });
  } catch { return null; }
}

export async function deleteAvatar(profileId: string): Promise<void> {
  try {
    const db = await openAvatarDb();
    return new Promise((res, rej) => {
      const req = db.transaction(DB_STORE, "readwrite").objectStore(DB_STORE).delete(profileId);
      req.onsuccess = () => res();
      req.onerror   = () => rej(req.error);
    });
  } catch {}
}

// ── Překlad profilu na UserTheme patch ────────────────────────────────────
/** Vrátí patch pro ThemeContext ze settingů profilu */
export function profileToThemePatch(profile: UserProfile): Partial<UserTheme> {
  return {
    colorMode:  profile.themeMode,
    cardSize:   profile.cardSize,
    showLabels: profile.showLabels,
  };
}

// ── Seed: výchozí profily při první instalaci ─────────────────────────────
export function seedDefaultProfiles(): UserProfile[] {
  const existing = loadProfiles();
  if (existing.length > 0) return existing;

  const child = createProfile({
    name:        "Jiřík",
    emoji:       "🦁",
    colorAccent: "#E95420",
    themeMode:   "ubuntu",
  });
  const parent = createProfile({
    name:        "Rodič",
    emoji:       "⭐",
    colorAccent: "#4A9EFF",
    themeMode:   "night",
  });

  logInfo("app", "Výchozí profily vytvořeny");
  return [child, parent];
}
