/**
 * Dynamically resolves the base URL for the client application.
 * Resolves CLIENT_URL from environment variables or incoming request headers
 * (Origin, Referer, Host), ensuring users receive valid links.
 *
 * @param {import('express').Request} [req] - Optional Express request object
 * @returns {string} Base URL without trailing slash
 */
export function getClientUrl(req) {
  const envUrl = process.env.CLIENT_URL ? process.env.CLIENT_URL.trim() : '';

  // 1. If CLIENT_URL is explicitly set to a live/production domain (not localhost)
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl.replace(/\/$/, '');
  }

  // 2. Extract origin from incoming request headers (Origin, Referer, Host)
  // This ensures live client requests (e.g. from https://triptally.work.gd) resolve correctly
  // even if CLIENT_URL was left as localhost or unset in server environment.
  if (req && typeof req.get === 'function') {
    const origin = req.get('origin');
    if (origin && !origin.includes('localhost') && !origin.includes('127.0.0.1') && origin.startsWith('http')) {
      return origin.replace(/\/$/, '');
    }

    const referer = req.get('referer');
    if (referer) {
      try {
        const refUrl = new URL(referer);
        if (!refUrl.hostname.includes('localhost') && !refUrl.hostname.includes('127.0.0.1')) {
          return `${refUrl.protocol}//${refUrl.host}`;
        }
      } catch {
        // Ignore parsing errors
      }
    }

    const forwardedHost = req.get('x-forwarded-host') || req.get('host');
    if (forwardedHost && !forwardedHost.includes('localhost') && !forwardedHost.includes('127.0.0.1')) {
      const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
      return `${proto}://${forwardedHost}`;
    }
  }

  // 3. Fallback to explicitly configured CLIENT_URL (e.g. for local dev)
  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }

  // 4. Default for local development
  return 'http://localhost:5173';
}

export default getClientUrl;
