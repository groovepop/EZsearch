try {
  if (process.loadEnvFile) process.loadEnvFile();
} catch (e) {}

import express from 'express';
import cors from 'cors';
import path from 'path';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';
import * as satellite from 'satellite.js';
import { processAgentChat, getAgentStatus, generateAgentGreeting } from './agentService.js';
import { getHSRTransitInfo } from './tools/hsrTransitTool.js';
import { getSkyViewingForecast } from './tools/skyViewingTool.js';
import { executeEngineTransform, executeEngineCaption } from './groovepopEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5001;
const HOST = '0.0.0.0';

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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

const NASA_MARS_CURIOSITY_URL = 'https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json';

const XWEATHER_CLIENT_ID = process.env.XWEATHER_CLIENT_ID || 'kNPY5XGr0SDofXdyLH9Z6';
const XWEATHER_CLIENT_SECRET = process.env.XWEATHER_CLIENT_SECRET || 'k88PkimT0tLyeFa8lhDRGMdGMMZdjvB3JgiCvCnA';

// Helper: Reliable HTTPS/HTTP JSON fetcher
async function fetchTextUrl(urlStr, timeoutMs = 7000) {
  const res = await fetch(urlStr, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      'Accept': '*/*'
    },
    signal: AbortSignal.timeout(timeoutMs)
  });
  if (!res.ok) {
    throw new Error(`HTTP status ${res.status}`);
  }
  return res.text();
}

async function fetchJsonUrl(urlStr, timeoutMs = 7000) {
  const res = await fetch(urlStr, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*'
    },
    signal: AbortSignal.timeout(timeoutMs)
  });
  if (!res.ok) {
    throw new Error(`HTTP status ${res.status}`);
  }
  return res.json();
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

// Compass Angle Helper
function azimuthToCompass(deg) {
  const points = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const idx = Math.round((deg % 360) / 22.5) % 16;
  return points[idx];
}

// Sun Position & Elevation Calculation Helper
function getSunElevation(date, latDeg, lonDeg) {
  const rad = Math.PI / 180;
  const d = (date.getTime() - new Date('2000-01-01T12:00:00Z').getTime()) / 86400000;
  const L = (280.460 + 0.9856474 * d) % 360;
  const g = (357.528 + 0.9856003 * d) % 360 * rad;
  const lambda = (L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * rad;
  const eps = 23.439 * rad;
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda));
  const dec = Math.asin(Math.sin(eps) * Math.sin(lambda));
  
  const gmst = satellite.gstime(date);
  const lmst = gmst + satellite.degreesToRadians(lonDeg);
  const ha = lmst - ra;
  const latRad = satellite.degreesToRadians(latDeg);
  const sinAlt = Math.sin(latRad) * Math.sin(dec) + Math.cos(latRad) * Math.cos(dec) * Math.cos(ha);
  return Math.asin(sinAlt) * (180 / Math.PI);
}

// Health check endpoint for Azure ping
app.get('/health', (req, res) => {
  res.send('OK');
});

// Helper: Normalize query for Pirate Bay & BitSearch
function normalizeTPBQuery(raw) {
  if (!raw) return '';
  let q = raw.trim();

  // Replace 'season X episode Y' or 'sX eY' or 'XxY' with 'SXEY'
  q = q.replace(/season\s*(\d+)\s*(?:episode|ep)\s*(\d+)/gi, (_, s, e) => 'S' + s.padStart(2, '0') + 'E' + e.padStart(2, '0'));
  q = q.replace(/[sS](\d+)\s*[eE](\d+)/g, (_, s, e) => 'S' + s.padStart(2, '0') + 'E' + e.padStart(2, '0'));
  q = q.replace(/(\d+)x(\d+)/g, (_, s, e) => 'S' + s.padStart(2, '0') + 'E' + e.padStart(2, '0'));

  // Replace 'season X pack' or 'season X complete' or 'season X' with 'S0X'
  q = q.replace(/season\s*(\d+)\s*(?:pack|complete|full)?/gi, (_, s) => 'S' + s.padStart(2, '0'));

  // Strip noisy filler words
  q = q.replace(/\b(pack|download|torrent|full\s*series|complete\s*series)\b/gi, '');
  
  // Clean redundant whitespace
  q = q.replace(/\s+/g, ' ').trim();
  return q;
}

// Helper: Parse TPB HTML mirrors
function parseTPBHtml(html) {
  const torrents = [];
  const rows = html.split('<tr');

  for (const r of rows) {
    if (!r.includes('magnet:?xt=')) continue;

    const titleMatch = r.match(/<a href="https?:\/\/[^/]+\/torrent\/\d+\/[^"]*"[^>]*>([^<]+)<\/a>/i) ||
                       r.match(/class="detLink"[^>]*>([^<]+)<\/a>/i);
    const magnetMatch = r.match(/href="(magnet:\?[^"]+)"/i);
    const tdMatches = [...r.matchAll(/<td[^>]*>(\d+)<\/td>/gi)].map(m => parseInt(m[1], 10));
    const sizeMatch = r.match(/<td[^>]*>([\d.]+\s*(?:GiB|MiB|KiB|GB|MB|KB|B))<\/td>/i) ||
                      r.match(/Size\s*([\d.]+\s*(?:GiB|MiB|KiB|GB|MB|KB|B))/i);

    if (titleMatch && magnetMatch) {
      const title = titleMatch[1].trim();
      const magnet_url = magnetMatch[1];
      const hashMatch = magnet_url.match(/btih:([a-fA-F0-9]{40})/i);
      const hash = hashMatch ? hashMatch[1].toUpperCase() : '';

      const seeds = tdMatches.length >= 2 ? tdMatches[tdMatches.length - 2] : (tdMatches[0] || 0);
      const peers = tdMatches.length >= 1 ? tdMatches[tdMatches.length - 1] : 0;

      torrents.push({
        id: `tpb_html_${hash || title}`,
        title,
        filename: title,
        category: 'TV Shows',
        seeds,
        peers,
        formatted_size: sizeMatch ? sizeMatch[1] : '1.6 GB',
        quality: parseQuality(title),
        magnet_url,
        date_released: 'N/A',
        source: 'The Pirate Bay (Mirror)'
      });
    }
  }

  return torrents;
}

async function fetchTPBMirrorHtml(query, timeoutMs = 5000) {
  const mirrors = [
    `https://tpb.party/search/${encodeURIComponent(query)}/1/99/0`,
    `https://thepiratebay10.org/search/${encodeURIComponent(query)}/1/99/0`
  ];
  for (const m of mirrors) {
    try {
      const html = await fetchTextUrl(m, timeoutMs);
      const list = parseTPBHtml(html);
      if (list.length > 0) return { list, mirror: m };
    } catch (e) {}
  }
  return { list: [], mirror: '' };
}

// ==================== ENDPOINTS ====================

// 1. EZTV Torrents Endpoint (Supports IMDb ID, Show Title search, Episode indicators, and Smart Fallback)
app.get('/api/eztv/torrents', async (req, res) => {
  const { limit = '100', page = '1', imdb_id = '', q = '', refresh = '' } = req.query;
  const rawQuery = (q || '').trim();
  const cacheKey = `eztv_${limit}_${page}_${imdb_id}_${rawQuery.toLowerCase()}`;

  if (!refresh) {
    const cached = getCached(cacheKey, rawQuery ? 60 * 1000 : 5 * 60 * 1000);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }
  }

  try {
    let resolvedImdbId = imdb_id ? imdb_id.replace(/^tt/, '') : '';
    let seasonFilter = null;
    let episodeFilter = null;
    let cleanShowName = rawQuery;

    if (!resolvedImdbId && rawQuery) {
      if (rawQuery.startsWith('tt')) {
        resolvedImdbId = rawQuery.replace(/^tt/, '');
      } else {
        // Extract Season & Episode indicators from free-text query
        const seMatch = rawQuery.match(/[sS](\d+)[eE](\d+)/) || rawQuery.match(/season\s*(\d+)\s*(?:episode|ep)\s*(\d+)/i) || rawQuery.match(/(\d+)x(\d+)/);
        const sOnlyMatch = rawQuery.match(/[sS](\d+)(?![eE]\d+)/) || rawQuery.match(/season\s*(\d+)/i);

        if (seMatch) {
          seasonFilter = parseInt(seMatch[1], 10);
          episodeFilter = parseInt(seMatch[2], 10);
          cleanShowName = rawQuery.replace(seMatch[0], '').replace(/season|episode|ep/gi, '').trim();
        } else if (sOnlyMatch) {
          seasonFilter = parseInt(sOnlyMatch[1], 10);
          cleanShowName = rawQuery.replace(sOnlyMatch[0], '').replace(/season/gi, '').trim();
        }

        // Query TVMaze to find the official IMDb ID for the show
        if (cleanShowName) {
          try {
            const tvmData = await fetchJsonUrl(`https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(cleanShowName)}`, 4000);
            if (tvmData?.externals?.imdb) {
              resolvedImdbId = tvmData.externals.imdb.replace(/^tt/, '');
              console.log(`[EZTV Search] TVMaze resolved "${cleanShowName}" -> IMDb: tt${resolvedImdbId} (${tvmData.name})`);
            }
          } catch (tvmErr) {
            console.warn(`[EZTV Search] TVMaze singlesearch lookup failed for "${cleanShowName}":`, tvmErr.message);
          }
        }
      }
    }

    // Attempt 1: If we have an IMDb ID or no search query (general feed), fetch directly from EZTV API
    let ezTorrents = [];
    let mirrorUsed = '';

    if (resolvedImdbId || !rawQuery) {
      try {
        const params = { limit, page };
        if (resolvedImdbId) {
          params.imdb_id = resolvedImdbId;
        }

        const ezResult = await fetchWithFallback(EZTV_MIRRORS, params, 6000);
        mirrorUsed = ezResult.mirrorUsed;
        const rawList = ezResult.data.torrents || [];

        ezTorrents = rawList.map(item => ({
          id: item.id || item.hash,
          title: item.title || item.filename,
          filename: item.filename,
          category: 'TV Shows',
          imdb_id: item.imdb_id ? `tt${item.imdb_id.padStart(7, '0')}` : (resolvedImdbId ? `tt${resolvedImdbId}` : ''),
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
          date_released_unix: item.date_released_unix || 0,
          small_screenshot: item.small_screenshot,
          large_screenshot: item.large_screenshot,
          source: 'EZTV'
        }));

        // Apply season / episode filtering if specified in the query
        if (seasonFilter !== null) {
          ezTorrents = ezTorrents.filter(t => parseInt(t.season, 10) === seasonFilter);
        }
        if (episodeFilter !== null) {
          ezTorrents = ezTorrents.filter(t => parseInt(t.episode, 10) === episodeFilter);
        }
      } catch (ezErr) {
        console.warn(`[EZTV API Warning] Direct EZTV mirror fetch failed: ${ezErr.message}`);
      }
    }

    // Attempt 2: If a search query was provided and EZTV returned 0 results, run fallback search on APIBay & BitSearch in parallel
    if (rawQuery && ezTorrents.length === 0) {
      console.log(`[EZTV Search] 0 direct EZTV results. Running smart TV search for "${rawQuery}"...`);
      const normalizedQ = normalizeTPBQuery(rawQuery);
      const searchTermsToTry = [rawQuery, normalizedQ, cleanShowName].filter((v, i, a) => v && a.indexOf(v) === i);

      const seenHashes = new Set();
      const combinedTorrents = [];

      for (const st of searchTermsToTry) {
        if (combinedTorrents.length > 0) break;
        try {
          const apibayUrl = `https://apibay.org/q.php?q=${encodeURIComponent(st)}&cat=0`;
          const bitUrl = `https://bitsearch.eu/api/v1/search?q=${encodeURIComponent(st)}&limit=${limit}&page=${page}`;

          const [apibayRes, bitRes, tpbHtmlRes] = await Promise.allSettled([
            fetchJsonUrl(apibayUrl, 5000),
            fetchJsonUrl(bitUrl, 5000),
            fetchTPBMirrorHtml(st, 5000)
          ]);

          // 1. Add TPB HTML Mirror results
          if (tpbHtmlRes.status === 'fulfilled' && tpbHtmlRes.value?.list?.length > 0) {
            tpbHtmlRes.value.list.forEach(item => {
              const hashMatch = item.magnet_url.match(/btih:([a-fA-F0-9]{40})/i);
              const h = hashMatch ? hashMatch[1].toLowerCase() : '';
              if (h && !seenHashes.has(h)) {
                seenHashes.add(h);
                combinedTorrents.push({
                  ...item,
                  imdb_id: resolvedImdbId ? `tt${resolvedImdbId}` : '',
                  season: seasonFilter ? String(seasonFilter) : '0',
                  episode: episodeFilter ? String(episodeFilter) : '0',
                  source: 'EZTV (TPB Mirror)'
                });
              }
            });
          }

          const rawApibay = (apibayRes.status === 'fulfilled' && Array.isArray(apibayRes.value))
            ? apibayRes.value.filter(item => item.id !== '0' && item.name !== 'No results returned')
            : [];
          const rawBit = (bitRes.status === 'fulfilled' && bitRes.value?.results)
            ? bitRes.value.results
            : [];

          // 2. Add APIBay results
          rawApibay.forEach(item => {
            const h = (item.info_hash || '').toLowerCase();
            if (h && !seenHashes.has(h)) {
              seenHashes.add(h);
              combinedTorrents.push({
                id: `tpb_${item.id}_${item.info_hash}`,
                title: item.name,
                filename: item.name,
                category: 'TV Shows',
                imdb_id: item.imdb ? `tt${item.imdb.padStart(7, '0')}` : (resolvedImdbId ? `tt${resolvedImdbId}` : ''),
                season: seasonFilter ? String(seasonFilter) : '0',
                episode: episodeFilter ? String(episodeFilter) : '0',
                seeds: parseInt(item.seeders || 0, 10),
                peers: parseInt(item.leechers || 0, 10),
                size_bytes: item.size,
                formatted_size: formatSizeBytes(item.size),
                quality: parseQuality(item.name),
                magnet_url: buildMagnetUrl(item.info_hash, item.name),
                date_released: item.added ? new Date(parseInt(item.added, 10) * 1000).toLocaleDateString() : 'N/A',
                date_released_unix: parseInt(item.added, 10) || 0,
                num_files: item.num_files,
                source: 'EZTV (APIBay Engine)'
              });
            }
          });

          // 3. Add BitSearch results
          rawBit.forEach(item => {
            const h = (item.infohash || item.hash || '').toLowerCase();
            if (!h || !seenHashes.has(h)) {
              if (h) seenHashes.add(h);
              combinedTorrents.push({
                id: `solid_${item.id}_${item.infohash || item.hash}`,
                title: item.title,
                filename: item.title,
                category: 'TV Shows',
                imdb_id: resolvedImdbId ? `tt${resolvedImdbId}` : '',
                season: seasonFilter ? String(seasonFilter) : '0',
                episode: episodeFilter ? String(episodeFilter) : '0',
                seeds: parseInt(item.seeders || item.seeds || 0, 10),
                peers: parseInt(item.leechers || item.peers || 0, 10),
                size_bytes: item.size,
                formatted_size: formatSizeBytes(item.size),
                quality: parseQuality(item.title),
                magnet_url: buildMagnetUrl(item.infohash || item.hash, item.title),
                date_released: item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : 'N/A',
                date_released_unix: item.updatedAt ? Math.floor(Date.parse(item.updatedAt) / 1000) : 0,
                source: 'EZTV (BitSearch Engine)'
              });
            }
          });

          if (combinedTorrents.length > 0) {
            mirrorUsed = 'The Pirate Bay + BitSearch Engines';
            break;
          }
        } catch (fallbackErr) {
          console.warn(`[EZTV Search] Parallel fallback search failed for "${st}":`, fallbackErr.message);
        }
      }

      if (combinedTorrents.length > 0) {
        // Apply episode / season filter if specified
        if (seasonFilter !== null && episodeFilter !== null) {
          const epRegex = new RegExp(`[sS]0*${seasonFilter}[eE]0*${episodeFilter}|${seasonFilter}x0*${episodeFilter}`, 'i');
          const matched = combinedTorrents.filter(item => epRegex.test(item.title));
          if (matched.length > 0) {
            ezTorrents = matched;
          } else {
            ezTorrents = combinedTorrents;
          }
        } else {
          ezTorrents = combinedTorrents;
        }

        // Sort by seeds
        ezTorrents.sort((a, b) => (b.seeds || 0) - (a.seeds || 0));
      }
    }

    const responsePayload = {
      torrents: ezTorrents,
      torrents_count: ezTorrents.length,
      limit: parseInt(limit, 10),
      page: parseInt(page, 10),
      mirrorUsed: mirrorUsed || 'EZTV Engine'
    };

    setCache(cacheKey, responsePayload);
    res.json(responsePayload);
  } catch (err) {
    console.error('[EZTV Error]', err);
    res.status(500).json({ error: 'Failed to fetch TV torrents. Please try again.', message: err.message });
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
          date_released_unix: t.date_uploaded_unix || (parseInt(movie.year, 10) ? Math.floor(new Date(movie.year, 0, 1).getTime() / 1000) : 0),
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

// 3. Unconstrained Pirate Bay Search API (100 Results per Page + Parallel Multi-Source Search & Seed Sorting)
app.get('/api/tpb/search', async (req, res) => {
  const { q = '', cat = '0', page = '1', limit = '100', refresh = '' } = req.query;
  const rawSearch = q.trim();
  const normalizedSearch = normalizeTPBQuery(rawSearch);
  const searchTermToUse = normalizedSearch || '2026';
  const cacheKey = `tpb_${searchTermToUse.toLowerCase()}_${cat}_${page}_${limit}`;

  if (!refresh) {
    const cached = getCached(cacheKey, rawSearch ? 60 * 1000 : 5 * 60 * 1000);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }
  }

  const seenHashes = new Set();
  const combinedTorrents = [];
  let mirrorUsed = '';

  const searchQueriesToTry = [searchTermToUse, rawSearch].filter((v, i, a) => v && a.indexOf(v) === i);

  for (const queryToTry of searchQueriesToTry) {
    if (combinedTorrents.length > 0) break;

    const solidUrl = `https://bitsearch.eu/api/v1/search?q=${encodeURIComponent(queryToTry)}&limit=${limit}&page=${page}`;
    const apibayUrl = `https://apibay.org/q.php?q=${encodeURIComponent(queryToTry)}&cat=${cat || '0'}`;

    const [bitRes, apibayRes, tpbHtmlRes] = await Promise.allSettled([
      fetchJsonUrl(solidUrl, 6000),
      fetchJsonUrl(apibayUrl, 5000),
      fetchTPBMirrorHtml(queryToTry, 5000)
    ]);

    // 1. Process TPB HTML Mirror results
    if (tpbHtmlRes.status === 'fulfilled' && tpbHtmlRes.value?.list?.length > 0) {
      tpbHtmlRes.value.list.forEach(item => {
        const hashMatch = item.magnet_url.match(/btih:([a-fA-F0-9]{40})/i);
        const h = hashMatch ? hashMatch[1].toLowerCase() : '';
        if (h && !seenHashes.has(h)) {
          seenHashes.add(h);
          combinedTorrents.push({
            ...item,
            category: 'Pirate Bay (All Categories)',
            uploader: 'Community',
            source: 'Pirate Bay (TPB Mirror)'
          });
        }
      });
      mirrorUsed = 'The Pirate Bay (HTML Mirror)';
    }

    // 2. Process APIBay results
    if (apibayRes.status === 'fulfilled' && Array.isArray(apibayRes.value)) {
      const rawList = apibayRes.value.filter(item => item.id !== '0' && item.name !== 'No results returned');
      rawList.forEach(item => {
        const h = (item.info_hash || '').toLowerCase();
        if (h && !seenHashes.has(h)) {
          seenHashes.add(h);
          combinedTorrents.push({
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
            date_released_unix: parseInt(item.added, 10) || 0,
            num_files: item.num_files,
            source: 'Pirate Bay (APIBay)'
          });
        }
      });
      if (rawList.length > 0) mirrorUsed = 'https://apibay.org';
    }

    // 3. Process BitSearch results
    if (bitRes.status === 'fulfilled' && bitRes.value?.results) {
      const rawList = bitRes.value.results;
      rawList.forEach(item => {
        const h = (item.infohash || item.hash || '').toLowerCase();
        if (!h || !seenHashes.has(h)) {
          if (h) seenHashes.add(h);
          combinedTorrents.push({
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
            date_released_unix: item.updatedAt ? Math.floor(Date.parse(item.updatedAt) / 1000) : 0,
            num_files: item.downloads || 1,
            source: 'Pirate Bay (BitSearch API)'
          });
        }
      });
      if (rawList.length > 0) {
        mirrorUsed = mirrorUsed ? `${mirrorUsed} + https://bitsearch.eu` : 'https://bitsearch.eu';
      }
    }
  }

  // Sort by seeds
  combinedTorrents.sort((a, b) => (b.seeds || 0) - (a.seeds || 0));

  const responsePayload = {
    torrents: combinedTorrents,
    total_count: combinedTorrents.length,
    torrents_count: combinedTorrents.length,
    query: q,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    mirrorUsed: mirrorUsed || 'Pirate Bay Multi-Engine'
  };

  setCache(cacheKey, responsePayload);
  res.json(responsePayload);
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

// 5. Complete High-Precision 14-Day ISS Orbital Pass Engine (Calculates ALL 80+ Flyovers, No Gaps)
app.get('/api/iss/passes', async (req, res) => {
  const latDeg = parseFloat(req.query.lat || '43.25');
  const lonDeg = parseFloat(req.query.lon || '-79.87');
  const visibleOnly = req.query.visible_only === 'true';
  const minElDeg = parseFloat(req.query.min_elevation || '10');
  const daysAhead = parseInt(req.query.days_ahead || '14', 10);

  const cacheKey = `iss_sgp4_${latDeg}_${lonDeg}_${visibleOnly}_${minElDeg}_${daysAhead}`;
  const SIX_HOURS = 6 * 60 * 60 * 1000;

  const cached = getCached(cacheKey, SIX_HOURS);
  if (cached) {
    return res.json({ ...cached, cached: true });
  }

  try {
    console.log(`[Proxy] Calculating High-Precision SGP4 Orbital Pass Data for Lat: ${latDeg}, Lon: ${lonDeg}...`);

    // Fetch Live NORAD TLE for ISS (25544) from Celestrak
    const celestrakUrl = 'https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE';
    const tleText = await fetchTextUrl(celestrakUrl, 7000);
    const lines = tleText.trim().split('\n');
    if (lines.length < 3) throw new Error('Invalid TLE payload from Celestrak');

    const line1 = lines[1].trim();
    const line2 = lines[2].trim();
    const satrec = satellite.twoline2satrec(line1, line2);

    const observerGd = {
      latitude: satellite.degreesToRadians(latDeg),
      longitude: satellite.degreesToRadians(lonDeg),
      height: 0.1
    };

    const startTime = Date.now();
    const endTime = startTime + daysAhead * 24 * 60 * 60 * 1000;
    const stepMs = 20 * 1000; // 20-second step

    let passes = [];
    let inPass = false;
    let currentPass = null;

    for (let t = startTime; t <= endTime; t += stepMs) {
      const d = new Date(t);
      const posEci = satellite.propagate(satrec, d).position;
      if (!posEci) continue;

      const gmst = satellite.gstime(d);
      const posEcf = satellite.eciToEcf(posEci, gmst);
      const look = satellite.ecfToLookAngles(observerGd, posEcf);
      const elevationDeg = satellite.radiansToDegrees(look.elevation);
      const azimuthDeg = satellite.radiansToDegrees(look.azimuth);

      if (elevationDeg >= minElDeg) {
        if (!inPass) {
          inPass = true;
          currentPass = {
            rise: { time: d.toISOString(), azimuth_deg: Math.round(azimuthDeg), compass: azimuthToCompass(azimuthDeg) },
            culmination: { time: d.toISOString(), elevation_deg: Math.round(elevationDeg * 10) / 10 },
            maxEl: elevationDeg,
            azRise: azimuthDeg,
            azSet: azimuthDeg,
            peakDate: d
          };
        } else {
          currentPass.azSet = azimuthDeg;
          if (elevationDeg > currentPass.maxEl) {
            currentPass.maxEl = elevationDeg;
            currentPass.peakDate = d;
            currentPass.culmination = {
              time: d.toISOString(),
              elevation_deg: Math.round(elevationDeg * 10) / 10
            };
          }
        }
      } else if (inPass) {
        inPass = false;
        currentPass.set = {
          time: d.toISOString(),
          azimuth_deg: Math.round(currentPass.azSet),
          compass: azimuthToCompass(currentPass.azSet)
        };
        currentPass.duration_sec = Math.round((d.getTime() - new Date(currentPass.rise.time).getTime()) / 1000);

        // Sun Elevation & Visibility Calculation
        const sunAlt = getSunElevation(currentPass.peakDate, latDeg, lonDeg);
        currentPass.visible = sunAlt < -5.0; // Sun below horizon = Dark/Twilight Naked-Eye Visible Pass!

        // Estimate Magnitude (-3.8 for overhead 80°+ to -1.0 for 15° visible)
        if (currentPass.visible) {
          const mag = -1.2 - ((currentPass.maxEl - 10) / 80) * 2.6;
          currentPass.magnitude = parseFloat(mag.toFixed(1));
        }

        passes.push(currentPass);
      }
    }

    // Filter if visibleOnly requested
    let filteredPasses = passes;
    if (visibleOnly) {
      filteredPasses = passes.filter(p => p.visible);
    }

    const responsePayload = {
      satellite: 'ISS (ZARYA)',
      observer: { lat: latDeg, lon: lonDeg, elevation_m: 0 },
      passes: filteredPasses,
      total_calculated_passes: passes.length,
      visible_passes_count: passes.filter(p => p.visible).length,
      fetched_at: Date.now(),
      cached: false
    };

    setCache(cacheKey, responsePayload);
    res.json(responsePayload);
  } catch (err) {
    console.error('[SGP4 ISS Engine Error]', err);
    res.status(500).json({ error: 'Failed to calculate ISS orbital passes.', message: err.message });
  }
});

// 6. Active NASA Curiosity Rover Mars Weather Endpoint (6 Hour Server Cache)
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

// 7. NASA SVS Dial-A-Moon Phase Endpoint (6 Hour Server Cache)
app.get('/api/nasa/moon', async (req, res) => {
  const now = new Date();
  const formatStr = now.toISOString().substring(0, 13) + ':00';
  const cacheKey = `nasa_svs_moon_${formatStr}`;
  const SIX_HOURS = 6 * 60 * 60 * 1000;

  const cached = getCached(cacheKey, SIX_HOURS);
  if (cached) {
    return res.json({ ...cached, cached: true });
  }

  try {
    const svsUrl = `https://svs.gsfc.nasa.gov/api/dialamoon/${formatStr}`;
    console.log(`[Proxy] Fetching NASA SVS Dial-A-Moon API: ${svsUrl}`);

    const data = await fetchJsonUrl(svsUrl, 6000);

    const responsePayload = {
      image_url: data.image?.url || '',
      phase: data.phase !== undefined ? parseFloat(data.phase.toFixed(1)) : 50.0,
      age: data.age !== undefined ? parseFloat(data.age.toFixed(1)) : 14.0,
      time: data.time || formatStr,
      alt_text: data.image?.alt_text || 'NASA SVS Moon Visualization',
      fetched_at: Date.now()
    };

    setCache(cacheKey, responsePayload);
    res.json(responsePayload);
  } catch (err) {
    console.error('[NASA SVS Moon API Error]', err);
    res.status(500).json({ error: 'Failed to fetch NASA SVS Moon phase telemetry.', message: err.message });
  }
});

// 8. Xweather Hamilton ON Local 7-Day & 12-Hour Hourly Weather Endpoint (30 Min Cache)
app.get('/api/weather/hamilton', async (req, res) => {
  const cacheKey = 'xweather_hamilton_7day_12hr_v3';
  const THIRTY_MINS = 30 * 60 * 1000;

  const cached = getCached(cacheKey, THIRTY_MINS);
  if (cached) {
    return res.json({ ...cached, cached: true });
  }

  // 1st Try: Official Xweather (AerisWeather) API (Daily + 12-Hour Hourly + Current Obs)
  try {
    const forecastUrl = `https://data.api.xweather.com/forecasts/hamilton,on?client_id=${XWEATHER_CLIENT_ID}&client_secret=${XWEATHER_CLIENT_SECRET}`;
    const hourlyUrl = `https://data.api.xweather.com/forecasts/hamilton,on?client_id=${XWEATHER_CLIENT_ID}&client_secret=${XWEATHER_CLIENT_SECRET}&filter=1hr&limit=12`;
    const obsUrl = `https://data.api.xweather.com/observations/hamilton,on?client_id=${XWEATHER_CLIENT_ID}&client_secret=${XWEATHER_CLIENT_SECRET}`;

    console.log(`[Proxy] Fetching Xweather Daily, 12-Hour Hourly & Observations for Hamilton, ON...`);
    const [forecastData, hourlyData, obsData] = await Promise.all([
      fetchJsonUrl(forecastUrl, 6000),
      fetchJsonUrl(hourlyUrl, 6000).catch(() => null),
      fetchJsonUrl(obsUrl, 6000).catch(() => null)
    ]);

    if (forecastData?.success && forecastData?.response?.[0]?.periods) {
      const forecastItem = forecastData.response[0];
      const obItem = obsData?.response?.ob || null;

      const periods = forecastItem.periods.map((p) => ({
        timestamp: p.timestamp,
        dateTimeISO: p.dateTimeISO,
        validTime: p.validTime,
        weather: p.weatherPrimary || p.weather || 'Clear',
        icon: p.icon ? `https://cdn.aerisapi.com/wxicons/v2/${p.icon}` : null,
        rawIcon: p.icon,
        maxTempC: p.maxTempC,
        minTempC: p.minTempC,
        avgTempC: p.avgTempC,
        maxTempF: p.maxTempF,
        minTempF: p.minTempF,
        avgTempF: p.avgTempF,
        humidity: p.humidity,
        windSpeedKPH: p.windSpeedKPH,
        windDir: p.windDir,
        pop: p.pop || 0,
        precipMM: p.precipMM || 0,
        uv: p.uv || 0
      }));

      const hourlyPeriods = (hourlyData?.response?.[0]?.periods || []).map((h) => ({
        timestamp: h.timestamp,
        dateTimeISO: h.dateTimeISO,
        validTime: h.validTime,
        tempC: h.tempC !== undefined ? h.tempC : h.avgTempC,
        feelslikeC: h.feelslikeC !== undefined ? h.feelslikeC : h.avgTempC,
        tempF: h.tempF !== undefined ? h.tempF : h.avgTempF,
        feelslikeF: h.feelslikeF !== undefined ? h.feelslikeF : h.avgTempF,
        weather: h.weatherPrimary || h.weather || 'Clear',
        icon: h.icon ? `https://cdn.aerisapi.com/wxicons/v2/${h.icon}` : null,
        rawIcon: h.icon,
        humidity: h.humidity,
        windSpeedKPH: h.windSpeedKPH,
        windDir: h.windDir,
        pop: h.pop || 0,
        precipMM: h.precipMM || 0,
        uv: h.uv || 0
      }));

      const current = obItem ? {
        tempC: obItem.tempC,
        feelslikeC: obItem.feelslikeC,
        tempF: obItem.tempF,
        feelslikeF: obItem.feelslikeF,
        weather: obItem.weatherPrimary || obItem.weather || 'Clear',
        icon: obItem.icon ? `https://cdn.aerisapi.com/wxicons/v2/${obItem.icon}` : null,
        humidity: obItem.humidity,
        windSpeedKPH: obItem.windSpeedKPH,
        windDir: obItem.windDir,
        pressureMB: obItem.pressureMB,
        visibilityKM: obItem.visibilityKM,
        uv: obItem.solrad?.uv || obItem.uv || 0,
        dateTimeISO: obItem.dateTimeISO
      } : {
        tempC: periods[0].avgTempC,
        feelslikeC: periods[0].avgTempC,
        weather: periods[0].weather,
        humidity: periods[0].humidity,
        windSpeedKPH: periods[0].windSpeedKPH,
        windDir: periods[0].windDir
      };

      const responsePayload = {
        source: 'Xweather (AerisWeather API)',
        location: 'Hamilton, ON',
        profile: forecastItem.profile || { tz: 'America/Toronto' },
        current,
        hourlyPeriods,
        periods,
        fetched_at: Date.now(),
        cached: false
      };

      setCache(cacheKey, responsePayload);
      return res.json(responsePayload);
    }
  } catch (xerr) {
    console.warn(`[Proxy] Xweather API warning: ${xerr.message}. Trying Open-Meteo fallback...`);
  }

  // 2nd Try: High-Resolution Open-Meteo Fallback (Daily + Hourly)
  try {
    const omUrl = 'https://api.open-meteo.com/v1/forecast?latitude=43.25&longitude=-79.87&hourly=temperature_2m,precipitation_probability,weathercode,windspeed_10m&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,windspeed_10m_max,uv_index_max&current_weather=true&timezone=America%2FToronto';
    console.log(`[Proxy] Fetching Open-Meteo fallback for Hamilton, ON: ${omUrl}`);

    const omData = await fetchJsonUrl(omUrl, 6000);

    const wmoMap = {
      0: 'Clear Sky ☀️', 1: 'Mainly Clear 🌤️', 2: 'Partly Cloudy ⛅', 3: 'Overcast ☁️',
      45: 'Foggy 🌫️', 48: 'Depositing Rime Fog 🌫️', 51: 'Light Drizzle 🌧️', 53: 'Moderate Drizzle 🌧️', 55: 'Dense Drizzle 🌧️',
      61: 'Slight Rain 🌧️', 63: 'Moderate Rain 🌧️', 65: 'Heavy Rain 🌧️', 71: 'Slight Snow ❄️', 73: 'Moderate Snow ❄️', 75: 'Heavy Snow ❄️',
      80: 'Rain Showers 🌦️', 81: 'Moderate Rain Showers 🌦️', 82: 'Violent Rain Showers ⛈️', 95: 'Thunderstorm 🌩️'
    };

    const daily = omData.daily || {};
    const periods = (daily.time || []).map((t, idx) => ({
      dateTimeISO: t,
      weather: wmoMap[daily.weathercode?.[idx]] || 'Partly Cloudy',
      maxTempC: daily.temperature_2m_max?.[idx],
      minTempC: daily.temperature_2m_min?.[idx],
      maxTempF: parseFloat((daily.temperature_2m_max?.[idx] * 1.8 + 32).toFixed(1)),
      minTempF: parseFloat((daily.temperature_2m_min?.[idx] * 1.8 + 32).toFixed(1)),
      pop: daily.precipitation_probability_max?.[idx] || 0,
      precipMM: daily.precipitation_sum?.[idx] || 0,
      windSpeedKPH: daily.windspeed_10m_max?.[idx] || 0,
      uv: daily.uv_index_max?.[idx] || 0
    }));

    const hourly = omData.hourly || {};
    const hourlyPeriods = (hourly.time || []).slice(0, 12).map((t, idx) => ({
      dateTimeISO: t,
      tempC: hourly.temperature_2m?.[idx],
      feelslikeC: hourly.temperature_2m?.[idx],
      weather: wmoMap[hourly.weathercode?.[idx]] || 'Clear',
      pop: hourly.precipitation_probability?.[idx] || 0,
      windSpeedKPH: hourly.windspeed_10m?.[idx] || 0
    }));

    const responsePayload = {
      source: 'Open-Meteo Weather API',
      location: 'Hamilton, ON',
      current: {
        tempC: omData.current_weather?.temperature,
        feelslikeC: omData.current_weather?.temperature,
        weather: wmoMap[omData.current_weather?.weathercode] || 'Clear',
        windSpeedKPH: omData.current_weather?.windspeed
      },
      hourlyPeriods,
      periods,
      fetched_at: Date.now(),
      cached: false
    };

    setCache(cacheKey, responsePayload);
    res.json(responsePayload);
  } catch (omErr) {
    console.error('[Weather API Error]', omErr);
    res.status(500).json({ error: 'Failed to fetch Hamilton local weather forecast.', message: omErr.message });
  }
});

// 9. HSR Transit Endpoint (Hamilton Street Railway - Anchored at 200 Bay St S)
app.get('/api/transit/hsr', async (req, res) => {
  try {
    const data = await getHSRTransitInfo(req.query);
    res.json(data);
  } catch (err) {
    console.error('[HSR Transit API Error]', err);
    res.status(500).json({ error: 'Failed to fetch HSR transit info', message: err.message });
  }
});

// 10. AI Agent Endpoint (Azure OpenAI GPT-4o / GPT-5 Deployments)
app.post('/api/agent/chat', async (req, res) => {
  try {
    const { messages, userMessage, clientTime, timezone, modelDeployment, deployment } = req.body || {};
    const result = await processAgentChat({ 
      messages, 
      userMessage, 
      clientTime, 
      timezone, 
      modelDeployment: modelDeployment || deployment 
    });
    res.json(result);
  } catch (err) {
    console.error('[Agent API Error]', err);
    res.status(500).json({ error: 'Agent chat processing failed', message: err.message });
  }
});

app.get('/api/agent/status', (req, res) => {
  res.json(getAgentStatus());
});

app.get('/api/agent/greet', async (req, res) => {
  try {
    const { clientTime, modelDeployment, deployment } = req.query || {};
    const greeting = await generateAgentGreeting(clientTime, modelDeployment || deployment);
    res.json(greeting);
  } catch (err) {
    console.error('[Agent Greet Error]', err);
    res.status(500).json({ error: 'Failed to generate greeting', message: err.message });
  }
});

// 11. Celestial & ISS Naked-Eye Viewing Forecast (Hamilton Anchor)
app.get('/api/sky/tonight', async (req, res) => {
  try {
    const data = await getSkyViewingForecast(req.query);
    res.json(data);
  } catch (err) {
    console.error('[Sky Tonight API Error]', err);
    res.status(500).json({ error: 'Failed to fetch sky viewing forecast', message: err.message });
  }
});

// 12. GROOVE POP Engine API (Direct Engine & Azure OpenAI Vision Integration)
app.get('/api/groovepop/health', async (req, res) => {
  res.json({
    ok: true,
    service: 'groovepop-engine-api',
    endpoints: ['/api/groovepop/health', '/api/groovepop/caption', '/api/groovepop/transform']
  });
});

app.post('/api/groovepop/transform', async (req, res) => {
  try {
    const result = await executeEngineTransform(req.body);
    res.json(result);
  } catch (err) {
    console.error('[GroovePop Transform Error]', err);
    const status = err.status || 500;
    const rawMsg = err.message || '';
    let errorType = 'generation_failed';
    let userMsg = rawMsg || 'Transformation failed';

    if (rawMsg.includes('Vision') || rawMsg.includes('caption') || rawMsg.includes('classification')) {
      errorType = 'caption_failed';
    }
    if (status === 429 || rawMsg.includes('429') || rawMsg.includes('RateLimit') || rawMsg.includes('EngineOverloaded')) {
      errorType = 'rate_limited';
      userMsg = 'Azure OpenAI rate limit reached. Please retry shortly.';
    } else if (rawMsg.includes('content_filter') || rawMsg.includes('ResponsibleAI') || rawMsg.includes('content_policy') || status === 400) {
      errorType = 'content_policy';
      userMsg = 'The submitted image or prompt could not be processed due to content filtering policies.';
    }

    res.status(status >= 400 && status < 600 ? status : 500).json({
      success: false,
      error: errorType,
      message: userMsg
    });
  }
});

app.post('/api/groovepop/caption', async (req, res) => {
  try {
    const result = await executeEngineCaption(req.body);
    res.json(result);
  } catch (err) {
    console.error('[GroovePop Caption Error]', err);
    const status = err.status || 500;
    res.status(status >= 400 && status < 600 ? status : 500).json({
      success: false,
      error: 'caption_failed',
      message: err.message || 'Vision captioning failed'
    });
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
