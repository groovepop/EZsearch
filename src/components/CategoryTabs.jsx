import React from 'react';
import { Tv, Film, Anchor, Orbit, Flame } from 'lucide-react';

export default function CategoryTabs({ activeCategory, setCategory }) {
  return (
    <div style={{ display: 'flex', gap: '0.8rem', marginBottom: '1.2rem', flexWrap: 'wrap' }}>
      <button
        onClick={() => setCategory('tv')}
        className="glass-panel"
        style={{
          flex: 1,
          minWidth: '150px',
          padding: '0.85rem 1.1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.6rem',
          fontWeight: 700,
          fontSize: '0.9rem',
          cursor: 'pointer',
          border: activeCategory === 'tv' ? '1px solid var(--accent-cyan)' : '1px solid var(--border-glass)',
          background: activeCategory === 'tv' ? 'rgba(0, 229, 255, 0.12)' : 'var(--bg-glass)',
          color: activeCategory === 'tv' ? 'var(--accent-cyan)' : 'var(--text-muted)',
          boxShadow: activeCategory === 'tv' ? '0 0 20px rgba(0, 229, 255, 0.2)' : 'none',
          transition: 'all 0.2s ease',
          borderRadius: '12px'
        }}
      >
        <Tv size={18} />
        <span>TV Shows (EZTV)</span>
        <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>SERIES</span>
      </button>

      <button
        onClick={() => setCategory('movies')}
        className="glass-panel"
        style={{
          flex: 1,
          minWidth: '150px',
          padding: '0.85rem 1.1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.6rem',
          fontWeight: 700,
          fontSize: '0.9rem',
          cursor: 'pointer',
          border: activeCategory === 'movies' ? '1px solid #ff0080' : '1px solid var(--border-glass)',
          background: activeCategory === 'movies' ? 'rgba(255, 0, 128, 0.12)' : 'var(--bg-glass)',
          color: activeCategory === 'movies' ? '#ff40a0' : 'var(--text-muted)',
          boxShadow: activeCategory === 'movies' ? '0 0 20px rgba(255, 0, 128, 0.2)' : 'none',
          transition: 'all 0.2s ease',
          borderRadius: '12px'
        }}
      >
        <Film size={18} />
        <span>Movies (YTS)</span>
        <span className="badge badge-amber" style={{ fontSize: '0.65rem' }}>HD / 4K</span>
      </button>

      <button
        onClick={() => setCategory('tpb')}
        className="glass-panel"
        style={{
          flex: 1,
          minWidth: '150px',
          padding: '0.85rem 1.1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.6rem',
          fontWeight: 700,
          fontSize: '0.9rem',
          cursor: 'pointer',
          border: activeCategory === 'tpb' ? '1px solid #00e5ff' : '1px solid var(--border-glass)',
          background: activeCategory === 'tpb' ? 'rgba(0, 229, 255, 0.15)' : 'var(--bg-glass)',
          color: activeCategory === 'tpb' ? '#00e5ff' : 'var(--text-muted)',
          boxShadow: activeCategory === 'tpb' ? '0 0 20px rgba(0, 229, 255, 0.25)' : 'none',
          transition: 'all 0.2s ease',
          borderRadius: '12px'
        }}
      >
        <Anchor size={18} color="#00e5ff" />
        <span>Pirate Bay</span>
        <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>ALL MEDIA</span>
      </button>

      <button
        onClick={() => setCategory('iss')}
        className="glass-panel"
        style={{
          flex: 1,
          minWidth: '140px',
          padding: '0.85rem 1.1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.6rem',
          fontWeight: 700,
          fontSize: '0.9rem',
          cursor: 'pointer',
          border: activeCategory === 'iss' ? '1px solid #00e676' : '1px solid var(--border-glass)',
          background: activeCategory === 'iss' ? 'rgba(0, 230, 118, 0.12)' : 'var(--bg-glass)',
          color: activeCategory === 'iss' ? '#00e676' : 'var(--text-muted)',
          boxShadow: activeCategory === 'iss' ? '0 0 20px rgba(0, 230, 118, 0.2)' : 'none',
          transition: 'all 0.2s ease',
          borderRadius: '12px'
        }}
      >
        <Orbit size={18} />
        <span>ISS Tracker</span>
      </button>

      <button
        onClick={() => setCategory('mars')}
        className="glass-panel"
        style={{
          flex: 1,
          minWidth: '140px',
          padding: '0.85rem 1.1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.6rem',
          fontWeight: 700,
          fontSize: '0.9rem',
          cursor: 'pointer',
          border: activeCategory === 'mars' ? '1px solid #ff4500' : '1px solid var(--border-glass)',
          background: activeCategory === 'mars' ? 'rgba(255, 69, 0, 0.15)' : 'var(--bg-glass)',
          color: activeCategory === 'mars' ? '#ff6b35' : 'var(--text-muted)',
          boxShadow: activeCategory === 'mars' ? '0 0 20px rgba(255, 69, 0, 0.25)' : 'none',
          transition: 'all 0.2s ease',
          borderRadius: '12px'
        }}
      >
        <Flame size={18} color="#ff4500" />
        <span>Mars Weather</span>
      </button>
    </div>
  );
}
