import { requireAuth } from "@/lib/auth";
import { checkRouteAccess } from "@/lib/rbac";
import { handleApiError } from "@/lib/errors";
import { createServiceClient } from "@/lib/supabase";

const ROUTE_KEY_LIST = "GET /api/audit";
const ROUTE_KEY_INTEGRITY = "GET /api/audit/integrity";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    await checkRouteAccess(ROUTE_KEY_LIST, user);

    const url = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") ?? "50", 10), 1), 200);
    const offset = Math.max(parseInt(url.searchParams.get("offset") ?? "0", 10), 0);
    const entity = url.searchParams.get("entity");
    const action = url.searchParams.get("action");
    const userId = url.searchParams.get("userId");

    const supabase = createServiceClient();

    let query = supabase
      .from("audit_log")
      .select("log_id, user_id, entity, entity_id, action, old_data, new_data, ip_address, request_id, timestamp, app_users(name)", { count: "exact" })
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

    return Response.json({
      entries: data?.map((row) => ({
        log_id: row.log_id,
        user_id: row.user_id,
        user_name: (row.app_users as { name: string } | null)?.name ?? null,
        app_users: row.app_users,
        entity: row.entity,
        entity_id: row.entity_id,
        action: row.action,
        old_data: row.old_data,
        new_data: row.new_data,
        ip_address: row.ip_address,
        request_id: row.request_id,
        timestamp: row.timestamp,
      })) ?? [],
      data: data?.map((row) => ({
        log_id: row.log_id,
        user_id: row.user_id,
        user_name: (row.app_users as { name: string } | null)?.name ?? null,
        app_users: row.app_users,
        entity: row.entity,
        entity_id: row.entity_id,
        action: row.action,
        old_data: row.old_data,
        new_data: row.new_data,
        ip_address: row.ip_address,
        request_id: row.request_id,
        timestamp: row.timestamp,
      })) ?? [],
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

export async function HEAD(request: Request) {
  try {
    const user = await requireAuth(request);
    await checkRouteAccess(ROUTE_KEY_INTEGRITY, user);

    const { verifyAuditIntegrity } = await import("@/lib/audit");
    const supabase = createServiceClient();
    const result = await verifyAuditIntegrity(supabase, user.warehouseId);

    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
