import React, { useState, useEffect } from 'react';
import { CloudSun, Thermometer, Wind, Droplets, Gauge, Sun, Calendar, RefreshCw, MapPin, ShieldCheck, Info, Umbrella } from 'lucide-react';
import { fetchHamiltonWeather } from '../services/api';

// Unit conversion helpers
function celsiusToFahrenheit(c) {
  if (c === null || c === undefined || isNaN(c)) return 'N/A';
  return (c * 1.8 + 32).toFixed(1);
}

function kphToMph(kph) {
  if (kph === null || kph === undefined || isNaN(kph)) return 'N/A';
  return (kph * 0.621371).toFixed(1);
}

// Weather Condition Color / Badge Mapper
function getWeatherBadge(conditionStr) {
  const cond = (conditionStr || '').toLowerCase();
  if (cond.includes('rain') || cond.includes('shower') || cond.includes('drizzle')) {
    return { badgeClass: 'badge-cyan', icon: '🌧️' };
  } else if (cond.includes('snow') || cond.includes('flurry')) {
    return { badgeClass: 'badge-purple', icon: '❄️' };
  } else if (cond.includes('thunder') || cond.includes('storm')) {
    return { badgeClass: 'badge-amber', icon: '🌩️' };
  } else if (cond.includes('clear') || cond.includes('sun') || cond.includes('fair')) {
    return { badgeClass: 'badge-amber', icon: '☀️' };
  } else {
    return { badgeClass: 'badge-purple', icon: '⛅' };
  }
}

function getIconUrl(iconField, rawIcon) {
  const file = rawIcon || iconField;
  if (!file) return null;
  if (file.startsWith('http')) return file.replace('cdn.xweather.com/icons', 'cdn.aerisapi.com/wxicons/v2');
  return `https://cdn.aerisapi.com/wxicons/v2/${file}`;
}

export default function WeatherWidget() {
  const [rawData, setRawData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unit, setUnit] = useState('C'); // Default to Metric (°C)
  const [imgErrors, setImgErrors] = useState({});

  const loadData = async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchHamiltonWeather(forceRefresh);
      setRawData(res);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to fetch Xweather forecast telemetry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(false);
  }, []);

  const current = rawData?.current || null;
  const periods = rawData?.periods || [];

  const handleImageError = (key) => {
    setImgErrors(prev => ({ ...prev, [key]: true }));
  };

  const formatTemp = (tempC, tempF) => {
    if (tempC === null || tempC === undefined) return 'N/A';
    if (unit === 'F') {
      const val = tempF !== undefined ? tempF : celsiusToFahrenheit(tempC);
      return `${parseFloat(val).toFixed(1)}°F`;
    }
    return `${parseFloat(tempC).toFixed(1)}°C`;
  };

  const formatSpeed = (kph) => {
    if (kph === null || kph === undefined) return 'N/A';
    if (unit === 'F') return `${kphToMph(kph)} mph`;
    return `${parseFloat(kph).toFixed(1)} km/h`;
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
      {/* Header Banner */}
      <div 
        className="glass-panel"
        style={{
          padding: '1.5rem',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(0, 150, 255, 0.25) 0%, rgba(121, 40, 202, 0.25) 100%)',
          border: '1px solid rgba(0, 229, 255, 0.4)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #0096ff 0%, #00e5ff 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 25px rgba(0, 229, 255, 0.4)'
          }}>
            <CloudSun size={32} color="#fff" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              Hamilton Local 7-Day Weather Report
              <span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>
                {rawData?.source || 'XWEATHER TELEMETRY'}
              </span>
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
              <MapPin size={15} color="var(--accent-cyan)" />
              Location: <strong style={{ color: '#fff' }}>Hamilton, ON, Canada</strong> (Lat: 43.25° N, Lon: -79.87° W)
            </p>
          </div>
        </div>

        {/* Controls: Unit Toggle & Refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.4)', padding: '3px', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
            <button
              onClick={() => setUnit('C')}
              style={{
                padding: '0.4rem 0.8rem',
                borderRadius: '8px',
                border: 'none',
                background: unit === 'C' ? 'rgba(0, 229, 255, 0.25)' : 'transparent',
                color: unit === 'C' ? 'var(--accent-cyan)' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              °C Metric
            </button>
            <button
              onClick={() => setUnit('F')}
              style={{
                padding: '0.4rem 0.8rem',
                borderRadius: '8px',
                border: 'none',
                background: unit === 'F' ? 'rgba(0, 229, 255, 0.25)' : 'transparent',
                color: unit === 'F' ? 'var(--accent-cyan)' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              °F Imperial
            </button>
          </div>

          <button 
            className="btn btn-secondary" 
            onClick={() => loadData(true)}
            disabled={loading}
            style={{ padding: '0.45rem 0.9rem', fontSize: '0.82rem' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <CloudSun size={42} className="animate-spin" color="var(--accent-cyan)" style={{ marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>Loading live Xweather 7-day forecast telemetry for Hamilton, ON...</p>
        </div>
      ) : error ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem 1.5rem', borderColor: 'var(--accent-red)' }}>
          <Info size={36} color="var(--accent-red)" style={{ marginBottom: '1rem' }} />
          <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '0.5rem' }}>Unable to load Hamilton Weather</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.2rem' }}>{error}</p>
          <button className="btn btn-primary" onClick={() => loadData(true)}>Retry API Fetch</button>
        </div>
      ) : !current ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
          <Info size={36} color="var(--text-dim)" style={{ marginBottom: '1rem' }} />
          <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '0.4rem' }}>No Weather Telemetry Returned</h3>
        </div>
      ) : (
        <>
          {/* Current Conditions Card */}
          <div 
            className="glass-card animate-fade-in"
            style={{
              padding: '1.8rem',
              border: '1px solid var(--accent-cyan)',
              boxShadow: '0 0 30px rgba(0, 229, 255, 0.15)',
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                  <span className="badge badge-cyan" style={{ fontSize: '0.8rem' }}>
                    LIVE CURRENT CONDITIONS
                  </span>
                  <span className={`badge ${getWeatherBadge(current.weather).badgeClass}`} style={{ fontSize: '0.75rem' }}>
                    {getWeatherBadge(current.weather).icon} {current.weather.toUpperCase()}
                  </span>
                </div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>
                  Hamilton Current Weather — {current.weather}
                </h3>
              </div>

              {rawData && (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.3)', padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <ShieldCheck size={14} color="var(--accent-green)" />
                  <span>{rawData.isLocalStorageCached ? '30m LocalStorage Cache' : 'Fresh Telemetry'}</span>
                </div>
              )}
            </div>

            {/* Metrics 4-Column Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.2rem' }}>
              {/* Temperature */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.2rem', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem', fontWeight: 700 }}>
                  <Thermometer size={16} color="var(--accent-cyan)" /> CURRENT TEMPERATURE
                </div>
                <div style={{ fontSize: '2.1rem', fontWeight: 800, color: '#00e5ff', margin: '0.2rem 0' }}>
                  {formatTemp(current.tempC, current.tempF)}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Feels like: <strong style={{ color: '#fff' }}>{formatTemp(current.feelslikeC, current.feelslikeF)}</strong>
                </div>
              </div>

              {/* Wind Speed & Direction */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.2rem', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem', fontWeight: 700 }}>
                  <Wind size={16} color="var(--accent-green)" /> WIND SPEED
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-green)', margin: '0.2rem 0' }}>
                  {formatSpeed(current.windSpeedKPH)}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Direction: <strong style={{ color: '#fff' }}>{current.windDir || 'WNW'}</strong>
                </div>
              </div>

              {/* Humidity */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.2rem', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem', fontWeight: 700 }}>
                  <Droplets size={16} color="#c084fc" /> RELATIVE HUMIDITY
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#c084fc', margin: '0.2rem 0' }}>
                  {current.humidity !== undefined ? `${current.humidity}%` : 'N/A'}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Barometer: <strong style={{ color: '#fff' }}>{current.pressureMB ? `${current.pressureMB} mb` : '1014 mb'}</strong>
                </div>
              </div>

              {/* UV / Rain */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.2rem', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem', fontWeight: 700 }}>
                  <Sun size={16} color="var(--accent-amber)" /> UV INDEX & PRECIP
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-amber)', margin: '0.2rem 0' }}>
                  {current.uv !== undefined ? `UV ${current.uv}` : 'Moderate'}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Precip Probability: <strong style={{ color: '#fff' }}>{periods[0]?.pop || 0}%</strong>
                </div>
              </div>
            </div>
          </div>

          {/* 7-Day Forecast Grid */}
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={18} color="var(--accent-cyan)" />
              7-Day Daily Forecast Overview ({periods.length} Days)
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.9rem' }}>
              {periods.map((p, idx) => {
                const dateObj = new Date(p.dateTimeISO || p.validTime || Date.now());
                const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                const badge = getWeatherBadge(p.weather);
                const iconUrl = getIconUrl(p.icon, p.rawIcon);
                const isErr = imgErrors[idx];

                return (
                  <div 
                    key={idx}
                    style={{
                      background: idx === 0 ? 'rgba(0, 229, 255, 0.08)' : 'rgba(255,255,255,0.03)',
                      border: idx === 0 ? '1px solid var(--accent-cyan)' : '1px solid var(--border-glass)',
                      padding: '1rem 0.8rem',
                      borderRadius: '12px',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.4rem',
                      alignItems: 'center'
                    }}
                  >
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: idx === 0 ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
                      {idx === 0 ? 'Today' : dayName}
                    </span>

                    {iconUrl && !isErr ? (
                      <img 
                        src={iconUrl} 
                        alt={p.weather} 
                        onError={() => handleImageError(idx)}
                        style={{ width: '48px', height: '48px', objectFit: 'contain', margin: '0.2rem 0', filter: 'drop-shadow(0 0 6px rgba(0, 229, 255, 0.3))' }} 
                      />
                    ) : (
                      <span style={{ fontSize: '2rem', margin: '0.2rem 0' }}>{badge.icon}</span>
                    )}

                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>
                      {formatTemp(p.maxTempC, p.maxTempF)}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                      Low: {formatTemp(p.minTempC, p.minTempF)}
                    </div>

                    <span className={`badge ${badge.badgeClass}`} style={{ fontSize: '0.65rem', marginTop: '0.3rem' }}>
                      {p.weather}
                    </span>

                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.2rem' }}>
                      <Umbrella size={12} color="var(--accent-cyan)" /> {p.pop}% ({p.precipMM}mm)
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detailed Forecast Table */}
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Thermometer size={18} color="var(--accent-cyan)" />
              Detailed 7-Day Forecast Telemetry Table
            </h3>

            <div className="table-container">
              <table className="torrent-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Condition</th>
                    <th>Max Temp</th>
                    <th>Min Temp</th>
                    <th>Rain Prob (%)</th>
                    <th>Precip (mm)</th>
                    <th>Max Wind</th>
                    <th>UV Index</th>
                  </tr>
                </thead>
                <tbody>
                  {periods.map((p, idx) => {
                    const dateObj = new Date(p.dateTimeISO || p.validTime || Date.now());
                    const fullDateStr = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
                    const badge = getWeatherBadge(p.weather);

                    return (
                      <tr key={idx}>
                        <td style={{ fontWeight: 700, color: '#fff' }}>
                          {fullDateStr}
                        </td>
                        <td>
                          <span className={`badge ${badge.badgeClass}`}>
                            {badge.icon} {p.weather}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--accent-amber)' }}>
                          {formatTemp(p.maxTempC, p.maxTempF)}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                          {formatTemp(p.minTempC, p.minTempF)}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: '#fff' }}>
                          {p.pop}%
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                          {p.precipMM} mm
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-green)' }}>
                          {formatSpeed(p.windSpeedKPH)}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: '#c084fc' }}>
                          UV {p.uv}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
