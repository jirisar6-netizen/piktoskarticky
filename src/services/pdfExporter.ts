// ─── src/services/pdfExporter.ts ─────────────────────────────────────────
//
// jsPDF engine pro generování A4 PDF s tisknutelnými kartičkami.
//
// Layout (A4 = 210 × 297 mm):
//   Okraje stránky:  10 mm (vlevo/vpravo/nahoře/dole)
//   Karta:           50 × 60 mm (šířka × výška vč. labelu)
//     – obrázek:     50 × 50 mm
//     – popisek:      8 mm (font 8pt, centrovaný)
//     – mezera mezi kartami: 2 mm (pro ořez)
//   Sloupce/řádky:   3 × 4 = 12 karet na stránku
//
// Ořezové značky:
//   Tečkované čáry 0.1pt šedé mezi každou kartou
//
// Požadavky:
//   npm install jspdf

import type { PrintCard } from "../context/PrintQueueContext";
import { logInfo, logError } from "./errorLogger";

// ── Rozměry (mm) ───────────────────────────────────────────────────────────
const A4_W    = 210;
const A4_H    = 297;
const MARGIN  = 10;      // okraj stránky
const CARD_W  = 50;      // šířka kartičky
const CARD_H  = 60;      // výška celé buňky (50mm obr + 8mm text + 2mm mezera)
const IMG_H   = 50;      // výška obrázku
const LABEL_H = 7;       // výška textové oblasti
const GAP     = 2;       // mezera mezi kartami (pro ořez)
const COLS    = 3;       // sloupců na stránce
const ROWS    = 4;       // řádků na stránce

// Celkový grid (3 × 50mm + 2 × 2mm mezera + 2 × 10mm okraj = 176mm → OK)
const GRID_W  = COLS * CARD_W + (COLS - 1) * GAP;  // 3×50 + 2×2 = 154mm
const GRID_H  = ROWS * CARD_H + (ROWS - 1) * GAP;  // 4×60 + 3×2 = 246mm
// Počáteční bod gridu (centrovaný na stránce)
const START_X = (A4_W - GRID_W) / 2;                // ≈ 28mm
const START_Y = (A4_H - GRID_H) / 2;                // ≈ 25.5mm

// ── Přidání jsPDF dynamicky ────────────────────────────────────────────────
async function loadJsPDF(): Promise<any> {
  // @ts-ignore – dynamický import pro tree shaking
  const { jsPDF } = await import("jspdf");
  return jsPDF;
}

// ── Načtení obrázku jako base64 ───────────────────────────────────────────
async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response  = await fetch(url, { mode: "cors" });
    if (!response.ok) return null;
    const blob      = await response.blob();
    return new Promise((resolve) => {
      const reader   = new FileReader();
      reader.onload  = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ── Výpočet pozice buňky ──────────────────────────────────────────────────
function cellPosition(index: number): { x: number; y: number; col: number; row: number } {
  const col = index % COLS;
  const row = Math.floor(index % (COLS * ROWS) / COLS);
  const x   = START_X + col * (CARD_W + GAP);
  const y   = START_Y + row * (CARD_H + GAP);
  return { x, y, col, row };
}

// ── Ořezové značky ────────────────────────────────────────────────────────
function drawCropMarks(doc: any, x: number, y: number, w: number, h: number) {
  // Tečkovaný styl pro ořezové čáry
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.1);
  doc.setLineDashPattern([0.5, 0.5], 0);

  const markLen = 3;  // délka čáry ořezové značky (mm)
  const offset  = 0.5; // odsazení od rohu

  // Rohové značky – L tvar u každého rohu
  const corners = [
    { cx: x, cy: y, hDir: -1, vDir: -1 },
    { cx: x + w, cy: y, hDir: 1, vDir: -1 },
    { cx: x, cy: y + h, hDir: -1, vDir: 1 },
    { cx: x + w, cy: y + h, hDir: 1, vDir: 1 },
  ];

  for (const { cx, cy, hDir, vDir } of corners) {
    // Horizontální čára
    doc.line(
      cx + hDir * offset,
      cy,
      cx + hDir * (offset + markLen),
      cy,
    );
    // Vertikální čára
    doc.line(
      cx,
      cy + vDir * offset,
      cx,
      cy + vDir * (offset + markLen),
    );
  }

  // Reset dash
  doc.setLineDashPattern([], 0);
}

// ── Zaoblený obdélník (fallback bez roundedRect) ──────────────────────────
function drawRoundedRect(doc: any, x: number, y: number, w: number, h: number, r: number, style = "S") {
  try {
    doc.roundedRect(x, y, w, h, r, r, style);
  } catch {
    doc.rect(x, y, w, h, style);
  }
}

// ── Hlavní export funkce ──────────────────────────────────────────────────
export interface ExportOptions {
  /** Zobrazit VOKS barevné rámečky */
  showVoksColors:  boolean;
  /** Zobrazit ořezové značky */
  showCropMarks:   boolean;
  /** Zobrazit popisky */
  showLabels:      boolean;
  /** Velká písmena */
  uppercase:       boolean;
  /** Barva pozadí karet */
  cardBg:          string;    // hex, výchozí "#FFFFFF"
  /** Název souboru */
  filename:        string;
  /** Callback pro průběh (0–1) */
  onProgress?:     (progress: number) => void;
}

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  showVoksColors: true,
  showCropMarks:  true,
  showLabels:     true,
  uppercase:      false,
  cardBg:         "#FFFFFF",
  filename:       "piktos-karticky.pdf",
};

export async function exportToPDF(
  cards:   PrintCard[],
  options: Partial<ExportOptions> = {},
): Promise<void> {
  const opts = { ...DEFAULT_EXPORT_OPTIONS, ...options };

  if (!cards.length) {
    throw new Error("Fronta k tisku je prázdná.");
  }

  logInfo("app", `PDF export: ${cards.length} karet`);

  // ── Načtení jsPDF ───────────────────────────────────────────────────
  const JsPDF = await loadJsPDF();
  const doc   = new JsPDF({
    orientation: "portrait",
    unit:        "mm",
    format:      "a4",
  });

  // Metadata
  doc.setProperties({
    title:    "Piktos – kartičky k tisku",
    subject:  "Komunikační piktogramy AAC",
    author:   "Piktos Portal",
    creator:  "Piktos Portal v0.1.7",
  });

  // ── Načtení obrázků (paralelně v dávkách) ───────────────────────────
  opts.onProgress?.(0.05);
  const BATCH = 6;
  const imageData: (string | null)[] = new Array(cards.length).fill(null);

  for (let i = 0; i < cards.length; i += BATCH) {
    const batch = cards.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map(card => loadImageAsBase64(card.imageUrl)),
    );
    results.forEach((data, j) => { imageData[i + j] = data; });
    opts.onProgress?.(0.05 + (i / cards.length) * 0.6);
  }

  opts.onProgress?.(0.65);

  // ── Generování stránek ──────────────────────────────────────────────
  const totalPages = Math.ceil(cards.length / (COLS * ROWS));

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) doc.addPage();

    const pageCards   = cards.slice(page * COLS * ROWS, (page + 1) * COLS * ROWS);
    const isLastPage  = page === totalPages - 1;

    // ── Záhlaví stránky ────────────────────────────────────────────
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(180, 180, 180);
    doc.text(
      `Piktos Portal – strana ${page + 1} / ${totalPages}  •  ${new Date().toLocaleDateString("cs-CZ")}`,
      A4_W / 2,
      6,
      { align: "center" },
    );

    // ── Mřížka karet ──────────────────────────────────────────────
    pageCards.forEach((card, localIdx) => {
      const cardGlobalIdx = page * COLS * ROWS + localIdx;
      const { x, y }      = cellPosition(localIdx);
      const imgUrl        = imageData[cardGlobalIdx];
      const label         = opts.uppercase ? card.label.toUpperCase() : card.label;

      // ── Pozadí kartičky ────────────────────────────────────────
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.2);
      drawRoundedRect(doc, x, y, CARD_W, IMG_H, 3, "FD");

      // ── VOKS barevný rámeček ──────────────────────────────────
      if (opts.showVoksColors && card.voksColor) {
        const hex = card.voksColor.replace("#", "");
        if (hex.length === 6) {
          const r = parseInt(hex.slice(0, 2), 16);
          const g = parseInt(hex.slice(2, 4), 16);
          const b = parseInt(hex.slice(4, 6), 16);
          doc.setDrawColor(r, g, b);
          doc.setLineWidth(1.2);
          drawRoundedRect(doc, x, y, CARD_W, IMG_H, 3, "S");
        }
      }

      // ── Obrázek ────────────────────────────────────────────────
      if (imgUrl) {
        try {
          // Obrázek centrovaný s 4mm vnitřním paddingem
          const pad = 4;
          doc.addImage(
            imgUrl,
            "JPEG",
            x + pad,
            y + pad,
            CARD_W - pad * 2,
            IMG_H  - pad * 2,
            undefined,
            "FAST",
          );
        } catch (err) {
          // Fallback: placeholder s textem
          logError("app", `PDF addImage failed for card ${card.id}`, err);
          doc.setFontSize(8);
          doc.setTextColor(180, 180, 180);
          doc.text("?", x + CARD_W / 2, y + IMG_H / 2, { align: "center", baseline: "middle" });
        }
      } else {
        // Placeholder – obrázek se nepodařilo načíst
        doc.setFontSize(7);
        doc.setTextColor(200, 200, 200);
        doc.text(
          "Obr. nedostupný",
          x + CARD_W / 2,
          y + IMG_H / 2,
          { align: "center", baseline: "middle" },
        );
      }

      // ── Textový popisek ────────────────────────────────────────
      if (opts.showLabels) {
        const labelY = y + IMG_H + LABEL_H / 2 + 0.5;

        // Bílé pozadí pod textem
        doc.setFillColor(248, 248, 248);
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.1);
        doc.rect(x, y + IMG_H, CARD_W, LABEL_H, "FD");

        // Text – centrovaný, tučný, Ubuntu fallback na Helvetica
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(30, 30, 30);

        // Zkrátit dlouhý label
        const maxW    = CARD_W - 4;
        let display   = label;
        while (
          display.length > 1 &&
          doc.getTextWidth(display) > maxW
        ) {
          display = display.slice(0, -1);
        }
        if (display.length < label.length) display += "…";

        doc.text(display, x + CARD_W / 2, labelY, {
          align:    "center",
          baseline: "middle",
        });
      }

      // ── Ořezové značky ─────────────────────────────────────────
      if (opts.showCropMarks) {
        drawCropMarks(doc, x, y, CARD_W, IMG_H + LABEL_H);
      }
    });

    // ── Číslo stránky (zápatí) ─────────────────────────────────
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(200, 200, 200);
    doc.text(
      `${page + 1} / ${totalPages}`,
      A4_W / 2,
      A4_H - 5,
      { align: "center" },
    );

    opts.onProgress?.(0.65 + ((page + 1) / totalPages) * 0.3);
  }

  opts.onProgress?.(0.95);

  // ── Uložení ─────────────────────────────────────────────────────────
  doc.save(opts.filename);

  opts.onProgress?.(1.0);
  logInfo("app", `PDF export hotov: ${opts.filename}, ${totalPages} stran`);
}

// ── Náhled rozložení (pro UI) ─────────────────────────────────────────────
export const LAYOUT_INFO = {
  cardsPerPage: COLS * ROWS,
  cols:         COLS,
  rows:         ROWS,
  cardW_mm:     CARD_W,
  cardH_mm:     CARD_H,
  imgH_mm:      IMG_H,
  labelH_mm:    LABEL_H,
  marginMm:     MARGIN,
};
