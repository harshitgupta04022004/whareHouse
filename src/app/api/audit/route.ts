import { requireAuth } from "@/lib/auth";
import { checkRouteAccess } from "@/lib/rbac";
import { handleApiError } from "@/lib/errors";
import { createServiceClient } from "@/lib/supabase";

const ROUTE_KEY_LIST = "GET /api/audit";
const ROUTE_KEY_INTEGRITY = "GET /api/audit/integrity";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    await checkRouteAccess(ROUTE_KEY_LIST, user, request);

    const url = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") ?? "50", 10), 1), 200);
    const offset = Math.max(parseInt(url.searchParams.get("offset") ?? "0", 10), 0);
    const entity = url.searchParams.get("entity");
    const action = url.searchParams.get("action");
    const userId = url.searchParams.get("userId");

    const supabase = createServiceClient();

    let query = supabase
      .from("audit_log")
      .select("log_id, user_id, actor_name, entity, entity_id, action, old_data, new_data, ip_address, request_id, timestamp, app_users(name)", { count: "exact" })
      .eq("warehouse_id", user.warehouseId)
      .order("timestamp", { ascending: false })
      .order("log_id", { ascending: false })
      .range(offset, offset + limit - 1);

    if (entity) query = query.eq("entity", entity);
    if (action) query = query.eq("action", action);
    // Include actions by the user AND actions targeting the user (add_user, role changes, etc.)
    if (userId) {
      query = query.or(
        `user_id.eq.${userId},and(entity.eq.user,entity_id.eq.${userId})`,
      );
    }

    const { data, error, count } = await query;
    if (error) throw error;

    const mapRow = (row: {
      log_id: number;
      user_id: string | null;
      actor_name?: string | null;
      entity: string;
      entity_id: string | null;
      action: string;
      old_data: Record<string, unknown> | null;
      new_data: Record<string, unknown> | null;
      ip_address: string | null;
      request_id: string | null;
      timestamp: string;
      app_users: { name: string } | null;
    }) => {
      const joinedName = row.app_users?.name ?? null;
      const actorName = row.actor_name?.trim() || joinedName;
      const targetName = targetLabelFromPayload(row.entity, row.new_data, row.old_data);

      return {
        log_id: row.log_id,
        user_id: row.user_id,
        actor_name: actorName,
        user_name: actorName,
        app_users: actorName ? { name: actorName } : row.app_users,
        entity: row.entity,
        entity_id: row.entity_id,
        target_name: targetName,
        action: row.action,
        old_data: row.old_data,
        new_data: row.new_data,
        ip_address: row.ip_address,
        request_id: row.request_id,
        timestamp: row.timestamp,
      };
    };

    return Response.json({
      entries: data?.map(mapRow) ?? [],
      data: data?.map(mapRow) ?? [],
      total: count ?? 0,
      limit,
      offset,
      hasMore: (count ?? 0) > offset + limit,
      cursor: String(offset + limit),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

function targetLabelFromPayload(
  entity: string,
  newData: Record<string, unknown> | null,
  oldData: Record<string, unknown> | null,
): string | null {
  const data = { ...(oldData ?? {}), ...(newData ?? {}) };

  if (entity === "user") {
    const name =
      (typeof newData?.name === "string" && newData.name) ||
      (typeof oldData?.name === "string" && oldData.name) ||
      null;
    const email =
      (typeof newData?.email === "string" && newData.email) ||
      (typeof oldData?.email === "string" && oldData.email) ||
      null;
    if (name && email) return `${name} (${email})`;
    return name || email || null;
  }

  if (entity === "do") {
    const doNumber =
      (typeof data.do_number === "string" && data.do_number) || null;
    const direction =
      (typeof data.direction === "string" && data.direction) || null;
    const date = typeof data.date === "string" ? data.date : null;
    const parts = [doNumber, direction, date].filter(Boolean);
    return parts.length > 0 ? parts.join(" · ") : null;
  }

  if (entity === "do_item") {
    const doNumber =
      (typeof data.do_number === "string" && data.do_number) || null;
    const bags = typeof data.bags === "number" ? `${data.bags} bags` : null;
    const vehicle =
      (typeof data.vehicle_number === "string" && data.vehicle_number) || null;
    const parts = [
      doNumber ? `DO ${doNumber}` : null,
      bags,
      vehicle ? `veh ${vehicle}` : null,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(" · ") : null;
  }

  if (entity === "party" || entity === "item") {
    const name = typeof data.name === "string" ? data.name : null;
    const bagSize =
      entity === "item" && typeof data.bag_size === "number"
        ? `${data.bag_size} kg`
        : null;
    if (name && bagSize) return `${name} · ${bagSize}`;
    return name;
  }

  if (entity === "file") {
    return typeof data.file_name === "string" ? data.file_name : null;
  }

  return null;
}

export async function HEAD(request: Request) {
  try {
    const user = await requireAuth(request);
    await checkRouteAccess(ROUTE_KEY_INTEGRITY, user, request);

    const { verifyAuditIntegrity } = await import("@/lib/audit");
    const supabase = createServiceClient();
    const result = await verifyAuditIntegrity(supabase, user.warehouseId);

    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
