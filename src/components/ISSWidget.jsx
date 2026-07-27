import React, { useState, useEffect } from 'react';
import { Orbit, Compass, Clock, Sparkles, RefreshCw, MapPin, Eye, Zap, Info, ShieldCheck, Sun } from 'lucide-react';
import { fetchISSPasses } from '../services/api';

// Helper: Elevation Category Mapping
function getElevationCategory(deg) {
  const el = parseFloat(deg || 0);
  if (el >= 61) {
    return { label: 'Spectacular Overhead View', badgeClass: 'badge-amber', glow: true, icon: '🌟' };
  } else if (el >= 46) {
    return { label: 'Great View', badgeClass: 'badge-purple', glow: false, icon: '✨' };
  } else {
    return { label: 'Good View', badgeClass: 'badge-cyan', glow: false, icon: '🔭' };
  }
}

// Helper: Format date to local time string
function formatLocalTime(isoStr) {
  if (!isoStr) return 'N/A';
  const d = new Date(isoStr);
  return d.toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

// Helper: Format duration seconds
function formatDuration(sec) {
  const s = parseInt(sec || 0, 10);
  const mins = Math.floor(s / 60);
  const remainder = s % 60;
  return `${mins}m ${remainder}s`;
}

export default function ISSWidget() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [countdown, setCountdown] = useState('');

  const loadData = async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchISSPasses(forceRefresh);
      setData(res);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to fetch ISS pass predictions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(false);
  }, []);

  // Countdown to next culmination
  useEffect(() => {
    if (!data || !data.passes || data.passes.length === 0) return;
    const nextPass = data.passes[0];
    const targetTime = new Date(nextPass.culmination?.time || nextPass.rise?.time).getTime();

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = targetTime - now;

      if (diff <= 0) {
        setCountdown('Pass is occurring right now! Look up! 🛰️');
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const mins = Math.floor((diff / (1000 * 60)) % 60);
        const secs = Math.floor((diff / 1000) % 60);
        setCountdown(`${days > 0 ? `${days}d ` : ''}${hours}h ${mins}m ${secs}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [data]);

  const passes = data?.passes || [];
  const nextPass = passes[0];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
      {/* Header Banner */}
      <div 
        className="glass-panel"
        style={{
          padding: '1.5rem',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(10, 108, 187, 0.25) 0%, rgba(121, 40, 202, 0.25) 100%)',
          border: '1px solid rgba(0, 229, 255, 0.3)',
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
            background: 'linear-gradient(135deg, #0a6cbb 0%, #00e5ff 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 25px rgba(0, 229, 255, 0.4)'
          }}>
            <Orbit size={30} color="#fff" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              ISS Space Station Tracker
              <span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>7-DAY FORECAST</span>
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
              <MapPin size={15} color="var(--accent-cyan)" />
              Location: <strong style={{ color: '#fff' }}>Hamilton, ON</strong> (Lat: 43.25°, Lon: -79.87°)
            </p>
          </div>
        </div>

        {/* Cache status & Refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {data && (
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.3)', padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ShieldCheck size={14} color="var(--accent-green)" />
              <span>{data.isLocalStorageCached ? 'LocalStorage Cache' : 'Fresh Fetch'} (24h TTL)</span>
            </div>
          )}

          <button 
            className="btn btn-secondary" 
            onClick={() => loadData(true)}
            disabled={loading}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Force Refresh</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <Orbit size={42} className="animate-spin" color="var(--accent-cyan)" style={{ marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>Calculating orbital passes for Hamilton, ON...</p>
        </div>
      ) : error ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem 1.5rem', borderColor: 'var(--accent-red)' }}>
          <Info size={36} color="var(--accent-red)" style={{ marginBottom: '1rem' }} />
          <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '0.5rem' }}>Unable to load ISS Pass Data</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.2rem' }}>{error}</p>
          <button className="btn btn-primary" onClick={() => loadData(true)}>Retry API Fetch</button>
        </div>
      ) : passes.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
          <Sparkles size={36} color="var(--accent-amber)" style={{ marginBottom: '1rem' }} />
          <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '0.4rem' }}>No Visible Passes in Next 7 Days</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', maxWidth: '500px', margin: '0 auto' }}>
            There are no high-visibility passes (&gt;30° elevation during twilight/night) over Hamilton, ON in the next 7 days. Check back soon for updated orbit predictions!
          </p>
        </div>
      ) : (
        <>
          {/* Featured Next Pass Card */}
          {nextPass && (
            <div 
              className="glass-card animate-fade-in"
              style={{
                padding: '1.8rem',
                border: '1px solid var(--accent-cyan)',
                boxShadow: '0 0 30px rgba(0, 229, 255, 0.15)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.2rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                    <span className="badge badge-green" style={{ fontSize: '0.75rem' }}>NEXT UPCOMING PASS</span>
                    {(() => {
                      const cat = getElevationCategory(nextPass.culmination?.elevation_deg);
                      return (
                        <span className={`badge ${cat.badgeClass}`} style={{ fontSize: '0.75rem' }}>
                          {cat.icon} {cat.label} ({nextPass.culmination?.elevation_deg}° Peak)
                        </span>
                      );
                    })()}
                  </div>

                  <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>
                    {formatLocalTime(nextPass.culmination?.time || nextPass.rise?.time)}
                  </h3>
                </div>

                {/* Countdown display */}
                <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(0,229,255,0.3)', padding: '0.6rem 1.2rem', borderRadius: '12px', textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>COUNTDOWN TO PASS</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                    {countdown || 'Calculating...'}
                  </div>
                </div>
              </div>

              {/* Data Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                {/* Viewing Time */}
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.9rem', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
                    <Clock size={14} color="var(--accent-cyan)" /> MAIN VIEWING TIME
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>
                    {formatLocalTime(nextPass.culmination?.time)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                    Duration: {formatDuration(nextPass.visible_duration_sec || nextPass.duration_sec)}
                  </div>
                </div>

                {/* Max Elevation */}
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.9rem', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
                    <Eye size={14} color="#c084fc" /> MAX ELEVATION
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                    {nextPass.culmination?.elevation_deg}° Peak
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    {getElevationCategory(nextPass.culmination?.elevation_deg).label}
                  </div>
                </div>

                {/* Magnitude & Brightness */}
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.9rem', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
                    <Sparkles size={14} color="var(--accent-amber)" /> BRIGHTNESS (MAGNITUDE)
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-amber)' }}>
                    {nextPass.magnitude !== undefined ? `${nextPass.magnitude} mag` : '-3.0 mag (Extremely Bright)'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.2rem' }} title="Negative numbers indicate extreme star brightness">
                    ℹ️ Negative magnitude = brighter star
                  </div>
                </div>

                {/* Compass Trajectory */}
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.9rem', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
                    <Compass size={14} color="var(--accent-green)" /> COMPASS TRAJECTORY
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>
                    {nextPass.rise?.compass || 'W'} → {nextPass.set?.compass || 'E'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                    Rise: {nextPass.rise?.azimuth_deg}° | Set: {nextPass.set?.azimuth_deg}°
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 7-Day Passes Table */}
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={18} color="var(--accent-cyan)" /> 
              Full 7-Day Visible Passes Forecast ({passes.length} Passes Found)
            </h3>

            <div className="table-container">
              <table className="torrent-table">
                <thead>
                  <tr>
                    <th>Viewing Date & Time (Local)</th>
                    <th>Peak Elevation</th>
                    <th>Quality</th>
                    <th>Brightness (Mag)</th>
                    <th>Direction (Rise → Set)</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {passes.map((pass, idx) => {
                    const cat = getElevationCategory(pass.culmination?.elevation_deg);
                    return (
                      <tr key={idx}>
                        <td style={{ fontWeight: 700, color: '#fff' }}>
                          {formatLocalTime(pass.culmination?.time || pass.rise?.time)}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                          {pass.culmination?.elevation_deg}°
                        </td>
                        <td>
                          <span className={`badge ${cat.badgeClass}`}>
                            {cat.icon} {cat.label}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-amber)', fontWeight: 600 }}>
                          {pass.magnitude !== undefined ? `${pass.magnitude} mag` : 'Very Bright'}
                        </td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          {pass.rise?.compass} ({pass.rise?.azimuth_deg}°) → {pass.set?.compass} ({pass.set?.azimuth_deg}°)
                        </td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          {formatDuration(pass.visible_duration_sec || pass.duration_sec)}
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
