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
export const INSPECTION_TYPES = [
  "Första besiktning",
  "Återkommande besiktning",
  "Ombesiktning",
] as const;
export const INSPECTION_INTERVALS = ["3 år", "6 år"] as const;

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
  id: "inspector";
  name: string;
  authorization?: string;
  phone?: string;
  email?: string;
  company?: string;
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
  // Linked
  propertyOwnerId?: string;
  operationsManagerId?: string;
  // Inspector snapshot
  inspectorName?: string;
  inspectorAuthorization?: string;
  inspectorPhone?: string;
  inspectorEmail?: string;
  inspectorCompany?: string;
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
  // Status
  status?: AggregateStatus;
  replacementInterval?: ReplacementInterval;
  verdict?: Verdict; // G / EG
  notes?: string;
}

class OvkDB extends Dexie {
  inspections!: Table<Inspection, string>;
  units!: Table<Unit, string>;
  propertyOwners!: Table<Contact, string>;
  operationsManagers!: Table<Contact, string>;
  inspector!: Table<Inspector, string>;

  constructor() {
    super("ovk-app");
    this.version(1).stores({
      inspections: "id, createdAt, updatedAt, propertyDesignation, archived",
      units: "id, inspectionId, order, updatedAt",
      propertyOwners: "id, name",
      operationsManagers: "id, name",
      inspector: "id",
    });
  }
}

export const db = new OvkDB();

export const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36);

export async function createInspection(): Promise<string> {
  const inspector = await db.inspector.get("inspector");
  const now = Date.now();
  const id = uid();
  await db.inspections.add({
    id,
    createdAt: now,
    updatedAt: now,
    propertyDesignation: "",
    inspectorName: inspector?.name,
    inspectorAuthorization: inspector?.authorization,
    inspectorPhone: inspector?.phone,
    inspectorEmail: inspector?.email,
    inspectorCompany: inspector?.company,
    inspectorAddress: inspector?.address,
    inspectorPostalCode: inspector?.postalCode,
    inspectorCity: inspector?.city,
  });
  return id;
}

export async function addUnit(inspectionId: string): Promise<string> {
  const existing = await db.units.where("inspectionId").equals(inspectionId).count();
  const id = uid();
  const now = Date.now();
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
