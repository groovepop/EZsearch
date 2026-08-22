import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Layers, Check } from 'lucide-react';

const APPS = [
  { id: 'tv', name: 'TV Shows (EZTV)', banner: '/banners/banner-eztv.jpg', color: 'var(--accent-cyan)', badge: 'EZTV' },
  { id: 'movies', name: 'Movies (YTS)', banner: '/banners/banner-yts.jpg', color: '#ff0080', badge: 'YTS 4K' },
  { id: 'tpb', name: 'The Pirate Bay', banner: '/banners/banner-piratebay.jpg', color: '#00e5ff', badge: 'TPB' },
  { id: 'weather', name: 'Hamilton Weather', banner: '/banners/banner-weather.jpg', color: '#0096ff', badge: 'WEATHER' },
  { id: 'iss', name: 'ISS Tracker', banner: '/banners/banner-iss.jpg', color: '#00e676', badge: 'ORBIT' },
  { id: 'mars', name: 'Mars Curiosity', banner: '/banners/banner-mars.jpg', color: '#ff6b35', badge: 'MARS' },
  { id: 'groovepop', name: 'Groove Pop', banner: '/banners/banner-groovepop.jpg', color: '#ff55b0', badge: 'AI STYLES' },
  { id: 'dev', name: 'GrooveDev V3', banner: '/banners/banner-dev.jpg', color: '#00e5ff', badge: 'DEV V3' },
  { id: 'vibeq', name: 'VibeQ Music', banner: '/banners/banner-vibeq.jpg', color: '#ff007a', badge: 'MUSIC' },
  { id: 'chat', name: 'EZ Assistant', banner: '/banners/banner-ezchat.jpg', color: '#00e5ff', badge: 'GPT-4o' },
  { id: 'grok', name: 'EZ Grok', banner: '/banners/banner-grok.jpg', color: '#ff2d55', badge: 'GROK 4' },
  { id: 'deepseek', name: 'EZ DeepSeek', banner: '/banners/banner-ds4.jpg', color: '#00e5ff', badge: 'DEEPSEEK V4' },
  { id: 'guessface', name: 'GuessFace', banner: '/banners/banner-guessface.jpg', color: '#ffd700', badge: 'GAME' },
];

export default function CategoryTabs({ activeCategory, setCategory }) {
  const [isOpen, setIsOpen] = useState(true);

  const activeApp = APPS.find(a => a.id === activeCategory) || APPS[0];

  return (
    <nav className="collapsible-nav-card glass-panel animate-fade-in" aria-label="App Navigation Hub">
      {/* Collapsible Header Bar */}
      <div 
        className="collapsible-nav-header"
        onClick={() => setIsOpen(prev => !prev)}
        title={isOpen ? 'Click to collapse navigation menu' : 'Click to expand 13-app navigation menu'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #00e5ff 0%, #7928ca 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 10px rgba(0, 229, 255, 0.35)'
          }}>
            <Layers size={15} color="#fff" />
          </div>
          <div>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#fff' }}>
              App Hub
            </span>
            <span className="badge badge-purple" style={{ fontSize: '0.62rem', marginLeft: '0.45rem', padding: '0.15rem 0.45rem' }}>
              13 ENGINES
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: '0.75rem', paddingLeft: '0.75rem', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Active:</span>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: activeApp.color || 'var(--accent-cyan)' }}>
              {activeApp.name}
            </span>
          </div>
        </div>

        <button
          className="btn-icon"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '0.3rem 0.7rem',
            borderRadius: '20px',
            fontSize: '0.75rem',
            fontWeight: 700,
            color: 'var(--text-muted)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            cursor: 'pointer'
          }}
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(prev => !prev);
          }}
        >
          <span>{isOpen ? 'Collapse' : 'Expand All 13'}</span>
          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Collapsible 13-App Grid (75% compact size) */}
      {isOpen && (
        <div className="collapsible-nav-grid">
          {APPS.map((app) => {
            const isActive = activeCategory === app.id;
            return (
              <button
                key={app.id}
                onClick={() => setCategory(app.id)}
                className={`collapsible-tab-btn ${isActive ? 'active' : ''}`}
                style={{
                  borderColor: isActive ? (app.color || 'var(--accent-cyan)') : undefined,
                  boxShadow: isActive ? `0 0 16px ${app.color || 'rgba(0, 229, 255, 0.4)'}` : undefined
                }}
                title={app.name}
                aria-label={app.name}
              >
                <img 
                  src={app.banner} 
                  alt={app.name} 
                  className="tab-banner-img" 
                  style={{
                    objectFit: 'contain',
                    background: '#04060c'
                  }}
                />
                {isActive && (
                  <div 
                    style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background: app.color || 'var(--accent-cyan)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 0 8px rgba(0,0,0,0.8)'
                    }}
                  >
                    <Check size={10} color="#000" strokeWidth={3} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </nav>
  );
}



