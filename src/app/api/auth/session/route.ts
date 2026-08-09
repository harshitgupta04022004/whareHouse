import { getAuthIdentity, getAuthUser, requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/errors";
import { createServiceClient, createServerClient } from "@/lib/supabase";
import { getClientIp, getUserAgent } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

/**
 * GET /api/auth/session
 * Returns the current authenticated user with warehouse + role info.
 * Returns 401 if not authenticated, 403 if signed in but no warehouse yet.
 */
export async function GET(request: Request) {
  try {
    const identity = await getAuthIdentity(request);
    if (!identity) {
      return Response.json(
        { error: "unauthenticated", message: "Not authenticated." },
        { status: 401 },
      );
    }

    const user = await getAuthUser(request);
    if (!user) {
      return Response.json(
        {
          error: "needs_onboarding",
          message: "No warehouse yet. Create a warehouse to continue.",
          needsOnboarding: true,
        },
        { status: 403 },
      );
    }

    return Response.json({
      user: {
        userId: user.userId,
        email: user.email,
        name: user.name,
        role: user.role,
        warehouseId: user.warehouseId,
        warehouseName: user.warehouseName,
      },
      needsOnboarding: false,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/auth/session/login
 * Logs a login event to audit_log.
 * Called after Supabase Auth sign-in succeeds on the client.
 */
export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);

    const supabase = createServiceClient();
    const ip = getClientIp(request);
    const ua = getUserAgent(request);

    // Get the current session id from the auth token
    const authClient = createServerClient(request);
    const {
      data: { session },
    } = await authClient.auth.getSession();
    const sessionId = session?.access_token?.slice(-8) ?? null;

    await writeAudit(supabase, {
      warehouseId: user.warehouseId,
      userId: user.userId,
      entity: "user",
      entityId: user.userId,
      action: "login",
      newData: { email: user.email, role: user.role },
      ipAddress: ip,
      userAgent: ua,
      sessionId,
    });

    return Response.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/auth/session
 * Logs a logout event to audit_log.
 * Called before Supabase Auth sign-out on the client.
 */
export async function DELETE(request: Request) {
  try {
    const user = await getAuthUser(request);

    if (user) {
      const supabase = createServiceClient();
      const ip = getClientIp(request);
      const ua = getUserAgent(request);

      await writeAudit(supabase, {
        warehouseId: user.warehouseId,
        userId: user.userId,
        entity: "user",
        entityId: user.userId,
        action: "logout",
        oldData: { email: user.email, role: user.role },
        ipAddress: ip,
        userAgent: ua,
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    // Logout should never fail — best-effort audit
    console.error("Logout audit error:", error);
    return Response.json({ success: true });
  }
}
