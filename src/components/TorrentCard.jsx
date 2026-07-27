import React from 'react';
import { Magnet, Download, Bookmark, Star, ArrowUpRight, ArrowDownLeft, Tv, Film } from 'lucide-react';

export default function TorrentCard({ torrent, onCopyMagnet, onOpenMagnetModal, isWatchlisted, onToggleWatchlist }) {
  const isMovie = torrent.source === 'YTS';

  return (
    <div className="glass-card animate-fade-in" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
      {/* Poster Header for Movies or Screenshots for TV */}
      <div style={{ position: 'relative', height: isMovie ? '200px' : '120px', overflow: 'hidden', background: 'rgba(0,0,0,0.4)' }}>
        {torrent.poster || torrent.large_screenshot || torrent.small_screenshot ? (
          <img 
            src={torrent.poster || torrent.large_screenshot || torrent.small_screenshot} 
            alt={torrent.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease' }}
            onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(0,229,255,0.05) 0%, rgba(121,40,202,0.1) 100%)' }}>
            {isMovie ? <Film size={40} color="var(--text-dim)" /> : <Tv size={40} color="var(--text-dim)" />}
          </div>
        )}

        {/* Quality Badge */}
        <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', gap: '0.4rem' }}>
          <span className={`badge ${torrent.quality?.includes('2160p') ? 'badge-amber' : torrent.quality?.includes('1080p') ? 'badge-cyan' : 'badge-purple'}`}>
            {torrent.quality}
          </span>
          {torrent.source && (
            <span className="badge badge-green">
              {torrent.source}
            </span>
          )}
        </div>

        {/* Watchlist Toggle Button */}
        <button
          onClick={() => onToggleWatchlist(torrent)}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(8px)',
            border: isWatchlisted ? '1px solid var(--accent-amber)' : '1px solid rgba(255,255,255,0.2)',
            color: isWatchlisted ? 'var(--accent-amber)' : '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          title={isWatchlisted ? "Remove from Watchlist" : "Add to Watchlist"}
        >
          <Bookmark size={16} fill={isWatchlisted ? 'var(--accent-amber)' : 'none'} />
        </button>

        {/* Rating overlay for YTS movies */}
        {torrent.rating > 0 && (
          <div style={{
            position: 'absolute',
            bottom: '10px',
            left: '10px',
            background: 'rgba(0,0,0,0.75)',
            padding: '0.2rem 0.5rem',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            fontSize: '0.78rem',
            fontWeight: 700,
            color: 'var(--accent-amber)'
          }}>
            <Star size={12} fill="var(--accent-amber)" />
            <span>{torrent.rating} / 10</span>
          </div>
        )}
      </div>

      {/* Body Content */}
      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
        <div>
          <h3 
            style={{ 
              fontSize: '0.95rem', 
              fontWeight: 700, 
              lineHeight: '1.35', 
              marginBottom: '0.5rem',
              color: '#fff',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
            title={torrent.title}
          >
            {torrent.title}
          </h3>

          {!isMovie && (torrent.season !== '0' || torrent.episode !== '0') && (
            <div style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)', fontWeight: 600, marginBottom: '0.5rem' }}>
              Season {torrent.season} • Episode {torrent.episode}
            </div>
          )}

          {/* Meta Info */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.8rem', flexWrap: 'wrap', gap: '0.4rem' }}>
            <span>Size: <strong style={{ color: 'var(--text-main)' }}>{torrent.formatted_size}</strong></span>
            <span>Date: {torrent.date_released}</span>
          </div>
        </div>

        {/* Health & Actions */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.7rem', background: 'rgba(0, 0, 0, 0.25)', borderRadius: '8px', marginBottom: '0.8rem' }}>
            <div className="seeds-peers">
              <span className="seed-count" title="Seeders">
                ▲ {torrent.seeds}
              </span>
              <span className="peer-count" title="Leechers/Peers">
                ▼ {torrent.peers}
              </span>
            </div>

            {torrent.imdb_id && (
              <a
                href={`https://www.imdb.com/title/${torrent.imdb_id}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '0.75rem', color: 'var(--accent-amber)', textDecoration: 'none', fontWeight: 600 }}
              >
                IMDb ↗
              </a>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className="btn btn-magnet"
              style={{ flex: 1, padding: '0.5rem', fontSize: '0.82rem', justifyContent: 'center' }}
              onClick={() => onCopyMagnet(torrent.magnet_url)}
            >
              <Magnet size={15} />
              <span>Copy Magnet</span>
            </button>

            {torrent.torrent_url && (
              <a
                className="btn btn-secondary"
                href={torrent.torrent_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ padding: '0.5rem 0.7rem' }}
                title="Download .torrent file"
              >
                <Download size={15} />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
