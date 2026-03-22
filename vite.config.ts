import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// ─── Vite + PWA konfigurace ───────────────────────────────────────────────
export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      // ── Registrace service workeru ──────────────────────────────────
      registerType: "autoUpdate",       // tichá aktualizace na pozadí
      injectRegister: "auto",           // automatická injekce do index.html
      devOptions: {
        enabled: true,                  // testování SW i v dev módu
        type: "module",
      },

      // ── Manifest (redundantní k public/manifest.json, ale PWA plugin
      //    ho použije pro generování fallbacků)
      includeAssets: [
        "icons/*.png",
        "icons/apple-touch-icon.png",
        "favicon.ico",
        "robots.txt",
      ],

      manifest: {
        name:             "Piktos Portal",
        short_name:       "Piktos",
        description:      "Komunikační aplikace s piktogramy pro děti s autismem",
        lang:             "cs",
        start_url:        "/",
        scope:            "/",
        display:          "standalone",
        orientation:      "any",
        background_color: "#1A0011",
        theme_color:      "#E95420",
        icons: [
          { src: "/icons/icon-72.png",   sizes: "72x72",   type: "image/png" },
          { src: "/icons/icon-96.png",   sizes: "96x96",   type: "image/png" },
          { src: "/icons/icon-128.png",  sizes: "128x128", type: "image/png" },
          { src: "/icons/icon-144.png",  sizes: "144x144", type: "image/png" },
          { src: "/icons/icon-152.png",  sizes: "152x152", type: "image/png", purpose: "maskable" },
          { src: "/icons/icon-192.png",  sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "/icons/icon-384.png",  sizes: "384x384", type: "image/png" },
          { src: "/icons/icon-512.png",  sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        shortcuts: [
          {
            name: "Guardian SOS",
            short_name: "SOS",
            url: "/sos",
            icons: [{ src: "/icons/icon-96.png", sizes: "96x96" }],
          },
          {
            name: "Vyhledávání",
            short_name: "Hledat",
            url: "/app",
            icons: [{ src: "/icons/icon-96.png", sizes: "96x96" }],
          },
        ],
      },

      // ── Workbox konfigurace ─────────────────────────────────────────
      workbox: {
        // ── Precache: všechny build artefakty (JS, CSS, HTML) ─────────
        // Piktos bude fungovat offline ihned po první návštěvě
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],

        // Maximální velikost souboru pro precache (piktogramy jsou ~15 KB)
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB

        // ── Runtime Cache pravidla ─────────────────────────────────────
        runtimeCaching: [

          // ── 1. ARASAAC statické piktogramy (CDN) ─────────────────────
          // Strategie: CacheFirst – jednou stažené = navždy offline
          // Uložíme až 2 000 obrázků, TTL 365 dní
          {
            urlPattern: /^https:\/\/static\.arasaac\.org\/pictograms\/.+/,
            handler: "CacheFirst",
            options: {
              cacheName:  "arasaac-pictograms",
              expiration: {
                maxEntries:       2000,     // max 2000 piktogramů
                maxAgeSeconds:    365 * 24 * 60 * 60, // 1 rok
                purgeOnQuotaError: true,    // uvolní místo při plném úložišti
              },
              cacheableResponse: {
                statuses: [0, 200],         // 0 = opaque response (CORS)
              },
              // Fallback pro offline: vrátí cache i po expiraci
              fetchOptions: {
                mode: "cors",
              },
            },
          },

          // ── 2. ARASAAC Search API ──────────────────────────────────────
          // Strategie: StaleWhileRevalidate – rychlá odpověď z cache +
          // tichá aktualizace na pozadí (kompromis: rychlost vs. čerstvost)
          {
            urlPattern: /^https:\/\/api\.arasaac\.org\/api\/.+/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName:  "arasaac-api",
              expiration: {
                maxEntries:    500,           // 500 unikátních vyhledávání
                maxAgeSeconds: 7 * 24 * 60 * 60, // 7 dní
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },

          // ── 3. Google Fonts (Ubuntu) ────────────────────────────────────
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.+/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "google-fonts-stylesheets",
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.+/,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: {
                maxEntries:    30,
                maxAgeSeconds: 365 * 24 * 60 * 60, // 1 rok
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },

          // ── 4. SPA navigace – NetworkFirst s fallbackem na index.html ──
          // Zajistí, že /sos, /app atd. fungují i offline
          {
            urlPattern: /^https?:\/\/[^/]+\/(?!api).*/,
            handler: "NetworkFirst",
            options: {
              cacheName:          "app-shell",
              networkTimeoutSeconds: 3,       // 3s timeout → fallback na cache
              expiration: {
                maxEntries:    10,
                maxAgeSeconds: 24 * 60 * 60,  // 24 hodin
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],

        // ── Skip waiting: nový SW přebere kontrolu okamžitě ─────────────
        skipWaiting: true,
        clientsClaim: true,

        // ── Navigační fallback pro SPA (react-router) ────────────────────
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api/, /^\/icons/],
      },
    }),
  ],

  // ── Vývojový server ─────────────────────────────────────────────────────
  server: {
    port: 5173,
    host: true,          // dostupný v lokální síti (tablet na stejné WiFi)
  },

  // ── Build optimalizace ──────────────────────────────────────────────────
  build: {
    target:    "es2018",     // podpora starších tabletů na Androidu 7+
    sourcemap: false,
    rollupOptions: {
      output: {
        // Code splitting pro rychlejší first load
        manualChunks: {
          vendor:  ["react", "react-dom"],
          router:  ["react-router-dom"],
        },
      },
    },
  },
});
