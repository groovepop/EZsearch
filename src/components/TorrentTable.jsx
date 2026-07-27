import React from 'react';
import { Magnet, Download, Bookmark, ExternalLink } from 'lucide-react';

export default function TorrentTable({ torrents, onCopyMagnet, watchlist, onToggleWatchlist }) {
  if (!torrents || torrents.length === 0) return null;

  const watchlistSet = new Set(watchlist.map(item => item.id || item.magnet_url));

  return (
    <div className="glass-panel table-container animate-fade-in">
      <table className="torrent-table">
        <thead>
          <tr>
            <th style={{ width: '40px' }}></th>
            <th>Title</th>
            <th>Source</th>
            <th>Quality</th>
            <th>Size</th>
            <th>Seeds / Leechers</th>
            <th>Released</th>
            <th style={{ textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {torrents.map((torrent) => {
            const isSaved = watchlistSet.has(torrent.id || torrent.magnet_url);
            return (
              <tr key={torrent.id || torrent.hash || torrent.magnet_url}>
                <td>
                  <button
                    onClick={() => onToggleWatchlist(torrent)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: isSaved ? 'var(--accent-amber)' : 'var(--text-dim)' }}
                    title={isSaved ? "Remove Watchlist" : "Add Watchlist"}
                  >
                    <Bookmark size={16} fill={isSaved ? 'var(--accent-amber)' : 'none'} />
                  </button>
                </td>

                <td style={{ fontWeight: 600, color: '#fff', maxWidth: '420px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.9rem', lineHeight: '1.3' }}>{torrent.title}</span>
                    {torrent.season && torrent.season !== '0' && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>
                        Season {torrent.season} E{torrent.episode}
                      </span>
                    )}
                  </div>
                </td>

                <td>
                  <span className={`badge ${torrent.source === 'YTS' ? 'badge-amber' : 'badge-purple'}`}>
                    {torrent.source || 'EZTV'}
                  </span>
                </td>

                <td>
                  <span className="badge badge-cyan">
                    {torrent.quality}
                  </span>
                </td>

                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {torrent.formatted_size}
                </td>

                <td>
                  <div className="seeds-peers">
                    <span className="seed-count" title="Seeders">▲ {torrent.seeds}</span>
                    <span className="peer-count" title="Leechers">▼ {torrent.peers}</span>
                  </div>
                </td>

                <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {torrent.date_released}
                </td>

                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                    <button
                      className="btn btn-magnet"
                      style={{ padding: '0.4rem 0.7rem', fontSize: '0.78rem' }}
                      onClick={() => onCopyMagnet(torrent.magnet_url)}
                    >
                      <Magnet size={14} />
                      <span>Magnet</span>
                    </button>

                    {torrent.torrent_url && (
                      <a
                        className="btn btn-secondary"
                        href={torrent.torrent_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ padding: '0.4rem 0.6rem' }}
                        title="Download .torrent file"
                      >
                        <Download size={14} />
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
