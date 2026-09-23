// Vercel serverless proxy for The Movie Database (TMDB) API.
//
// The browser calls:  /api/tmdb?endpoint=movie/popular&page=2
// This function adds the secret TMDB_API_KEY on the server, so the key never reaches the browser.
//
// Security model: the proxy is public, so it only forwards requests that match the small set of
// TMDB calls the site actually needs. Everything else is rejected before it leaves the server.

// TMDB endpoint shapes the front end is allowed to request.
// Each pattern is matched against the path that comes AFTER https://api.themoviedb.org/3/
const ALLOWED_ENDPOINTS = [
  /^configuration$/, // image base URLs and sizes
  /^trending\/(all|movie|tv)\/(day|week)$/, // trending lists
  /^(movie|tv)\/(popular|top_rated)$/, // popular and top-rated lists
  /^movie\/now_playing$/, // movies currently in theatres
  /^tv\/on_the_air$/, // shows currently airing
  /^search\/multi$/, // combined movie / TV / person search
  /^(movie|tv)\/\d{1,10}$/, // details for one title, by numeric TMDB id
  /^tv\/\d{1,10}\/season\/\d{1,3}$/, // episode list for one season
];

// Query parameters the front end may pass through to TMDB. Anything else is dropped.
const ALLOWED_PARAMS = new Set(['page', 'query', 'include_adult', 'append_to_response', 'language']);

const MAX_PARAM_LENGTH = 100; // longest value accepted for any single parameter
const TMDB_TIMEOUT_MS = 8000; // stop waiting for TMDB after 8 seconds

export default async function handler(req, res) {
  // This proxy only reads data, so every method except GET is refused.
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Split the query string into the endpoint and every other parameter.
  const { endpoint, ...params } = req.query;

  // A query value can be an array (?a=1&a=2), so check the type before testing it.
  // Only endpoints that match the allow-list above are accepted.
  if (typeof endpoint !== 'string' || !ALLOWED_ENDPOINTS.some((pattern) => pattern.test(endpoint))) {
    return res.status(400).json({ error: 'Invalid endpoint' });
  }

  // The API key lives in a Vercel environment variable, never in the code.
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    // Log the real problem for the owner, but tell the caller as little as possible.
    console.error('TMDB_API_KEY is not set in this deployment');
    return res.status(500).json({ error: 'Server is not configured' });
  }

  // Build the outgoing query string from allow-listed parameters only.
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    // Skip unknown parameters and repeated ones (which arrive as arrays).
    if (!ALLOWED_PARAMS.has(key) || typeof value !== 'string') continue;
    // Reject oversized values instead of forwarding them.
    if (value.length > MAX_PARAM_LENGTH) {
      return res.status(400).json({ error: 'Parameter too long' });
    }
    search.set(key, value);
  }
  // Set the key last and from the server only, so a caller can never override it.
  search.set('api_key', apiKey);

  // Abort the request if TMDB is slow, so a hung call cannot tie up the function.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TMDB_TIMEOUT_MS);

  try {
    // The endpoint already matched the allow-list, so it is safe to place in the URL.
    const response = await fetch(`https://api.themoviedb.org/3/${endpoint}?${search.toString()}`, {
      signal: controller.signal,
    });
    const data = await response.json();

    // Cache only successful answers, for 5 minutes, so errors are never served from cache.
    if (response.ok) {
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    }
    // Pass TMDB's status code and body through to the browser.
    return res.status(response.status).json(data);
  } catch (error) {
    // Log the detail privately; return a generic message to the caller.
    console.error('TMDB request failed:', error && error.name);
    return res.status(502).json({ error: 'Failed to fetch from TMDB' });
  } finally {
    // Always clear the timer so it does not keep the function alive.
    clearTimeout(timer);
  }
}
