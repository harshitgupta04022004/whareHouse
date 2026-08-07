// ─── Audit Writer Helper (Prompt 08) ─────────────────────────────────
//
// Centralized audit logging with SHA-256 hash chain.
// Every mutating API must call writeAudit() after a successful write.

import type { SupabaseClient } from "@supabase/supabase-js";

export interface AuditEntry {
  warehouseId: string;
  userId: string | null;
  entity: string;
  entityId: string | null;
  action: string;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  sessionId?: string | null;
  requestId?: string | null;
}

// ─── SHA-256 Hash Chain ───────────────────────────────────────────────

async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function computeHash(
  timestamp: string,
  userId: string | null,
  action: string,
  entityId: string | null,
  oldData: Record<string, unknown> | null,
  newData: Record<string, unknown> | null,
): Promise<string> {
  const input =
    (timestamp ?? "") +
    (userId ?? "") +
    (action ?? "") +
    (entityId ?? "") +
    (oldData ? JSON.stringify(oldData) : "") +
    (newData ? JSON.stringify(newData) : "");
  return sha256(input);
}

// ─── Write Audit Entry ────────────────────────────────────────────────

/**
 * Write an audit log entry with hash chain integrity.
 *
 * 1. Fetch the previous hash for this warehouse
 * 2. Compute current hash from row data
 * 3. Insert with previous_hash → current_hash chain
 *
 * @param supabase - Service-role Supabase client (bypasses RLS for insert)
 * @param entry - The audit entry to write
 */
export async function writeAudit(
  supabase: SupabaseClient,
  entry: AuditEntry,
): Promise<void> {
  const timestamp = new Date().toISOString();

  // Fetch the previous hash (latest entry for this warehouse)
  const { data: prevRow } = await supabase
    .from("audit_log")
    .select("current_hash")
    .eq("warehouse_id", entry.warehouseId)
    .order("timestamp", { ascending: false })
    .order("log_id", { ascending: false })
    .limit(1)
    .single();

  const previousHash = prevRow?.current_hash ?? null;

  // Compute current hash
  const currentHash = await computeHash(
    timestamp,
    entry.userId,
    entry.action,
    entry.entityId,
    entry.oldData ?? null,
    entry.newData ?? null,
  );

  // Insert the audit row
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const auditRow: any = {
    warehouse_id: entry.warehouseId,
    user_id: entry.userId,
    entity: entry.entity,
    entity_id: entry.entityId,
    action: entry.action,
    old_data: entry.oldData ?? null,
    new_data: entry.newData ?? null,
    ip_address: entry.ipAddress ?? undefined,
    user_agent: entry.userAgent ?? undefined,
    session_id: entry.sessionId ?? undefined,
    request_id: entry.requestId ?? undefined,
    previous_hash: previousHash,
    current_hash: currentHash,
  };
  await supabase.from("audit_log").insert(auditRow);
}

// ─── Integrity Verification ───────────────────────────────────────────

/**
 * Verify the audit hash chain integrity for a warehouse.
 * Calls the database function verify_audit_integrity().
 */
export async function verifyAuditIntegrity(
  supabase: SupabaseClient,
  warehouseId: string,
): Promise<{ ok: boolean; brokenAt: number | null; message: string }> {
  const { data, error } = await supabase.rpc("verify_audit_integrity", {
    p_warehouse_id: warehouseId,
  });

  if (error) throw error;

  const row = data?.[0];
  return {
    ok: row?.ok ?? false,
    brokenAt: row?.broken_at ?? null,
    message: row?.message ?? "Unknown error",
  };
}
