import React from 'react';
import { Filter, ArrowUpDown, LayoutGrid, List, X, Layers } from 'lucide-react';

export default function FilterBar({
  selectedQuality,
  setSelectedQuality,
  sortBy,
  setSortBy,
  limit,
  setLimit,
  viewMode,
  setViewMode,
  selectedShow,
  clearSelectedShow,
  activeCategory
}) {
  const qualities = activeCategory === 'tv' 
    ? ['ALL', '1080p', '720p', '480p', 'x265']
    : ['ALL', '2160p', '1080p', '720p', '3D'];

  return (
    <div 
      className="glass-panel" 
      style={{
        padding: '0.8rem 1.2rem',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}
    >
      {/* Quality Pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <Filter size={14} /> QUALITY:
        </span>
        {qualities.map((q) => (
          <button
            key={q}
            onClick={() => setSelectedQuality(q)}
            style={{
              padding: '0.3rem 0.7rem',
              borderRadius: '20px',
              fontSize: '0.78rem',
              fontWeight: 700,
              border: selectedQuality === q ? '1px solid var(--accent-cyan)' : '1px solid var(--border-glass)',
              background: selectedQuality === q ? 'rgba(0, 229, 255, 0.2)' : 'rgba(255, 255, 255, 0.03)',
              color: selectedQuality === q ? 'var(--accent-cyan)' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            {q}
          </button>
        ))}

        {selectedShow && (
          <div 
            className="badge badge-purple"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.7rem', cursor: 'pointer' }}
            onClick={clearSelectedShow}
            title="Clear Show Filter"
          >
            <span>Show: {selectedShow.name} ({selectedShow.imdb_id})</span>
            <X size={14} />
          </div>
        )}
      </div>

      {/* Controls Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        {/* Sort By */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <ArrowUpDown size={14} color="var(--text-muted)" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              background: 'rgba(18, 22, 31, 0.9)',
              color: 'var(--text-main)',
              border: '1px solid var(--border-glass)',
              borderRadius: '8px',
              padding: '0.35rem 0.6rem',
              fontSize: '0.82rem',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="seeds">Sort by Seeds (Highest)</option>
            <option value="peers">Sort by Peechers/Peers</option>
            <option value="size">Sort by File Size</option>
            <option value="date">Sort by Date Released</option>
            <option value="title">Sort by Title</option>
          </select>
        </div>

        {/* Page Limit */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Per Page:</span>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            style={{
              background: 'rgba(18, 22, 31, 0.9)',
              color: 'var(--text-main)',
              border: '1px solid var(--border-glass)',
              borderRadius: '8px',
              padding: '0.35rem 0.6rem',
              fontSize: '0.82rem',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value={10}>10</option>
            <option value={30}>30</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        {/* View Mode Toggle */}
        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', padding: '2px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
          <button
            className="btn-icon"
            onClick={() => setViewMode('grid')}
            style={{
              padding: '0.35rem 0.5rem',
              borderRadius: '6px',
              border: 'none',
              background: viewMode === 'grid' ? 'rgba(0, 229, 255, 0.2)' : 'transparent',
              color: viewMode === 'grid' ? 'var(--accent-cyan)' : 'var(--text-muted)'
            }}
            title="Grid View"
          >
            <LayoutGrid size={16} />
          </button>

          <button
            className="btn-icon"
            onClick={() => setViewMode('table')}
            style={{
              padding: '0.35rem 0.5rem',
              borderRadius: '6px',
              border: 'none',
              background: viewMode === 'table' ? 'rgba(0, 229, 255, 0.2)' : 'transparent',
              color: viewMode === 'table' ? 'var(--accent-cyan)' : 'var(--text-muted)'
            }}
            title="Table View"
          >
            <List size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
