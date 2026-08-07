import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let client: ReturnType<typeof createClient<Database>> | null = null;

/**
 * Singleton Supabase browser client.
 * Uses anon key — safe for client bundles.
 * RLS enforces warehouse isolation automatically.
 */
export function getSupabase() {
  if (client) return client;
  client = createClient<Database>(supabaseUrl, supabaseAnonKey);
  return client;
}
