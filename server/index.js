import express from 'express';
import cors from 'cors';
import path from 'path';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5001;
const HOST = '0.0.0.0';

app.use(cors());
app.use(express.json());

// In-Memory Cache Helper
const cache = new Map();

function getCached(key, ttlMs) {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() - item.timestamp > ttlMs) {
    cache.delete(key);
    return null;
  }
  return item.data;
}

function setCache(key, data) {
  cache.set(key, { timestamp: Date.now(), data });
}

// Endpoints & Keys
const EZTV_MIRRORS = [
  'https://eztvx.to/api/get-torrents',
  'https://eztv.re/api/get-torrents',
  'https://eztv.ag/api/get-torrents',
  'https://eztv.wf/api/get-torrents',
  'https://eztv.tf/api/get-torrents'
];

const YTS_MIRRORS = [
  'https://yts.mx/api/v2/list_movies.json',
  'https://yts.gg/api/v2/list_movies.json',
  'https://yts.rs/api/v2/list_movies.json',
  'https://yts.lt/api/v2/list_movies.json'
];

const ISS_API_URL = 'https://iss-api.polluxlabs.io/iss-pass';
// Live Active NASA Curiosity Rover (MSL REMS) Telemetry Feed (Live 2026 Sols)
const NASA_MARS_CURIOSITY_URL = 'https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json';

// Helper: Reliable HTTPS/HTTP JSON fetcher with automatic 301/302 Redirect Following
function fetchJsonUrl(urlStr, timeoutMs = 7000, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) return reject(new Error('Too many HTTP redirects'));

    const parsedUrl = new URL(urlStr);
    const transport = parsedUrl.protocol === 'https:' ? https : http;

    const req = transport.get(urlStr, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Host': parsedUrl.hostname
      }
    }, (res) => {
      if ((res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (redirectUrl.startsWith('/')) {
          redirectUrl = `${parsedUrl.protocol}//${parsedUrl.host}${redirectUrl}`;
        }
        console.log(`[Proxy] Redirect (${res.statusCode}): ${urlStr} -> ${redirectUrl}`);
        return resolve(fetchJsonUrl(redirectUrl, timeoutMs, redirectCount + 1));
      }

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Invalid JSON output: ${data.substring(0, 100)}`));
          }
        } else {
          reject(new Error(`HTTP status ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error(`Request timed out after ${timeoutMs}ms`));
    });
  });
}

// Helper: Fetch with timeout and mirror fallback
async function fetchWithFallback(mirrors, queryParams, timeoutMs = 7000) {
  let lastError = null;

  const queryString = Object.entries(queryParams)
    .filter(([_, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  for (const mirror of mirrors) {
    try {
      const url = `${mirror}?${queryString}`;
      console.log(`[Proxy] Fetching: ${url}`);
      const data = await fetchJsonUrl(url, timeoutMs);
      return { data, mirrorUsed: mirror };
    } catch (err) {
      console.warn(`[Proxy] Mirror failed: ${mirror} (${err.message})`);
      lastError = err;
    }
  }

  throw new Error(lastError ? lastError.message : 'All mirror requests failed');
}

// Utility: Format size bytes
function formatSizeBytes(bytesStr) {
  const bytes = parseInt(bytesStr, 10);
  if (isNaN(bytes) || bytes === 0) return 'N/A';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Utility: Extract quality tags
function parseQuality(title) {
  if (!title) return 'HD';
  const t = title.toUpperCase();
  if (t.includes('2160P') || t.includes('4K') || t.includes('UHD')) return '2160p (4K)';
  if (t.includes('1080P')) return '1080p';
  if (t.includes('720P')) return '720p';
  if (t.includes('480P') || t.includes('SD')) return '480p';
  if (t.includes('X265') || t.includes('HEVC')) return 'x265';
  return 'HDTV';
}

const DEFAULT_TRACKERS = [
  'udp://open.demonii.com:1337/announce',
  'udp://tracker.openbittorrent.com:80',
  'udp://tracker.coppersurfer.tk:6969',
  'udp://glotorrents.pw:6969/announce',
  'udp://tracker.opentrackr.org:1337/announce',
  'udp://torrent.gresille.org:80/announce',
  'udp://p4p.arenabg.com:1337',
  'udp://tracker.leechers-paradise.org:6969'
];

function buildMagnetUrl(hash, title) {
  const dn = encodeURIComponent(title || 'torrent');
  const tr = DEFAULT_TRACKERS.map(t => `tr=${encodeURIComponent(t)}`).join('&');
  return `magnet:?xt=urn:btih:${hash}&dn=${dn}&${tr}`;
}

// Health check endpoint for Azure ping
app.get('/health', (req, res) => {
  res.send('OK');
});

// ==================== ENDPOINTS ====================

// 1. EZTV Torrents Endpoint (5 Min Cache)
app.get('/api/eztv/torrents', async (req, res) => {
  const { limit = '30', page = '1', imdb_id = '' } = req.query;
  const cacheKey = `eztv_${limit}_${page}_${imdb_id}`;

  const cached = getCached(cacheKey, 5 * 60 * 1000);
  if (cached) {
    return res.json({ ...cached, cached: true });
  }

  try {
    const params = { limit, page };
    if (imdb_id) {
      params.imdb_id = imdb_id.replace(/^tt/, '');
    }

    const { data, mirrorUsed } = await fetchWithFallback(EZTV_MIRRORS, params);

    const torrents = (data.torrents || []).map(item => ({
      id: item.id || item.hash,
      title: item.title || item.filename,
      filename: item.filename,
      category: 'TV Shows',
      imdb_id: item.imdb_id ? `tt${item.imdb_id.padStart(7, '0')}` : '',
      season: item.season || '0',
      episode: item.episode || '0',
      seeds: parseInt(item.seeds || 0, 10),
      peers: parseInt(item.peers || 0, 10),
      size_bytes: item.size_bytes,
      formatted_size: formatSizeBytes(item.size_bytes),
      quality: parseQuality(item.title || item.filename),
      magnet_url: item.magnet_url,
      torrent_url: item.torrent_url,
      date_released: item.date_released_unix ? new Date(item.date_released_unix * 1000).toLocaleDateString() : 'N/A',
      small_screenshot: item.small_screenshot,
      large_screenshot: item.large_screenshot,
      source: 'EZTV'
    }));

    const responsePayload = {
      torrents,
      torrents_count: data.torrents_count || torrents.length,
      limit: parseInt(limit, 10),
      page: parseInt(page, 10),
      mirrorUsed
    };

    setCache(cacheKey, responsePayload);
    res.json(responsePayload);
  } catch (err) {
    console.error('[EZTV Error]', err);
    res.status(500).json({ error: 'Failed to fetch EZTV torrents. Please try again.', message: err.message });
  }
});

// 2. YTS Movies Endpoint (5 Min Cache)
app.get('/api/yts/movies', async (req, res) => {
  const { limit = '30', page = '1', query_term = '', quality = '', genre = '', sort_by = 'date_added', order_by = 'desc' } = req.query;
  const cacheKey = `yts_${limit}_${page}_${query_term}_${quality}_${genre}_${sort_by}_${order_by}`;

  const cached = getCached(cacheKey, 5 * 60 * 1000);
  if (cached) {
    return res.json({ ...cached, cached: true });
  }

  try {
    const params = { limit, page, sort_by, order_by };
    if (query_term) params.query_term = query_term;
    if (quality) params.quality = quality;
    if (genre) params.genre = genre;

    const { data, mirrorUsed } = await fetchWithFallback(YTS_MIRRORS, params);

    const moviesList = data?.data?.movies || [];
    const movieCount = data?.data?.movie_count || moviesList.length;

    const torrents = [];

    moviesList.forEach(movie => {
      (movie.torrents || []).forEach(t => {
        torrents.push({
          id: `${movie.id}_${t.quality}_${t.hash}`,
          movieId: movie.id,
          title: `${movie.title} (${movie.year})`,
          rawTitle: movie.title,
          year: movie.year,
          category: 'Movies',
          rating: movie.rating,
          genres: movie.genres || [],
          imdb_id: movie.imdb_code,
          seeds: t.seeds || 0,
          peers: t.peers || 0,
          size_bytes: t.size_bytes,
          formatted_size: t.size || formatSizeBytes(t.size_bytes),
          quality: t.quality,
          type: t.type,
          magnet_url: buildMagnetUrl(t.hash, movie.title),
          torrent_url: t.url,
          date_released: t.date_uploaded || movie.year.toString(),
          poster: movie.medium_cover_image || movie.small_cover_image,
          large_poster: movie.large_cover_image,
          summary: movie.summary,
          source: 'YTS'
        });
      });
    });

    const responsePayload = {
      movies: moviesList,
      torrents,
      movie_count: movieCount,
      limit: parseInt(limit, 10),
      page: parseInt(page, 10),
      mirrorUsed
    };

    setCache(cacheKey, responsePayload);
    res.json(responsePayload);
  } catch (err) {
    console.error('[YTS Error]', err);
    res.status(500).json({ error: 'Failed to fetch YTS movies. Please try again.', message: err.message });
  }
});

// 3. Unconstrained Pirate Bay & Season Packs Search API (5 Min Cache)
app.get('/api/tpb/search', async (req, res) => {
  const { q = '', cat = '0' } = req.query;
  const searchTermToUse = q.trim() || '2026';
  const cacheKey = `tpb_${searchTermToUse.toLowerCase()}_${cat}`;

  const cached = getCached(cacheKey, 5 * 60 * 1000);
  if (cached) {
    return res.json({ ...cached, cached: true });
  }

  // 1st Try: BitSearch API (Unconstrained across ALL categories)
  try {
    const solidUrl = `https://bitsearch.eu/api/v1/search?q=${encodeURIComponent(searchTermToUse)}`;
    console.log(`[Proxy] Fetching BitSearch API (Unconstrained): ${solidUrl}`);
    const solidData = await fetchJsonUrl(solidUrl, 6000);

    const rawList = solidData?.results || [];
    if (rawList.length > 0) {
      const torrents = rawList.map(item => ({
        id: `solid_${item.id}_${item.infohash || item.hash}`,
        title: item.title,
        category: 'Pirate Bay (All Categories)',
        uploader: item.verified ? 'Verified Uploader' : 'Community',
        imdb_id: '',
        seeds: parseInt(item.seeders || item.seeds || 0, 10),
        peers: parseInt(item.leechers || item.peers || 0, 10),
        size_bytes: item.size,
        formatted_size: formatSizeBytes(item.size),
        quality: parseQuality(item.title),
        magnet_url: buildMagnetUrl(item.infohash || item.hash, item.title),
        date_released: item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : 'N/A',
        num_files: item.downloads || 1,
        source: 'Pirate Bay (BitSearch API)'
      }));

      const responsePayload = { torrents, total_count: torrents.length, query: q, mirrorUsed: 'https://bitsearch.eu' };
      setCache(cacheKey, responsePayload);
      return res.json(responsePayload);
    }
  } catch (solidErr) {
    console.warn(`[Proxy] BitSearch API failed: ${solidErr.message}. Trying APIBay...`);
  }

  // 2nd Try: Official APIBay API (apibay.org - cat=0 for ALL categories)
  try {
    const apibayUrl = `https://apibay.org/q.php?q=${encodeURIComponent(searchTermToUse)}&cat=${cat || '0'}`;
    console.log(`[Proxy] Fetching APIBay (Unconstrained): ${apibayUrl}`);
    const data = await fetchJsonUrl(apibayUrl, 5000);

    const rawList = Array.isArray(data) ? data.filter(item => item.id !== '0' && item.name !== 'No results returned') : [];

    const torrents = rawList.map(item => ({
      id: `tpb_${item.id}_${item.info_hash}`,
      title: item.name,
      category: 'Pirate Bay (All Categories)',
      uploader: item.username || 'Anonymous',
      imdb_id: item.imdb ? `tt${item.imdb.padStart(7, '0')}` : '',
      seeds: parseInt(item.seeders || 0, 10),
      peers: parseInt(item.leechers || 0, 10),
      size_bytes: item.size,
      formatted_size: formatSizeBytes(item.size),
      quality: parseQuality(item.name),
      magnet_url: buildMagnetUrl(item.info_hash, item.name),
      date_released: item.added ? new Date(parseInt(item.added, 10) * 1000).toLocaleDateString() : 'N/A',
      num_files: item.num_files,
      source: 'Pirate Bay (APIBay)'
    }));

    const responsePayload = { torrents, total_count: torrents.length, query: q, mirrorUsed: 'https://apibay.org' };
    setCache(cacheKey, responsePayload);
    return res.json(responsePayload);
  } catch (apibayErr) {
    console.error('[Pirate Bay Search Error]', apibayErr);
    res.status(500).json({ error: 'Failed to fetch torrents from Pirate Bay APIs.', message: apibayErr.message });
  }
});

// 4. Search TV Shows
app.get('/api/search/shows', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json({ shows: [] });

  const cacheKey = `show_search_${q.toLowerCase()}`;
  const cached = getCached(cacheKey, 5 * 60 * 1000);
  if (cached) return res.json(cached);

  try {
    const data = await fetchJsonUrl(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(q)}`);
    const shows = data.map(item => ({
      id: item.show.id,
      name: item.show.name,
      imdb_id: item.show.externals?.imdb || null,
      year: item.show.premiered ? item.show.premiered.substring(0, 4) : null,
      image: item.show.image?.medium || null,
      summary: item.show.summary?.replace(/<[^>]*>?/gm, '') || ''
    })).filter(show => show.imdb_id);

    const payload = { shows };
    setCache(cacheKey, payload);
    res.json(payload);
  } catch (err) {
    console.warn('[TVMaze Search Warning]', err.message);
    res.json({ shows: [] });
  }
});

// 5. ISS Space Station Pass Endpoint (20 Max Results + 24 Hour Cache)
app.get('/api/iss/passes', async (req, res) => {
  const lat = req.query.lat || '43.25';
  const lon = req.query.lon || '-79.87';
  const visible_only = req.query.visible_only !== undefined ? req.query.visible_only : 'false';
  const min_elevation = req.query.min_elevation || '15';
  const days_ahead = req.query.days_ahead || '14';
  const sun_alt_max = req.query.sun_alt_max || '-3';
  const n = req.query.n || '20';

  const cacheKey = `iss_pass_${lat}_${lon}_${visible_only}_${min_elevation}_${days_ahead}_${sun_alt_max}_${n}`;
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

  const cached = getCached(cacheKey, TWENTY_FOUR_HOURS);
  if (cached) {
    return res.json({ ...cached, cached: true });
  }

  try {
    const queryParams = { lat, lon, visible_only, min_elevation, days_ahead, sun_alt_max, n };
    const url = `${ISS_API_URL}?${new URLSearchParams(queryParams).toString()}`;
    console.log(`[Proxy] Fetching ISS Passes: ${url}`);

    const data = await fetchJsonUrl(url);

    const responsePayload = {
      ...data,
      fetched_at: Date.now(),
      cached: false
    };

    setCache(cacheKey, responsePayload);
    res.json(responsePayload);
  } catch (err) {
    console.error('[ISS API Error]', err);
    res.status(500).json({ error: 'Failed to fetch ISS orbital pass data.', message: err.message });
  }
});

// 6. Active NASA Curiosity Rover Mars Weather Endpoint (Live 2026 Sols, 6 Hour Server Cache)
app.get('/api/mars/weather', async (req, res) => {
  const cacheKey = 'nasa_mars_weather_curiosity_v2';
  const SIX_HOURS = 6 * 60 * 60 * 1000;

  const cached = getCached(cacheKey, SIX_HOURS);
  if (cached) {
    return res.json({ ...cached, cached: true });
  }

  try {
    console.log(`[Proxy] Fetching Active NASA Curiosity Mars Weather: ${NASA_MARS_CURIOSITY_URL}`);
    const data = await fetchJsonUrl(NASA_MARS_CURIOSITY_URL);

    const responsePayload = {
      ...data,
      fetched_at: Date.now(),
      cached: false
    };

    setCache(cacheKey, responsePayload);
    res.json(responsePayload);
  } catch (err) {
    console.error('[NASA Mars Weather Error]', err);
    res.status(500).json({ error: 'Failed to fetch active NASA Mars Curiosity weather telemetry.', message: err.message });
  }
});

// Serve frontend static build
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(distPath, 'index.html'));
  }
});

app.listen(PORT, HOST, () => {
  console.log(`====================================================`);
  console.log(`🚀 EZsearch Multi-API Server running on http://${HOST}:${PORT}`);
  console.log(`====================================================`);
});
