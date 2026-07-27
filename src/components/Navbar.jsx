import React, { useState, useEffect } from 'react';
import { Zap, Film, Tv, Bookmark, ShieldCheck, RefreshCw, Moon } from 'lucide-react';
import { fetchMoonPhase } from '../services/api';

export default function Navbar({ activeTab, setActiveTab, watchlistCount, onRefresh, mirrorUsed, isCached }) {
  const [moonData, setMoonData] = useState(null);

  useEffect(() => {
    fetchMoonPhase()
      .then(data => setMoonData(data))
      .catch(e => console.warn('[Moon Navbar Error]', e));
  }, []);

  let mirrorHostname = '';
  if (mirrorUsed) {
    try {
      if (mirrorUsed.startsWith('http://') || mirrorUsed.startsWith('https://')) {
        mirrorHostname = new URL(mirrorUsed).hostname;
      } else {
        mirrorHostname = mirrorUsed;
      }
    } catch (e) {
      mirrorHostname = mirrorUsed;
    }
  }

  return (
    <header className="glass-panel" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #00e5ff 0%, #7928ca 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 20px rgba(0, 229, 255, 0.4)'
        }}>
          <Zap size={24} color="#fff" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            EZ<span className="gradient-text">Stream</span> Hub
            <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>FAST PROXY</span>
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            EZTV Shows, YTS Movies & Pirate Bay Season Packs
          </p>
        </div>
      </div>

      {/* Center/Right Space: NASA SVS Moon Phase Pill */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        {moonData && moonData.image_url && (
          <div 
            title={`NASA Scientific Visualization Studio Dial-A-Moon (LRO Telemetry)\nIllumination: ${moonData.phase}%\nMoon Age: ${moonData.age} days`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              background: 'rgba(255, 255, 255, 0.04)',
              padding: '0.35rem 0.8rem 0.35rem 0.4rem',
              borderRadius: '24px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 0 15px rgba(255, 255, 255, 0.08)',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              overflow: 'hidden',
              background: '#000',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              boxShadow: '0 0 10px rgba(255, 255, 255, 0.35)',
              flexShrink: 0
            }}>
              <img 
                src={moonData.image_url} 
                alt="NASA Moon Phase"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Moon size={12} color="var(--accent-cyan)" />
                {moonData.phase}% Illuminated
              </span>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                NASA SVS Age: {moonData.age}d
              </span>
            </div>
          </div>
        )}

        {mirrorUsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-dim)', background: 'rgba(255, 255, 255, 0.03)', padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
            <ShieldCheck size={14} color="var(--accent-green)" />
            <span>Mirror: <strong style={{ color: 'var(--text-main)' }}>{mirrorHostname}</strong></span>
            {isCached && <span className="badge badge-purple" style={{ fontSize: '0.6rem', marginLeft: '0.2rem' }}>CACHED</span>}
          </div>
        )}

        <button 
          className="btn btn-secondary" 
          onClick={onRefresh}
          title="Force refresh current list"
          style={{ padding: '0.5rem 0.9rem', fontSize: '0.82rem' }}
        >
          <RefreshCw size={15} />
          <span>Refresh</span>
        </button>

        <button
          className={`btn ${activeTab === 'watchlist' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('watchlist')}
          style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
        >
          <Bookmark size={16} />
          <span>Watchlist</span>
          {watchlistCount > 0 && (
            <span className="badge badge-amber" style={{ borderRadius: '10px', padding: '0.1rem 0.4rem' }}>
              {watchlistCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
