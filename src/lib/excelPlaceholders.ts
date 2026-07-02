import { db, type Inspection, type Unit, type Contact } from "./db";

export interface ExportData {
  inspection: Record<string, string>;
  owner: Record<string, string>;
  ops: Record<string, string>;
  inspector: Record<string, string>;
  inspectorSignature?: string; // data URL
  units: UnitData[];
  exportDate: string;
}

export interface UnitData extends Record<string, string> {
  index: string;
  total: string;
}

/**
 * Normalize a custom-field label to a placeholder key segment.
 * Lowercase, swedish chars preserved, non-alphanumerics → "_".
 */
export function slugifyCustomLabel(label: string): string {
  return (label || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9åäö]+/gi, "_")
    .replace(/^_+|_+$/g, "");
}

const s = (v: unknown): string => (v === undefined || v === null ? "" : String(v));

function contactFields(c: Contact | undefined): Record<string, string> {
  return {
    name: s(c?.name),
    contactPerson: s(c?.contactPerson),
    address: s(c?.address),
    postalCode: s(c?.postalCode),
    city: s(c?.city),
    phone: s(c?.phone),
    email: s(c?.email),
  };
}

export async function buildExportData(inspectionId: string): Promise<ExportData> {
  const inspection = await db.inspections.get(inspectionId);
  if (!inspection) throw new Error("Besiktning hittades inte");
  const units = await db.units.where("inspectionId").equals(inspectionId).sortBy("order");
  const owner = inspection.propertyOwnerId
    ? await db.propertyOwners.get(inspection.propertyOwnerId)
    : undefined;
  const ops = inspection.operationsManagerId
    ? await db.operationsManagers.get(inspection.operationsManagerId)
    : undefined;

  const total = units.length;
  const today = new Date();
  const exportDate = today.toLocaleDateString("sv-SE");

  return {
    inspection: {
      propertyDesignation: s(inspection.propertyDesignation),
      buildingYear: s(inspection.buildingYear),
      renovationYear: s(inspection.renovationYear),
      address: s(inspection.address),
      postalCode: s(inspection.postalCode),
      city: s(inspection.city),
      buildingId: s(inspection.buildingId),
      buildingNorm: s(inspection.buildingNorm),
      workOrderNumber: s(inspection.workOrderNumber),
    },
    owner: contactFields(owner),
    ops: contactFields(ops),
    inspector: {
      name: s(inspection.inspectorName),
      authorization: s(inspection.inspectorAuthorization),
      certificationNumber: s(inspection.inspectorCertificationNumber),
      company: s(inspection.inspectorCompany),
      orgNumber: s(inspection.inspectorOrgNumber),
      address: s(inspection.inspectorAddress),
      postalCode: s(inspection.inspectorPostalCode),
      city: s(inspection.inspectorCity),
      phone: s(inspection.inspectorPhone),
      email: s(inspection.inspectorEmail),
    },
    inspectorSignature: inspection.inspectorSignature,
    units: units.map((u, i) => unitFields(u, i + 1, total)),
    exportDate,
  };
}

function unitFields(u: Unit, index: number, total: number): UnitData {
  const base: UnitData = {
    index: String(index),
    total: String(total),
    systemDesignation: s(u.systemDesignation),
    placement: s(u.placement),
    aggregate: s(u.aggregate),
    ventilationType: s(u.ventilationType),
    servedArea: s(u.servedArea),
    business: s(u.business),
    operatingHours: s(u.operatingHours),
    inspectionInterval: s(u.inspectionInterval),
    apartmentCount: s(u.apartmentCount),
    renovationYear: s(u.renovationYear),
    inspectionType: s(u.inspectionType),
    inspectionDate: s(u.inspectionDate),
    reInspectionDate: s(u.reInspectionDate),
    nextOrdinaryDate: s(u.nextOrdinaryDate),
    previousInspectionDate: s(u.previousInspectionDate),
    ratedPower: s(u.ratedPower),
    airflow: s(u.airflow),
    qNozzle: s(u.qNozzle),
    status: s(u.status),
    replacementInterval: s(u.replacementInterval),
    verdict: s(u.verdict),
    notes: s(u.notes),
  };
  // Custom tech fields
  const customs = u.customTechFields ?? [];
  // (a) Slug-baserade nycklar (om man vet rubriken): unit.custom.<slug>
  customs.forEach((cf) => {
    const slug = slugifyCustomLabel(cf.label);
    if (slug) base[`custom.${slug}`] = s(cf.value);
  });
  // (b) Indexerade nycklar (för okända rubriker): unit.customLabel1 / unit.customValue1 ...
  // Reservera upp till 5 platser i mallen — tomma om fältet saknas.
  const MAX_CUSTOM = 5;
  for (let i = 0; i < MAX_CUSTOM; i++) {
    const cf = customs[i];
    base[`customLabel${i + 1}`] = s(cf?.label);
    base[`customValue${i + 1}`] = s(cf?.value);
  }
  return base;
}

/**
 * Returns the full list of available placeholders so the UI can show them
 * to the user as a reference when designing the template.
 */
export const AVAILABLE_PLACEHOLDERS = {
  Besiktning: [
    "propertyDesignation",
    "buildingYear",
    "renovationYear",
    "address",
    "postalCode",
    "city",
    "buildingId",
    "buildingNorm",
    "workOrderNumber",
  ],
  "Fastighetsägare (owner)": [
    "owner.name",
    "owner.contactPerson",
    "owner.address",
    "owner.postalCode",
    "owner.city",
    "owner.phone",
    "owner.email",
  ],
  "Driftansvarig (ops)": [
    "ops.name",
    "ops.contactPerson",
    "ops.address",
    "ops.postalCode",
    "ops.city",
    "ops.phone",
    "ops.email",
  ],
  Besiktningsman: [
    "inspector.name",
    "inspector.authorization",
    "inspector.certificationNumber",
    "inspector.company",
    "inspector.orgNumber",
    "inspector.address",
    "inspector.postalCode",
    "inspector.city",
    "inspector.phone",
    "inspector.email",
    "inspector.signature (infogas som bild om cellen bara innehåller denna)",
  ],
  "Aggregat (på fliken 'Aggregat' som dupliceras per aggregat)": [
    "unit.index",
    "unit.total",
    "unit.systemDesignation",
    "unit.placement",
    "unit.aggregate",
    "unit.ventilationType",
    "unit.servedArea",
    "unit.business",
    "unit.operatingHours",
    "unit.inspectionInterval",
    "unit.apartmentCount",
    "unit.renovationYear",
    "unit.inspectionType",
    "unit.inspectionDate",
    "unit.reInspectionDate",
    "unit.nextOrdinaryDate",
    "unit.previousInspectionDate",
    "unit.ratedPower",
    "unit.airflow",
    "unit.qNozzle",
    "unit.status",
    "unit.replacementInterval",
    "unit.verdict",
    "unit.notes",
    "unit.custom.<rubrik> (om du vet rubriken — t.ex. unit.custom.kanaltryck)",
    "unit.customLabel1 / unit.customValue1 ... upp till 5 (för okända rubriker — par av rubrik+värde)",
  ],
  Övrigt: ["exportDate"],
};

export function resolvePlaceholder(
  key: string,
  data: ExportData,
  unit?: UnitData,
): string | null {
  if (key === "exportDate") return data.exportDate;
  if (key.startsWith("owner.")) return data.owner[key.slice(6)] ?? "";
  if (key.startsWith("ops.")) return data.ops[key.slice(4)] ?? "";
  if (key.startsWith("inspector.")) {
    const k = key.slice(10);
    if (k === "signature") return null; // handled separately as image
    return data.inspector[k] ?? "";
  }
  if (key.startsWith("unit.")) {
    if (!unit) return "";
    const sub = key.slice(5);
    if (sub.startsWith("custom.")) {
      const slug = slugifyCustomLabel(sub.slice(7));
      return unit[`custom.${slug}`] ?? "";
    }
    return unit[sub] ?? "";
  }
  return data.inspection[key] ?? "";
}
