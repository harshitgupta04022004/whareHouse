/**
 * Get the correct app URL for redirects and callbacks.
 * Works in both development and production environments.
 */
export function getAppUrl(): string {
  // In production (Vercel), use the environment variable
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  
  // In development, default to localhost
  return "http://localhost:3000";
}

export function getRedirectUrl(path: string = "/auth/callback"): string {
  const baseUrl = getAppUrl();
  return `${baseUrl}${path}`;
}