import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { type Inspection, type Unit, type Contact, type Inspector } from "./db";
import { formatDateSE } from "./utils";

interface PdfContext {
  inspection: Inspection;
  units: Unit[];
  propertyOwner?: Contact;
  operationsManager?: Contact;
  inspector?: Inspector;
}

const RED = "#c92a2a" as const;
const DARK = "#1a1f2c" as const;

function header(doc: jsPDF, title: string) {
  doc.setFillColor(RED);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 18, "F");
  doc.setFont("helvetica", "bold");
  doc.setTextColor("#ffffff");
  doc.setFontSize(14);
  doc.text(title, 14, 12);
  doc.setTextColor(DARK);
}

function footer(doc: jsPDF, ctx: PdfContext) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  doc.setDrawColor("#e5e7eb");
  doc.line(14, h - 22, w - 14, h - 22);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor("#6b7280");
  const insp = ctx.inspector?.name || ctx.inspection.inspectorName || "";
  const company = ctx.inspector?.company || ctx.inspection.inspectorCompany || "";
  doc.text(`${insp}${company ? " · " + company : ""}`, 14, h - 14);
  const dateStr = formatDateSE(Date.now());
  doc.text(`Genererad ${dateStr}`, w - 14, h - 14, { align: "right" });
  doc.setTextColor(DARK);
}

function fileName(ctx: PdfContext, kind: string) {
  const safe = (s: string) => s.replace(/[^\p{L}\p{N}\-_]+/gu, "_").slice(0, 40);
  const prop = safe(ctx.inspection.propertyDesignation || "OVK");
  const date = formatDateSE(Date.now());
  return `OVK_${kind}_${prop}_${date}.pdf`;
}

export function exportIntygPdf(ctx: PdfContext) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  header(doc, "OVK – Intyg om obligatorisk ventilationskontroll");

  const left = 14;
  let y = 28;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Fastighet", left, y);
  doc.setFont("helvetica", "normal");
  y += 5;
  const propLines = [
    ["Fastighetsbeteckning", ctx.inspection.propertyDesignation],
    ["Adress", [ctx.inspection.address, ctx.inspection.postalCode, ctx.inspection.city].filter(Boolean).join(", ")],
    ["Byggår", ctx.inspection.buildingYear ?? ""],
    ["Byggnorm", ctx.inspection.buildingNorm ?? ""],
  ];
  propLines.forEach(([k, v]) => {
    doc.setTextColor("#6b7280");
    doc.text(`${k}:`, left, y);
    doc.setTextColor(DARK);
    doc.text(String(v ?? ""), left + 45, y);
    y += 5;
  });

  y += 4;
  doc.setFont("helvetica", "bold");
  doc.text("Sammanställning aggregat", left, y);
  y += 2;

  autoTable(doc, {
    startY: y + 2,
    head: [["#", "System", "Betjänar", "Utfall", "Besiktningsdatum", "Nästa ord. besiktning"]],
    body: ctx.units
      .sort((a, b) => a.order - b.order)
      .map((u, i) => [
        String(i + 1),
        u.systemDesignation || "—",
        [u.placement, u.servedArea].filter(Boolean).join(" / ") || "—",
        u.verdict || "—",
        u.inspectionDate || "—",
        u.nextOrdinaryDate || "—",
      ]),
    headStyles: { fillColor: RED, textColor: "#ffffff", fontStyle: "bold" },
    styles: { fontSize: 9, cellPadding: 2.5 },
    alternateRowStyles: { fillColor: "#fafafa" },
    margin: { left, right: 14 },
  });

  // signature block (lastAutoTable injected by jspdf-autotable)
  const endY = (doc as any).lastAutoTable?.finalY ?? y + 60;
  let sy = endY + 14;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Besiktningsman", left, sy);
  doc.setFont("helvetica", "normal");
  sy += 6;
  const ins = ctx.inspector;
  const insLines = [
    ["Namn", ctx.inspection.inspectorName ?? ins?.name ?? ""],
    ["Behörighet", ctx.inspection.inspectorAuthorization ?? ins?.authorization ?? ""],
    ["Företag", ctx.inspection.inspectorCompany ?? ins?.company ?? ""],
    ["Telefon", ctx.inspection.inspectorPhone ?? ins?.phone ?? ""],
    ["E-post", ctx.inspection.inspectorEmail ?? ins?.email ?? ""],
  ];
  insLines.forEach(([k, v]) => {
    doc.setTextColor("#6b7280");
    doc.text(`${k}:`, left, sy);
    doc.setTextColor(DARK);
    doc.text(String(v ?? ""), left + 45, sy);
    sy += 5;
  });

  // signature line
  sy += 12;
  doc.setDrawColor("#1a1f2c");
  doc.line(left, sy, left + 80, sy);
  doc.setFontSize(8);
  doc.setTextColor("#6b7280");
  doc.text("Underskrift", left, sy + 4);
  doc.setTextColor(DARK);

  footer(doc, ctx);
  doc.save(fileName(ctx, "Intyg"));
}

export function exportProtokollPdf(ctx: PdfContext) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const units = ctx.units.sort((a, b) => a.order - b.order);

  units.forEach((u, idx) => {
    if (idx > 0) doc.addPage();
    header(doc, `OVK – Protokoll (Aggregat ${idx + 1} av ${units.length})`);
    const left = 14;
    let y = 28;
    doc.setFontSize(10);

    const block = (title: string, rows: [string, string][]) => {
      doc.setFont("helvetica", "bold");
      doc.setFillColor("#f3f4f6");
      doc.rect(left, y - 4, doc.internal.pageSize.getWidth() - 28, 6, "F");
      doc.text(title, left + 2, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      rows.forEach(([k, v]) => {
        doc.setTextColor("#6b7280");
        doc.text(`${k}:`, left, y);
        doc.setTextColor(DARK);
        doc.text(String(v ?? "") || "—", left + 55, y);
        y += 5;
      });
      y += 3;
    };

    block("Fastighet", [
      ["Fastighetsbeteckning", ctx.inspection.propertyDesignation],
      ["Adress", [ctx.inspection.address, ctx.inspection.postalCode, ctx.inspection.city].filter(Boolean).join(", ")],
      ["Byggår", ctx.inspection.buildingYear ?? ""],
      ["Bygg.ID", ctx.inspection.buildingId ?? ""],
      ["Byggnorm", ctx.inspection.buildingNorm ?? ""],
    ]);

    block("Aggregat", [
      ["Systembeteckning", u.systemDesignation],
      ["Placering", u.placement ?? ""],
      ["Aggregat", u.aggregate ?? ""],
      ["Typ av ventilation", u.ventilationType ?? ""],
      ["Betjänad yta", u.servedArea ?? ""],
      ["Verksamhet", u.business ?? ""],
      ["Antal lägenheter", u.apartmentCount ?? ""],
      ["Drifttider", u.operatingHours ?? ""],
      ["Märkeffekt", u.ratedPower ?? ""],
      ["Luftmängd", u.airflow ?? ""],
      ["Q-dysa", u.qNozzle ?? ""],
    ]);

    block("Besiktning", [
      ["Typ av besiktning", u.inspectionType ?? ""],
      ["Besiktningsintervall", u.inspectionInterval ?? ""],
      ["Besiktningsdatum", u.inspectionDate ?? ""],
      ["Ombesiktningsdag", u.reInspectionDate ?? ""],
      ["Nästa ord. besiktning", u.nextOrdinaryDate ?? ""],
      ["Föregående besiktning", u.previousInspectionDate ?? ""],
    ]);

    block("Bedömning", [
      ["Aggregatstatus", u.status ?? ""],
      ["Bytesintervall", u.replacementInterval ?? ""],
      ["Besiktningsutlåtande", u.verdict ?? ""],
    ]);

    if (u.notes) {
      doc.setFont("helvetica", "bold");
      doc.setFillColor("#f3f4f6");
      doc.rect(left, y - 4, doc.internal.pageSize.getWidth() - 28, 6, "F");
      doc.text("Anteckningar", left + 2, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      const splits = doc.splitTextToSize(u.notes, doc.internal.pageSize.getWidth() - 28);
      doc.text(splits, left, y);
    }

    footer(doc, ctx);
  });

  if (units.length === 0) {
    header(doc, "OVK – Protokoll");
    doc.setFontSize(11);
    doc.text("Inga aggregat finns i denna besiktning.", 14, 30);
    footer(doc, ctx);
  }

  doc.save(fileName(ctx, "Protokoll"));
}
