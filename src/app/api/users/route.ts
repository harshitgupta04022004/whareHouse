import { requireAuth } from "@/lib/auth";
import { checkRouteAccess } from "@/lib/rbac";
import { handleApiError, ValidationError, ConflictError, PermissionError } from "@/lib/errors";
import { createServiceClient } from "@/lib/supabase";
import { writeAudit } from "@/lib/audit";
import { z } from "zod";

const ROUTE_KEY_GET = "GET /api/users";
const ROUTE_KEY_POST = "POST /api/users/invite";
const ROUTE_KEY_PATCH = "PATCH /api/users";
const ROUTE_KEY_DELETE = "DELETE /api/users";

const inviteUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  role: z.enum(["admin", "manager", "staff"]),
});

const updateUserSchema = z.object({
  user_id: z.string().uuid(),
  name: z.string().min(2).max(100).optional(),
  role: z.enum(["admin", "manager", "staff"]).optional(),
});

/**
 * GET /api/users
 * List all users in the warehouse (admin only).
 */
export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    await checkRouteAccess(ROUTE_KEY_GET, user);

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("app_users")
      .select("user_id, name, email, role, created_at")
      .eq("warehouse_id", user.warehouseId)
      .order("name");

    if (error) throw error;

    return Response.json({ users: data ?? [] });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/users/invite
 * Invite a user to the warehouse (admin only).
 * Creates Supabase Auth user + app_users row.
 */
export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    await checkRouteAccess(ROUTE_KEY_POST, user);

    const body = await request.json();
    const parsed = inviteUserSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      throw new ValidationError(firstError.path.join("."), firstError.message);
    }

    const { email, name, role } = parsed.data;
    const supabase = createServiceClient();

    const { data: existing } = await supabase
      .from("app_users")
      .select("user_id, warehouse_id")
      .eq("email", email)
      .single();

    if (existing) {
      throw new ConflictError("Email already registered.");
    }

    const { data: authUser, error: authError } = await supabase.auth.admin.inviteUserByEmail(
      email,
      {
        data: { name, warehouse_id: user.warehouseId, role },
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/callback`,
      },
    );

    if (authError) {
      if (authError.message?.includes("already")) {
        throw new ConflictError("Email already registered.");
      }
      throw authError;
    }

    const { error: insertError } = await supabase.from("app_users").insert({
      user_id: authUser.user.id,
      warehouse_id: user.warehouseId,
      name,
      email,
      role,
    });

    if (insertError) {
      await supabase.auth.admin.deleteUser(authUser.user.id);
      if (insertError.code === "23505") {
        throw new ConflictError("Email already registered.");
      }
      throw insertError;
    }

    await writeAudit(supabase, {
      warehouseId: user.warehouseId,
      userId: user.userId,
      entity: "user",
      entityId: authUser.user.id,
      action: "add_user",
      newData: { name, email, role },
    });

    return Response.json(
      { user_id: authUser.user.id, message: "User invited." },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/users
 * Update a user's name or role (admin only).
 */
export async function PATCH(request: Request) {
  try {
    const user = await requireAuth(request);
    await checkRouteAccess(ROUTE_KEY_PATCH, user);

    const body = await request.json();
    const parsed = updateUserSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      throw new ValidationError(firstError.path.join("."), firstError.message);
    }

    const { user_id, ...updates } = parsed.data;
    const supabase = createServiceClient();

    const { data: existing } = await supabase
      .from("app_users")
      .select("*")
      .eq("user_id", user_id)
      .eq("warehouse_id", user.warehouseId)
      .single();

    if (!existing) throw new ValidationError("user_id", "User not found in this warehouse");

    if (updates.role && updates.role !== "admin" && existing.role === "admin") {
      const { count } = await supabase
        .from("app_users")
        .select("user_id", { count: "exact", head: true })
        .eq("warehouse_id", user.warehouseId)
        .eq("role", "admin");

      if (count !== null && count <= 1) {
        throw new PermissionError(
          "You cannot change your own role — you are the last admin.",
        );
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateFields: any = {};
    if (updates.name !== undefined) updateFields.name = updates.name;
    if (updates.role !== undefined) updateFields.role = updates.role;

    if (Object.keys(updateFields).length === 0) {
      return Response.json({ message: "No changes." });
    }

    const { error } = await supabase
      .from("app_users")
      .update(updateFields)
      .eq("user_id", user_id);

    if (error) throw error;

    await writeAudit(supabase, {
      warehouseId: user.warehouseId,
      userId: user.userId,
      entity: "user",
      entityId: user_id,
      action: "update_user",
      oldData: existing as unknown as Record<string, unknown>,
      newData: { ...existing, ...updateFields } as Record<string, unknown>,
    });

    return Response.json({ message: "User updated." });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/users?id=<uuid>
 * Remove a user from the warehouse (admin only).
 */
export async function DELETE(request: Request) {
  try {
    const user = await requireAuth(request);
    await checkRouteAccess(ROUTE_KEY_DELETE, user);

    const url = new URL(request.url);
    const targetUserId = url.searchParams.get("id");
    if (!targetUserId) throw new ValidationError("id", "User ID required");

    const supabase = createServiceClient();

    const { data: existing } = await supabase
      .from("app_users")
      .select("*")
      .eq("user_id", targetUserId)
      .eq("warehouse_id", user.warehouseId)
      .single();

    if (!existing) throw new ValidationError("id", "User not found in this warehouse");

    if (existing.role === "admin") {
      const { count } = await supabase
        .from("app_users")
        .select("user_id", { count: "exact", head: true })
        .eq("warehouse_id", user.warehouseId)
        .eq("role", "admin");

      if (count !== null && count <= 1) {
        throw new PermissionError("Cannot remove the last admin.");
      }
    }

    const { error } = await supabase
      .from("app_users")
      .delete()
      .eq("user_id", targetUserId);

    if (error) throw error;

    await supabase.auth.admin.deleteUser(targetUserId);

    await writeAudit(supabase, {
      warehouseId: user.warehouseId,
      userId: user.userId,
      entity: "user",
      entityId: targetUserId,
      action: "remove_user",
      oldData: existing as unknown as Record<string, unknown>,
    });

    return Response.json({ message: "User removed." });
  } catch (error) {
    return handleApiError(error);
  }
}
