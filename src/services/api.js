// API Client Service for EZTV, YTS, The Pirate Bay (APIBay), TVMaze, ISS (SGP4), NASA Mars, NASA SVS Moon & Xweather Hamilton

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

export async function fetchPirateBayTorrents({ query = '', cat = '0', page = 1, limit = 100 }) {
  const params = new URLSearchParams({
    q: query || '',
    cat: cat || '0',
    page: page.toString(),
    limit: limit.toString()
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

// ISS Space Station High-Precision SGP4 Engine (24-Hour LocalStorage Caching Strategy)
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export async function fetchISSPasses({
  visibleOnly = false,
  minElevation = 10,
  daysAhead = 14,
  forceRefresh = false
} = {}) {
  const cacheKey = `iss_pass_sgp4_v4_${visibleOnly}_${minElevation}_${daysAhead}`;

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
    days_ahead: daysAhead.toString()
  });

  const res = await fetch(`/api/iss/passes?${params.toString()}`);
  if (!res.ok) throw new Error(`Proxy error ${res.status}`);
  const data = await res.json();

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

// NASA Curiosity Rover Active Mars Weather Client (6-Hour LocalStorage Caching Strategy)
const MARS_CURIOSITY_CACHE_KEY = 'nasa_mars_curiosity_weather_v2';
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

export async function fetchMarsWeather(forceRefresh = false) {
  if (!forceRefresh) {
    try {
      const cachedRaw = localStorage.getItem(MARS_CURIOSITY_CACHE_KEY);
      if (cachedRaw) {
        const cachedObj = JSON.parse(cachedRaw);
        const age = Date.now() - (cachedObj.timestamp || 0);
        if (age < SIX_HOURS_MS) {
          return {
            ...cachedObj.data,
            isLocalStorageCached: true,
            cachedAt: cachedObj.timestamp,
            cacheExpiresInMs: SIX_HOURS_MS - age
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
    const directRes = await fetch('https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json');
    if (!directRes.ok) throw new Error('Failed to fetch active Curiosity Mars weather from NASA API');
    data = await directRes.json();
  }

  const now = Date.now();
  try {
    localStorage.setItem(MARS_CURIOSITY_CACHE_KEY, JSON.stringify({
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
    cacheExpiresInMs: SIX_HOURS_MS
  };
}

// NASA SVS Dial-A-Moon Phase Client (6-Hour LocalStorage Caching Strategy)
const MOON_PHASE_CACHE_KEY = 'nasa_svs_moon_phase_v1';

export async function fetchMoonPhase(forceRefresh = false) {
  if (!forceRefresh) {
    try {
      const cachedRaw = localStorage.getItem(MOON_PHASE_CACHE_KEY);
      if (cachedRaw) {
        const cachedObj = JSON.parse(cachedRaw);
        const age = Date.now() - (cachedObj.timestamp || 0);
        if (age < SIX_HOURS_MS) {
          return cachedObj.data;
        }
      }
    } catch (e) {
      console.warn('[Moon Cache] LocalStorage error:', e);
    }
  }

  let data;
  try {
    const res = await fetch('/api/nasa/moon');
    if (!res.ok) throw new Error(`Proxy error ${res.status}`);
    data = await res.json();
  } catch (proxyError) {
    const now = new Date();
    const formatStr = now.toISOString().substring(0, 13) + ':00';
    const directRes = await fetch(`https://svs.gsfc.nasa.gov/api/dialamoon/${formatStr}`);
    if (!directRes.ok) throw new Error('Failed to fetch NASA SVS Moon phase from NASA API');
    const svsData = await directRes.json();
    data = {
      image_url: svsData.image?.url || '',
      phase: svsData.phase !== undefined ? parseFloat(svsData.phase.toFixed(1)) : 50.0,
      age: svsData.age !== undefined ? parseFloat(svsData.age.toFixed(1)) : 14.0,
      time: svsData.time || formatStr
    };
  }

  const now = Date.now();
  try {
    localStorage.setItem(MOON_PHASE_CACHE_KEY, JSON.stringify({
      timestamp: now,
      data
    }));
  } catch (e) {
    console.warn('[Moon Cache] Failed to save to LocalStorage:', e);
  }

  return data;
}

// Xweather Hamilton ON Local 7-Day Weather Client (30-Minute LocalStorage Cache)
const HAMILTON_WEATHER_CACHE_KEY = 'xweather_hamilton_weather_v1';
const THIRTY_MINS_MS = 30 * 60 * 1000;

export async function fetchHamiltonWeather(forceRefresh = false) {
  if (!forceRefresh) {
    try {
      const cachedRaw = localStorage.getItem(HAMILTON_WEATHER_CACHE_KEY);
      if (cachedRaw) {
        const cachedObj = JSON.parse(cachedRaw);
        const age = Date.now() - (cachedObj.timestamp || 0);
        if (age < THIRTY_MINS_MS) {
          return {
            ...cachedObj.data,
            isLocalStorageCached: true,
            cachedAt: cachedObj.timestamp,
            cacheExpiresInMs: THIRTY_MINS_MS - age
          };
        }
      }
    } catch (e) {
      console.warn('[Weather Cache] LocalStorage error:', e);
    }
  }

  const res = await fetch('/api/weather/hamilton');
  if (!res.ok) throw new Error(`Weather proxy error ${res.status}`);
  const data = await res.json();

  const now = Date.now();
  try {
    localStorage.setItem(HAMILTON_WEATHER_CACHE_KEY, JSON.stringify({
      timestamp: now,
      data
    }));
  } catch (e) {
    console.warn('[Weather Cache] Failed to save to LocalStorage:', e);
  }

  return {
    ...data,
    isLocalStorageCached: false,
    cachedAt: now,
    cacheExpiresInMs: THIRTY_MINS_MS
  };
}

// 9. HSR Transit Service (Hamilton Street Railway)
export async function fetchHSRTransit({ destination = '', route_number = '' } = {}) {
  const params = new URLSearchParams();
  if (destination) params.append('destination', destination);
  if (route_number) params.append('route_number', route_number);

  const res = await fetch(`/api/transit/hsr?${params.toString()}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch HSR transit data');
  }
  return res.json();
}

// 10. AI Agent Service (Azure OpenAI GPT-4o ezchat Deployment)
export async function sendAgentMessage({ messages = [], userMessage = '' } = {}) {
  const clientTime = new Date().toISOString();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Toronto';

  const res = await fetch('/api/agent/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ messages, userMessage, clientTime, timezone })
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Agent request failed');
  }
  return res.json();
}

export async function fetchAgentStatus() {
  const res = await fetch('/api/agent/status');
  if (!res.ok) return { deployment: 'ezchat', available: false };
  return res.json();
}

export async function fetchAgentGreeting() {
  const clientTime = encodeURIComponent(new Date().toISOString());
  const res = await fetch(`/api/agent/greet?clientTime=${clientTime}`);
  if (!res.ok) return { greeting: "Hey! I'm EZ, your unfiltered chat buddy and assistant. What's on your mind?" };
  return res.json();
}
