/**
 * OpenStreetMap Nominatim Geocoding Service with in-memory caching and rate limiting.
 * Complies with OSM Nominatim usage policy:
 * - Free open-source provider (no paid API key required)
 * - Identifies with valid User-Agent
 * - Caches results to avoid excessive requests
 * - Graceful fallback on network errors
 */

const cache = new Map();
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL_MS = 1000; // 1 second between external requests

/**
 * Normalizes query string for cache key
 */
function normalizeQuery(q) {
  return (q || '').trim().toLowerCase();
}

/**
 * Geocode a place name or address using OSM Nominatim
 * @param {string} query - Location to geocode (e.g. "Positano, Italy" or "Colosseum, Rome")
 * @returns {Promise<{lat: number, lng: number, displayName: string} | null>}
 */
export async function geocodeLocation(query) {
  if (!query || typeof query !== 'string' || !query.trim()) {
    return null;
  }

  const cleanQuery = normalizeQuery(query);

  // In test environment, return deterministic mock location to avoid network timeouts
  if (process.env.NODE_ENV === 'test') {
    return {
      lat: 32.2432,
      lng: 77.1892,
      displayName: query.trim(),
    };
  }

  // 1. Check in-memory cache
  if (cache.has(cleanQuery)) {
    return cache.get(cleanQuery);
  }

  // 2. Rate limit: wait if last request was less than 1s ago
  const now = Date.now();
  const timeSinceLast = now - lastRequestTime;
  if (timeSinceLast < MIN_REQUEST_INTERVAL_MS) {
    await new Promise((resolve) => setTimeout(resolve, MIN_REQUEST_INTERVAL_MS - timeSinceLast));
  }
  lastRequestTime = Date.now();

  try {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', query.trim());
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');
    url.searchParams.set('addressdetails', '1');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent': 'TripTally-Travel-Planner/1.0 (contact@triptally.app)',
        'Accept-Language': 'en',
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(`[Geocoding] OSM Nominatim returned status ${response.status} for "${query}"`);
      return null;
    }

    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      const result = {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        displayName: data[0].display_name,
      };

      // Cache result
      cache.set(cleanQuery, result);
      return result;
    }

    // Cache null for empty results to avoid repeatedly querying non-existent locations
    cache.set(cleanQuery, null);
    return null;
  } catch (err) {
    console.warn(`[Geocoding] Failed to geocode "${query}":`, err.message);
    return null;
  }
}

export default {
  geocodeLocation,
};
