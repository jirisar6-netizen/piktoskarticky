/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // ── Barvy ─────────────────────────────────────────────────────────
      colors: {
        "ubuntu-aubergine": "#2C001E",
        "ubuntu-dark":      "#1A0011",
        "ubuntu-orange":    "#E95420",
        // Průhledné varianty pro Tailwind třídy
        "orange": {
          DEFAULT: "#E95420",
          10:  "rgba(233,84,32,0.10)",
          15:  "rgba(233,84,32,0.15)",
          20:  "rgba(233,84,32,0.20)",
          30:  "rgba(233,84,32,0.30)",
          50:  "rgba(233,84,32,0.50)",
          70:  "rgba(233,84,32,0.70)",
        },
      },

      // ── Písmo ─────────────────────────────────────────────────────────
      fontFamily: {
        sans: ["Ubuntu", "ui-sans-serif", "system-ui", "sans-serif"],
      },

      // ── Zaoblení ──────────────────────────────────────────────────────
      borderRadius: {
        "card-sm": "20px",
        "card-md": "28px",
        "card-lg": "32px",
        "pill":    "999px",
      },

      // ── Stíny ─────────────────────────────────────────────────────────
      boxShadow: {
        "card":       "0 4px 24px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.06) inset",
        "card-hover": "0 8px 32px rgba(0,0,0,0.55), 0 0 0 2px rgba(233,84,32,0.55), 0 1px 0 rgba(255,255,255,0.08) inset",
        "orange":     "0 0 20px rgba(233,84,32,0.35)",
        "orange-lg":  "0 0 40px rgba(233,84,32,0.45)",
        "inset-top":  "inset 0 1px 0 rgba(255,255,255,0.08)",
      },

      // ── Přechody ──────────────────────────────────────────────────────
      transitionTimingFunction: {
        "spring": "cubic-bezier(0.34, 1.56, 0.64, 1)",
        "out":    "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      transitionDuration: {
        "150":  "150ms",
        "250":  "250ms",
        "400":  "400ms",
      },

      // ── Rozměry ───────────────────────────────────────────────────────
      minWidth:  { "hit": "48px" },
      minHeight: { "hit": "48px" },

      // ── Animace ───────────────────────────────────────────────────────
      keyframes: {
        pageFadeIn: {
          "from": { opacity: "0", transform: "translateY(8px)" },
          "to":   { opacity: "1", transform: "translateY(0)" },
        },
        cardReveal: {
          "from": { opacity: "0", transform: "translateY(12px) scale(0.96)" },
          "to":   { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        voicePulse: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(233,84,32,0.7)" },
          "50%":      { boxShadow: "0 0 0 8px rgba(233,84,32,0)" },
        },
        popIn: {
          "from": { opacity: "0", transform: "scale(0.92) translateY(-6px)" },
          "to":   { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        piktosPing: {
          "75%, 100%": { transform: "scale(2.2)", opacity: "0" },
        },
        shimmer: {
          "0%, 100%": { opacity: "0.45" },
          "50%":      { opacity: "0.85" },
        },
        recBlink: {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.35" },
        },
      },
      animation: {
        "page-enter":   "pageFadeIn 400ms cubic-bezier(0.22,1,0.36,1) both",
        "card-reveal":  "cardReveal 400ms cubic-bezier(0.22,1,0.36,1) both",
        "voice-pulse":  "voicePulse 900ms ease-in-out infinite",
        "pop-in":       "popIn 180ms cubic-bezier(0.22,1,0.36,1) both",
        "piktos-ping":  "piktosPing 1.4s cubic-bezier(0,0,0.2,1) infinite",
        "shimmer":      "shimmer 1.6s ease-in-out infinite",
        "rec-blink":    "recBlink 800ms ease-in-out infinite",
      },

      // ── Backdrop blur ─────────────────────────────────────────────────
      backdropBlur: {
        "xs": "4px",
        "sm": "8px",
        "md": "12px",
        "lg": "20px",
      },
    },
  },
  plugins: [],
};
