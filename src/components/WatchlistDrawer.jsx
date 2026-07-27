import React from 'react';
import { X, Bookmark, Magnet, Trash2, Download } from 'lucide-react';

export default function WatchlistDrawer({ watchlist, onRemove, onCopyMagnet, onClose }) {
  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: '420px',
        maxWidth: '100vw',
        background: 'rgba(12, 15, 22, 0.98)',
        backdropFilter: 'blur(20px)',
        borderLeft: '1px solid var(--accent-cyan)',
        boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.8)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        animation: 'fadeIn 0.25s ease-out'
      }}
    >
      {/* Header */}
      <div style={{ padding: '1.2rem 1.5rem', borderBottom: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Bookmark size={20} color="var(--accent-amber)" fill="var(--accent-amber)" />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Saved Watchlist ({watchlist.length})</h2>
        </div>
        <button className="btn-icon" onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.2rem 1.5rem' }}>
        {watchlist.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
            <Bookmark size={40} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <p>Your watchlist is empty.</p>
            <p style={{ fontSize: '0.8rem', marginTop: '0.4rem' }}>Click the bookmark icon on any torrent to save it here for quick access!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {watchlist.map((item) => (
              <div 
                key={item.id || item.magnet_url}
                className="glass-card"
                style={{ padding: '1rem', border: '1px solid var(--border-glass)', borderRadius: '12px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', lineHeight: '1.3' }}>
                    {item.title}
                  </h4>
                  <button 
                    onClick={() => onRemove(item)}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', opacity: 0.8 }}
                    title="Remove from Watchlist"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.8rem' }}>
                  <span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>{item.quality}</span>
                  <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>{item.formatted_size}</span>
                  <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>▲ {item.seeds}</span>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="btn btn-magnet"
                    style={{ flex: 1, padding: '0.4rem', fontSize: '0.78rem', justifyContent: 'center' }}
                    onClick={() => onCopyMagnet(item.magnet_url)}
                  >
                    <Magnet size={14} />
                    <span>Copy Magnet</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
