import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerClient, createServiceClient } from "./supabase";
import { NotFoundError, PermissionError } from "./errors";

// ─── Types ────────────────────────────────────────────────────────────

export interface AuthUser {
  userId: string;
  email: string;
  name: string;
  role: "admin" | "manager" | "staff";
  warehouseId: string;
  warehouseName: string;
}

// ─── Auth Helpers ─────────────────────────────────────────────────────

/**
 * Get the authenticated user from the request.
 * Returns the full AuthUser with warehouse info, or null if not authenticated.
 */
export async function getAuthUser(request: Request): Promise<AuthUser | null> {
  const supabase = createServerClient(request);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  // Look up app_users row (RLS auto-scopes to user's warehouse)
  const { data: appUser, error: appError } = await supabase
    .from("app_users")
    .select("user_id, email, name, role, warehouse_id, warehouses!inner(name)")
    .eq("user_id", user.id)
    .single();

  if (appError || !appUser) return null;

  const wh = appUser.warehouses as { name: string };

  return {
    userId: appUser.user_id,
    email: appUser.email,
    name: appUser.name,
    role: appUser.role as "admin" | "manager" | "staff",
    warehouseId: appUser.warehouse_id,
    warehouseName: wh.name,
  };
}

/**
 * Require an authenticated user. Throws PermissionError if not authenticated.
 */
export async function requireAuth(request: Request): Promise<AuthUser> {
  const user = await getAuthUser(request);
  if (!user) throw new PermissionError("Not authenticated.");
  return user;
}

/**
 * Require a specific role. Throws PermissionError if role doesn't match.
 */
export async function requireRole(
  request: Request,
  allowedRoles: Array<"admin" | "manager" | "staff">,
): Promise<AuthUser> {
  const user = await requireAuth(request);
  if (!allowedRoles.includes(user.role)) {
    throw new PermissionError(
      `This action requires one of: ${allowedRoles.join(", ")}.`,
    );
  }
  return user;
}

/**
 * Create a Supabase client with the user's session attached (for RLS).
 */
export function createUserClient(request: Request): SupabaseClient {
  return createServerClient(request);
}

/**
 * Service role client (bypasses RLS). For admin-only operations
 * like inviting users (inserting into app_users).
 */
export function getServiceClient(): SupabaseClient {
  return createServiceClient();
}

/**
 * Get the IP address from the request (for audit logging).
 */
export function getClientIp(request: Request): string | null {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    null
  );
}

/**
 * Get the User-Agent from the request (for audit logging).
 */
export function getUserAgent(request: Request): string | null {
  return request.headers.get("user-agent") ?? null;
}
