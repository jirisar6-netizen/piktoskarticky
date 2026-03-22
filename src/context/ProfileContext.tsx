// ─── src/context/ProfileContext.tsx ──────────────────────────────────────
//
// Globální kontext aktivního profilu.
// Po přepnutí profilu se automaticky aplikuje jeho téma přes ThemeContext.

import {
  createContext, useContext, useState, useCallback,
  useMemo, useEffect, type ReactNode,
} from "react";
import {
  loadProfiles, loadActiveProfileId, touchProfile,
  createProfile, updateProfile, deleteProfile,
  addFavorite, removeFavorite, isFavorite,
  setPinCategories, seedDefaultProfiles, profileToThemePatch,
  loadAvatar, saveAvatar,
  type UserProfile, type FavPictogram, type PinCategory,
} from "../services/profileService";
import { useTheme } from "./ThemeContext";

// ── Typy ──────────────────────────────────────────────────────────────────
interface ProfileContextValue {
  /** Všechny profily */
  profiles:        UserProfile[];
  /** Aktivní profil (null = žádný nevybrán = splash screen) */
  activeProfile:   UserProfile | null;
  /** Přepne na profil (aplikuje jeho téma) */
  switchProfile:   (id: string)       => void;
  /** Vytvoří nový profil */
  addProfile:      (data: Partial<Pick<UserProfile, "name" | "emoji" | "colorAccent" | "themeMode">>) => UserProfile;
  /** Aktualizuje profil */
  editProfile:     (id: string, patch: Partial<Omit<UserProfile, "id" | "createdAt">>) => void;
  /** Smaže profil */
  removeProfile:   (id: string)       => void;
  /** Přidá/odebere oblíbený piktogram */
  toggleFavorite:  (pict: FavPictogram) => void;
  /** Zkontroluje, zda je piktogram oblíbený */
  checkFavorite:   (id: number)       => boolean;
  /** Nastaví prioritní kategorie */
  updatePinCategories: (cats: PinCategory[]) => void;
  /** URL avataru aktivního profilu (Object URL) */
  avatarUrl:       string | null;
  /** Uloží nový avatar */
  uploadAvatar:    (blob: Blob)        => Promise<void>;
  /** Zda je zobrazen splash výběr profilu */
  showSplash:      boolean;
  /** Zavře splash a vstoupí do aplikace */
  dismissSplash:   ()                  => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────
export function ProfileProvider({ children }: { children: ReactNode }) {
  const { update: updateTheme } = useTheme();

  // ── Inicializace ────────────────────────────────────────────────────
  const [profiles,     setProfiles]     = useState<UserProfile[]>(() => {
    const loaded = loadProfiles();
    return loaded.length > 0 ? loaded : seedDefaultProfiles();
  });

  const [activeProfile, setActiveProfile] = useState<UserProfile | null>(() => {
    const savedId = loadActiveProfileId();
    const loaded  = loadProfiles();
    if (loaded.length === 0) return null;
    return loaded.find(p => p.id === savedId) ?? null;
  });

  const [avatarUrl,  setAvatarUrl]  = useState<string | null>(null);
  // Splash = žádný profil nevybrán nebo >1 profil (výběr při startu)
  const [showSplash, setShowSplash] = useState<boolean>(() => {
    const savedId = loadActiveProfileId();
    const loaded  = loadProfiles();
    // Pokud je uložen aktivní profil, přeskočíme splash
    return !savedId || !loaded.some(p => p.id === savedId);
  });

  // ── Načti avatar při změně aktivního profilu ────────────────────────
  useEffect(() => {
    if (!activeProfile) { setAvatarUrl(null); return; }
    let cancelled = false;
    loadAvatar(activeProfile.id).then(url => {
      if (!cancelled) setAvatarUrl(url);
    });
    return () => { cancelled = true; };
  }, [activeProfile?.id]);

  // ── Aplikuj téma při startu pokud je aktivní profil ─────────────────
  useEffect(() => {
    if (activeProfile) {
      updateTheme(profileToThemePatch(activeProfile));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── switchProfile ───────────────────────────────────────────────────
  const switchProfile = useCallback((id: string) => {
    const all     = loadProfiles();
    const profile = all.find(p => p.id === id);
    if (!profile) return;
    touchProfile(id);
    // Znovu načti po touch (aktualizuje lastUsedAt)
    const refreshed = loadProfiles().find(p => p.id === id) ?? profile;
    setActiveProfile(refreshed);
    setProfiles(loadProfiles());
    // Aplikuj téma profilu
    updateTheme(profileToThemePatch(profile));
  }, [updateTheme]);

  // ── addProfile ──────────────────────────────────────────────────────
  const addProfile = useCallback((data: Partial<Pick<UserProfile, "name" | "emoji" | "colorAccent" | "themeMode">>) => {
    const newProfile = createProfile(data);
    setProfiles(loadProfiles());
    return newProfile;
  }, []);

  // ── editProfile ─────────────────────────────────────────────────────
  const editProfile = useCallback((id: string, patch: Partial<Omit<UserProfile, "id" | "createdAt">>) => {
    updateProfile(id, patch);
    const refreshed = loadProfiles();
    setProfiles(refreshed);
    // Pokud editujeme aktivní profil, aktualizuj stav
    if (activeProfile?.id === id) {
      const updated = refreshed.find(p => p.id === id) ?? null;
      setActiveProfile(updated);
      if (updated) updateTheme(profileToThemePatch(updated));
    }
  }, [activeProfile, updateTheme]);

  // ── removeProfile ───────────────────────────────────────────────────
  const removeProfile = useCallback((id: string) => {
    deleteProfile(id);
    const refreshed = loadProfiles();
    setProfiles(refreshed);
    if (activeProfile?.id === id) {
      setActiveProfile(null);
      setShowSplash(true);
    }
  }, [activeProfile]);

  // ── Oblíbené ────────────────────────────────────────────────────────
  const toggleFavorite = useCallback((pict: FavPictogram) => {
    if (!activeProfile) return;
    if (isFavorite(activeProfile.id, pict.id)) {
      removeFavorite(activeProfile.id, pict.id);
    } else {
      addFavorite(activeProfile.id, pict);
    }
    const refreshed = loadProfiles().find(p => p.id === activeProfile.id);
    if (refreshed) setActiveProfile(refreshed);
    setProfiles(loadProfiles());
  }, [activeProfile]);

  const checkFavorite = useCallback((id: number) => {
    if (!activeProfile) return false;
    return isFavorite(activeProfile.id, id);
  }, [activeProfile]);

  // ── Pin categories ──────────────────────────────────────────────────
  const updatePinCategories = useCallback((cats: PinCategory[]) => {
    if (!activeProfile) return;
    setPinCategories(activeProfile.id, cats);
    const refreshed = loadProfiles().find(p => p.id === activeProfile.id);
    if (refreshed) setActiveProfile(refreshed);
    setProfiles(loadProfiles());
  }, [activeProfile]);

  // ── Avatar ──────────────────────────────────────────────────────────
  const uploadAvatar = useCallback(async (blob: Blob) => {
    if (!activeProfile) return;
    await saveAvatar(activeProfile.id, blob);
    const url = URL.createObjectURL(blob);
    setAvatarUrl(url);
  }, [activeProfile]);

  // ── Dismiss splash ──────────────────────────────────────────────────
  const dismissSplash = useCallback(() => setShowSplash(false), []);

  const value = useMemo<ProfileContextValue>(() => ({
    profiles, activeProfile, switchProfile,
    addProfile, editProfile, removeProfile,
    toggleFavorite, checkFavorite, updatePinCategories,
    avatarUrl, uploadAvatar,
    showSplash, dismissSplash,
  }), [
    profiles, activeProfile, switchProfile,
    addProfile, editProfile, removeProfile,
    toggleFavorite, checkFavorite, updatePinCategories,
    avatarUrl, uploadAvatar,
    showSplash, dismissSplash,
  ]);

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────
export function useProfiles(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfiles musí být uvnitř <ProfileProvider>");
  return ctx;
}
