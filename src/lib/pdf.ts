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

// FST brand-aligned colours (orange logo + black headers, matching exempel-PDF)
const ORANGE = "#d6843a" as const;
const BLACK = "#000000" as const;
const DARK = "#0f0f0f" as const;
const MUTED = "#6b7280" as const;
const LIGHT_GREY = "#f3f4f6" as const;
const BORDER = "#000000" as const;

const PAGE_MARGIN = 10;

function drawProtokollHeader(doc: jsPDF, ctx: PdfContext) {
  const w = doc.internal.pageSize.getWidth();
  const left = PAGE_MARGIN;
  const right = w - PAGE_MARGIN;

  // Top-left subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(DARK);
  doc.text(
    "Funktionskontroll av ventilationssystem enligt BFS 2011:16 OVK 5 med ändringar",
    left,
    9,
  );

  // Big title centred-ish
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(DARK);
  doc.text("OVK - Protokoll", left, 18);

  // Arb.nr field
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Arb.nr:", left, 24);

  // FST logotype (text-based fallback, top-right)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(ORANGE);
  doc.text("FST", right, 12, { align: "right" });
  doc.setFontSize(8);
  doc.setTextColor(DARK);
  doc.text("HUSBESIKTNINGAR", right, 17, { align: "right" });

  doc.setTextColor(DARK);
}

function drawIntygHeader(doc: jsPDF) {
  const left = PAGE_MARGIN;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(DARK);
  doc.text("OVK - INTYG", left, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    "Obligatorisk ventilationskontroll är genomförd enligt förordningen BFS 2011:16 OVK 5 med ändringar",
    left,
    25,
  );
}

function footer(doc: jsPDF, ctx: PdfContext) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  doc.setDrawColor("#cccccc");
  doc.line(PAGE_MARGIN, h - 14, w - PAGE_MARGIN, h - 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(MUTED);
  const insp = ctx.inspector?.name || ctx.inspection.inspectorName || "";
  const company = ctx.inspector?.company || ctx.inspection.inspectorCompany || "";
  doc.text(`${insp}${company ? " · " + company : ""}`, PAGE_MARGIN, h - 9);
  doc.text(`Genererad ${formatDateSE(Date.now())}`, w - PAGE_MARGIN, h - 9, { align: "right" });
  doc.setTextColor(DARK);
}

function fileName(ctx: PdfContext, kind: string) {
  const safe = (s: string) => s.replace(/[^\p{L}\p{N}\-_]+/gu, "_").slice(0, 40);
  const prop = safe(ctx.inspection.propertyDesignation || "OVK");
  return `OVK_${kind}_${prop}_${formatDateSE(Date.now())}.pdf`;
}

// Common table styling — thin black borders, black header rows, like exempel-PDF
const tableTheme = {
  theme: "grid" as const,
  styles: {
    fontSize: 8,
    cellPadding: 1.8,
    lineColor: BORDER,
    lineWidth: 0.2,
    textColor: DARK,
    overflow: "linebreak" as const,
  },
  headStyles: {
    fillColor: BLACK,
    textColor: "#ffffff",
    fontStyle: "bold" as const,
    fontSize: 8,
  },
  margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
};

// ---------- PROTOKOLL ----------

export function exportProtokollPdf(ctx: PdfContext) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const units = ctx.units.sort((a, b) => a.order - b.order);

  if (units.length === 0) {
    drawProtokollHeader(doc, ctx);
    doc.setFontSize(11);
    doc.text("Inga aggregat finns i denna besiktning.", PAGE_MARGIN, 35);
    footer(doc, ctx);
    doc.save(fileName(ctx, "Protokoll"));
    return;
  }

  units.forEach((u, idx) => {
    if (idx > 0) doc.addPage();
    drawProtokollHeader(doc, ctx);
    renderProtokollPage(doc, ctx, u);
    footer(doc, ctx);
  });

  doc.save(fileName(ctx, "Protokoll"));
}

function renderProtokollPage(doc: jsPDF, ctx: PdfContext, u: Unit) {
  const ins = ctx.inspector;
  let startY = 28;

  // 1. Sakkunnig/besiktningsman table
  autoTable(doc, {
    ...tableTheme,
    startY,
    head: [["Sakkunnig/besiktningsman", "Telefon nr.", "Cert nr.", "Behörighet", "E-post"]],
    body: [[
      ctx.inspection.inspectorName ?? ins?.name ?? "",
      ctx.inspection.inspectorPhone ?? ins?.phone ?? "",
      ctx.inspection.inspectorCertificationNumber ?? ins?.certificationNumber ?? "",
      ctx.inspection.inspectorAuthorization ?? ins?.authorization ?? "",
      ctx.inspection.inspectorEmail ?? ins?.email ?? "",
    ]],
  });
  startY = (doc as any).lastAutoTable.finalY;

  // 2. Företag table — with signature column
  const sigCellX = { x: 0, y: 0, w: 0, h: 0 };
  autoTable(doc, {
    ...tableTheme,
    startY,
    head: [["Företag", "Organisationsnummer", "Adress", "Sign.besiktningsman"]],
    body: [[
      ctx.inspection.inspectorCompany ?? ins?.company ?? "",
      "",
      [
        ctx.inspection.inspectorAddress ?? ins?.address ?? "",
        [ctx.inspection.inspectorPostalCode ?? ins?.postalCode ?? "",
         ctx.inspection.inspectorCity ?? ins?.city ?? ""].filter(Boolean).join(" "),
      ].filter(Boolean).join(", "),
      "", // signature drawn below
    ]],
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 3) {
        data.cell.styles.minCellHeight = 14;
      }
    },
    didDrawCell: (data) => {
      if (data.section === "body" && data.column.index === 3) {
        sigCellX.x = data.cell.x;
        sigCellX.y = data.cell.y;
        sigCellX.w = data.cell.width;
        sigCellX.h = data.cell.height;
      }
    },
  });
  // Draw signature in last cell
  const sig = ctx.inspection.inspectorSignature ?? ins?.signature;
  if (sig && sigCellX.w > 0) {
    try {
      doc.addImage(sig, "PNG", sigCellX.x + 1, sigCellX.y + 1, sigCellX.w - 2, sigCellX.h - 2);
    } catch {
      /* ignore */
    }
  }
  startY = (doc as any).lastAutoTable.finalY;

  // 3. Fastighet table
  autoTable(doc, {
    ...tableTheme,
    startY,
    head: [["Fastighetsbeteckning", "Byggår", "Ombygg.", "Adress", "Postnr.", "Bygg.ID", "Byggnorm"]],
    body: [[
      ctx.inspection.propertyDesignation ?? "",
      ctx.inspection.buildingYear ?? "",
      ctx.inspection.renovationYear ?? "",
      ctx.inspection.address ?? "",
      [ctx.inspection.postalCode, ctx.inspection.city].filter(Boolean).join(" "),
      ctx.inspection.buildingId ?? "",
      ctx.inspection.buildingNorm ?? "",
    ]],
  });
  startY = (doc as any).lastAutoTable.finalY;

  // 4. Fastighetsägare
  if (ctx.propertyOwner) {
    const c = ctx.propertyOwner;
    autoTable(doc, {
      ...tableTheme,
      startY,
      head: [["Fastighetsägare", "Telefon", "Adress", "Postnr.", "E-post"]],
      body: [[
        c.name ?? "",
        c.phone ?? "",
        c.address ?? "",
        [c.postalCode, c.city].filter(Boolean).join(" "),
        c.email ?? "",
      ]],
    });
    startY = (doc as any).lastAutoTable.finalY;
  }

  // 5. Driftansvarig
  if (ctx.operationsManager) {
    const c = ctx.operationsManager;
    autoTable(doc, {
      ...tableTheme,
      startY,
      head: [["Driftansvarig", "Telefon", "Adress", "Postnr.", "E-post"]],
      body: [[
        c.name ?? "",
        c.phone ?? "",
        c.address ?? "",
        [c.postalCode, c.city].filter(Boolean).join(" "),
        c.email ?? "",
      ]],
    });
    startY = (doc as any).lastAutoTable.finalY;
  }

  // 6. Aggregat-info
  autoTable(doc, {
    ...tableTheme,
    startY,
    head: [[
      "Systembeteckning",
      "Drifttider",
      "Besiktningsintervall",
      "Aggregat",
      "Aggregatplacering",
      "Antal lägenheter",
    ]],
    body: [[
      u.systemDesignation ?? "",
      u.operatingHours ?? "",
      u.inspectionInterval ?? "",
      u.aggregate ?? "",
      u.placement ?? "",
      u.apartmentCount ?? "",
    ]],
  });
  startY = (doc as any).lastAutoTable.finalY;

  // 7. Besiktnings-info
  autoTable(doc, {
    ...tableTheme,
    startY,
    head: [[
      "Typ av besiktning",
      "Besiktningsdatum",
      "Ombesiktningsdag",
      "Nästa ord. besiktningsdatum",
      "Föregående besiktningsdatum",
    ]],
    body: [[
      u.inspectionType ?? "",
      u.inspectionDate ?? "",
      u.reInspectionDate ?? "",
      u.nextOrdinaryDate ?? "",
      u.previousInspectionDate ?? "",
    ]],
  });
  startY = (doc as any).lastAutoTable.finalY;

  // 8. Utlåtande summary
  autoTable(doc, {
    ...tableTheme,
    startY,
    body: [[
      { content: "Besiktningsanmärkningar markerade med √", styles: { fontStyle: "bold" } },
      `Aggregatstatus: ${u.status || "—"}`,
      `Bytesintervall: ${u.replacementInterval || "—"}`,
      { content: `Besiktningsutlåtande: ${u.verdict || "—"}`, styles: { fontStyle: "bold", halign: "right" } },
    ]],
    styles: { ...tableTheme.styles, fillColor: LIGHT_GREY },
  });
  startY = (doc as any).lastAutoTable.finalY;

  // 9. Tech values + custom fields if any
  const techRows: [string, string][] = [];
  if (u.ratedPower) techRows.push(["Märkeffekt", u.ratedPower]);
  if (u.airflow) techRows.push(["Luftmängd", u.airflow]);
  if (u.qNozzle) techRows.push(["Q-dysa", u.qNozzle]);
  if (u.ventilationType) techRows.push(["Typ av ventilation", u.ventilationType]);
  if (u.servedArea) techRows.push(["Betjänad yta", u.servedArea]);
  if (u.business) techRows.push(["Verksamhet", u.business]);
  (u.customTechFields ?? [])
    .filter((cf) => cf.label || cf.value)
    .forEach((cf) => techRows.push([cf.label || "—", cf.value ?? ""]));

  if (techRows.length > 0) {
    autoTable(doc, {
      ...tableTheme,
      startY,
      head: [["Tekniska uppgifter", "Värde"]],
      body: techRows,
      columnStyles: { 0: { cellWidth: 60, fontStyle: "bold" } },
    });
    startY = (doc as any).lastAutoTable.finalY;
  }

  // 10. Notes
  if (u.notes) {
    autoTable(doc, {
      ...tableTheme,
      startY,
      head: [["Anteckningar"]],
      body: [[u.notes]],
    });
    startY = (doc as any).lastAutoTable.finalY;
  }

  // Footer disclaimer
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(MUTED);
  const disclaimer =
    "Funktionskontrollen är utförd med bestämmelser som gällde då respektive system togs i bruk. Vid nybyggnad tas särskild hänsyn till krav i gällande entreprenadhandlingar, även om dessa skärper gällande föreskrifter.";
  const lines = doc.splitTextToSize(disclaimer, w - PAGE_MARGIN * 2);
  doc.text(lines, PAGE_MARGIN, h - 18);
  doc.setTextColor(DARK);
}

// ---------- INTYG ----------

export function exportIntygPdf(ctx: PdfContext) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  drawIntygHeader(doc);

  let startY = 32;

  // Fastighet block (matches exempel: Fastighetsbet., Adress, Byggnad, postnr)
  autoTable(doc, {
    ...tableTheme,
    startY,
    body: [
      [
        { content: "Fastighetsbet./Kv.namn:", styles: { fontStyle: "bold", fillColor: LIGHT_GREY } },
        ctx.inspection.propertyDesignation ?? "",
        { content: "Adress:", styles: { fontStyle: "bold", fillColor: LIGHT_GREY } },
        ctx.inspection.address ?? "",
      ],
      [
        { content: "Byggnad:", styles: { fontStyle: "bold", fillColor: LIGHT_GREY } },
        ctx.inspection.buildingId ?? "",
        "",
        [ctx.inspection.postalCode, ctx.inspection.city].filter(Boolean).join(" "),
      ],
    ],
  });
  startY = (doc as any).lastAutoTable.finalY + 4;

  // System table
  autoTable(doc, {
    ...tableTheme,
    startY,
    head: [["System", "Betjänar", "Utfall*", "Besiktningsdatum", "Nästa ord. besiktning"]],
    body: ctx.units
      .sort((a, b) => a.order - b.order)
      .map((u) => [
        u.systemDesignation || "—",
        [u.placement, u.servedArea].filter(Boolean).join(" / ") || "—",
        u.verdict || "—",
        u.inspectionDate || "—",
        u.nextOrdinaryDate || "—",
      ]),
  });
  startY = (doc as any).lastAutoTable.finalY + 6;

  // Besiktningsman block — labelled rows like exempel
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const ins = ctx.inspector;
  const insRows: [string, string][] = [
    ["Besiktningsman:", ctx.inspection.inspectorName ?? ins?.name ?? ""],
    ["Behörighet:", ctx.inspection.inspectorCertificationNumber ?? ins?.certificationNumber ?? ""],
    ["Telefon:", ctx.inspection.inspectorPhone ?? ins?.phone ?? ""],
    ["E-post:", ctx.inspection.inspectorEmail ?? ins?.email ?? ""],
    ["Företag:", ctx.inspection.inspectorCompany ?? ins?.company ?? ""],
    ["Adress:", ctx.inspection.inspectorAddress ?? ins?.address ?? ""],
    [
      "Postnr:",
      [
        ctx.inspection.inspectorPostalCode ?? ins?.postalCode ?? "",
        ctx.inspection.inspectorCity ?? ins?.city ?? "",
      ].filter(Boolean).join(" "),
    ],
  ];
  insRows.forEach(([k, v]) => {
    doc.setFont("helvetica", "bold");
    doc.text(k, PAGE_MARGIN, startY);
    doc.setFont("helvetica", "normal");
    doc.text(v || "—", PAGE_MARGIN + 35, startY);
    startY += 5;
  });
  startY += 4;

  // Disclaimer
  const w = doc.internal.pageSize.getWidth();
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(MUTED);
  const disclaimer =
    "Protokoll finns att tillgå hos byggnadens ägare/byggnadsnämnden. Funktionskontrollen är utförd på grundval av de bestämmelser som gällde då respektive system togs i bruk. Vid nybyggnad har särskild hänsyn tagits till förekommande krav i gällande entreprenadhandlingar även om dessa skärper gällande föreskrifter.";
  const lines = doc.splitTextToSize(disclaimer, w - PAGE_MARGIN * 2);
  doc.text(lines, PAGE_MARGIN, startY);
  startY += lines.length * 4 + 4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("*Utfall: G = Godkänd, EG = Ej godkänd", PAGE_MARGIN, startY);
  startY += 12;

  // Signature block
  const sig = ctx.inspection.inspectorSignature ?? ins?.signature;
  if (sig) {
    try {
      doc.addImage(sig, "PNG", PAGE_MARGIN, startY - 6, 70, 18);
    } catch {
      /* ignore */
    }
    startY += 14;
  }
  doc.setDrawColor(DARK);
  doc.line(PAGE_MARGIN, startY, PAGE_MARGIN + 80, startY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(DARK);
  doc.text("Underskrift besiktningsman", PAGE_MARGIN, startY + 5);

  // FST text-logo bottom-right
  const h = doc.internal.pageSize.getHeight();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(ORANGE);
  doc.text("FST", w - PAGE_MARGIN, h - 22, { align: "right" });
  doc.setFontSize(8);
  doc.setTextColor(DARK);
  doc.text("HUSBESIKTNINGAR", w - PAGE_MARGIN, h - 17, { align: "right" });

  footer(doc, ctx);
  doc.save(fileName(ctx, "Intyg"));
}
