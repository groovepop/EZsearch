import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, Tv } from 'lucide-react';
import { searchTVShows } from '../services/api';

export default function SearchBar({ searchTerm, setSearchTerm, onSelectShow, activeCategory }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (activeCategory !== 'tv' || !searchTerm || searchTerm.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const results = await searchTVShows(searchTerm);
        setSuggestions(results.slice(0, 6));
        setShowDropdown(results.length > 0);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, activeCategory]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%', marginBottom: '1.2rem' }}>
      <div 
        className="glass-panel" 
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0.4rem 1rem',
          borderRadius: '14px',
          border: '1px solid var(--border-glass)',
          background: 'rgba(18, 22, 31, 0.85)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)'
        }}
      >
        <Search size={20} color="var(--accent-cyan)" style={{ marginRight: '0.8rem', flexShrink: 0 }} />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={
            activeCategory === 'tv' 
              ? "Search TV show title (e.g. Breaking Bad, House of the Dragon, tt0903747)..." 
              : activeCategory === 'tpb'
              ? "Search TV Season Packs & Torrent Releases (e.g. Breaking Bad S01, Game of Thrones Complete)..."
              : "Search movies by title, actor, or genre (e.g. Inception, Avatar, Action)..."
          }
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text-main)',
            fontSize: '1rem',
            fontFamily: 'var(--font-sans)',
            padding: '0.6rem 0'
          }}
        />

        {loadingSuggestions && (
          <Loader2 size={18} className="animate-spin" color="var(--accent-cyan)" style={{ marginLeft: '0.5rem' }} />
        )}

        {searchTerm && (
          <button
            onClick={() => {
              setSearchTerm('');
              setSuggestions([]);
              setShowDropdown(false);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '0.2rem',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown for TV Shows */}
      {showDropdown && suggestions.length > 0 && (
        <div 
          className="glass-panel animate-fade-in"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '0.5rem',
            zIndex: 100,
            background: 'rgba(14, 18, 26, 0.96)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(0, 229, 255, 0.3)',
            borderRadius: '12px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.8)',
            overflow: 'hidden'
          }}
        >
          <div style={{ padding: '0.6rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', borderBottom: '1px solid var(--border-glass)', background: 'rgba(0, 0, 0, 0.2)' }}>
            MATCHED TV SHOWS (CLICK TO FILTER BY IMDB ID)
          </div>
          {suggestions.map((show) => (
            <div
              key={show.id}
              onClick={() => {
                onSelectShow(show);
                setShowDropdown(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '0.75rem 1rem',
                cursor: 'pointer',
                borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                transition: 'background 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 229, 255, 0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              {show.image ? (
                <img src={show.image} alt={show.name} style={{ width: '38px', height: '52px', objectFit: 'cover', borderRadius: '6px' }} />
              ) : (
                <div style={{ width: '38px', height: '52px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Tv size={18} color="var(--text-dim)" />
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>
                  {show.name} {show.year && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>({show.year})</span>}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                  IMDb: {show.imdb_id}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
