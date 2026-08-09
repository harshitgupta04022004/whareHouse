/**
 * Platform super-admin allowlist.
 * Access is enforced server-side on every /api/super-admin route.
 * Client checks are UI-only.
 */
export const SUPER_ADMIN_EMAILS = [
  "hg280175@gmail.com",
  "harshitgupta040204@gmail.com",
  "harshitguptafebruary42004@gmail.com",
  "harshitgupta12m22d@gmail.com",
  "harshitguptafourfebruary2004@gmail.com",
] as const;

const ALLOWED = new Set(
  SUPER_ADMIN_EMAILS.map((email) => email.trim().toLowerCase()),
);

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ALLOWED.has(normalizeEmail(email));
}
