import { requireAuth } from "@/lib/auth";
import { checkRouteAccess } from "@/lib/rbac";
import { handleApiError } from "@/lib/errors";
import { createServiceClient } from "@/lib/supabase";

const ROUTE_KEY_INTEGRITY = "GET /api/audit/integrity";

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    await checkRouteAccess(ROUTE_KEY_INTEGRITY, user);

    const supabase = createServiceClient();
    const { data, error } = await supabase.rpc("repair_audit_chain", {
      p_warehouse_id: user.warehouseId,
    });
    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;
    const { verifyAuditIntegrity } = await import("@/lib/audit");
    const verify = await verifyAuditIntegrity(supabase, user.warehouseId);

    return Response.json({
      ok: verify.ok,
      repairedCount: row?.repaired_count ?? 0,
      message: row?.message ?? "Repair finished.",
      verify,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
