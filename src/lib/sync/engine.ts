import { supabase } from "@/integrations/supabase/client";
import {
  db,
  TABLE_FOR_ENTITY,
  setSyncNudge,
  withoutOutbox,
  type SyncEntity,
  type OutboxEntry,
} from "@/lib/db";
import { toast } from "sonner";

type Status = "idle" | "syncing" | "offline" | "error";
type Listener = (s: SyncState) => void;

export interface SyncState {
  status: Status;
  pending: number;
  lastSyncAt: number | null;
  error?: string;
}

let _state: SyncState = { status: "idle", pending: 0, lastSyncAt: null };
const listeners = new Set<Listener>();

export function getSyncState() {
  return _state;
}
export function subscribeSync(l: Listener) {
  listeners.add(l);
  l(_state);
  return () => listeners.delete(l);
}
function setState(p: Partial<SyncState>) {
  _state = { ..._state, ...p };
  listeners.forEach((l) => l(_state));
}

let running = false;
let scheduled = false;
let currentCompanyId: string | null = null;
let pollHandle: ReturnType<typeof setInterval> | null = null;

export function startSync(companyId: string) {
  currentCompanyId = companyId;
  setSyncNudge(() => kick());
  window.addEventListener("online", onOnline);
  if (!pollHandle) pollHandle = setInterval(() => kick(), 30000);
  void kick();
}
export function stopSync() {
  currentCompanyId = null;
  setSyncNudge(null);
  window.removeEventListener("online", onOnline);
  if (pollHandle) {
    clearInterval(pollHandle);
    pollHandle = null;
  }
}
function onOnline() {
  void kick();
}

export async function kick() {
  if (!currentCompanyId) return;
  if (!navigator.onLine) {
    setState({ status: "offline", pending: await db.outbox.count() });
    return;
  }
  if (running) {
    scheduled = true;
    return;
  }
  running = true;
  setState({ status: "syncing" });
  try {
    await pushOutbox(currentCompanyId);
    await pullSince(currentCompanyId);
    setState({
      status: "idle",
      pending: await db.outbox.count(),
      lastSyncAt: Date.now(),
      error: undefined,
    });
  } catch (e: any) {
    console.error("[sync] failed", e);
    setState({
      status: "error",
      pending: await db.outbox.count(),
      error: e?.message ?? String(e),
    });
  } finally {
    running = false;
    if (scheduled) {
      scheduled = false;
      setTimeout(() => kick(), 100);
    }
  }
}

async function pushOutbox(companyId: string) {
  // Coalesce by (entity, rowId) — only push the latest state once.
  const all = await db.outbox.orderBy("enqueuedAt").toArray();
  if (all.length === 0) return;
  const latest = new Map<string, OutboxEntry>();
  for (const e of all) latest.set(`${e.entity}:${e.rowId}`, e);

  for (const [key, entry] of latest) {
    try {
      const payload = await buildPayload(companyId, entry);
      const { error } = await supabase.from("sync_rows").upsert(payload, {
        onConflict: "entity,id",
      });
      if (error) throw error;
      // Drop all queued ops for this row.
      const toDelete = all.filter((x) => `${x.entity}:${x.rowId}` === key).map((x) => x.id);
      await db.outbox.bulkDelete(toDelete);
    } catch (e: any) {
      // Bump attempts; keep entry in queue.
      await db.outbox.update(entry.id, {
        attempts: (entry.attempts ?? 0) + 1,
        lastError: e?.message ?? String(e),
      });
      throw e;
    }
  }
}

async function buildPayload(companyId: string, entry: OutboxEntry) {
  const tableName = TABLE_FOR_ENTITY[entry.entity];
  const tbl = (db as any)[tableName];
  const now = Date.now();
  if (entry.op === "delete") {
    return {
      entity: entry.entity,
      id: entry.rowId,
      company_id: companyId,
      data: {},
      updated_at: now,
      deleted_at: now,
    };
  }
  const row = await tbl.get(entry.rowId);
  if (!row) {
    // Row was deleted before we could push; convert to delete.
    return {
      entity: entry.entity,
      id: entry.rowId,
      company_id: companyId,
      data: {},
      updated_at: now,
      deleted_at: now,
    };
  }
  return {
    entity: entry.entity,
    id: entry.rowId,
    company_id: companyId,
    data: await serializeRow(entry.entity, row),
    updated_at: row.updatedAt ?? now,
    deleted_at: null as number | null,
  };
}

// Excel template stores ArrayBuffer; convert to base64 for JSON transport.
async function serializeRow(entity: SyncEntity, row: any) {
  if (entity === "excelTemplate" && row.data instanceof ArrayBuffer) {
    return { ...row, data: arrayBufferToBase64(row.data), __dataKind: "base64" };
  }
  return row;
}
async function deserializeRow(entity: SyncEntity, data: any) {
  if (entity === "excelTemplate" && data?.__dataKind === "base64") {
    const { __dataKind, ...rest } = data;
    return { ...rest, data: base64ToArrayBuffer(data.data) };
  }
  return data;
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as any);
  }
  return btoa(bin);
}
function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

// Pending conflicts surfaced for the UI.
export interface ConflictItem {
  entity: SyncEntity;
  rowId: string;
  serverData: any;
  serverUpdatedAt: number;
  serverDeleted: boolean;
  localUpdatedBy?: string;
}
const conflicts: ConflictItem[] = [];
const conflictListeners = new Set<(list: ConflictItem[]) => void>();
export function subscribeConflicts(l: (list: ConflictItem[]) => void) {
  conflictListeners.add(l);
  l(conflicts);
  return () => conflictListeners.delete(l);
}
function notifyConflicts() {
  conflictListeners.forEach((l) => l(conflicts.slice()));
}

export async function resolveConflict(
  item: ConflictItem,
  choice: "server" | "local",
) {
  const tableName = TABLE_FOR_ENTITY[item.entity];
  const tbl = (db as any)[tableName];
  if (choice === "server") {
    // Drop any pending outbox entries for this row, apply server version.
    const pending = await db.outbox.where("rowId").equals(item.rowId).toArray();
    await db.outbox.bulkDelete(
      pending.filter((p) => p.entity === item.entity).map((p) => p.id),
    );
    await withoutOutbox(async () => {
      if (item.serverDeleted) {
        await tbl.delete(item.rowId);
      } else {
        const data = await deserializeRow(item.entity, item.serverData);
        await tbl.put(data);
      }
    });
  } else {
    // Keep local: bump its updatedAt past server so next push wins LWW.
    const row = await tbl.get(item.rowId);
    if (row) {
      const next = Math.max(row.updatedAt ?? 0, item.serverUpdatedAt) + 1;
      await withoutOutbox(async () => {
        await tbl.update(item.rowId, { updatedAt: next });
      });
      // Re-enqueue so it gets pushed.
      const { uid } = await import("@/lib/db");
      await db.outbox.add({
        id: uid(),
        entity: item.entity,
        rowId: item.rowId,
        op: "upsert",
        enqueuedAt: Date.now(),
        attempts: 0,
      });
    }
  }
  const idx = conflicts.findIndex(
    (c) => c.entity === item.entity && c.rowId === item.rowId,
  );
  if (idx >= 0) conflicts.splice(idx, 1);
  notifyConflicts();
  void kick();
}

async function pullSince(companyId: string) {
  const cursorKey = `pull:${companyId}`;
  const cursor = (await db.syncMeta.get(cursorKey))?.value ?? "1970-01-01T00:00:00Z";
  const { data, error } = await supabase
    .from("sync_rows")
    .select("entity, id, data, updated_at, updated_by, deleted_at, server_updated_at")
    .eq("company_id", companyId)
    .gt("server_updated_at", cursor)
    .order("server_updated_at", { ascending: true })
    .limit(500);
  if (error) throw error;
  if (!data || data.length === 0) return;

  for (const row of data) {
    const entity = row.entity as SyncEntity;
    const tableName = TABLE_FOR_ENTITY[entity];
    if (!tableName) continue;
    const tbl = (db as any)[tableName];

    // Conflict check: do we have outstanding outbox entries for this row?
    const pending = await db.outbox
      .where("rowId")
      .equals(row.id)
      .and((e) => e.entity === entity)
      .count();
    if (pending > 0) {
      // Queue a conflict and skip overwriting until the user resolves.
      const existing = conflicts.find(
        (c) => c.entity === entity && c.rowId === row.id,
      );
      const conflict: ConflictItem = {
        entity,
        rowId: row.id,
        serverData: row.data,
        serverUpdatedAt: row.updated_at,
        serverDeleted: row.deleted_at != null,
      };
      if (existing) Object.assign(existing, conflict);
      else conflicts.push(conflict);
      notifyConflicts();
      continue;
    }

    await withoutOutbox(async () => {
      if (row.deleted_at != null) {
        await tbl.delete(row.id);
      } else {
        const data = await deserializeRow(entity, row.data);
        await tbl.put(data);
      }
    });
  }

  const newest = data[data.length - 1].server_updated_at as string;
  await db.syncMeta.put({ key: cursorKey, value: newest });
}

// Manual full reset (e.g., on company switch in the future).
export async function clearLocalSyncState() {
  await db.outbox.clear();
  await db.syncMeta.clear();
}
