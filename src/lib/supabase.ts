import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_PUBLISHABLE_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY!;

/**
 * Browser/client Supabase client.
 * Uses anon (publishable) key — safe for client bundles.
 * RLS policies enforce warehouse isolation automatically.
 */
export function createBrowserClient() {
  return createClient<Database>(supabaseUrl, supabaseAnonKey);
}

/**
 * Server-side Supabase client with user session (for Route Handlers).
 * Reads the JWT from the request cookies and attaches it.
 */
export function createServerClient(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      flowType: "pkce",
      storage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      },
    },
    global: {
      headers: {
        cookie: cookieHeader,
      },
    },
  });
}

/**
 * Server-side Supabase client with SERVICE ROLE key.
 * Bypasses RLS — use ONLY for admin operations that require it
 * (e.g., inserting app_users on invite, managing auth users).
 * NEVER expose this to the browser.
 */
export function createServiceClient() {
  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
