import { requireAuth } from "@/lib/auth";
import { checkRouteAccess } from "@/lib/rbac";
import { handleApiError, ValidationError } from "@/lib/errors";
import { createServiceClient } from "@/lib/supabase";

const ROUTE_KEY = "GET /api/dashboard";

/**
 * GET /api/dashboard?startDate=<date>&endDate=<date>
 * Admin/Manager dashboard: inventory matrix per product with date-range IN/OUT.
 */
export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    await checkRouteAccess(ROUTE_KEY, user);

    const url = new URL(request.url);
    // Accept both startDate/endDate (API contract) and from/to (frontend)
    const startDate =
      url.searchParams.get("startDate") ?? url.searchParams.get("from");
    const endDate =
      url.searchParams.get("endDate") ?? url.searchParams.get("to");

    if (!startDate || !endDate) {
      throw new ValidationError("dates", "startDate and endDate are required");
    }
    if (isNaN(Date.parse(startDate)) || isNaN(Date.parse(endDate))) {
      throw new ValidationError("dates", "Invalid date format");
    }

    const supabase = createServiceClient();

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

    // Get date-filtered IN/OUT per product (both bags and weight)
    const { data: filteredDoItems } = await supabase
      .from("do_items")
      .select(`
        item_id,
        bags,
        total_weight,
        delivery_orders!inner(direction, date, warehouse_id)
      `)
      .eq("delivery_orders.warehouse_id", user.warehouseId)
      .gte("delivery_orders.date", startDate)
      .lte("delivery_orders.date", endDate);

    const filteredAgg = new Map<string, { in_bags: number; in_kg: number; out_bags: number; out_kg: number }>();

    if (filteredDoItems) {
      for (const row of filteredDoItems) {
        const doRef = row.delivery_orders as unknown as { direction: string };
        const existing = filteredAgg.get(row.item_id) ?? { in_bags: 0, in_kg: 0, out_bags: 0, out_kg: 0 };

        if (doRef.direction === "IN") {
          existing.in_bags += row.bags;
          existing.in_kg += Number(row.total_weight);
        } else {
          existing.out_bags += row.bags;
          existing.out_kg += Number(row.total_weight);
        }
        filteredAgg.set(row.item_id, existing);
      }
    }

    const matrix = (products ?? []).map((item) => {
      const filtered = filteredAgg.get(item.item_id) ?? { in_bags: 0, in_kg: 0, out_bags: 0, out_kg: 0 };
      const summary = summaryMap.get(item.item_id);
      const remaining = Number(summary?.remaining ?? 0);
      const remainingBags = item.bag_size > 0 ? Math.floor(remaining / item.bag_size) : 0;

      return {
        item_id: item.item_id,
        product: item.name,
        bag_size: item.bag_size,
        in_bags: filtered.in_bags,
        in_kg: Math.round(filtered.in_kg * 100) / 100,
        out_bags: filtered.out_bags,
        out_kg: Math.round(filtered.out_kg * 100) / 100,
        remaining: Math.round(remaining * 100) / 100,
        remaining_bags: remainingBags,
      };
    });

    return Response.json({
      startDate,
      endDate,
      data: matrix,
      products: matrix,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
