import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import CategoryTabs from './components/CategoryTabs';
import SearchBar from './components/SearchBar';
import FilterBar from './components/FilterBar';
import TorrentGrid from './components/TorrentGrid';
import TorrentTable from './components/TorrentTable';
import Pagination from './components/Pagination';
import WatchlistDrawer from './components/WatchlistDrawer';
import ISSWidget from './components/ISSWidget';
import MarsWidget from './components/MarsWidget';
import { fetchEZTVTorrents, fetchYTSMovies, fetchPirateBayTorrents } from './services/api';
import { Loader2, Check, AlertTriangle, Sparkles, Anchor } from 'lucide-react';

export default function App() {
  // State
  const [activeCategory, setActiveCategory] = useState('tpb'); // Default to 'tpb', 'tv', 'movies', 'iss', or 'mars'
  const [activeTab, setActiveTab] = useState('main');
  const [torrents, setTorrents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(30);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedShow, setSelectedShow] = useState(null);
  
  const [selectedQuality, setSelectedQuality] = useState('ALL');
  const [sortBy, setSortBy] = useState('seeds');
  const [viewMode, setViewMode] = useState('grid');
  
  const [mirrorUsed, setMirrorUsed] = useState('');
  const [isCached, setIsCached] = useState(false);
  
  // Watchlist stored in LocalStorage
  const [watchlist, setWatchlist] = useState(() => {
    try {
      const saved = localStorage.getItem('eztv_yts_watchlist');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  useEffect(() => {
    try {
      localStorage.setItem('eztv_yts_watchlist', JSON.stringify(watchlist));
    } catch (e) {
      console.error(e);
    }
  }, [watchlist]);

  const toggleWatchlist = (torrent) => {
    const key = torrent.id || torrent.magnet_url;
    setWatchlist((prev) => {
      const exists = prev.some((item) => (item.id || item.magnet_url) === key);
      if (exists) {
        showToast('Removed from Watchlist');
        return prev.filter((item) => (item.id || item.magnet_url) !== key);
      } else {
        showToast('Saved to Watchlist');
        return [...prev, torrent];
      }
    });
  };

  const copyMagnet = (url) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    showToast('⚡ Magnet link copied to clipboard!');
  };

  // Fetch Torrents Logic
  const loadData = useCallback(async () => {
    if (activeCategory === 'iss' || activeCategory === 'mars') return;

    setLoading(true);
    setError(null);
    try {
      if (activeCategory === 'tpb') {
        const queryToSearch = searchTerm.trim();
        const res = await fetchPirateBayTorrents({ query: queryToSearch, cat: '0', page, limit: 100 });
        setTorrents(res.torrents || []);
        setMirrorUsed(res.mirrorUsed || 'Pirate Bay API Engine');
        setIsCached(!!res.cached);
      } else if (activeCategory === 'tv') {
        const imdbId = selectedShow ? selectedShow.imdb_id : (searchTerm.startsWith('tt') ? searchTerm : '');
        const res = await fetchEZTVTorrents({ page, limit, imdb_id: imdbId });
        setTorrents(res.torrents || []);
        setMirrorUsed(res.mirrorUsed || '');
        setIsCached(!!res.cached);
      } else if (activeCategory === 'movies') {
        const res = await fetchYTSMovies({
          page,
          limit,
          query_term: searchTerm,
          quality: selectedQuality !== 'ALL' ? selectedQuality : '',
          sort_by: sortBy === 'seeds' ? 'seeds' : sortBy === 'peers' ? 'peers' : sortBy === 'date' ? 'date_added' : 'seeds'
        });
        setTorrents(res.torrents || []);
        setMirrorUsed(res.mirrorUsed || '');
        setIsCached(!!res.cached);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load torrents. Please try again.');
      setTorrents([]);
    } finally {
      setLoading(false);
    }
  }, [activeCategory, page, limit, selectedShow, searchTerm, selectedQuality, sortBy]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCategorySwitch = (cat) => {
    setActiveCategory(cat);
    setPage(1);
    setSearchTerm('');
    setSelectedShow(null);
    setSelectedQuality('ALL');
  };

  const processedTorrents = React.useMemo(() => {
    if (activeCategory === 'iss' || activeCategory === 'mars') return [];
    let list = [...torrents];

    if (activeCategory === 'tv' && searchTerm && !selectedShow && !searchTerm.startsWith('tt')) {
      const q = searchTerm.toLowerCase();
      list = list.filter((t) => (t.title || '').toLowerCase().includes(q) || (t.filename || '').toLowerCase().includes(q));
    }

    if (selectedQuality !== 'ALL') {
      const q = selectedQuality.toLowerCase();
      list = list.filter((t) => (t.quality || '').toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      if (sortBy === 'seeds') return (b.seeds || 0) - (a.seeds || 0);
      if (sortBy === 'peers') return (b.peers || 0) - (a.peers || 0);
      if (sortBy === 'size') return (parseInt(b.size_bytes || 0) - parseInt(a.size_bytes || 0));
      if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '');
      return 0;
    });

    return list;
  }, [torrents, activeCategory, searchTerm, selectedShow, selectedQuality, sortBy]);

  return (
    <div className="app-container">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        watchlistCount={watchlist.length}
        onRefresh={loadData}
        mirrorUsed={mirrorUsed}
        isCached={isCached}
      />

      <CategoryTabs activeCategory={activeCategory} setCategory={handleCategorySwitch} />

      {/* Render Widgets or Torrent Views */}
      {activeCategory === 'iss' ? (
        <ISSWidget />
      ) : activeCategory === 'mars' ? (
        <MarsWidget />
      ) : (
        <>
          <SearchBar
            searchTerm={searchTerm}
            setSearchTerm={(term) => {
              setSearchTerm(term);
              setPage(1);
            }}
            onSelectShow={(show) => {
              setSelectedShow(show);
              setSearchTerm(show.name);
              setPage(1);
            }}
            activeCategory={activeCategory}
          />

          <FilterBar
            selectedQuality={selectedQuality}
            setSelectedQuality={setSelectedQuality}
            sortBy={sortBy}
            setSortBy={setSortBy}
            limit={limit}
            setLimit={setLimit}
            viewMode={viewMode}
            setViewMode={setViewMode}
            selectedShow={selectedShow}
            clearSelectedShow={() => {
              setSelectedShow(null);
              setSearchTerm('');
            }}
            activeCategory={activeCategory}
          />

          {/* Main Content Area */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '5rem 1rem' }}>
              <Loader2 size={42} className="animate-spin" color="var(--accent-cyan)" style={{ marginBottom: '1rem' }} />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Fetching torrent list from {activeCategory === 'tpb' ? 'Pirate Bay API Engine (100 Results/Page)...' : 'mirror proxy...'}</p>
            </div>
          ) : error ? (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem 1.5rem', borderColor: 'var(--accent-red)' }}>
              <AlertTriangle size={40} color="var(--accent-red)" style={{ marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: '#fff' }}>Connection Error</h3>
              <p style={{ color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto 1.5rem auto' }}>{error}</p>
              <button className="btn btn-primary" onClick={loadData}>Try Again</button>
            </div>
          ) : processedTorrents.length === 0 ? (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 1.5rem' }}>
              <Sparkles size={38} color="var(--text-dim)" style={{ marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '0.4rem' }}>No Torrents Found</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Try searching for a title, season pack, movie, software, or audio keyword above.</p>
            </div>
          ) : (
            <>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Showing <strong>{processedTorrents.length}</strong> results (Page {page})</span>
                {activeCategory === 'tpb' && (
                  <span style={{ fontSize: '0.78rem', color: '#00e5ff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Anchor size={14} /> Full Multi-Page Pirate Bay Engine (100 Results/Page)
                  </span>
                )}
              </div>

              {viewMode === 'grid' ? (
                <TorrentGrid
                  torrents={processedTorrents}
                  onCopyMagnet={copyMagnet}
                  watchlist={watchlist}
                  onToggleWatchlist={toggleWatchlist}
                />
              ) : (
                <TorrentTable
                  torrents={processedTorrents}
                  onCopyMagnet={copyMagnet}
                  watchlist={watchlist}
                  onToggleWatchlist={toggleWatchlist}
                />
              )}

              <Pagination
                currentPage={page}
                onPageChange={(newPage) => {
                  setPage(newPage);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                loading={loading}
              />
            </>
          )}
        </>
      )}

      {/* Watchlist Drawer */}
      {activeTab === 'watchlist' && (
        <WatchlistDrawer
          watchlist={watchlist}
          onRemove={toggleWatchlist}
          onCopyMagnet={copyMagnet}
          onClose={() => setActiveTab('main')}
        />
      )}

      {/* Copy Toast */}
      {toastMessage && (
        <div className="toast">
          <Check size={18} color="var(--accent-green)" />
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
