/**
 * Dynamically resolves the base URL for the client application.
 * In serverless deployments (such as Vercel), it detects the live deployed URL
 * from incoming request headers (Origin, Referer, Host) or Vercel environment variables,
 * ensuring users receive valid live links instead of hardcoded localhost URLs.
 *
 * @param {import('express').Request} [req] - Optional Express request object
 * @returns {string} Base URL without trailing slash (e.g. 'https://triptally-yeu6.vercel.app')
 */
export function getClientUrl(req) {
  // 1. If CLIENT_URL is explicitly set and not localhost when running on Vercel
  if (process.env.CLIENT_URL && (!process.env.VERCEL || !process.env.CLIENT_URL.includes('localhost'))) {
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

  // 3. Check Vercel platform environment variables
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`.replace(/\/$/, '');
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/$/, '');
  }

  // 4. Default for local development
  return (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
}

export default getClientUrl;
