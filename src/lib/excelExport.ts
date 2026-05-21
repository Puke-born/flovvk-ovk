import ExcelJS from "exceljs";
import { db } from "./db";
import {
  buildExportData,
  resolvePlaceholder,
  type ExportData,
  type UnitData,
} from "./excelPlaceholders";

const PLACEHOLDER_RE = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;
const SIGNATURE_RE = /^\s*\{\{\s*inspector\.signature\s*\}\}\s*$/;
const TEMPLATE_SHEET_NAME = "Aggregat";

/**
 * Convert near-white pixels in a PNG/JPEG data URL to transparent.
 * Returns a PNG data URL. Falls back to the original on any failure.
 */
async function makeWhiteTransparent(dataUrl: string): Promise<string> {
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = dataUrl;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      // Treat near-white as transparent
      if (d[i] > 240 && d[i + 1] > 240 && d[i + 2] > 240) {
        d[i + 3] = 0;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL("image/png");
  } catch {
    return dataUrl;
  }
}

function sanitizeSheetName(name: string, fallback: string): string {
  let n = (name || fallback).replace(/[\\/?*\[\]:]/g, " ").trim();
  if (!n) n = fallback;
  if (n.length > 31) n = n.slice(0, 31);
  return n;
}

function uniqueSheetName(workbook: ExcelJS.Workbook, base: string): string {
  let name = base;
  let i = 2;
  while (workbook.getWorksheet(name)) {
    const suffix = ` (${i})`;
    name = (base.length + suffix.length > 31 ? base.slice(0, 31 - suffix.length) : base) + suffix;
    i++;
  }
  return name;
}

/**
 * Replace placeholders in a single cell. Handles strings and rich text.
 */
function replaceInCell(
  cell: ExcelJS.Cell,
  data: ExportData,
  unit: UnitData | undefined,
  workbook: ExcelJS.Workbook,
  worksheet: ExcelJS.Worksheet,
): void {
  const value = cell.value;

  // Signature image — only when cell value is exactly the signature placeholder
  if (typeof value === "string" && SIGNATURE_RE.test(value)) {
    const sig = data.inspectorSignature;
    if (sig && sig.startsWith("data:image/")) {
      const m = sig.match(/^data:image\/(\w+);base64,(.+)$/);
      if (m) {
        // Always force PNG so transparency is preserved
        const base64 = m[2];
        const imgId = workbook.addImage({ base64, extension: "png" });
        const col = Number(cell.col) - 1;
        const rowIdx = Number(cell.row) - 1;
        // Size: width 2.8 cm, height 0.8 cm (96 DPI: 1 cm ≈ 37.7953 px)
        const imgWidthPx = 2.8 * 37.7953;
        const imgHeightPx = 0.8 * 37.7953;
        // Compute row height in px to anchor image to the bottom of the cell
        const rowObj = worksheet.getRow(Number(cell.row));
        const rowHeightPt = rowObj.height ?? 15; // default Excel row height
        const rowHeightPx = rowHeightPt * (96 / 72);
        const yOffsetPx = Math.max(0, rowHeightPx - imgHeightPx);
        // ExcelJS expects fractional row/col where the fraction represents
        // the offset within the cell. Convert pixel offset to a fraction.
        const rowFraction = rowHeightPx > 0 ? yOffsetPx / rowHeightPx : 0;
        worksheet.addImage(imgId, {
          tl: { col, row: rowIdx + rowFraction } as unknown as ExcelJS.Anchor,
          ext: { width: imgWidthPx, height: imgHeightPx },
          editAs: "oneCell",
        });
        cell.value = null;
      }
    } else {
      cell.value = "";
    }
    return;
  }

  const replaceString = (str: string): string =>
    str.replace(PLACEHOLDER_RE, (_, key) => {
      const v = resolvePlaceholder(key, data, unit);
      return v ?? "";
    });

  if (typeof value === "string") {
    if (PLACEHOLDER_RE.test(value)) {
      cell.value = replaceString(value);
    }
    return;
  }

  // Rich text
  if (value && typeof value === "object" && "richText" in value && Array.isArray((value as any).richText)) {
    const rt = (value as ExcelJS.CellRichTextValue).richText;
    let changed = false;
    const newRt = rt.map((part) => {
      if (typeof part.text === "string" && PLACEHOLDER_RE.test(part.text)) {
        changed = true;
        return { ...part, text: replaceString(part.text) };
      }
      return part;
    });
    if (changed) cell.value = { richText: newRt };
    return;
  }
}

const UNIT_PLACEHOLDER_RE = /\{\{\s*unit\.[a-zA-Z0-9_.]+\s*\}\}/;

function cellHasUnitPlaceholder(cell: ExcelJS.Cell): boolean {
  const v = cell.value;
  if (typeof v === "string") return UNIT_PLACEHOLDER_RE.test(v);
  if (v && typeof v === "object" && "richText" in v && Array.isArray((v as any).richText)) {
    return (v as ExcelJS.CellRichTextValue).richText.some(
      (p) => typeof p.text === "string" && UNIT_PLACEHOLDER_RE.test(p.text),
    );
  }
  return false;
}

function processSheet(
  worksheet: ExcelJS.Worksheet,
  data: ExportData,
  unit: UnitData | undefined,
  workbook: ExcelJS.Workbook,
): void {
  worksheet.eachRow({ includeEmpty: false }, (row) => {
    row.eachCell({ includeEmpty: false }, (cell) => {
      replaceInCell(cell, data, unit, workbook, worksheet);
    });
  });
}

/**
 * For non-aggregate sheets: find rows containing unit.* placeholders and
 * assign one unit per row in order. Any remaining template rows are blanked.
 */
function processSheetWithUnitRows(
  worksheet: ExcelJS.Worksheet,
  data: ExportData,
  workbook: ExcelJS.Workbook,
): void {
  // Collect unit-template rows in order
  const unitRows: ExcelJS.Row[] = [];
  worksheet.eachRow({ includeEmpty: false }, (row) => {
    let hasUnit = false;
    row.eachCell({ includeEmpty: false }, (cell) => {
      if (cellHasUnitPlaceholder(cell)) hasUnit = true;
    });
    if (hasUnit) unitRows.push(row);
  });

  // Fill per-unit rows first (without touching unit cells)
  worksheet.eachRow({ includeEmpty: false }, (row) => {
    if (unitRows.includes(row)) return;
    row.eachCell({ includeEmpty: false }, (cell) => {
      replaceInCell(cell, data, undefined, workbook, worksheet);
    });
  });

  // Now fill unit rows
  unitRows.forEach((row, i) => {
    const unit = data.units[i];
    row.eachCell({ includeEmpty: false }, (cell) => {
      replaceInCell(cell, data, unit, workbook, worksheet);
    });
  });
}

/**
 * Scan all cells in a workbook and return a sorted unique list of placeholder
 * keys (e.g. "propertyDesignation", "unit.status").
 */
export async function scanTemplate(buffer: ArrayBuffer): Promise<{
  sheetNames: string[];
  placeholders: string[];
  hasAggregateSheet: boolean;
}> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const found = new Set<string>();
  wb.eachSheet((ws) => {
    ws.eachRow({ includeEmpty: false }, (row) => {
      row.eachCell({ includeEmpty: false }, (cell) => {
        const v = cell.value;
        const collect = (str: string) => {
          let m: RegExpExecArray | null;
          PLACEHOLDER_RE.lastIndex = 0;
          while ((m = PLACEHOLDER_RE.exec(str)) !== null) found.add(m[1]);
        };
        if (typeof v === "string") collect(v);
        else if (v && typeof v === "object" && "richText" in v && Array.isArray((v as any).richText)) {
          (v as ExcelJS.CellRichTextValue).richText.forEach((p) => {
            if (typeof p.text === "string") collect(p.text);
          });
        }
      });
    });
  });
  return {
    sheetNames: wb.worksheets.map((w) => w.name),
    placeholders: Array.from(found).sort(),
    hasAggregateSheet: !!wb.getWorksheet(TEMPLATE_SHEET_NAME),
  };
}

/**
 * Write a unit's free-form remarks grid (30 rows × 13 cols) into cells H21:T50.
 * Empty cells are skipped so template formatting is preserved.
 */
function writeUnitGrid(worksheet: ExcelJS.Worksheet, grid: string[][] | undefined): void {
  if (!grid) return;
  const ROW_START = 21;
  const COL_START = 8; // H
  const MAX_ROWS = 30;
  const MAX_COLS = 13;
  for (let r = 0; r < Math.min(grid.length, MAX_ROWS); r++) {
    const row = grid[r];
    if (!row) continue;
    for (let c = 0; c < Math.min(row.length, MAX_COLS); c++) {
      const v = row[c];
      if (v === undefined || v === null || v === "") continue;
      worksheet.getCell(ROW_START + r, COL_START + c).value = v;
    }
  }
}

export async function exportInspectionToExcel(inspectionId: string): Promise<void> {
  const tpl = await db.excelTemplate.get("template");
  if (!tpl) throw new Error("Ingen Excel-mall är uppladdad. Gå till Inställningar → Excel-mall.");

  const data = await buildExportData(inspectionId);
  // Load raw units for data not exposed via placeholders (e.g. gridCells)
  const rawUnits = await db.units.where("inspectionId").equals(inspectionId).sortBy("order");
  if (data.inspectorSignature) {
    data.inspectorSignature = await makeWhiteTransparent(data.inspectorSignature);
  }
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(tpl.data);

  // Find aggregate template sheet by exact name
  const tplSheet = wb.getWorksheet(TEMPLATE_SHEET_NAME);

  // Process non-aggregate sheets first (replace inspection-level placeholders)
  wb.worksheets
    .filter((ws) => ws.name !== TEMPLATE_SHEET_NAME)
    .forEach((ws) => processSheetWithUnitRows(ws, data, wb));

  if (tplSheet && data.units.length > 0) {
    // Position to insert duplicated sheets — keep them where the template was
    const tplIndex = wb.worksheets.indexOf(tplSheet);
    // We will copy the model for each unit
    const tplModel = JSON.parse(JSON.stringify(tplSheet.model));

    data.units.forEach((unit, i) => {
      const baseName = sanitizeSheetName(
        unit.systemDesignation || `Aggregat ${i + 1}`,
        `Aggregat ${i + 1}`,
      );
      const name = uniqueSheetName(wb, baseName);
      const newSheet = wb.addWorksheet(name);
      // Copy template model into the new sheet
      const model = JSON.parse(JSON.stringify(tplModel));
      model.name = name;
      // exceljs lets us assign model — but we must keep the new id
      const newId = (newSheet as any).id;
      newSheet.model = { ...model, id: newId, name };
      processSheet(newSheet, data, unit, wb);
      writeUnitGrid(newSheet, rawUnits[i]?.gridCells);
    });

    // Move duplicated sheets to where the template was, then remove the template
    // exceljs doesn't expose reorder cleanly; removing template is sufficient — new sheets sit at end.
    wb.removeWorksheet(tplSheet.id);
    void tplIndex;
  } else if (tplSheet && data.units.length === 0) {
    // No units — just remove the template sheet so the file isn't littered with placeholders
    wb.removeWorksheet(tplSheet.id);
  }

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const safeProp = (data.inspection.propertyDesignation || "Besiktning").replace(/[\\/?*\[\]:]/g, " ").trim();
  const fileName = `${safeProp}_${data.exportDate}.xlsx`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const TEMPLATE_AGGREGATE_SHEET_NAME = TEMPLATE_SHEET_NAME;
