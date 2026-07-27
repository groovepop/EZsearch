import React from 'react';
import TorrentCard from './TorrentCard';

export default function TorrentGrid({ torrents, onCopyMagnet, watchlist, onToggleWatchlist }) {
  if (!torrents || torrents.length === 0) {
    return null;
  }

  const watchlistMap = new Set(watchlist.map(item => item.id || item.magnet_url));

  return (
    <div className="torrent-grid">
      {torrents.map((torrent) => (
        <TorrentCard
          key={torrent.id || torrent.hash || torrent.magnet_url}
          torrent={torrent}
          onCopyMagnet={onCopyMagnet}
          isWatchlisted={watchlistMap.has(torrent.id || torrent.magnet_url)}
          onToggleWatchlist={onToggleWatchlist}
        />
      ))}
    </div>
  );
}
