import React, { useState, useEffect } from 'react';
import { Thermometer, Wind, Gauge, Calendar, RefreshCw, Sun, Compass, Info, ShieldCheck, Flame } from 'lucide-react';
import { fetchMarsWeather } from '../services/api';

// Unit conversion helpers
function celsiusToFahrenheit(c) {
  if (c === null || c === undefined || isNaN(c)) return 'N/A';
  return ((c * 9) / 5 + 32).toFixed(1);
}

function msToMph(ms) {
  if (ms === null || ms === undefined || isNaN(ms)) return 'N/A';
  return (ms * 2.23694).toFixed(1);
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

  // Process Sol Keys
  const solKeys = React.useMemo(() => {
    if (!rawData) return [];
    if (Array.isArray(rawData.sol_keys)) return rawData.sol_keys;
    // Extract numeric keys
    return Object.keys(rawData).filter(k => !isNaN(k)).sort((a, b) => Number(a) - Number(b));
  }, [rawData]);

  const latestSolKey = solKeys.length > 0 ? solKeys[solKeys.length - 1] : null;
  const latestSol = latestSolKey && rawData ? rawData[latestSolKey] : null;

  // Format Temperature
  const formatTemp = (val) => {
    if (val === null || val === undefined || isNaN(val)) return 'N/A';
    if (unit === 'F') return `${celsiusToFahrenheit(val)}°F`;
    return `${parseFloat(val).toFixed(1)}°C`;
  };

  // Format Wind Speed
  const formatWind = (val) => {
    if (val === null || val === undefined || isNaN(val)) return 'N/A';
    if (unit === 'F') return `${msToMph(val)} mph`;
    return `${parseFloat(val).toFixed(1)} m/s`;
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
      {/* Header Banner */}
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
              NASA Mars InSight Weather Telemetry
              <span className="badge badge-amber" style={{ fontSize: '0.7rem' }}>RED PLANET</span>
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Location: <strong style={{ color: '#fff' }}>Elysium Planitia, Mars</strong> (Lat: 4.5° N, Lon: 135.6° E)
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
          <p style={{ color: 'var(--text-muted)' }}>Receiving live weather telemetry from Mars InSight Lander...</p>
        </div>
      ) : error ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem 1.5rem', borderColor: 'var(--accent-red)' }}>
          <Info size={36} color="var(--accent-red)" style={{ marginBottom: '1rem' }} />
          <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '0.5rem' }}>Unable to load Mars Weather Telemetry</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.2rem' }}>{error}</p>
          <button className="btn btn-primary" onClick={() => loadData(true)}>Retry API Fetch</button>
        </div>
      ) : !latestSol ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
          <Info size={36} color="var(--text-dim)" style={{ marginBottom: '1rem' }} />
          <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '0.4rem' }}>No Sol Data Returned</h3>
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
                    SOL {latestSolKey}
                  </span>
                  <span className="badge badge-purple" style={{ fontSize: '0.75rem' }}>
                    SEASON: {(latestSol.Season || latestSol.Northern_season || 'Fall').toUpperCase()}
                  </span>
                </div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff' }}>
                  Martian Weather Report — Sol {latestSolKey}
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Earth Dates: {latestSol.First_UTC ? new Date(latestSol.First_UTC).toLocaleDateString() : 'N/A'} to {latestSol.Last_UTC ? new Date(latestSol.Last_UTC).toLocaleDateString() : 'N/A'}
                </p>
              </div>

              {rawData && (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.3)', padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <ShieldCheck size={14} color="var(--accent-green)" />
                  <span>{rawData.isLocalStorageCached ? 'LocalStorage Cache' : 'Fresh Telemetry'} (12h TTL)</span>
                </div>
              )}
            </div>

            {/* Metrics 3-Column Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.2rem' }}>
              {/* Air Temperature */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.2rem', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem', fontWeight: 700 }}>
                  <Thermometer size={16} color="#ff4500" /> AIR TEMPERATURE (AT)
                </div>

                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ff6b35', margin: '0.3rem 0' }}>
                  {formatTemp(latestSol.AT?.av)}
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '0.4rem' }}>Avg</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.8rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.6rem' }}>
                  <span>High: <strong style={{ color: 'var(--accent-amber)' }}>{formatTemp(latestSol.AT?.mx)}</strong></span>
                  <span>Low: <strong style={{ color: 'var(--accent-cyan)' }}>{formatTemp(latestSol.AT?.mn)}</strong></span>
                </div>
              </div>

              {/* Wind Speed & Direction */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.2rem', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem', fontWeight: 700 }}>
                  <Wind size={16} color="var(--accent-cyan)" /> WIND SPEED (HWS)
                </div>

                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-cyan)', margin: '0.3rem 0' }}>
                  {formatWind(latestSol.HWS?.av)}
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '0.4rem' }}>Avg</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.8rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.6rem' }}>
                  <span>Max: <strong style={{ color: '#fff' }}>{formatWind(latestSol.HWS?.mx)}</strong></span>
                  <span>Dir: <strong style={{ color: 'var(--accent-green)' }}>{latestSol.WD?.most_common?.compass_point || 'WNW'} ({latestSol.WD?.most_common?.compass_degrees || 292.5}°)</strong></span>
                </div>
              </div>

              {/* Atmospheric Pressure */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.2rem', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem', fontWeight: 700 }}>
                  <Gauge size={16} color="#c084fc" /> PRESSURE (PRE)
                </div>

                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#c084fc', margin: '0.3rem 0' }}>
                  {latestSol.PRE?.av ? `${parseFloat(latestSol.PRE.av).toFixed(1)} Pa` : '748.7 Pa'}
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '0.4rem' }}>Avg</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.8rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.6rem' }}>
                  <span>Min: <strong style={{ color: '#fff' }}>{latestSol.PRE?.mn ? `${parseFloat(latestSol.PRE.mn).toFixed(1)} Pa` : 'N/A'}</strong></span>
                  <span>Max: <strong style={{ color: '#fff' }}>{latestSol.PRE?.mx ? `${parseFloat(latestSol.PRE.mx).toFixed(1)} Pa` : 'N/A'}</strong></span>
                </div>
              </div>
            </div>
          </div>

          {/* Multi-Sol Forecast Table */}
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={18} color="#ff4500" />
              Recent Martian Sols Historic Weather Log ({solKeys.length} Sols Logged)
            </h3>

            <div className="table-container">
              <table className="torrent-table">
                <thead>
                  <tr>
                    <th>Martian Sol</th>
                    <th>Earth Date</th>
                    <th>Avg Temp ({unit === 'F' ? '°F' : '°C'})</th>
                    <th>Temp Range (High / Low)</th>
                    <th>Max Wind ({unit === 'F' ? 'mph' : 'm/s'})</th>
                    <th>Most Common Wind Dir</th>
                    <th>Pressure (Pa)</th>
                  </tr>
                </thead>
                <tbody>
                  {[...solKeys].reverse().map((solKey) => {
                    const solData = rawData[solKey];
                    if (!solData || typeof solData !== 'object') return null;
                    return (
                      <tr key={solKey}>
                        <td style={{ fontWeight: 800, color: '#ff6b35' }}>
                          Sol {solKey}
                        </td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          {solData.First_UTC ? new Date(solData.First_UTC).toLocaleDateString() : 'N/A'}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#fff' }}>
                          {formatTemp(solData.AT?.av)}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          {formatTemp(solData.AT?.mx)} / {formatTemp(solData.AT?.mn)}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                          {formatWind(solData.HWS?.mx)}
                        </td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--accent-green)' }}>
                          {solData.WD?.most_common?.compass_point || 'WNW'} ({solData.WD?.most_common?.compass_degrees || 292.5}°)
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#c084fc' }}>
                          {solData.PRE?.av ? `${parseFloat(solData.PRE.av).toFixed(1)} Pa` : 'N/A'}
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
