// ═══════════════════════════════════════════════════════════════════════════
//  Piktos Portal – Google Apps Script Proxy
//  Soubor: docs/apps-script-proxy.js
// ═══════════════════════════════════════════════════════════════════════════
//
//  INSTALACE:
//  1. Otevři svou Google Sheets tabulku
//  2. Rozšíření → Apps Script
//  3. Smaž výchozí kód a vlož tento soubor
//  4. Ulož (Ctrl+S)
//  5. Nasadit → Nové nasazení
//     - Typ:         Webová aplikace
//     - Popis:       Piktos Portal sync
//     - Spustit jako: Já (your@email.com)
//     - Přístup:     Kdokoli
//  6. Klikni "Nasadit" → zkopíruj URL webové aplikace
//  7. Vlož URL do Piktos → ikona mráčku → Apps Script URL → Uložit
//
//  SCHÉMA TABULKY (list "Grid"):
//  Řádek 1 = hlavička (vytvoří se automaticky)
//  A: id        B: label    C: category
//  D: audioUrl  E: pinned   F: updatedAt
// ═══════════════════════════════════════════════════════════════════════════

// ── Konfigurace ────────────────────────────────────────────────────────────
const SHEET_NAME = "Grid";
// ID tabulky se načte automaticky z kontextu – není třeba nastavovat
// const SHEET_ID = "...";  // alternativně: SpreadsheetApp.openById(ID)

// ── GET handler ────────────────────────────────────────────────────────────
function doGet(e) {
  try {
    const action = e && e.parameter && e.parameter.action;

    if (action === "getGrid") {
      return getGrid();
    }

    if (action === "ping") {
      return jsonResponse({ status: "ok", message: "Piktos proxy aktivní" });
    }

    return jsonResponse({ error: "Neznámá akce. Použij ?action=getGrid nebo ?action=ping" });
  } catch (err) {
    return jsonResponse({ status: "error", message: err.toString() });
  }
}

// ── POST handler ───────────────────────────────────────────────────────────
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("Prázdné tělo požadavku.");
    }

    const data = JSON.parse(e.postData.contents);

    if (data.action === "setGrid") {
      return setGrid(data.rows || []);
    }

    throw new Error("Neznámá akce: " + data.action);
  } catch (err) {
    return jsonResponse({ status: "error", message: err.toString() });
  }
}

// ── getGrid: čti ze Sheets ─────────────────────────────────────────────────
function getGrid() {
  const sheet = getOrCreateSheet();
  const lastRow = sheet.getLastRow();

  // Prázdná tabulka (jen hlavička nebo nic)
  if (lastRow <= 1) {
    return jsonResponse({ rows: [], count: 0 });
  }

  // Načti všechna data od řádku 2 (přeskoč hlavičku)
  const range = sheet.getRange(2, 1, lastRow - 1, 6);
  const values = range.getValues();

  // Filtruj prázdné řádky (kde sloupec A je prázdný)
  const rows = values.filter(function(row) {
    return row[0] !== "" && row[0] !== null && row[0] !== undefined;
  });

  return jsonResponse({
    rows:      rows,
    count:     rows.length,
    updatedAt: new Date().toISOString(),
  });
}

// ── setGrid: zapiš do Sheets ───────────────────────────────────────────────
function setGrid(rows) {
  if (!Array.isArray(rows)) {
    throw new Error("rows musí být pole.");
  }

  const sheet = getOrCreateSheet();

  // Smaž všechny řádky s daty (zachovej hlavičku na řádku 1)
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
  }

  // Zapiš nové řádky
  if (rows.length > 0) {
    // Normalizuj každý řádek na 6 sloupců
    var normalizedRows = rows.map(function(row) {
      return [
        row[0] || "",   // id
        row[1] || "",   // label
        row[2] || "",   // category
        row[3] || "",   // audioUrl
        row[4] || "",   // pinned
        row[5] || new Date().toISOString(),  // updatedAt
      ];
    });

    sheet.getRange(2, 1, normalizedRows.length, 6).setValues(normalizedRows);
  }

  return jsonResponse({
    status:  "ok",
    count:   rows.length,
    savedAt: new Date().toISOString(),
  });
}

// ── Pomocné funkce ─────────────────────────────────────────────────────────
function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    // Vytvoř list s hlavičkou
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.getRange(1, 1, 1, 6).setValues([[
      "id", "label", "category", "audioUrl", "pinned", "updatedAt"
    ]]);

    // Formátování hlavičky
    var header = sheet.getRange(1, 1, 1, 6);
    header.setFontWeight("bold");
    header.setBackground("#2C001E");
    header.setFontColor("#FFFFFF");

    // Zamkni sloupce na správnou šířku
    sheet.setColumnWidth(1, 80);
    sheet.setColumnWidth(2, 150);
    sheet.setColumnWidth(3, 120);
    sheet.setColumnWidth(4, 200);
    sheet.setColumnWidth(5, 70);
    sheet.setColumnWidth(6, 160);
  }

  return sheet;
}

function jsonResponse(obj) {
  var output = ContentService.createTextOutput(JSON.stringify(obj));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
