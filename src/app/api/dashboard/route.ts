import { requireAuth } from "@/lib/auth";
import { checkRouteAccess } from "@/lib/rbac";
import { handleApiError, ValidationError } from "@/lib/errors";
import { createServiceClient } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rate-limit";

const ROUTE_KEY = "GET /api/dashboard";

/**
 * GET /api/dashboard?startDate=<date>&endDate=<date>
 * Admin/Manager dashboard: inventory matrix per product with date-range IN/OUT.
 */
export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    await checkRouteAccess(ROUTE_KEY, user);
    await checkRateLimit("dashboard", user.userId);

    const url = new URL(request.url);
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");

    if (!startDate || !endDate) {
      throw new ValidationError("dates", "startDate and endDate are required");
    }
    if (isNaN(Date.parse(startDate)) || isNaN(Date.parse(endDate))) {
      throw new ValidationError("dates", "Invalid date format");
    }

    const supabase = createServiceClient();

    // Query the dashboard SQL from database.md
    const { data, error } = await supabase.rpc("current_warehouse_id" as never).select();

    // Direct SQL query via the service client for the dashboard aggregation
    const { data: products, error: productsError } = await supabase
      .from("items")
      .select("item_id, name, bag_size, warehouse_id")
      .eq("warehouse_id", user.warehouseId)
      .order("name");

    if (productsError) throw productsError;

    // Get product_summary for remaining (all-time)
    const { data: summaries } = await supabase
      .from("product_summary")
      .select("item_id, total_in, total_out, remaining")
      .eq("warehouse_id", user.warehouseId);

    const summaryMap = new Map(
      summaries?.map((s) => [s.item_id, s]) ?? [],
    );

    // Get date-filtered IN/OUT per product
    // We need to join do_items with delivery_orders for date filtering
    const { data: filteredDoItems } = await supabase
      .from("do_items")
      .select(`
        item_id,
        total_weight,
        delivery_orders!inner(direction, date, warehouse_id)
      `)
      .eq("delivery_orders.warehouse_id", user.warehouseId)
      .gte("delivery_orders.date", startDate)
      .lte("delivery_orders.date", endDate);

    // Aggregate filtered IN/OUT per item
    const filteredAgg = new Map<string, { total_in: number; total_out: number }>();

    if (filteredDoItems) {
      for (const row of filteredDoItems) {
        const doRef = row.delivery_orders as { direction: string };
        const existing = filteredAgg.get(row.item_id) ?? { total_in: 0, total_out: 0 };

        if (doRef.direction === "IN") {
          existing.total_in += Number(row.total_weight);
        } else {
          existing.total_out += Number(row.total_weight);
        }
        filteredAgg.set(row.item_id, existing);
      }
    }

    const matrix = (products ?? []).map((item) => {
      const filtered = filteredAgg.get(item.item_id) ?? { total_in: 0, total_out: 0 };
      const summary = summaryMap.get(item.item_id);
      const remaining = summary?.remaining ?? 0;
      const remainingBags = item.bag_size > 0 ? Math.floor(remaining / item.bag_size) : 0;

      return {
        product: item.name,
        bag_size: item.bag_size,
        total_in: Math.round(filtered.total_in * 100) / 100,
        total_out: Math.round(filtered.total_out * 100) / 100,
        remaining: Math.round(remaining * 100) / 100,
        remaining_bags: remainingBags,
      };
    });

    return Response.json({
      startDate,
      endDate,
      products: matrix,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
