// API Client Service for EZTV, YTS, The Pirate Bay (APIBay), TVMaze, ISS & NASA Mars Weather

export async function fetchEZTVTorrents({ page = 1, limit = 30, imdb_id = '' }) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString()
  });
  if (imdb_id) params.append('imdb_id', imdb_id);

  const res = await fetch(`/api/eztv/torrents?${params.toString()}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch TV torrents from EZTV');
  }
  return res.json();
}

export async function fetchYTSMovies({ page = 1, limit = 30, query_term = '', quality = '', genre = '', sort_by = 'date_added', order_by = 'desc' }) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    sort_by,
    order_by
  });
  if (query_term) params.append('query_term', query_term);
  if (quality) params.append('quality', quality);
  if (genre) params.append('genre', genre);

  const res = await fetch(`/api/yts/movies?${params.toString()}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch movies from YTS');
  }
  return res.json();
}

export async function fetchPirateBayTorrents({ query = 'Breaking Bad', cat = '200' }) {
  const params = new URLSearchParams({
    q: query || 'Breaking Bad',
    cat: cat || '200'
  });

  const res = await fetch(`/api/tpb/search?${params.toString()}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch torrents from The Pirate Bay');
  }
  return res.json();
}

export async function searchTVShows(query) {
  if (!query || query.trim().length < 2) return [];
  const res = await fetch(`/api/search/shows?q=${encodeURIComponent(query)}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.shows || [];
}

// ISS Space Station API Client with 24-Hour LocalStorage Caching Strategy
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export async function fetchISSPasses({
  visibleOnly = false,
  minElevation = 15,
  daysAhead = 14,
  sunAltMax = -3,
  n = 20,
  forceRefresh = false
} = {}) {
  const cacheKey = `iss_pass_hamilton_v3_${visibleOnly}_${minElevation}_${daysAhead}_${sunAltMax}_${n}`;

  if (!forceRefresh) {
    try {
      const cachedRaw = localStorage.getItem(cacheKey);
      if (cachedRaw) {
        const cachedObj = JSON.parse(cachedRaw);
        const age = Date.now() - (cachedObj.timestamp || 0);
        if (age < TWENTY_FOUR_HOURS_MS) {
          return {
            ...cachedObj.data,
            isLocalStorageCached: true,
            cachedAt: cachedObj.timestamp,
            cacheExpiresInMs: TWENTY_FOUR_HOURS_MS - age
          };
        }
      }
    } catch (e) {
      console.warn('[ISS Cache] LocalStorage error:', e);
    }
  }

  const params = new URLSearchParams({
    lat: '43.25',
    lon: '-79.87',
    visible_only: visibleOnly.toString(),
    min_elevation: minElevation.toString(),
    days_ahead: daysAhead.toString(),
    sun_alt_max: sunAltMax.toString(),
    n: n.toString()
  });

  let data;
  try {
    const res = await fetch(`/api/iss/passes?${params.toString()}`);
    if (!res.ok) throw new Error(`Proxy error ${res.status}`);
    data = await res.json();
  } catch (proxyError) {
    const directRes = await fetch(`https://iss-api.polluxlabs.io/iss-pass?${params.toString()}`);
    if (!directRes.ok) throw new Error('Failed to fetch ISS pass data from both proxy and direct API');
    data = await directRes.json();
  }

  const now = Date.now();
  try {
    localStorage.setItem(cacheKey, JSON.stringify({
      timestamp: now,
      data
    }));
  } catch (e) {
    console.warn('[ISS Cache] Failed to save to LocalStorage:', e);
  }

  return {
    ...data,
    isLocalStorageCached: false,
    cachedAt: now,
    cacheExpiresInMs: TWENTY_FOUR_HOURS_MS
  };
}

// NASA Mars Weather API Client with 12-Hour LocalStorage Caching Strategy
const MARS_CACHE_KEY = 'nasa_mars_weather_cache_v1';
const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

export async function fetchMarsWeather(forceRefresh = false) {
  if (!forceRefresh) {
    try {
      const cachedRaw = localStorage.getItem(MARS_CACHE_KEY);
      if (cachedRaw) {
        const cachedObj = JSON.parse(cachedRaw);
        const age = Date.now() - (cachedObj.timestamp || 0);
        if (age < TWELVE_HOURS_MS) {
          return {
            ...cachedObj.data,
            isLocalStorageCached: true,
            cachedAt: cachedObj.timestamp,
            cacheExpiresInMs: TWELVE_HOURS_MS - age
          };
        }
      }
    } catch (e) {
      console.warn('[Mars Cache] LocalStorage error:', e);
    }
  }

  let data;
  try {
    const res = await fetch('/api/mars/weather');
    if (!res.ok) throw new Error(`Proxy error ${res.status}`);
    data = await res.json();
  } catch (proxyError) {
    const directRes = await fetch('https://api.nasa.gov/insight_weather/?api_key=HjDzwXUG8xus968xQkgPC0MKB6hcUN1hF4x5TvaP&feedtype=json&ver=1.0');
    if (!directRes.ok) throw new Error('Failed to fetch Mars weather from NASA API');
    data = await directRes.json();
  }

  const now = Date.now();
  try {
    localStorage.setItem(MARS_CACHE_KEY, JSON.stringify({
      timestamp: now,
      data
    }));
  } catch (e) {
    console.warn('[Mars Cache] Failed to save to LocalStorage:', e);
  }

  return {
    ...data,
    isLocalStorageCached: false,
    cachedAt: now,
    cacheExpiresInMs: TWELVE_HOURS_MS
  };
}
