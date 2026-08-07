/**
 * Test Client Helpers — Shared utilities for creating Supabase clients
 * with different auth contexts for integration tests.
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/** Service-role client — bypasses RLS, for seeding/teardown. */
export function getServiceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Anonymous client — RLS enforced, no auth. */
export function getAnonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Authenticate as a specific user and return an authed Supabase client.
 * This uses the password-based sign-in flow.
 */
export async function getAuthedClient(
  email: string,
  password: string
): Promise<SupabaseClient> {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: true },
  });

  const { error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(`Failed to authenticate as ${email}: ${error.message}`);
  }

  return client;
}

/**
 * Create a temporary test user, run test callback, then clean up.
 */
export async function withTestUser<T>(
  email: string,
  password: string,
  fn: (client: SupabaseClient) => Promise<T>
): Promise<T> {
  const service = getServiceClient();

  // Create user via service role
  const { data, error: createError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError) {
    throw new Error(`Failed to create test user: ${createError.message}`);
  }

  try {
    const client = await getAuthedClient(email, password);
    return await fn(client);
  } finally {
    // Cleanup: delete the test user
    await service.auth.admin.deleteUser(data.user.id);
  }
}

/** Base URL for API integration tests. */
export const API_BASE = process.env.BASE_URL || "http://localhost:3000";

/**
 * Make an authenticated API request.
 */
export async function apiRequest(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<Response> {
  const { token, ...fetchOptions } = options;
  const headers = new Headers(fetchOptions.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(`${API_BASE}${path}`, {
    ...fetchOptions,
    headers,
  });
}
