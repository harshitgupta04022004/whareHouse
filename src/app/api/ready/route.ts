import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const startTime = Date.now();

export async function GET() {
  const checks: Record<string, string> = {};

  // Check Supabase Postgres
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const { error } = await supabase.from("warehouses").select("warehouse_id").limit(1);
    checks.db = error ? `error: ${error.message}` : "ok";
  } catch (err) {
    checks.db = `error: ${err instanceof Error ? err.message : "unknown"}`;
  }

  // Check Google Drive (lightweight — just verify env is set)
  checks.drive = process.env.DRIVE_ROOT_FOLDER_ID ? "ok" : "not_configured";

  const allOk = Object.values(checks).every((v) => v === "ok" || v === "not_configured");

  return NextResponse.json(
    {
      status: allOk ? "ready" : "not_ready",
      ...checks,
      uptime: Math.floor((Date.now() - startTime) / 1000),
    },
    { status: allOk ? 200 : 503 }
  );
}
