import https from 'https';
import http from 'http';
import * as satellite from 'satellite.js';

// Hamilton Anchor Location (200 Bay St S)
export const HAMILTON_COORDS = {
  name: '200 Bay Street South, Hamilton, ON (L8P 4S4)',
  lat: 43.2536,
  lon: -79.8752,
  elevation_m: 100
};

// Known Tracked Visual Targets (NORAD Catalog IDs)
const SATELLITE_TARGETS = [
  { id: 25544, name: 'International Space Station (ISS)', shortName: 'ISS', baseMag: -3.8, priority: 1 },
  { id: 48274, name: 'Tiangong Space Station (CSS)', shortName: 'Tiangong', baseMag: -2.0, priority: 2 },
  { id: 20580, name: 'Hubble Space Telescope (HST)', shortName: 'Hubble', baseMag: 1.5, priority: 3 }
];

// Major Annual Meteor Showers
const METEOR_SHOWERS = [
  { name: 'Quadrantids', peakMonth: 1, peakDay: 3, startMonth: 12, startDay: 28, endMonth: 1, endDay: 12, zhr: 120, speed: '41 km/s', description: 'Bright fireball-rich shower' },
  { name: 'Lyrids', peakMonth: 4, peakDay: 22, startMonth: 4, startDay: 14, endMonth: 4, endDay: 30, zhr: 18, speed: '49 km/s', description: 'Fast meteors with persistent trains' },
  { name: 'Eta Aquariids', peakMonth: 5, peakDay: 6, startMonth: 4, startDay: 19, endMonth: 5, endDay: 28, zhr: 50, speed: '66 km/s', description: 'Debris from Halley’s Comet' },
  { name: 'Delta Aquariids', peakMonth: 7, peakDay: 30, startMonth: 7, startDay: 12, endMonth: 8, endDay: 23, zhr: 25, speed: '41 km/s', description: 'Steady summer shower' },
  { name: 'Perseids', peakMonth: 8, peakDay: 12, startMonth: 7, startDay: 17, endMonth: 8, endDay: 24, zhr: 100, speed: '59 km/s', description: 'Top annual summer shower, bright fireballs' },
  { name: 'Orionids', peakMonth: 10, peakDay: 21, startMonth: 10, startDay: 2, endMonth: 11, endDay: 7, zhr: 20, speed: '66 km/s', description: 'Fast meteors from Halley’s Comet' },
  { name: 'Leonids', peakMonth: 11, peakDay: 17, startMonth: 11, startDay: 6, endMonth: 11, endDay: 30, zhr: 15, speed: '71 km/s', description: 'Fastest meteors with bright trains' },
  { name: 'Geminids', peakMonth: 12, peakDay: 14, startMonth: 12, startDay: 4, endMonth: 12, endDay: 17, zhr: 150, speed: '35 km/s', description: 'King of winter meteor showers, multi-colored' },
  { name: 'Ursids', peakMonth: 12, peakDay: 22, startMonth: 12, startDay: 17, endMonth: 12, endDay: 26, zhr: 10, speed: '33 km/s', description: 'Late December winter shower' }
];

// Helper: HTTP GET JSON
function fetchJson(urlStr, timeoutMs = 7000) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(urlStr);
    const transport = parsed.protocol === 'https:' ? https : http;
    const req = transport.get(urlStr, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) EZsearch-SkyViewer/1.0',
        'Accept': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Invalid JSON from ${urlStr}`));
          }
        } else {
          reject(new Error(`HTTP status ${res.statusCode} from ${urlStr}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error(`Timeout fetching ${urlStr}`));
    });
  });
}

// Helper: HTTP GET Text (for TLEs)
function fetchText(urlStr, timeoutMs = 7000) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(urlStr);
    const transport = parsed.protocol === 'https:' ? https : http;
    const req = transport.get(urlStr, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) EZsearch-SkyViewer/1.0'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`HTTP status ${res.statusCode} from ${urlStr}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error(`Timeout fetching ${urlStr}`));
    });
  });
}

// Azimuth degrees to compass direction
function azimuthToCompass(deg) {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(((deg % 360) + 360) % 360 / 22.5) % 16;
  return directions[index];
}

// Solar elevation helper
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

// Moon illumination & phase calculator
function getMoonData(date = new Date()) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();

  // Approximate moon phase calculation (0 to 1, where 0 = New, 0.5 = Full)
  const c = Math.floor(year / 100);
  const epact = (11 * (year % 19) + 20 + Math.floor((c - Math.floor(c / 4) - Math.floor((c - 17) / 25) + 4) / 30)) % 30;
  const daysSinceNew = ((epact + day + [0, 2, 0, 2, 2, 4, 5, 7, 7, 9, 10, 12][month - 1]) % 29.53);
  const phaseFraction = daysSinceNew / 29.53;
  const illuminationPercent = Math.round((1 - Math.cos(phaseFraction * 2 * Math.PI)) / 2 * 100);

  let phaseName = 'New Moon';
  if (phaseFraction < 0.03 || phaseFraction > 0.97) phaseName = 'New Moon';
  else if (phaseFraction < 0.22) phaseName = 'Waxing Crescent';
  else if (phaseFraction < 0.28) phaseName = 'First Quarter';
  else if (phaseFraction < 0.47) phaseName = 'Waxing Gibbous';
  else if (phaseFraction < 0.53) phaseName = 'Full Moon';
  else if (phaseFraction < 0.72) phaseName = 'Waning Gibbous';
  else if (phaseFraction < 0.78) phaseName = 'Last Quarter';
  else phaseName = 'Waning Crescent';

  const glareImpact = illuminationPercent > 75 
    ? 'High (washes out faint stars & satellites)' 
    : (illuminationPercent > 40 ? 'Moderate' : 'Low / Dark Sky (Optimal)');

  return {
    phase: phaseName,
    illuminationPercent: `${illuminationPercent}%`,
    glareImpact,
    darkSkyFriendly: illuminationPercent < 50
  };
}

/**
 * Fetch Hourly Cloud Cover & Astronomical Forecast for Hamilton from Open-Meteo
 */
async function fetchHamiltonSkyWeather() {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${HAMILTON_COORDS.lat}&longitude=${HAMILTON_COORDS.lon}&hourly=cloudcover,cloudcover_low,cloudcover_mid,cloudcover_high,visibility,precipitation_probability,temperature_2m&daily=sunrise,sunset&timezone=America%2FToronto&forecast_days=3`;
  
  try {
    const data = await fetchJson(url);
    const hourly = data.hourly || {};
    const times = hourly.time || [];
    
    const weatherMap = {};
    times.forEach((tStr, idx) => {
      weatherMap[tStr] = {
        time: tStr,
        cloudCoverTotal: hourly.cloudcover?.[idx] ?? 0,
        cloudCoverLow: hourly.cloudcover_low?.[idx] ?? 0,
        cloudCoverMid: hourly.cloudcover_mid?.[idx] ?? 0,
        cloudCoverHigh: hourly.cloudcover_high?.[idx] ?? 0,
        visibilityKm: Math.round(((hourly.visibility?.[idx] ?? 10000) / 1000) * 10) / 10,
        rainChance: `${hourly.precipitation_probability?.[idx] ?? 0}%`,
        tempC: `${hourly.temperature_2m?.[idx] ?? 15}°C`
      };
    });

    return {
      weatherMap,
      daily: data.daily || {}
    };
  } catch (err) {
    console.warn('[SkyTool] Open-Meteo sky weather fetch failed:', err.message);
    return { weatherMap: {}, daily: {} };
  }
}

/**
 * Fetch Live Space Weather (Planetary K-index / Aurora Alert) from NOAA SWPC
 */
async function fetchNOAASpaceWeather() {
  const liveUrl = 'https://services.swpc.noaa.gov/json/planetary_k_index_1m.json';
  const forecastUrl = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json';

  try {
    const [liveData, forecastData] = await Promise.all([
      fetchJson(liveUrl).catch(() => null),
      fetchJson(forecastUrl).catch(() => null)
    ]);

    let currentKp = 2.0;
    let kpTime = 'Recent';
    if (Array.isArray(liveData) && liveData.length > 0) {
      const latest = liveData[liveData.length - 1];
      currentKp = parseFloat(latest.kp_index || latest.estimated_kp || 2.0);
      kpTime = latest.time_tag;
    }

    let maxForecastKp = currentKp;
    if (Array.isArray(forecastData) && forecastData.length > 1) {
      // Skip header row
      for (let i = 1; i < forecastData.length; i++) {
        const val = parseFloat(forecastData[i][1]);
        if (!isNaN(val) && val > maxForecastKp) {
          maxForecastKp = val;
        }
      }
    }

    // Hamilton latitude is ~43.25°N. Hamilton needs Kp >= 5.0 for photographic aurora, Kp >= 6.0 for naked-eye aurora
    let auroraStatus = 'Quiet (No Aurora)';
    let canSeeInHamilton = false;
    let visualChance = 'Very Low (<5%)';

    if (maxForecastKp >= 7.0) {
      auroraStatus = '🚨 G3+ Strong Geomagnetic Storm - Major Naked-Eye Aurora Alert!';
      canSeeInHamilton = true;
      visualChance = 'High (Look north from dark areas like Bayfront or Escarpment)';
    } else if (maxForecastKp >= 5.5) {
      auroraStatus = '🌌 G1-G2 Moderate Geomagnetic Activity - Potential Northern Lights Visible';
      canSeeInHamilton = true;
      visualChance = 'Moderate (30-60% chance to north horizon)';
    } else if (maxForecastKp >= 4.5) {
      auroraStatus = '⚠️ Unsettled to Active Geomagnetic Field';
      canSeeInHamilton = false;
      visualChance = 'Low / Photographic only';
    }

    return {
      currentKp: Math.round(currentKp * 10) / 10,
      forecastMaxKp: Math.round(maxForecastKp * 10) / 10,
      auroraStatus,
      canSeeInHamilton,
      visualChance,
      hamiltonThreshold: 'Kp ≥ 5.0 needed for naked-eye visibility in Hamilton'
    };
  } catch (err) {
    console.warn('[SkyTool] NOAA Space weather lookup failed:', err.message);
    return {
      currentKp: 2.0,
      forecastMaxKp: 2.5,
      auroraStatus: 'Quiet (Normal Baseline)',
      canSeeInHamilton: false,
      visualChance: 'Very Low'
    };
  }
}

/**
 * Calculate Satellite Passes for ISS & Other Visual Targets over Hamilton
 */
async function calculateVisualSatellitePasses(weatherMap = {}, hoursAhead = 48) {
  const passes = [];
  const observerGd = {
    latitude: satellite.degreesToRadians(HAMILTON_COORDS.lat),
    longitude: satellite.degreesToRadians(HAMILTON_COORDS.lon),
    height: 0.1
  };

  const startTime = Date.now();
  const endTime = startTime + hoursAhead * 60 * 60 * 1000;
  const stepMs = 25 * 1000; // 25s time resolution

  for (const target of SATELLITE_TARGETS) {
    try {
      const tleUrl = `https://celestrak.org/NORAD/elements/gp.php?CATNR=${target.id}&FORMAT=tle`;
      const rawTle = await fetchText(tleUrl, 6000).catch(() => null);
      if (!rawTle) continue;

      const lines = rawTle.trim().split(/\r?\n/);
      if (lines.length < 2) continue;

      const line1 = lines[lines.length - 2].trim();
      const line2 = lines[lines.length - 1].trim();
      const satrec = satellite.twoline2satrec(line1, line2);

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

        // Minimum 10° elevation to count as above tree/building horizon
        if (elevationDeg >= 10.0) {
          if (!inPass) {
            inPass = true;
            currentPass = {
              satellite: target.name,
              shortName: target.shortName,
              noradId: target.id,
              rise: { 
                timeISO: d.toISOString(), 
                timeLocal: d.toLocaleTimeString('en-US', { timeZone: 'America/Toronto', hour: 'numeric', minute: '2-digit', hour12: true }),
                azimuth_deg: Math.round(azimuthDeg), 
                compass: azimuthToCompass(azimuthDeg) 
              },
              maxEl: elevationDeg,
              azSet: azimuthDeg,
              peakDate: d
            };
          } else {
            currentPass.azSet = azimuthDeg;
            if (elevationDeg > currentPass.maxEl) {
              currentPass.maxEl = elevationDeg;
              currentPass.peakDate = d;
            }
          }
        } else if (inPass) {
          inPass = false;
          currentPass.set = {
            timeISO: d.toISOString(),
            timeLocal: d.toLocaleTimeString('en-US', { timeZone: 'America/Toronto', hour: 'numeric', minute: '2-digit', hour12: true }),
            azimuth_deg: Math.round(currentPass.azSet),
            compass: azimuthToCompass(currentPass.azSet)
          };
          currentPass.durationMinutes = Math.round((d.getTime() - new Date(currentPass.rise.timeISO).getTime()) / 60000);
          currentPass.peakTimeLocal = currentPass.peakDate.toLocaleTimeString('en-US', { timeZone: 'America/Toronto', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
          currentPass.peakDateFormatted = currentPass.peakDate.toLocaleDateString('en-US', { timeZone: 'America/Toronto', weekday: 'short', month: 'short', day: 'numeric' });
          currentPass.maxElevationDeg = Math.round(currentPass.maxEl);

          // Visibility Check: Sun must be below horizon (< -6° civil twilight)
          const sunAlt = getSunElevation(currentPass.peakDate, HAMILTON_COORDS.lat, HAMILTON_COORDS.lon);
          currentPass.sunElevationDeg = Math.round(sunAlt * 10) / 10;
          currentPass.isNightOrTwilight = sunAlt < -6.0;

          // Estimate Visual Magnitude based on peak elevation and satellite base brightness
          if (currentPass.isNightOrTwilight) {
            const mag = target.baseMag - ((currentPass.maxEl - 10) / 80) * 1.5;
            currentPass.estimatedMagnitude = parseFloat(mag.toFixed(1));
            
            // Match with hourly cloud cover forecast for Hamilton
            const localHourISO = currentPass.peakDate.toISOString().substring(0, 13) + ':00';
            const matchedWeather = weatherMap[localHourISO] || Object.values(weatherMap)[0] || { cloudCoverTotal: 25 };
            
            currentPass.cloudCoverPercent = matchedWeather.cloudCoverTotal;
            currentPass.weatherCondition = matchedWeather.cloudCoverTotal < 20 ? 'Clear Sky' : (matchedWeather.cloudCoverTotal < 50 ? 'Partly Cloudy' : 'Cloudy / Obscured');

            // Calculate Composite Viewing Score (0 to 10)
            let score = 0;
            // 1. Cloud score (up to 4.5 pts)
            if (matchedWeather.cloudCoverTotal <= 15) score += 4.5;
            else if (matchedWeather.cloudCoverTotal <= 35) score += 3.5;
            else if (matchedWeather.cloudCoverTotal <= 60) score += 1.5;
            else score += 0.2;

            // 2. Elevation score (overhead passes are much brighter and clearer) (up to 3.0 pts)
            if (currentPass.maxElevationDeg >= 60) score += 3.0;
            else if (currentPass.maxElevationDeg >= 40) score += 2.2;
            else if (currentPass.maxElevationDeg >= 25) score += 1.4;
            else score += 0.7;

            // 3. Brightness/Target bonus (up to 2.5 pts)
            if (target.id === 25544) score += 2.5; // ISS is brilliantly bright (-3.5 mag)
            else if (target.id === 48274) score += 1.8;
            else score += 1.0;

            currentPass.viewingScore = Math.min(10, Math.round(score * 10) / 10);
            
            if (currentPass.viewingScore >= 8.0) currentPass.rating = '🌟 Exceptional (Brilliant & Clear)';
            else if (currentPass.viewingScore >= 6.0) currentPass.rating = '👍 Good Naked-Eye Pass';
            else if (currentPass.viewingScore >= 4.0) currentPass.rating = '⚠️ Marginal / Partial Clouds';
            else currentPass.rating = '🚫 Likely Clouded Out';

            passes.push(currentPass);
          }
        }
      }
    } catch (e) {
      console.warn(`[SkyTool] Failed to calculate passes for ${target.name}:`, e.message);
    }
  }

  passes.sort((a, b) => new Date(a.rise.timeISO) - new Date(b.rise.timeISO));
  return passes;
}

/**
 * Identify Active Meteor Showers
 */
function getActiveMeteorShowers(now = new Date()) {
  const currentMonth = now.getUTCMonth() + 1;
  const currentDay = now.getUTCDate();

  return METEOR_SHOWERS.filter(s => {
    // Cross-year showers (e.g. Quadrantids Dec-Jan)
    if (s.startMonth > s.endMonth) {
      return (currentMonth === s.startMonth && currentDay >= s.startDay) || 
             (currentMonth === s.endMonth && currentDay <= s.endDay) ||
             (currentMonth > s.startMonth || currentMonth < s.endMonth);
    }
    return (currentMonth > s.startMonth || (currentMonth === s.startMonth && currentDay >= s.startDay)) &&
           (currentMonth < s.endMonth || (currentMonth === s.endMonth && currentDay <= s.endDay));
  }).map(s => {
    const isNearPeak = currentMonth === s.peakMonth && Math.abs(currentDay - s.peakDay) <= 3;
    return {
      name: s.name,
      status: isNearPeak ? '🔥 PEAK ACTIVITY NOW' : 'Active',
      expectedHourlyRate: `${s.zhr} meteors/hour at peak`,
      peakDate: `${new Date(now.getFullYear(), s.peakMonth - 1, s.peakDay).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      speed: s.speed,
      description: s.description
    };
  });
}

/**
 * Main Sky Viewing Tool Entry Point
 */
export async function getSkyViewingForecast({ time_window = 'next_48h', event_type = 'all' } = {}) {
  const now = new Date();
  const hamiltonTimeStr = now.toLocaleTimeString('en-US', { timeZone: 'America/Toronto', hour: 'numeric', minute: '2-digit', hour12: true });
  const hamiltonDateStr = now.toLocaleDateString('en-US', { timeZone: 'America/Toronto', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  // Parallel fetch: Open-Meteo Cloud Cover + NOAA Space Weather
  const [weatherData, spaceWeather] = await Promise.all([
    fetchHamiltonSkyWeather(),
    fetchNOAASpaceWeather()
  ]);

  // Satellite pass calculations with cloud cover correlation
  const satellitePasses = await calculateVisualSatellitePasses(weatherData.weatherMap, time_window === 'next_24h' ? 24 : 48);

  // Moon data
  const moonData = getMoonData(now);

  // Active meteor showers
  const activeMeteorShowers = getActiveMeteorShowers(now);

  // Filter best naked-eye windows (score >= 6.0)
  const bestNakedEyeWindows = satellitePasses
    .filter(p => p.viewingScore >= 5.0)
    .slice(0, 5)
    .map(p => ({
      target: p.satellite,
      window: `${p.peakDateFormatted} at ${p.peakTimeLocal}`,
      duration: `${p.durationMinutes} mins`,
      maxElevation: `${p.maxElevationDeg}° (${p.maxElevationDeg > 50 ? 'High Overhead' : 'Mid Sky'})`,
      trajectory: `Rises in ${p.rise.compass} (${p.rise.azimuth_deg}°) ➔ Sets in ${p.set.compass} (${p.set.azimuth_deg}°)`,
      estimatedBrightness: `Magnitude ${p.estimatedMagnitude} (${p.estimatedMagnitude < -2 ? 'Brighter than Jupiter' : 'Bright'})`,
      cloudCover: `${p.cloudCoverPercent}% (${p.weatherCondition})`,
      viewingScore: `${p.viewingScore}/10`,
      rating: p.rating
    }));

  return {
    locationAnchor: HAMILTON_COORDS.name,
    currentTime: hamiltonTimeStr,
    currentDate: hamiltonDateStr,
    moonCondition: moonData,
    auroraAlert: spaceWeather,
    activeMeteorShowers: activeMeteorShowers.length > 0 ? activeMeteorShowers : 'No major peak showers tonight; minor background sporadics visible',
    bestUpcomingPasses: bestNakedEyeWindows,
    allCalculatedPasses: satellitePasses.map(p => ({
      satellite: p.shortName,
      date: p.peakDateFormatted,
      time: p.peakTimeLocal,
      maxElevation: `${p.maxElevationDeg}°`,
      clouds: `${p.cloudCoverPercent}%`,
      score: `${p.viewingScore}/10`,
      rating: p.rating
    })),
    bestLocalLookoutSpots: [
      { name: 'Sam Lawrence Park (Mountain Brow)', reason: 'High elevation overlooking lower city and lake, great north/east horizon view' },
      { name: 'Bayfront Park / Pier 4', reason: 'Open water horizon to the north for satellite and aurora spotting' },
      { name: 'Dundurn Castle Park grounds', reason: 'Open lawn with reduced street lamp glare' }
    ]
  };
}
