import React, { useState, useEffect } from 'react';
import { Thermometer, Wind, Gauge, Calendar, RefreshCw, Sun, Compass, Info, ShieldCheck, Flame, Eye } from 'lucide-react';
import { fetchMarsWeather } from '../services/api';

// Unit conversion helpers
function celsiusToFahrenheit(c) {
  if (c === null || c === undefined || c === '' || isNaN(c)) return 'N/A';
  return ((parseFloat(c) * 9) / 5 + 32).toFixed(1);
}

export default function MarsWidget() {
  const [rawData, setRawData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unit, setUnit] = useState('C'); // 'C' or 'F'

  const loadData = async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchMarsWeather(forceRefresh);
      setRawData(res);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to fetch NASA Mars weather telemetry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(false);
  }, []);

  // Process Curiosity Sols
  const solesList = React.useMemo(() => {
    if (!rawData || !Array.isArray(rawData.soles)) return [];
    return rawData.soles;
  }, [rawData]);

  const latestSol = solesList.length > 0 ? solesList[0] : null;

  // Format Temperature
  const formatTemp = (val) => {
    if (val === null || val === undefined || val === '' || val === '--' || isNaN(val)) return 'N/A';
    const num = parseFloat(val);
    if (unit === 'F') return `${celsiusToFahrenheit(num)}°F`;
    return `${num.toFixed(1)}°C`;
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem' }}>
      {/* Section Header Banner */}
      <div className="section-banner-card">
        <img src="/banners/banner-mars.jpg" alt="NASA Curiosity Rover Live Telemetry" />
      </div>

      {/* Header Bar */}
      <div 
        className="glass-panel"
        style={{
          padding: '1.5rem',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(255, 69, 0, 0.25) 0%, rgba(139, 0, 0, 0.3) 100%)',
          border: '1px solid rgba(255, 69, 0, 0.4)',
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
            background: 'linear-gradient(135deg, #ff4500 0%, #8b0000 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 25px rgba(255, 69, 0, 0.5)'
          }}>
            <Flame size={30} color="#fff" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              NASA Curiosity Rover Live Telemetry
              <span className="badge badge-amber" style={{ fontSize: '0.7rem' }}>ACTIVE 2026</span>
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Location: <strong style={{ color: '#fff' }}>Gale Crater, Mars</strong> (Lat: 4.5° S, Lon: 137.4° E)
            </p>
          </div>
        </div>

        {/* Controls: Unit Toggle & Refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
          {/* Unit Toggle */}
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.4)', padding: '3px', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
            <button
              onClick={() => setUnit('C')}
              style={{
                padding: '0.4rem 0.8rem',
                borderRadius: '8px',
                border: 'none',
                background: unit === 'C' ? 'rgba(255, 69, 0, 0.3)' : 'transparent',
                color: unit === 'C' ? '#ff6b35' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              °C (Metric)
            </button>
            <button
              onClick={() => setUnit('F')}
              style={{
                padding: '0.4rem 0.8rem',
                borderRadius: '8px',
                border: 'none',
                background: unit === 'F' ? 'rgba(255, 69, 0, 0.3)' : 'transparent',
                color: unit === 'F' ? '#ff6b35' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              °F (Imperial)
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
          <Flame size={42} className="animate-spin" color="#ff4500" style={{ marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>Receiving live active weather telemetry from NASA Curiosity Rover...</p>
        </div>
      ) : error ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem 1.5rem', borderColor: 'var(--accent-red)' }}>
          <Info size={36} color="var(--accent-red)" style={{ marginBottom: '1rem' }} />
          <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '0.5rem' }}>Unable to load NASA Mars Weather Telemetry</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.2rem' }}>{error}</p>
          <button className="btn btn-primary" onClick={() => loadData(true)}>Retry API Fetch</button>
        </div>
      ) : !latestSol ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
          <Info size={36} color="var(--text-dim)" style={{ marginBottom: '1rem' }} />
          <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '0.4rem' }}>No Active Sol Data Returned</h3>
        </div>
      ) : (
        <>
          {/* Featured Latest Sol Dashboard */}
          <div 
            className="glass-card animate-fade-in"
            style={{
              padding: '1.8rem',
              border: '1px solid rgba(255, 69, 0, 0.4)',
              boxShadow: '0 0 30px rgba(255, 69, 0, 0.15)',
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                  <span className="badge badge-amber" style={{ fontSize: '0.8rem', background: 'rgba(255, 69, 0, 0.2)', border: '1px solid #ff4500', color: '#ff6b35' }}>
                    SOL {latestSol.sol}
                  </span>
                  <span className="badge badge-purple" style={{ fontSize: '0.75rem' }}>
                    SEASON: {(latestSol.season || 'Month 11').toUpperCase()}
                  </span>
                  <span className="badge badge-green" style={{ fontSize: '0.75rem' }}>
                    SKY: {latestSol.atmo_opacity || 'Sunny'}
                  </span>
                </div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff' }}>
                  Martian Active Weather Report — Sol {latestSol.sol}
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Terrestrial Date: <strong style={{ color: '#fff' }}>{latestSol.terrestrial_date}</strong> • Sol Solar Longitude: <strong>{latestSol.ls}°</strong>
                </p>
              </div>

              {rawData && (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.3)', padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <ShieldCheck size={14} color="var(--accent-green)" />
                  <span>{rawData.isLocalStorageCached ? 'LocalStorage Cache' : 'Fresh Telemetry'} (6h TTL)</span>
                </div>
              )}
            </div>

            {/* Metrics 4-Column Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.2rem' }}>
              {/* Air Temperature */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.2rem', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem', fontWeight: 700 }}>
                  <Thermometer size={16} color="#ff4500" /> AIR TEMP (MIN / MAX)
                </div>

                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ff6b35', margin: '0.3rem 0' }}>
                  {formatTemp(latestSol.max_temp)}
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '0.4rem' }}>Max</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.8rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.6rem' }}>
                  <span>Min Air: <strong style={{ color: 'var(--accent-cyan)' }}>{formatTemp(latestSol.min_temp)}</strong></span>
                </div>
              </div>

              {/* Ground Temperature */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.2rem', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem', fontWeight: 700 }}>
                  <Sun size={16} color="var(--accent-amber)" /> GROUND TEMP (GTS)
                </div>

                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-amber)', margin: '0.3rem 0' }}>
                  {formatTemp(latestSol.max_gts_temp)}
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '0.4rem' }}>Max</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.8rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.6rem' }}>
                  <span>Min Ground: <strong style={{ color: 'var(--accent-cyan)' }}>{formatTemp(latestSol.min_gts_temp)}</strong></span>
                </div>
              </div>

              {/* Atmospheric Pressure */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.2rem', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem', fontWeight: 700 }}>
                  <Gauge size={16} color="#c084fc" /> ATMOSPHERIC PRESSURE
                </div>

                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#c084fc', margin: '0.3rem 0' }}>
                  {latestSol.pressure} Pa
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '0.4rem' }}>{latestSol.pressure_string || 'Higher'}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.8rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.6rem' }}>
                  <span>UV Index: <strong style={{ color: 'var(--accent-green)' }}>{latestSol.local_uv_irradiance_index || 'Moderate'}</strong></span>
                </div>
              </div>

              {/* Sunrise & Sunset */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.2rem', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem', fontWeight: 700 }}>
                  <Compass size={16} color="var(--accent-green)" /> SOLAR DAY CYCLE
                </div>

                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', margin: '0.3rem 0' }}>
                  🌅 {latestSol.sunrise} / 🌇 {latestSol.sunset}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.8rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.6rem' }}>
                  <span>Atmosphere: <strong style={{ color: 'var(--accent-amber)' }}>{latestSol.atmo_opacity || 'Clear'}</strong></span>
                </div>
              </div>
            </div>
          </div>

          {/* Multi-Sol Forecast Table */}
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={18} color="#ff4500" />
              NASA Curiosity Active Sols Weather Log ({solesList.length} Active Sols Logged)
            </h3>

            <div className="table-container">
              <table className="torrent-table">
                <thead>
                  <tr>
                    <th>Martian Sol</th>
                    <th>Earth Date</th>
                    <th>Air Temp Range (High / Low)</th>
                    <th>Ground Temp Range</th>
                    <th>Sky / Opacity</th>
                    <th>UV Irradiance</th>
                    <th>Pressure (Pa)</th>
                    <th>Sunrise / Sunset</th>
                  </tr>
                </thead>
                <tbody>
                  {solesList.map((solItem) => (
                    <tr key={solItem.id || solItem.sol}>
                      <td style={{ fontWeight: 800, color: '#ff6b35' }}>
                        Sol {solItem.sol}
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {solItem.terrestrial_date}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#fff' }}>
                        {formatTemp(solItem.max_temp)} / {formatTemp(solItem.min_temp)}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--accent-amber)' }}>
                        {formatTemp(solItem.max_gts_temp)} / {formatTemp(solItem.min_gts_temp)}
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--accent-green)' }}>
                        {solItem.atmo_opacity || 'Sunny'}
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)' }}>
                        {solItem.local_uv_irradiance_index || 'Moderate'}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#c084fc' }}>
                        {solItem.pressure} Pa
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        {solItem.sunrise} / {solItem.sunset}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
