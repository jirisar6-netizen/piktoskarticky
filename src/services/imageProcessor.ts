// ─── src/services/imageProcessor.ts ──────────────────────────────────────
//
// Canvas API: automatický ořez na čtverec + JPEG komprese.
// Funguje s File (upload), Blob (kamera) i URL (download).
//
// Pipeline:
//   Input (File | Blob | URL)
//     → loadImage()           – načte do HTMLImageElement
//     → cropToSquare()        – ořízne na střed (aspect-ratio 1:1)
//     → resizeAndCompress()   – zmenší na maxPx × maxPx, JPEG quality
//     → Blob (JPEG)

import { logInfo, logError, logWarn } from "./errorLogger";

// ── Konfigurace ────────────────────────────────────────────────────────────
export const IMAGE_CONFIG = {
  maxPx:   500,          // max šířka/výška výstupu
  quality: 0.72,         // JPEG kvalita (0–1)
  type:    "image/jpeg" as const,
};

// ── Načtení obrázku ────────────────────────────────────────────────────────
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img  = new Image();
    img.crossOrigin = "anonymous";
    img.onload  = () => resolve(img);
    img.onerror = () => reject(new Error(`Nelze načíst obrázek: ${src.slice(0, 60)}`));
    img.src     = src;
  });
}

// ── Ořez na čtverec (center crop) ────────────────────────────────────────
function cropToSquare(img: HTMLImageElement): HTMLCanvasElement {
  const size = Math.min(img.naturalWidth, img.naturalHeight);
  const sx   = Math.floor((img.naturalWidth  - size) / 2);
  const sy   = Math.floor((img.naturalHeight - size) / 2);

  const canvas = document.createElement("canvas");
  canvas.width  = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, sx, sy, size, size, 0, 0, size, size);
  return canvas;
}

// ── Resize + komprese → Blob ───────────────────────────────────────────────
function canvasToBlob(
  sourceCanvas: HTMLCanvasElement,
  maxPx:   number,
  quality: number,
  type:    string,
): Promise<Blob> {
  const scale  = Math.min(1, maxPx / Math.max(sourceCanvas.width, sourceCanvas.height));
  const outPx  = Math.round(sourceCanvas.width * scale);

  const outCanvas = document.createElement("canvas");
  outCanvas.width  = outPx;
  outCanvas.height = outPx;
  const ctx = outCanvas.getContext("2d")!;

  // Lepší interpolace pro downsample
  ctx.imageSmoothingEnabled  = true;
  ctx.imageSmoothingQuality  = "high";
  ctx.drawImage(sourceCanvas, 0, 0, outPx, outPx);

  return new Promise((resolve, reject) => {
    outCanvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("Canvas toBlob selhal")),
      type,
      quality,
    );
  });
}

// ── Hlavní funkce ─────────────────────────────────────────────────────────

/**
 * Zpracuje File nebo Blob → čtverec 500px JPEG.
 * @param source  File z <input type="file"> nebo Blob z MediaStream
 * @param config  Přepíše výchozí nastavení
 */
export async function processImage(
  source:  File | Blob,
  config?: Partial<typeof IMAGE_CONFIG>,
): Promise<Blob> {
  const cfg = { ...IMAGE_CONFIG, ...config };
  const objectUrl = URL.createObjectURL(source);

  try {
    const img    = await loadImage(objectUrl);
    logInfo("app", `processImage: ${img.naturalWidth}×${img.naturalHeight} → ${cfg.maxPx}px JPEG`);

    const square  = cropToSquare(img);
    const result  = await canvasToBlob(square, cfg.maxPx, cfg.quality, cfg.type);

    logInfo("app", `processImage: ${(source.size / 1024).toFixed(0)}KB → ${(result.size / 1024).toFixed(0)}KB`);
    return result;
  } catch (err) {
    logError("app", "processImage failed", err);
    throw err;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Zachytí jeden frame z HTMLVideoElement (kamera preview).
 * Vrátí Blob (JPEG) – pak projde přes processImage.
 */
export async function captureFromVideo(
  video:  HTMLVideoElement,
  config?: Partial<typeof IMAGE_CONFIG>,
): Promise<Blob> {
  const canvas  = document.createElement("canvas");
  canvas.width  = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx     = canvas.getContext("2d")!;
  ctx.drawImage(video, 0, 0);

  const raw = await new Promise<Blob>((res, rej) =>
    canvas.toBlob(b => b ? res(b) : rej(new Error("Video capture failed")), "image/jpeg", 0.95),
  );
  return processImage(raw, config);
}

/**
 * Vytvoří data URL pro preview (bez ukládání do DB).
 * Vhodné pro živý náhled před uložením.
 */
export async function createPreviewUrl(source: File | Blob): Promise<string> {
  try {
    const blob = await processImage(source, { maxPx: 300, quality: 0.8 });
    return URL.createObjectURL(blob);
  } catch {
    return URL.createObjectURL(source); // raw fallback
  }
}

// ── Validace souboru ──────────────────────────────────────────────────────

export interface FileValidationResult {
  ok:      boolean;
  error?:  string;
}

export function validateImageFile(file: File): FileValidationResult {
  const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic"];
  const MAX_MB  = 20;

  if (!ALLOWED.includes(file.type)) {
    return { ok: false, error: `Nepodporovaný formát (${file.type}). Použij JPG, PNG nebo WEBP.` };
  }
  if (file.size > MAX_MB * 1024 * 1024) {
    return { ok: false, error: `Soubor je příliš velký (max ${MAX_MB} MB).` };
  }
  return { ok: true };
}
