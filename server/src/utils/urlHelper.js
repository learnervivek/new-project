/**
 * Dynamically resolves the base URL for the client application.
 * Resolves CLIENT_URL from environment variables or incoming request headers
 * (Origin, Referer, Host), ensuring users receive valid links.
 *
 * @param {import('express').Request} [req] - Optional Express request object
 * @returns {string} Base URL without trailing slash
 */
export function getClientUrl(req) {
  // 1. If CLIENT_URL is explicitly set
  if (process.env.CLIENT_URL) {
    return process.env.CLIENT_URL.replace(/\/$/, '');
  }

  // 2. Extract origin from incoming request headers
  if (req && typeof req.get === 'function') {
    const origin = req.get('origin');
    if (origin && !origin.includes('localhost') && origin.startsWith('http')) {
      return origin.replace(/\/$/, '');
    }

    const referer = req.get('referer');
    if (referer) {
      try {
        const refUrl = new URL(referer);
        if (!refUrl.hostname.includes('localhost')) {
          return `${refUrl.protocol}//${refUrl.host}`;
        }
      } catch {
        // Ignore parsing errors
      }
    }

    const forwardedHost = req.get('x-forwarded-host') || req.get('host');
    if (forwardedHost && !forwardedHost.includes('localhost')) {
      const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
      return `${proto}://${forwardedHost}`;
    }
  }

  // 3. Default for local development
  return 'http://localhost:5173';
}

export default getClientUrl;
