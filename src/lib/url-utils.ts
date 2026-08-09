/**
 * Get the correct app URL for redirects and callbacks.
 * Works in both development and production environments.
 */
export function getAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  return "http://localhost:3000";
}

export function getRedirectUrl(path: string = "/auth/callback"): string {
  const baseUrl = getAppUrl();
  return `${baseUrl}${path}`;
}

/**
 * Derive the app URL from the incoming request.
 * More reliable than env vars because it reflects the actual host.
 */
export function getAppUrlFromRequest(request: Request): string {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export function getRedirectUrlFromRequest(request: Request, path: string = "/auth/callback"): string {
  const baseUrl = getAppUrlFromRequest(request);
  return `${baseUrl}${path}`;
}