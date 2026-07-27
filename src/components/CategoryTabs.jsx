import React from 'react';
import { Tv, Film, Orbit } from 'lucide-react';

export default function CategoryTabs({ activeCategory, setCategory }) {
  return (
    <div style={{ display: 'flex', gap: '0.8rem', marginBottom: '1.2rem', flexWrap: 'wrap' }}>
      <button
        onClick={() => setCategory('tv')}
        className="glass-panel"
        style={{
          flex: 1,
          minWidth: '180px',
          padding: '0.9rem 1.2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.7rem',
          fontWeight: 700,
          fontSize: '0.95rem',
          cursor: 'pointer',
          border: activeCategory === 'tv' ? '1px solid var(--accent-cyan)' : '1px solid var(--border-glass)',
          background: activeCategory === 'tv' ? 'rgba(0, 229, 255, 0.12)' : 'var(--bg-glass)',
          color: activeCategory === 'tv' ? 'var(--accent-cyan)' : 'var(--text-muted)',
          boxShadow: activeCategory === 'tv' ? '0 0 20px rgba(0, 229, 255, 0.2)' : 'none',
          transition: 'all 0.2s ease',
          borderRadius: '12px'
        }}
      >
        <Tv size={20} />
        <span>TV Shows (EZTV)</span>
        <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>SERIES</span>
      </button>

      <button
        onClick={() => setCategory('movies')}
        className="glass-panel"
        style={{
          flex: 1,
          minWidth: '180px',
          padding: '0.9rem 1.2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.7rem',
          fontWeight: 700,
          fontSize: '0.95rem',
          cursor: 'pointer',
          border: activeCategory === 'movies' ? '1px solid #ff0080' : '1px solid var(--border-glass)',
          background: activeCategory === 'movies' ? 'rgba(255, 0, 128, 0.12)' : 'var(--bg-glass)',
          color: activeCategory === 'movies' ? '#ff40a0' : 'var(--text-muted)',
          boxShadow: activeCategory === 'movies' ? '0 0 20px rgba(255, 0, 128, 0.2)' : 'none',
          transition: 'all 0.2s ease',
          borderRadius: '12px'
        }}
      >
        <Film size={20} />
        <span>Movies (YTS)</span>
        <span className="badge badge-amber" style={{ fontSize: '0.65rem' }}>HD / 4K</span>
      </button>

      <button
        onClick={() => setCategory('iss')}
        className="glass-panel"
        style={{
          flex: 1,
          minWidth: '180px',
          padding: '0.9rem 1.2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.7rem',
          fontWeight: 700,
          fontSize: '0.95rem',
          cursor: 'pointer',
          border: activeCategory === 'iss' ? '1px solid #00e676' : '1px solid var(--border-glass)',
          background: activeCategory === 'iss' ? 'rgba(0, 230, 118, 0.12)' : 'var(--bg-glass)',
          color: activeCategory === 'iss' ? '#00e676' : 'var(--text-muted)',
          boxShadow: activeCategory === 'iss' ? '0 0 20px rgba(0, 230, 118, 0.2)' : 'none',
          transition: 'all 0.2s ease',
          borderRadius: '12px'
        }}
      >
        <Orbit size={20} />
        <span>ISS Space Tracker</span>
        <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>ORBIT</span>
      </button>
    </div>
  );
}
