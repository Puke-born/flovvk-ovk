import Dexie, { type Table } from "dexie";

export type Verdict = "G" | "EG" | "";

export const STATUS_OPTIONS = [
  "God",
  "Äldre, bör bytas",
  "Normalskick",
  "Underhållsbehov",
  "Visst underhållsbehov",
  "Stort underhållsbehov",
  "Remdrift (Byt till direktdriven EC-fläkt)",
] as const;
export type AggregateStatus = (typeof STATUS_OPTIONS)[number] | "";

export const REPLACEMENT_OPTIONS = [
  "0-2 år",
  "2-5 år",
  "5-10 år",
  "10 år eller mer",
  "Snarast",
  "Vid behov",
] as const;
export type ReplacementInterval = (typeof REPLACEMENT_OPTIONS)[number] | "";

export const VENT_TYPES = ["F", "FT", "FTX", "S", "FX"] as const;
export const INSPECTION_TYPES = ["FB", "ÅB", "OB"] as const;
export const INSPECTION_INTERVALS = ["3 år", "6 år"] as const;

export interface BuildingNorm {
  id: string;
  year: string;
  norm: string;
  note?: string;
}

export interface Contact {
  id: string;
  name: string;
  contactPerson?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  phone?: string;
  email?: string;
}

export interface Inspector {
  id: string;
  name: string;
  authorization?: string;
  certificationNumber?: string;
  signature?: string; // base64 PNG data URL
  phone?: string;
  email?: string;
  company?: string;
  orgNumber?: string;
  address?: string;
  postalCode?: string;
  city?: string;
}

export interface Inspection {
  id: string;
  createdAt: number;
  updatedAt: number;
  // Property data
  propertyDesignation: string; // Fastighetsbeteckning J7
  buildingYear?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  buildingId?: string;
  buildingNorm?: string;
  workOrderNumber?: string;
  // Linked
  propertyOwnerId?: string;
  operationsManagerId?: string;
  inspectorId?: string;
  // Inspector snapshot
  inspectorName?: string;
  inspectorAuthorization?: string;
  inspectorCertificationNumber?: string;
  inspectorSignature?: string;
  inspectorPhone?: string;
  inspectorEmail?: string;
  inspectorCompany?: string;
  inspectorOrgNumber?: string;
  inspectorAddress?: string;
  inspectorPostalCode?: string;
  inspectorCity?: string;
  archived?: boolean;
}

export interface Unit {
  id: string;
  inspectionId: string;
  order: number;
  createdAt: number;
  updatedAt: number;
  // Header
  systemDesignation: string; // A14
  operatingHours?: string;
  inspectionInterval?: string; // 3/6
  aggregate?: string;
  placement?: string; // F16
  apartmentCount?: string;
  renovationYear?: string;
  // Building/property (mostly inherited from inspection but editable per unit)
  ventilationType?: string;
  servedArea?: string;
  business?: string;
  // Inspection details
  inspectionType?: string;
  inspectionDate?: string;
  reInspectionDate?: string;
  nextOrdinaryDate?: string;
  previousInspectionDate?: string;
  // Tech
  ratedPower?: string;
  airflow?: string;
  qNozzle?: string;
  customTechFields?: { id: string; label: string; value: string }[];
  // Status
  status?: AggregateStatus;
  replacementInterval?: ReplacementInterval;
  verdict?: Verdict; // G / EG
  notes?: string;
  // Free-form grid for remarks: 30 rows × 13 cols, sparse. Exports to H21:T50.
  gridCells?: string[][];
}

export interface ExcelTemplate {
  id: string; // always "template"
  fileName: string;
  uploadedAt: number;
  data: ArrayBuffer;
}

class OvkDB extends Dexie {
  inspections!: Table<Inspection, string>;
  units!: Table<Unit, string>;
  propertyOwners!: Table<Contact, string>;
  operationsManagers!: Table<Contact, string>;
  inspector!: Table<Inspector, string>; // legacy single-record (kept for migration)
  inspectors!: Table<Inspector, string>;
  buildingNorms!: Table<BuildingNorm, string>;
  excelTemplate!: Table<ExcelTemplate, string>;

  constructor() {
    super("ovk-app");
    this.version(1).stores({
      inspections: "id, createdAt, updatedAt, propertyDesignation, archived",
      units: "id, inspectionId, order, updatedAt",
      propertyOwners: "id, name",
      operationsManagers: "id, name",
      inspector: "id",
    });
    this.version(2)
      .stores({
        inspections: "id, createdAt, updatedAt, propertyDesignation, archived",
        units: "id, inspectionId, order, updatedAt",
        propertyOwners: "id, name",
        operationsManagers: "id, name",
        inspector: "id",
        inspectors: "id, name",
      })
      .upgrade(async (tx) => {
        const old = await tx.table("inspector").get("inspector");
        if (old && old.name) {
          await tx.table("inspectors").add({ ...old, id: uid() });
        }
      });
    this.version(3).stores({
      inspections: "id, createdAt, updatedAt, propertyDesignation, archived",
      units: "id, inspectionId, order, updatedAt",
      propertyOwners: "id, name",
      operationsManagers: "id, name",
      inspector: "id",
      inspectors: "id, name",
      buildingNorms: "id, year",
    });
    this.version(4).stores({
      inspections: "id, createdAt, updatedAt, propertyDesignation, archived",
      units: "id, inspectionId, order, updatedAt",
      propertyOwners: "id, name",
      operationsManagers: "id, name",
      inspector: "id",
      inspectors: "id, name",
      buildingNorms: "id, year",
      excelTemplate: "id",
    });
  }
}

export const db = new OvkDB();

export const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36);

export async function createInspection(): Promise<string> {
  const inspectors = await db.inspectors.toArray();
  const inspector = inspectors[0];
  const now = Date.now();
  const id = uid();
  await db.inspections.add({
    id,
    createdAt: now,
    updatedAt: now,
    propertyDesignation: "",
    inspectorId: inspector?.id,
    inspectorName: inspector?.name,
    inspectorAuthorization: inspector?.authorization,
    inspectorCertificationNumber: inspector?.certificationNumber,
    inspectorSignature: inspector?.signature,
    inspectorPhone: inspector?.phone,
    inspectorEmail: inspector?.email,
    inspectorCompany: inspector?.company,
    inspectorOrgNumber: inspector?.orgNumber,
    inspectorAddress: inspector?.address,
    inspectorPostalCode: inspector?.postalCode,
    inspectorCity: inspector?.city,
  });
  return id;
}

export async function assignInspector(inspectionId: string, inspectorId: string) {
  const ins = await db.inspectors.get(inspectorId);
  if (!ins) return;
  await updateInspection(inspectionId, {
    inspectorId: ins.id,
    inspectorName: ins.name,
    inspectorAuthorization: ins.authorization,
    inspectorCertificationNumber: ins.certificationNumber,
    inspectorSignature: ins.signature,
    inspectorPhone: ins.phone,
    inspectorEmail: ins.email,
    inspectorCompany: ins.company,
    inspectorOrgNumber: ins.orgNumber,
    inspectorAddress: ins.address,
    inspectorPostalCode: ins.postalCode,
    inspectorCity: ins.city,
  });
}

export async function addUnit(inspectionId: string): Promise<string> {
  const existing = await db.units.where("inspectionId").equals(inspectionId).count();
  const id = uid();
  const now = Date.now();
  const gridCells: string[][] = [];
  gridCells[0] = []; gridCells[0][1] = "Märkeffekt:";
  gridCells[2] = []; gridCells[2][1] = "Luftmängd:";
  await db.units.add({
    id,
    inspectionId,
    order: existing,
    createdAt: now,
    updatedAt: now,
    systemDesignation: "",
    inspectionInterval: "6 år",
    verdict: "",
    status: "",
    replacementInterval: "",
    gridCells,
  });
  await db.inspections.update(inspectionId, { updatedAt: now });
  return id;
}

export async function duplicateUnit(unitId: string): Promise<string | null> {
  const u = await db.units.get(unitId);
  if (!u) return null;
  const id = uid();
  const now = Date.now();
  const count = await db.units.where("inspectionId").equals(u.inspectionId).count();
  await db.units.add({
    ...u,
    id,
    order: count,
    createdAt: now,
    updatedAt: now,
    systemDesignation: u.systemDesignation + " (kopia)",
  });
  return id;
}

export async function deleteUnit(unitId: string) {
  await db.units.delete(unitId);
}

export async function deleteInspection(inspectionId: string) {
  await db.units.where("inspectionId").equals(inspectionId).delete();
  await db.inspections.delete(inspectionId);
}

export async function updateInspection(id: string, patch: Partial<Inspection>) {
  await db.inspections.update(id, { ...patch, updatedAt: Date.now() });
}

export async function updateUnit(id: string, patch: Partial<Unit>) {
  await db.units.update(id, { ...patch, updatedAt: Date.now() });
}
