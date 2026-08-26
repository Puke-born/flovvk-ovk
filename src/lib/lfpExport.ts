import type ExcelJS from "exceljs";
import { LFP_COL_KEYS, type LfpSheet } from "./db";

function hexToArgb(hex: string): string {
  const clean = hex.replace("#", "").toUpperCase();
  return clean.length === 6 ? `FF${clean}` : clean;
}

export interface LfpHeaderDefaults {
  kund?: string;
  anlaggning?: string;
  utfordAv?: string;
  arbNr?: string;
  datum?: string;
  system?: string;
}

/**
 * Fyll ett LFP-ark enligt LFP-appens mall:
 * header C4-C7 / J4-J7, rutnät A14:J49, anteckningar A51:J55, cellfärger.
 */
export function fillLfpSheet(
  ws: ExcelJS.Worksheet,
  sheet: LfpSheet,
  sidNr: string,
  defaults: LfpHeaderDefaults = {},
): void {
  ws.getCell("C4").value = sheet.kund || defaults.kund || null;
  ws.getCell("C5").value = sheet.anlaggning || defaults.anlaggning || null;
  ws.getCell("C6").value = sheet.system || defaults.system || null;
  ws.getCell("C7").value = sheet.utfordAv || defaults.utfordAv || null;
  ws.getCell("J4").value = sheet.plan || null;
  ws.getCell("J5").value = sidNr;
  ws.getCell("J6").value = sheet.arbNr || defaults.arbNr || null;
  ws.getCell("J7").value = sheet.datum || defaults.datum || null;

  for (let i = 0; i < 36; i++) {
    const row = sheet.rows?.[i] ?? {};
    const rowNum = 14 + i;
    LFP_COL_KEYS.forEach((key, c) => {
      const v = row[key];
      if (v !== undefined && v !== null && v !== "") {
        ws.getCell(rowNum, c + 1).value = v;
      }
    });
  }

  const noteLines = (sheet.notes || "").split("\n");
  for (let i = 0; i < 5; i++) {
    const cells = (noteLines[i] || "").split("\t");
    for (let c = 0; c < 10; c++) {
      if (cells[c]) ws.getCell(51 + i, c + 1).value = cells[c];
    }
  }

  const colors = sheet.cellColors;
  if (colors) {
    Object.entries(colors).forEach(([rowIdxStr, cols]) => {
      const rowIdx = Number(rowIdxStr);
      Object.entries(cols).forEach(([colKey, hex]) => {
        const colIdx = (LFP_COL_KEYS as readonly string[]).indexOf(colKey);
        if (colIdx === -1 || !hex) return;
        const cell = ws.getCell(14 + rowIdx, colIdx + 1);
        cell.style = {
          ...cell.style,
          fill: {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: hexToArgb(hex) },
          },
        };
      });
    });
  }
}
