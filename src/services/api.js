// API Client Service for EZTV, YTS, The Pirate Bay (APIBay), TVMaze, ISS (SGP4), NASA Mars, NASA SVS Moon & Xweather Hamilton

export async function fetchEZTVTorrents({ page = 1, limit = 100, imdb_id = '', q = '' }) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString()
  });
  if (imdb_id) params.append('imdb_id', imdb_id);
  if (q) params.append('q', q);

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

// 10. AI Agent Service (Azure OpenAI GPT-4o / GPT-5 Deployments)
export async function sendAgentMessage({ messages = [], userMessage = '', modelDeployment = 'ezchat' } = {}) {
  const clientTime = new Date().toISOString();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Toronto';

  const res = await fetch('/api/agent/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ messages, userMessage, clientTime, timezone, modelDeployment })
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

export async function fetchAgentGreeting(modelDeployment = 'ezchat') {
  const clientTime = encodeURIComponent(new Date().toISOString());
  const res = await fetch(`/api/agent/greet?clientTime=${clientTime}&modelDeployment=${encodeURIComponent(modelDeployment)}`);
  if (!res.ok) return { greeting: "Hey! I'm EZ, your unfiltered chat buddy and assistant. What's on your mind?" };
  return res.json();
}

// 10b. EZ-Grok Agent API Helpers (ez-grok:4 on Azure AI Services)
export async function sendGrokMessage({ messages = [], userMessage = '' } = {}) {
  const res = await fetch('/api/grok/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      userMessage,
      clientTime: new Date().toISOString()
    })
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Grok request failed');
  }
  return res.json();
}

export async function fetchGrokGreeting() {
  const clientTime = encodeURIComponent(new Date().toISOString());
  const res = await fetch(`/api/grok/greet?clientTime=${clientTime}`);
  if (!res.ok) return { greeting: "🌀 *KZZZT!* The portal is open! I'm EZ-Grok. What music or TV universe are we blasting into tonight?" };
  return res.json();
}

export async function fetchGrokStatus() {
  const res = await fetch('/api/grok/status');
  if (!res.ok) return { status: 'offline', agentName: 'ez-grok', agentVersion: '4' };
  return res.json();
}

// 10c. EZ-DeepSeek Agent API Helpers (ez-deepseek / DeepSeek-V4-Flash on Azure AI Services)
export async function sendDeepSeekMessage({ messages = [], userMessage = '', version = 'latest' } = {}) {
  const res = await fetch('/api/deepseek/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      userMessage,
      version,
      clientTime: new Date().toISOString()
    })
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'DeepSeek request failed');
  }
  return res.json();
}

export async function fetchDeepSeekGreeting(version = 'latest') {
  const clientTime = encodeURIComponent(new Date().toISOString());
  const ver = encodeURIComponent(version);
  const res = await fetch(`/api/deepseek/greet?clientTime=${clientTime}&version=${ver}`);
  if (!res.ok) return { greeting: "💥 *BOOM!* Portal link online! I'm EZ-DeepSeek. Ready to dive into some unhinged music deep cuts or mind-bending TV shows?" };
  return res.json();
}

export async function fetchDeepSeekStatus() {
  const res = await fetch('/api/deepseek/status');
  if (!res.ok) return { status: 'offline', agentName: 'ez-deepseek', activeVersion: '2' };
  return res.json();
}

export async function fetchDeepSeekVersions(forceRefresh = false) {
  const res = await fetch(`/api/deepseek/versions?refresh=${forceRefresh ? 'true' : 'false'}`);
  if (!res.ok) return null;
  return res.json();
}

export async function refreshFoundryVersions() {
  const res = await fetch('/api/foundry/refresh-versions', { method: 'POST' });
  return res.json();
}

// 10d. Pop Culture Agent API Helpers (Genius Machine / GPT-5 + 7 Live Tools)
export async function sendPopCultureMessage({ messages = [], userMessage = '', modelDeployment = 'gpt-5-pop-culture-agent' } = {}) {
  const clientTime = new Date().toISOString();
  const res = await fetch('/api/popculture/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      userMessage,
      clientTime,
      modelDeployment
    })
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || 'Pop culture agent request failed');
  }
  return res.json();
}

export async function fetchPopCultureGreeting(modelDeployment = 'gpt-5-pop-culture-agent') {
  const clientTime = encodeURIComponent(new Date().toISOString());
  const res = await fetch(`/api/popculture/greet?clientTime=${clientTime}&modelDeployment=${encodeURIComponent(modelDeployment)}`);
  if (!res.ok) return { greeting: "⚡ **Genius Machine Online!** I'm your pop culture intelligence agent. What are we exploring today?" };
  return res.json();
}

export async function fetchPopCultureStatus() {
  const res = await fetch('/api/popculture/status');
  if (!res.ok) return { status: 'offline', agentName: 'Genius Machine' };
  return res.json();
}

// 11. Celestial & ISS Viewing Forecast Helper
export async function fetchSkyViewingForecast({ time_window = 'next_48h', event_type = 'all' } = {}) {
  const params = new URLSearchParams();
  if (time_window) params.append('time_window', time_window);
  if (event_type) params.append('event_type', event_type);

  const res = await fetch(`/api/sky/tonight?${params.toString()}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch sky viewing data');
  }
  return res.json();
}

// 12. GROOVE POP Engine API Client (Azure Functions v4 Node.js Engine)
export async function fetchGroovePopEngineHealth() {
  try {
    const res = await fetch('/api/groovepop/health');
    if (!res.ok) return { ok: false, status: res.status };
    return res.json();
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export async function transformGroovePopImage({
  image,
  stylePrompt,
  styleLabel = '',
  aspectRatio = '1:1',
  clientApp = 'ezsearch',
  sessionId = null,
  captionInstruction = ''
}) {
  const payload = {
    image,
    stylePrompt,
    styleLabel,
    aspectRatio,
    clientApp,
    sessionId: sessionId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `session_${Date.now()}`),
  };

  if (captionInstruction && captionInstruction.trim()) {
    payload.captionInstruction = captionInstruction.trim();
  }

  const res = await fetch('/api/groovepop/transform', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || `Transformation failed with HTTP ${res.status}`);
    err.status = res.status;
    err.errorType = data.error || 'transform_failed';
    throw err;
  }

  return data;
}

export async function captionGroovePopImage({
  image,
  clientApp = 'ezsearch',
  captionInstruction = ''
}) {
  const payload = {
    image,
    clientApp
  };

  if (captionInstruction && captionInstruction.trim()) {
    payload.captionInstruction = captionInstruction.trim();
  }

  const res = await fetch('/api/groovepop/caption', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || `Captioning failed with HTTP ${res.status}`);
    err.status = res.status;
    err.errorType = data.error || 'caption_failed';
    throw err;
  }

  return data;
}

// 13. GuessFace Engine Client Services
export async function fetchGuessFaceHealth() {
  const res = await fetch('/api/guessface/health');
  if (!res.ok) throw new Error(`Health check failed (${res.status})`);
  return res.json();
}

export async function fetchGuessFaceModes() {
  const res = await fetch('/api/guessface/modes');
  if (!res.ok) throw new Error(`Failed to load GuessFace modes (${res.status})`);
  return res.json();
}

export async function fetchGuessFaceStyles(modeId) {
  const res = await fetch(`/api/guessface/modes/${modeId}/styles`);
  if (!res.ok) throw new Error(`Failed to load styles for mode ${modeId}`);
  return res.json();
}

export async function runGuessFaceMode({
  modeId,
  subjects,
  seedValues = null,
  styleVariantKey = null,
  simulate = false,
  customEndpoint = null,
  apiKey = ''
}) {
  if (customEndpoint && customEndpoint.trim()) {
    // Execute through custom endpoint proxy
    const proxyPayload = {
      targetUrl: `${customEndpoint.trim().replace(/\/$/, '')}/v1/mode-runs`,
      method: 'POST',
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
      body: {
        modeId,
        subjects,
        seedValues
      }
    };
    const res = await fetch('/api/guessface/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(proxyPayload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `External API returned status ${res.status}`);
    }
    return res.json();
  }

  const res = await fetch('/api/guessface/mode-runs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      modeId,
      subjects,
      seedValues,
      styleVariantKey,
      simulate
    })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.message || `Mode run failed (${res.status})`);
  }
  return data;
}

export async function pollGuessFaceModeRun(modeRunId, customEndpoint = null, apiKey = '') {
  if (customEndpoint && customEndpoint.trim()) {
    const proxyPayload = {
      targetUrl: `${customEndpoint.trim().replace(/\/$/, '')}/v1/mode-runs/${modeRunId}`,
      method: 'GET',
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {}
    };
    const res = await fetch('/api/guessface/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(proxyPayload)
    });
    return res.json();
  }

  const res = await fetch(`/api/guessface/mode-runs/${modeRunId}`);
  if (!res.ok) throw new Error(`Mode-run not found (${res.status})`);
  return res.json();
}

export async function createGuessFaceParty({ hostName = 'Host Party' } = {}) {
  const res = await fetch('/api/guessface/parties', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hostName })
  });
  if (!res.ok) throw new Error(`Failed to create party (${res.status})`);
  return res.json();
}

export async function reportGuessFaceRound(partyId, payload) {
  const res = await fetch(`/api/guessface/parties/${partyId}/rounds`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`Failed to report round (${res.status})`);
  return res.json();
}

export async function fetchGuessFaceParty(partyId) {
  const res = await fetch(`/api/guessface/parties/${partyId}`);
  if (!res.ok) throw new Error(`Failed to fetch party (${res.status})`);
  return res.json();
}


