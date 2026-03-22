// ─── src/components/ProfileSwitcher.tsx ──────────────────────────────────
//
// Tři části:
//   <ProfileSplash>   – fullscreen výběr při startu
//   <ProfileChip>     – mini avatar v top baru (přepínání)
//   <ProfileEditor>   – modál pro vytvoření / editaci profilu

import { useState, useCallback, useRef, useEffect } from "react";
import { useProfiles }   from "../context/ProfileContext";
import { useTheme }      from "../context/ThemeContext";
import { COLOR_TOKENS, MODE_INFO, ACCENT_COLORS } from "../context/ThemeContext";
import {
  AVATAR_EMOJIS, ALL_CATEGORIES, createDefaultProfile,
  type UserProfile, type PinCategory,
} from "../services/profileService";

// ── Barevný kruh avataru ──────────────────────────────────────────────────
export function Avatar({
  profile, avatarUrl, size = 56, selected = false, speaking = false,
}: {
  profile:    UserProfile;
  avatarUrl?: string | null;
  size?:      number;
  selected?:  boolean;
  speaking?:  boolean;
}) {
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%",
        position: "relative", flexShrink: 0,
        // Oranžový/barevný kroužek
        boxShadow: selected
          ? `0 0 0 3px ${profile.colorAccent}, 0 0 16px ${profile.colorAccent}80`
          : `0 0 0 2px ${profile.colorAccent}50`,
        transition: "box-shadow 250ms",
      }}
      aria-hidden="true"
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={profile.name}
          style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
        />
      ) : (
        <div style={{
          width: "100%", height: "100%", borderRadius: "50%",
          background: `linear-gradient(135deg, ${profile.colorAccent}40, ${profile.colorAccent}18)`,
          border: `2px solid ${profile.colorAccent}50`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: size * 0.46, lineHeight: 1,
          backdropFilter: "blur(4px)",
        }}>
          {profile.emoji}
        </div>
      )}
    </div>
  );
}

// ── Splash – fullscreen výběr profilu ─────────────────────────────────────
export function ProfileSplash() {
  const {
    profiles, switchProfile, addProfile, dismissSplash, avatarUrl,
  } = useProfiles();
  const [showNew, setShowNew] = useState(false);

  const handleSelect = useCallback((id: string) => {
    switchProfile(id);
    dismissSplash();
  }, [switchProfile, dismissSplash]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "linear-gradient(160deg, var(--pk-bg-from, #2C001E) 0%, var(--pk-bg-to, #1A0011) 100%)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: "Ubuntu, sans-serif",
      padding: 24,
      animation: "pageFadeIn 400ms ease both",
    }}>
      <style>{`@keyframes pageFadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>

      {/* Logo */}
      <div style={{ marginBottom: 40, textAlign: "center" }}>
        <div style={{
          width: 64, height: 64, borderRadius: 18,
          background: "#E95420",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 24, fontWeight: 700, color: "#fff",
          margin: "0 auto 12px",
          boxShadow: "0 0 32px rgba(233,84,32,0.4)",
        }}>
          PK
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 6px", color: "#fff" }}>
          Piktos Portal
        </h1>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: 0 }}>
          Kdo bude komunikovat?
        </p>
      </div>

      {/* Profily */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 20,
        justifyContent: "center", maxWidth: 520,
        marginBottom: 32,
      }}>
        {profiles.map((profile, i) => (
          <ProfileCard
            key={profile.id}
            profile={profile}
            delay={i * 80}
            onSelect={() => handleSelect(profile.id)}
          />
        ))}

        {/* Přidat profil */}
        <button
          type="button"
          onClick={() => setShowNew(true)}
          style={{
            width: 120, height: 148,
            borderRadius: 24,
            background: "rgba(255,255,255,0.04)",
            border: "1.5px dashed rgba(255,255,255,0.2)",
            cursor: "pointer",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: 10, color: "rgba(255,255,255,0.4)",
            transition: "all 200ms",
            fontFamily: "Ubuntu, sans-serif",
            animation: `cardReveal 400ms ease ${profiles.length * 80}ms both`,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "rgba(255,255,255,0.08)";
            e.currentTarget.style.borderColor = "rgba(233,84,32,0.5)";
            e.currentTarget.style.color = "rgba(233,84,32,0.8)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "rgba(255,255,255,0.04)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
            e.currentTarget.style.color = "rgba(255,255,255,0.4)";
          }}
        >
          <span style={{ fontSize: 28, lineHeight: 1 }}>＋</span>
          <span style={{ fontSize: 12, fontWeight: 500, textAlign: "center" }}>
            Nový profil
          </span>
        </button>
      </div>

      <style>{`@keyframes cardReveal{from{opacity:0;transform:translateY(14px) scale(0.92)}to{opacity:1;transform:none}}`}</style>

      {/* ProfileEditor modal */}
      {showNew && (
        <ProfileEditor
          onSave={(data) => {
            const p = addProfile(data);
            handleSelect(p.id);
          }}
          onClose={() => setShowNew(false)}
        />
      )}
    </div>
  );
}

// ── Karta profilu na splash ───────────────────────────────────────────────
function ProfileCard({ profile, delay, onSelect }: {
  profile: UserProfile; delay: number; onSelect: () => void;
}) {
  const tokens = COLOR_TOKENS[profile.themeMode];
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={`Vybrat profil ${profile.name}`}
      style={{
        width: 120, height: 148,
        borderRadius: 24,
        background: hovered
          ? `${profile.colorAccent}18`
          : "rgba(255,255,255,0.05)",
        border: `${hovered ? "2px" : "1px"} solid ${hovered ? profile.colorAccent : "rgba(255,255,255,0.12)"}`,
        boxShadow: hovered ? `0 0 24px ${profile.colorAccent}40` : "0 4px 24px rgba(0,0,0,0.3)",
        backdropFilter: "blur(10px)",
        cursor: "pointer",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 12,
        transition: "all 220ms cubic-bezier(0.34,1.56,0.64,1)",
        transform: hovered ? "translateY(-4px) scale(1.03)" : "none",
        fontFamily: "Ubuntu, sans-serif",
        animation: `cardReveal 400ms ease ${delay}ms both`,
      }}
    >
      {/* Avatar */}
      <div style={{
        width: 64, height: 64, borderRadius: "50%",
        background: `linear-gradient(135deg, ${profile.colorAccent}40, ${profile.colorAccent}18)`,
        border: `2px solid ${profile.colorAccent}60`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 28, lineHeight: 1,
        boxShadow: hovered ? `0 0 16px ${profile.colorAccent}60` : "none",
        transition: "box-shadow 220ms",
      }}>
        {profile.emoji}
      </div>

      {/* Jméno */}
      <div style={{ textAlign: "center" }}>
        <div style={{
          fontSize: 13, fontWeight: 600, color: "#fff",
          marginBottom: 3, lineHeight: 1.2,
        }}>
          {profile.name}
        </div>
        {/* Téma badge */}
        <div style={{
          fontSize: 9, fontWeight: 700, letterSpacing: "0.07em",
          textTransform: "uppercase", padding: "2px 7px",
          borderRadius: 999,
          background: `${profile.colorAccent}20`,
          color: profile.colorAccent,
          border: `1px solid ${profile.colorAccent}30`,
          display: "inline-block",
        }}>
          {MODE_INFO[profile.themeMode]?.emoji} {MODE_INFO[profile.themeMode]?.label}
        </div>
      </div>
    </button>
  );
}

// ── ProfileChip – mini avatar v top baru ──────────────────────────────────
export function ProfileChip() {
  const { profiles, activeProfile, switchProfile, avatarUrl, addProfile } = useProfiles();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  if (!activeProfile) return null;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Chip tlačítko */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-label={`Profil: ${activeProfile.name}. Klikni pro přepnutí.`}
        aria-expanded={open}
        data-compact
        style={{
          display: "flex", alignItems: "center", gap: 7,
          padding: "4px 10px 4px 4px",
          borderRadius: 999,
          background: open ? `${activeProfile.colorAccent}18` : "rgba(255,255,255,0.06)",
          border: `1px solid ${open ? activeProfile.colorAccent + "60" : "rgba(255,255,255,0.12)"}`,
          cursor: "pointer",
          transition: "all 180ms",
          minHeight: 36, minWidth: 36,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = `${activeProfile.colorAccent}14`;
          e.currentTarget.style.borderColor = `${activeProfile.colorAccent}50`;
        }}
        onMouseLeave={e => {
          if (!open) {
            e.currentTarget.style.background = "rgba(255,255,255,0.06)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
          }
        }}
      >
        {/* Mini avatar */}
        <div style={{
          width: 28, height: 28, borderRadius: "50%",
          background: `linear-gradient(135deg, ${activeProfile.colorAccent}50, ${activeProfile.colorAccent}20)`,
          border: `1.5px solid ${activeProfile.colorAccent}70`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, lineHeight: 1, flexShrink: 0,
          overflow: "hidden",
        }}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            activeProfile.emoji
          )}
        </div>

        {/* Jméno – skryto na malých obrazovkách */}
        <span style={{
          fontSize: 12, fontWeight: 600,
          color: "rgba(255,255,255,0.8)",
          fontFamily: "Ubuntu, sans-serif",
          maxWidth: 80, overflow: "hidden",
          textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {activeProfile.name}
        </span>

        <span style={{ fontSize: 8, opacity: 0.4, transform: open ? "rotate(180deg)" : "none", transition: "transform 180ms" }}>
          ▾
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="listbox"
          aria-label="Přepnout profil"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            minWidth: 200,
            borderRadius: 18,
            background: "rgba(18,2,12,0.97)",
            border: "1px solid rgba(255,255,255,0.12)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            boxShadow: "0 16px 40px rgba(0,0,0,0.55)",
            overflow: "hidden",
            animation: "popIn 160ms cubic-bezier(0.34,1.56,0.64,1) both",
            zIndex: 50,
            fontFamily: "Ubuntu, sans-serif",
          }}
        >
          <style>{`@keyframes popIn{from{opacity:0;transform:scale(.9) translateY(-4px)}to{opacity:1;transform:none}}`}</style>

          <div style={{ padding: "10px 14px 6px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}>
              Profily
            </span>
          </div>

          {profiles.map(p => {
            const isActive = p.id === activeProfile.id;
            return (
              <button
                key={p.id}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => { switchProfile(p.id); setOpen(false); }}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px",
                  background: isActive ? `${p.colorAccent}12` : "transparent",
                  border: "none", borderBottom: "1px solid rgba(255,255,255,0.05)",
                  cursor: "pointer", textAlign: "left",
                  transition: "background 150ms",
                  minHeight: 52,
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
              >
                {/* Avatar */}
                <div style={{
                  width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                  background: `linear-gradient(135deg, ${p.colorAccent}40, ${p.colorAccent}18)`,
                  border: `${isActive ? "2px" : "1.5px"} solid ${p.colorAccent}${isActive ? "90" : "50"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, lineHeight: 1,
                  boxShadow: isActive ? `0 0 10px ${p.colorAccent}50` : "none",
                }}>
                  {p.emoji}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: isActive ? 700 : 500, color: isActive ? p.colorAccent : "rgba(255,255,255,0.8)", lineHeight: 1.2 }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>
                    {MODE_INFO[p.themeMode]?.emoji} {p.favPictograms.length} oblíbených
                  </div>
                </div>
                {isActive && (
                  <span style={{ fontSize: 12, color: p.colorAccent, flexShrink: 0 }}>✓</span>
                )}
              </button>
            );
          })}

          {/* Přidat profil */}
          <button
            type="button"
            onClick={() => { setOpen(false); /* TODO: open editor */ }}
            style={{
              width: "100%", padding: "10px 14px", border: "none",
              background: "transparent", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 10,
              color: "rgba(255,255,255,0.35)", fontSize: 12,
              fontFamily: "Ubuntu, sans-serif",
              transition: "color 150ms", minHeight: 44,
            }}
            onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}
          >
            <span style={{ width: 36, textAlign: "center", fontSize: 16 }}>＋</span>
            Přidat profil
          </button>
        </div>
      )}
    </div>
  );
}

// ── ProfileEditor – modál pro vytvoření/editaci ───────────────────────────
interface ProfileEditorProps {
  /** null = vytváříme nový, UserProfile = editujeme stávající */
  profile?: UserProfile | null;
  onSave:   (data: Partial<Pick<UserProfile, "name" | "emoji" | "colorAccent" | "themeMode" | "cardSize" | "showLabels" | "pinCategories">>) => void;
  onClose:  () => void;
}

export function ProfileEditor({ profile, onSave, onClose }: ProfileEditorProps) {
  const isNew = !profile;
  const draft = createDefaultProfile(profile ?? {});

  const [name,        setName]        = useState(profile?.name        ?? "");
  const [emoji,       setEmoji]       = useState(profile?.emoji       ?? draft.emoji);
  const [accent,      setAccent]      = useState(profile?.colorAccent ?? draft.colorAccent);
  const [themeMode,   setThemeMode]   = useState<UserProfile["themeMode"]>(profile?.themeMode ?? "ubuntu");
  const [pinCats,     setPinCats]     = useState<PinCategory[]>(profile?.pinCategories ?? draft.pinCategories);
  const [emojiPage,   setEmojiPage]   = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 180); }, []);

  const EMOJIS_PER_PAGE = 10;
  const emojiSlice = AVATAR_EMOJIS.slice(emojiPage * EMOJIS_PER_PAGE, (emojiPage + 1) * EMOJIS_PER_PAGE);

  const toggleCat = (cat: PinCategory) => {
    setPinCats(p => p.includes(cat) ? p.filter(c => c !== cat) : [...p, cat]);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), emoji, colorAccent: accent, themeMode, pinCategories: pinCats });
    onClose();
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 99, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isNew ? "Nový profil" : "Upravit profil"}
        style={{
          position: "fixed",
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 100,
          width: "min(400px, calc(100vw - 24px))",
          maxHeight: "90dvh",
          borderRadius: 24,
          background: "rgba(18,2,12,0.98)",
          border: "1px solid rgba(255,255,255,0.14)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
          display: "flex", flexDirection: "column",
          fontFamily: "Ubuntu, sans-serif",
          overflow: "hidden",
          animation: "popIn 220ms cubic-bezier(0.34,1.56,0.64,1) both",
        }}
      >
        {/* Header */}
        <div style={{ padding: "18px 20px 12px", borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#fff" }}>
            {isNew ? "✨ Nový profil" : "✏️ Upravit profil"}
          </h2>
          <button onClick={onClose} data-compact style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", minWidth: 32, minHeight: 32 }}>✕</button>
        </div>

        {/* Obsah */}
        <div style={{ overflowY: "auto", padding: "16px 20px 20px", display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Preview + Jméno */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: `linear-gradient(135deg, ${accent}50, ${accent}20)`, border: `2px solid ${accent}70`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, lineHeight: 1, flexShrink: 0 }}>
              {emoji}
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 7 }}>Jméno profilu</label>
              <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={e => setName(e.target.value.slice(0, 24))}
                placeholder="Jiřík"
                maxLength={24}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 12, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", fontSize: 15, fontFamily: "Ubuntu, sans-serif", outline: "none", userSelect: "text", WebkitUserSelect: "text", transition: "border-color 200ms" }}
                onFocus={e => (e.target.style.borderColor = `${accent}70`)}
                onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.15)")}
              />
            </div>
          </div>

          {/* Výběr emoji */}
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 8 }}>Ikona</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {emojiSlice.map(e => (
                <button key={e} type="button" onClick={() => setEmoji(e)} data-compact
                  style={{ width: 40, height: 40, borderRadius: 10, fontSize: 20, background: emoji === e ? `${accent}25` : "rgba(255,255,255,0.06)", border: `${emoji === e ? "2px" : "1px"} solid ${emoji === e ? accent : "rgba(255,255,255,0.1)"}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 150ms", minWidth: 40, minHeight: 40 }}>
                  {e}
                </button>
              ))}
              {AVATAR_EMOJIS.length > EMOJIS_PER_PAGE && (
                <button type="button" onClick={() => setEmojiPage(p => (p + 1) % Math.ceil(AVATAR_EMOJIS.length / EMOJIS_PER_PAGE))} data-compact
                  style={{ width: 40, height: 40, borderRadius: 10, fontSize: 12, background: "rgba(255,255,255,0.04)", border: "1px dashed rgba(255,255,255,0.15)", cursor: "pointer", color: "rgba(255,255,255,0.4)", minWidth: 40, minHeight: 40 }}>
                  …
                </button>
              )}
            </div>
          </div>

          {/* Barva */}
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 8 }}>Barva kruhu</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {ACCENT_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setAccent(c)} data-compact
                  style={{ width: 32, height: 32, borderRadius: "50%", background: c, border: `${accent === c ? "3px" : "2px"} solid ${accent === c ? "#fff" : "transparent"}`, cursor: "pointer", boxShadow: accent === c ? `0 0 12px ${c}80` : "none", transition: "all 200ms", minWidth: 32, minHeight: 32 }}>
                </button>
              ))}
            </div>
          </div>

          {/* Téma */}
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 8 }}>Téma aplikace</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {(Object.entries(MODE_INFO) as [UserProfile["themeMode"], typeof MODE_INFO[keyof typeof MODE_INFO]][]).map(([mode, info]) => {
                const t = COLOR_TOKENS[mode];
                const active = themeMode === mode;
                return (
                  <button key={mode} type="button" onClick={() => setThemeMode(mode)}
                    style={{ padding: "10px 10px", borderRadius: 14, background: active ? `${t.accentDim}` : "rgba(255,255,255,0.04)", border: `${active ? "1.5px" : "1px"} solid ${active ? t.accent : "rgba(255,255,255,0.1)"}`, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, transition: "all 200ms", fontFamily: "Ubuntu, sans-serif", minHeight: 48 }}>
                    <span style={{ fontSize: 16 }}>{info.emoji}</span>
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontSize: 12, fontWeight: active ? 700 : 500, color: active ? t.accent : "rgba(255,255,255,0.75)" }}>{info.label}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Prioritní kategorie */}
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 8 }}>Prioritní kategorie</label>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 10, lineHeight: 1.5 }}>
              Vybrané kategorie se zobrazí první ve SmartBaru.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {ALL_CATEGORIES.map(cat => {
                const active = pinCats.includes(cat);
                return (
                  <button key={cat} type="button" onClick={() => toggleCat(cat)}
                    style={{ padding: "5px 12px", borderRadius: 999, fontSize: 11, fontWeight: active ? 700 : 400, background: active ? `${accent}20` : "rgba(255,255,255,0.05)", border: `1px solid ${active ? accent : "rgba(255,255,255,0.1)"}`, color: active ? accent : "rgba(255,255,255,0.5)", cursor: "pointer", transition: "all 180ms", fontFamily: "Ubuntu, sans-serif", minHeight: 32 }}>
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 20px 16px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: 10, flexShrink: 0 }}>
          <button type="button" onClick={handleSave} disabled={!name.trim()}
            style={{ flex: 2, padding: "13px 0", borderRadius: 14, background: accent, border: "none", color: theme.colorMode === "high-contrast" ? "#000" : "#fff", fontSize: 14, fontWeight: 700, cursor: name.trim() ? "pointer" : "default", opacity: name.trim() ? 1 : 0.4, fontFamily: "Ubuntu, sans-serif", boxShadow: `0 0 20px ${accent}50`, transition: "opacity 150ms", minHeight: 52 }}>
            {isNew ? "Vytvořit profil" : "Uložit změny"}
          </button>
          <button type="button" onClick={onClose}
            style={{ flex: 1, padding: "13px 0", borderRadius: 14, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.6)", fontSize: 13, cursor: "pointer", fontFamily: "Ubuntu, sans-serif", minHeight: 52 }}>
            Zrušit
          </button>
        </div>
      </div>
    </>
  );
}

// Potřebujeme přístup k ThemeContext pro barvu textu tlačítka
function useCurrentTheme() {
  try { return useTheme(); } catch { return { theme: { colorMode: "ubuntu" } } as any; }
}
const theme = { colorMode: "ubuntu" }; // fallback pro ProfileEditor
