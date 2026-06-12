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

// Sync metadata mixed into every row.
export interface SyncFields {
  companyId?: string;
  updatedBy?: string;
  deletedAt?: number;
}

export interface BuildingNorm extends SyncFields {
  id: string;
  year: string;
  norm: string;
  note?: string;
  updatedAt?: number;
}

export interface Contact extends SyncFields {
  id: string;
  name: string;
  contactPerson?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  phone?: string;
  email?: string;
  updatedAt?: number;
}

export interface Inspector extends SyncFields {
  id: string;
  name: string;
  authorization?: string;
  certificationNumber?: string;
  signature?: string;
  phone?: string;
  email?: string;
  company?: string;
  orgNumber?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  updatedAt?: number;
}

export interface Inspection extends SyncFields {
  id: string;
  createdAt: number;
  updatedAt: number;
  propertyDesignation: string;
  buildingYear?: string;
  renovationYear?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  buildingId?: string;
  buildingNorm?: string;
  workOrderNumber?: string;
  propertyOwnerId?: string;
  operationsManagerId?: string;
  inspectorId?: string;
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

export interface Unit extends SyncFields {
  id: string;
  inspectionId: string;
  order: number;
  createdAt: number;
  updatedAt: number;
  systemDesignation: string;
  operatingHours?: string;
  inspectionInterval?: string;
  aggregate?: string;
  placement?: string;
  apartmentCount?: string;
  ventilationType?: string;
  servedArea?: string;
  business?: string;
  inspectionType?: string;
  inspectionDate?: string;
  reInspectionDate?: string;
  nextOrdinaryDate?: string;
  previousInspectionDate?: string;
  ratedPower?: string;
  airflow?: string;
  qNozzle?: string;
  customTechFields?: { id: string; label: string; value: string }[];
  status?: AggregateStatus;
  replacementInterval?: ReplacementInterval;
  verdict?: Verdict;
  notes?: string;
  gridCells?: string[][];
}

export interface ExcelTemplate extends SyncFields {
  id: string;
  fileName: string;
  uploadedAt: number;
  data: ArrayBuffer;
  updatedAt?: number;
}

// Outbox of pending sync mutations.
export interface OutboxEntry {
  id: string; // uuid
  entity: SyncEntity;
  rowId: string;
  op: "upsert" | "delete";
  enqueuedAt: number;
  attempts: number;
  lastError?: string;
}

// Per-(entity, kind) cursor.
export interface SyncMeta {
  key: string; // e.g. "pull:lastServerUpdatedAt"
  value: string;
}

export type SyncEntity =
  | "inspection"
  | "unit"
  | "propertyOwner"
  | "operationsManager"
  | "inspector"
  | "buildingNorm"
  | "excelTemplate";

export const TABLE_FOR_ENTITY: Record<SyncEntity, string> = {
  inspection: "inspections",
  unit: "units",
  propertyOwner: "propertyOwners",
  operationsManager: "operationsManagers",
  inspector: "inspectors",
  buildingNorm: "buildingNorms",
  excelTemplate: "excelTemplate",
};

export const ENTITY_FOR_TABLE: Record<string, SyncEntity> = Object.fromEntries(
  Object.entries(TABLE_FOR_ENTITY).map(([e, t]) => [t, e as SyncEntity]),
) as Record<string, SyncEntity>;

class OvkDB extends Dexie {
  inspections!: Table<Inspection, string>;
  units!: Table<Unit, string>;
  propertyOwners!: Table<Contact, string>;
  operationsManagers!: Table<Contact, string>;
  inspector!: Table<Inspector, string>;
  inspectors!: Table<Inspector, string>;
  buildingNorms!: Table<BuildingNorm, string>;
  excelTemplate!: Table<ExcelTemplate, string>;
  outbox!: Table<OutboxEntry, string>;
  syncMeta!: Table<SyncMeta, string>;

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
    this.version(5).stores({
      inspections: "id, createdAt, updatedAt, propertyDesignation, archived, companyId",
      units: "id, inspectionId, order, updatedAt, companyId",
      propertyOwners: "id, name, companyId",
      operationsManagers: "id, name, companyId",
      inspector: "id",
      inspectors: "id, name, companyId",
      buildingNorms: "id, year, companyId",
      excelTemplate: "id, companyId",
      outbox: "id, entity, rowId, enqueuedAt",
      syncMeta: "key",
    });

    this.attachSyncHooks();
  }

  private attachSyncHooks() {
    const syncedTables: (keyof OvkDB)[] = [
      "inspections",
      "units",
      "propertyOwners",
      "operationsManagers",
      "inspectors",
      "buildingNorms",
      "excelTemplate",
    ];
    for (const tableName of syncedTables) {
      const tbl = (this as any)[tableName] as Table<any, any>;
      const entity = ENTITY_FOR_TABLE[tableName as string];
      if (!entity) continue;

      tbl.hook("creating", (_pk, obj) => {
        const ctx = getSyncContext();
        if (ctx.companyId && !obj.companyId) obj.companyId = ctx.companyId;
        if (ctx.userId && !obj.updatedBy) obj.updatedBy = ctx.userId;
        if (obj.updatedAt == null) obj.updatedAt = Date.now();
        if (!ctx.suppressOutbox) enqueueLater(entity, primaryKey(obj), "upsert");
      });

      tbl.hook("updating", (mods: any, _pk, obj) => {
        const ctx = getSyncContext();
        const next: any = { ...mods };
        if (ctx.companyId && !obj.companyId && next.companyId == null) {
          next.companyId = ctx.companyId;
        }
        if (ctx.userId && next.updatedBy == null) next.updatedBy = ctx.userId;
        if (next.updatedAt == null) next.updatedAt = Date.now();
        if (!ctx.suppressOutbox) enqueueLater(entity, primaryKey(obj), "upsert");
        return next;
      });

      tbl.hook("deleting", (_pk, obj) => {
        const ctx = getSyncContext();
        if (!ctx.suppressOutbox) enqueueLater(entity, primaryKey(obj), "delete");
      });
    }
  }
}

function primaryKey(obj: any): string {
  return String(obj?.id);
}

// Sync context maintained by AuthProvider / sync engine.
interface SyncContext {
  companyId?: string;
  userId?: string;
  suppressOutbox?: boolean;
}
let _syncContext: SyncContext = {};
export function setSyncContext(ctx: Partial<SyncContext>) {
  _syncContext = { ..._syncContext, ...ctx };
}
export function getSyncContext(): SyncContext {
  return _syncContext;
}
export async function withoutOutbox<T>(fn: () => Promise<T>): Promise<T> {
  const prev = _syncContext.suppressOutbox;
  _syncContext = { ..._syncContext, suppressOutbox: true };
  try {
    return await fn();
  } finally {
    _syncContext = { ..._syncContext, suppressOutbox: prev };
  }
}

// Outbox enqueue (deferred so we don't conflict with the running transaction).
function enqueueLater(entity: SyncEntity, rowId: string, op: "upsert" | "delete") {
  queueMicrotask(() => {
    db.outbox
      .add({
        id: uid(),
        entity,
        rowId,
        op,
        enqueuedAt: Date.now(),
        attempts: 0,
      })
      .catch(() => {});
    // Trigger sync nudge if listener registered.
    syncNudge?.();
  });
}

let syncNudge: (() => void) | null = null;
export function setSyncNudge(fn: (() => void) | null) {
  syncNudge = fn;
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
