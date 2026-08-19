import https from 'https';
import http from 'http';

const XWEATHER_CLIENT_ID = process.env.XWEATHER_CLIENT_ID || 'kNPY5XGr0SDofXdyLH9Z6';
const XWEATHER_CLIENT_SECRET = process.env.XWEATHER_CLIENT_SECRET || 'k88PkimT0tLyeFa8lhDRGMdGMMZdjvB3JgiCvCnA';

// Quick fetch helper
function fetchJson(urlStr, timeoutMs = 6000) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(urlStr);
    const transport = parsed.protocol === 'https:' ? https : http;
    const req = transport.get(urlStr, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) EZsearch-Agent/1.0',
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
            reject(new Error('Invalid JSON received'));
          }
        } else {
          reject(new Error(`HTTP status ${res.statusCode}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error('Weather request timed out'));
    });
  });
}

/**
 * Fetch live Hamilton weather telemetry and forecast
 */
export async function getHamiltonWeather({ forecast_type = 'all', units = 'celsius' } = {}) {
  // 1. Try Xweather (AerisWeather)
  try {
    const forecastUrl = `https://data.api.xweather.com/forecasts/hamilton,on?client_id=${XWEATHER_CLIENT_ID}&client_secret=${XWEATHER_CLIENT_SECRET}`;
    const obsUrl = `https://data.api.xweather.com/observations/hamilton,on?client_id=${XWEATHER_CLIENT_ID}&client_secret=${XWEATHER_CLIENT_SECRET}`;
    const hourlyUrl = `https://data.api.xweather.com/forecasts/hamilton,on?client_id=${XWEATHER_CLIENT_ID}&client_secret=${XWEATHER_CLIENT_SECRET}&filter=1hr&limit=12`;

    const [forecastData, obsData, hourlyData] = await Promise.all([
      fetchJson(forecastUrl).catch(() => null),
      fetchJson(obsUrl).catch(() => null),
      fetchJson(hourlyUrl).catch(() => null)
    ]);

    if (forecastData?.success && forecastData?.response?.[0]?.periods) {
      const ob = obsData?.response?.ob;
      const periods = forecastData.response[0].periods;
      const hourly = hourlyData?.response?.[0]?.periods || [];

      const current = {
        location: 'Hamilton, ON (Downtown / Escarpment)',
        condition: ob?.weatherPrimary || ob?.weather || periods[0].weatherPrimary || 'Clear',
        temp: units === 'fahrenheit' ? `${ob?.tempF ?? periods[0].avgTempF}°F` : `${ob?.tempC ?? periods[0].avgTempC}°C`,
        feelsLike: units === 'fahrenheit' ? `${ob?.feelslikeF ?? periods[0].avgTempF}°F` : `${ob?.feelslikeC ?? periods[0].avgTempC}°C`,
        humidity: `${ob?.humidity ?? periods[0].humidity}%`,
        wind: `${ob?.windSpeedKPH ?? periods[0].windSpeedKPH} km/h ${ob?.windDir ?? periods[0].windDir}`,
        uvIndex: ob?.solrad?.uv ?? ob?.uv ?? periods[0].uv ?? 0,
        rainChance: `${periods[0].pop || 0}%`,
        precipitation: `${periods[0].precipMM || 0} mm`
      };

      const next12Hours = hourly.slice(0, 12).map(h => ({
        time: new Date(h.dateTimeISO).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true, timeZone: 'America/Toronto' }),
        condition: h.weatherPrimary || h.weather,
        temp: units === 'fahrenheit' ? `${h.tempF ?? h.avgTempF}°F` : `${h.tempC ?? h.avgTempC}°C`,
        pop: `${h.pop || 0}%`
      }));

      const sevenDayOutlook = periods.slice(0, 7).map(p => ({
        day: new Date(p.dateTimeISO).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/Toronto' }),
        condition: p.weatherPrimary || p.weather,
        high: units === 'fahrenheit' ? `${p.maxTempF}°F` : `${p.maxTempC}°C`,
        low: units === 'fahrenheit' ? `${p.minTempF}°F` : `${p.minTempC}°C`,
        rainChance: `${p.pop || 0}%`,
        rainAmount: `${p.precipMM || 0} mm`
      }));

      return {
        source: 'Xweather Official (Hamilton Station)',
        location: '200 Bay St S, Hamilton, ON (L8P 4S4)',
        current,
        ...(forecast_type === 'hourly' || forecast_type === 'all' ? { next12Hours } : {}),
        ...(forecast_type === '7day' || forecast_type === 'all' ? { sevenDayOutlook } : {})
      };
    }
  } catch (err) {
    console.warn('[Agent WeatherTool] Xweather lookup failed, using Open-Meteo:', err.message);
  }

  // 2. Open-Meteo Fallback
  try {
    const omUrl = 'https://api.open-meteo.com/v1/forecast?latitude=43.2536&longitude=-79.8752&hourly=temperature_2m,precipitation_probability,weathercode,windspeed_10m&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,windspeed_10m_max,uv_index_max&current_weather=true&timezone=America%2FToronto';
    const om = await fetchJson(omUrl);

    const wmoMap = {
      0: 'Clear Sky ☀️', 1: 'Mainly Clear 🌤️', 2: 'Partly Cloudy ⛅', 3: 'Overcast ☁️',
      45: 'Foggy 🌫️', 51: 'Light Drizzle 🌧️', 61: 'Slight Rain 🌧️', 63: 'Moderate Rain 🌧️',
      65: 'Heavy Rain 🌧️', 71: 'Slight Snow ❄️', 73: 'Moderate Snow ❄️', 75: 'Heavy Snow ❄️',
      80: 'Rain Showers 🌦️', 95: 'Thunderstorm 🌩️'
    };

    const currentTempC = om.current_weather?.temperature;
    const currentCode = om.current_weather?.weathercode;
    const currentWind = om.current_weather?.windspeed;

    return {
      source: 'Open-Meteo High-Resolution (Bay 200 Coordinates: 43.2536, -79.8752)',
      location: '200 Bay St S, Hamilton, ON L8P 4S4',
      current: {
        condition: wmoMap[currentCode] || 'Partly Cloudy',
        temp: units === 'fahrenheit' ? `${(currentTempC * 1.8 + 32).toFixed(1)}°F` : `${currentTempC}°C`,
        wind: `${currentWind} km/h`,
        rainChance: `${om.daily?.precipitation_probability_max?.[0] || 0}%`,
        uvIndex: om.daily?.uv_index_max?.[0] || 0
      },
      sevenDayOutlook: (om.daily?.time || []).slice(0, 7).map((t, idx) => ({
        date: t,
        condition: wmoMap[om.daily.weathercode[idx]] || 'Cloudy',
        high: units === 'fahrenheit' ? `${(om.daily.temperature_2m_max[idx] * 1.8 + 32).toFixed(1)}°F` : `${om.daily.temperature_2m_max[idx]}°C`,
        low: units === 'fahrenheit' ? `${(om.daily.temperature_2m_min[idx] * 1.8 + 32).toFixed(1)}°F` : `${om.daily.temperature_2m_min[idx]}°C`,
        rainChance: `${om.daily.precipitation_probability_max[idx]}%`,
        rainAmount: `${om.daily.precipitation_sum[idx]} mm`
      }))
    };
  } catch (omErr) {
    return {
      error: 'Weather service currently unavailable',
      message: omErr.message,
      location: '200 Bay St S, Hamilton, ON'
    };
  }
}
