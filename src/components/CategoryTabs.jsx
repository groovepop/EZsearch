import React, { useState, useEffect } from 'react';
import { Tv, Film, Anchor, Orbit, Flame, CloudSun, Bot, Clapperboard, Compass, Sparkles, Gamepad2 } from 'lucide-react';

export default function CategoryTabs({ activeCategory, setCategory }) {
  // Determine active primary group based on activeCategory
  const isTorrentGroup = ['tv', 'movies', 'tpb'].includes(activeCategory);
  const isSpaceGroup = ['weather', 'iss', 'mars'].includes(activeCategory);
  const isAiGroup = ['groovepop', 'chat', 'guessface'].includes(activeCategory);

  // Track last active subcategory per group
  const [lastTorrentSub, setLastTorrentSub] = useState('tv');
  const [lastSpaceSub, setLastSpaceSub] = useState('weather');
  const [lastAiSub, setLastAiSub] = useState('groovepop');

  useEffect(() => {
    if (['tv', 'movies', 'tpb'].includes(activeCategory)) {
      setLastTorrentSub(activeCategory);
    } else if (['weather', 'iss', 'mars'].includes(activeCategory)) {
      setLastSpaceSub(activeCategory);
    } else if (['groovepop', 'chat', 'guessface'].includes(activeCategory)) {
      setLastAiSub(activeCategory);
    }
  }, [activeCategory]);

  const handleGroupSwitch = (group) => {
    if (group === 'torrents') {
      setCategory(lastTorrentSub || 'tv');
    } else if (group === 'space') {
      setCategory(lastSpaceSub || 'weather');
    } else if (group === 'ai') {
      setCategory(lastAiSub || 'groovepop');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.2rem' }}>
      {/* Level 1: Primary Category Groups */}
      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
        {/* Torrents & Media Group */}
        <button
          onClick={() => handleGroupSwitch('torrents')}
          className="glass-panel"
          style={{
            flex: 1,
            minWidth: '150px',
            padding: '0.75rem 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.6rem',
            fontWeight: 800,
            fontSize: '0.92rem',
            cursor: 'pointer',
            border: isTorrentGroup ? '1px solid var(--accent-cyan)' : '1px solid var(--border-glass)',
            background: isTorrentGroup 
              ? 'linear-gradient(135deg, rgba(0, 229, 255, 0.18) 0%, rgba(121, 40, 202, 0.18) 100%)' 
              : 'var(--bg-glass)',
            color: isTorrentGroup ? 'var(--accent-cyan)' : 'var(--text-muted)',
            boxShadow: isTorrentGroup ? '0 0 20px rgba(0, 229, 255, 0.25)' : 'none',
            transition: 'all 0.2s ease',
            borderRadius: '12px'
          }}
        >
          <Clapperboard size={18} color={isTorrentGroup ? 'var(--accent-cyan)' : 'currentColor'} />
          <span>Torrents & Media</span>
          <span className="badge badge-cyan" style={{ fontSize: '0.62rem' }}>3 ENGINES</span>
        </button>

        {/* Space & Weather Group */}
        <button
          onClick={() => handleGroupSwitch('space')}
          className="glass-panel"
          style={{
            flex: 1,
            minWidth: '150px',
            padding: '0.75rem 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.6rem',
            fontWeight: 800,
            fontSize: '0.92rem',
            cursor: 'pointer',
            border: isSpaceGroup ? '1px solid #00e676' : '1px solid var(--border-glass)',
            background: isSpaceGroup 
              ? 'linear-gradient(135deg, rgba(0, 230, 118, 0.18) 0%, rgba(0, 150, 255, 0.18) 100%)' 
              : 'var(--bg-glass)',
            color: isSpaceGroup ? '#00e676' : 'var(--text-muted)',
            boxShadow: isSpaceGroup ? '0 0 20px rgba(0, 230, 118, 0.25)' : 'none',
            transition: 'all 0.2s ease',
            borderRadius: '12px'
          }}
        >
          <Compass size={18} color={isSpaceGroup ? '#00e676' : 'currentColor'} />
          <span>Space & Weather</span>
          <span className="badge badge-green" style={{ fontSize: '0.62rem' }}>HAMILTON</span>
        </button>

        {/* AI Top Level Tab */}
        <button
          onClick={() => handleGroupSwitch('ai')}
          className="glass-panel"
          style={{
            flex: 1.2,
            minWidth: '180px',
            padding: '0.75rem 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.6rem',
            fontWeight: 800,
            fontSize: '0.92rem',
            cursor: 'pointer',
            border: isAiGroup ? '1px solid #ff0080' : '1px solid rgba(255, 0, 128, 0.35)',
            background: isAiGroup 
              ? 'linear-gradient(135deg, rgba(255, 0, 128, 0.28) 0%, rgba(121, 40, 202, 0.28) 100%)' 
              : 'rgba(255, 0, 128, 0.08)',
            color: isAiGroup ? '#ff55b0' : '#fff',
            boxShadow: isAiGroup ? '0 0 25px rgba(255, 0, 128, 0.4)' : 'none',
            transition: 'all 0.2s ease',
            borderRadius: '12px'
          }}
        >
          <Sparkles size={18} color="#ff0080" />
          <span>AI Studio & Suite</span>
          <span className="badge badge-purple" style={{ fontSize: '0.62rem' }}>3 TOOLS</span>
        </button>
      </div>


      {/* Level 2: Submenu Pills for the Active Group */}
      {isTorrentGroup && (
        <div 
          className="glass-panel animate-fade-in"
          style={{
            display: 'flex',
            gap: '0.5rem',
            padding: '0.45rem',
            borderRadius: '12px',
            background: 'rgba(14, 18, 26, 0.7)',
            border: '1px solid rgba(0, 229, 255, 0.2)',
            flexWrap: 'wrap'
          }}
        >
          <button
            onClick={() => setCategory('tv')}
            style={{
              flex: 1,
              minWidth: '130px',
              padding: '0.55rem 0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              borderRadius: '8px',
              border: activeCategory === 'tv' ? '1px solid var(--accent-cyan)' : '1px solid transparent',
              background: activeCategory === 'tv' ? 'rgba(0, 229, 255, 0.2)' : 'transparent',
              color: activeCategory === 'tv' ? 'var(--accent-cyan)' : 'var(--text-muted)',
              transition: 'all 0.15s ease'
            }}
          >
            <Tv size={16} />
            <span>TV Shows (EZTV)</span>
            <span className="badge badge-purple" style={{ fontSize: '0.6rem' }}>SERIES</span>
          </button>

          <button
            onClick={() => setCategory('movies')}
            style={{
              flex: 1,
              minWidth: '130px',
              padding: '0.55rem 0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              borderRadius: '8px',
              border: activeCategory === 'movies' ? '1px solid #ff0080' : '1px solid transparent',
              background: activeCategory === 'movies' ? 'rgba(255, 0, 128, 0.2)' : 'transparent',
              color: activeCategory === 'movies' ? '#ff40a0' : 'var(--text-muted)',
              transition: 'all 0.15s ease'
            }}
          >
            <Film size={16} />
            <span>Movies (YTS)</span>
            <span className="badge badge-amber" style={{ fontSize: '0.6rem' }}>HD / 4K</span>
          </button>

          <button
            onClick={() => setCategory('tpb')}
            style={{
              flex: 1,
              minWidth: '130px',
              padding: '0.55rem 0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              borderRadius: '8px',
              border: activeCategory === 'tpb' ? '1px solid #00e5ff' : '1px solid transparent',
              background: activeCategory === 'tpb' ? 'rgba(0, 229, 255, 0.2)' : 'transparent',
              color: activeCategory === 'tpb' ? '#00e5ff' : 'var(--text-muted)',
              transition: 'all 0.15s ease'
            }}
          >
            <Anchor size={16} color="#00e5ff" />
            <span>The Pirate Bay</span>
            <span className="badge badge-green" style={{ fontSize: '0.6rem' }}>ALL MEDIA</span>
          </button>
        </div>
      )}

      {isSpaceGroup && (
        <div 
          className="glass-panel animate-fade-in"
          style={{
            display: 'flex',
            gap: '0.5rem',
            padding: '0.45rem',
            borderRadius: '12px',
            background: 'rgba(14, 18, 26, 0.7)',
            border: '1px solid rgba(0, 230, 118, 0.2)',
            flexWrap: 'wrap'
          }}
        >
          <button
            onClick={() => setCategory('weather')}
            style={{
              flex: 1,
              minWidth: '130px',
              padding: '0.55rem 0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              borderRadius: '8px',
              border: activeCategory === 'weather' ? '1px solid #0096ff' : '1px solid transparent',
              background: activeCategory === 'weather' ? 'rgba(0, 150, 255, 0.2)' : 'transparent',
              color: activeCategory === 'weather' ? '#0096ff' : 'var(--text-muted)',
              transition: 'all 0.15s ease'
            }}
          >
            <CloudSun size={16} color="#0096ff" />
            <span>Hamilton Weather</span>
            <span className="badge badge-cyan" style={{ fontSize: '0.6rem' }}>12H & 7D</span>
          </button>

          <button
            onClick={() => setCategory('iss')}
            style={{
              flex: 1,
              minWidth: '130px',
              padding: '0.55rem 0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              borderRadius: '8px',
              border: activeCategory === 'iss' ? '1px solid #00e676' : '1px solid transparent',
              background: activeCategory === 'iss' ? 'rgba(0, 230, 118, 0.2)' : 'transparent',
              color: activeCategory === 'iss' ? '#00e676' : 'var(--text-muted)',
              transition: 'all 0.15s ease'
            }}
          >
            <Orbit size={16} color="#00e676" />
            <span>ISS Tracker</span>
            <span className="badge badge-purple" style={{ fontSize: '0.6rem' }}>SGP4</span>
          </button>

          <button
            onClick={() => setCategory('mars')}
            style={{
              flex: 1,
              minWidth: '130px',
              padding: '0.55rem 0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              borderRadius: '8px',
              border: activeCategory === 'mars' ? '1px solid #ff4500' : '1px solid transparent',
              background: activeCategory === 'mars' ? 'rgba(255, 69, 0, 0.2)' : 'transparent',
              color: activeCategory === 'mars' ? '#ff6b35' : 'var(--text-muted)',
              transition: 'all 0.15s ease'
            }}
          >
            <Flame size={16} color="#ff4500" />
            <span>Mars Curiosity</span>
            <span className="badge badge-amber" style={{ fontSize: '0.6rem' }}>SOL LOG</span>
          </button>
        </div>
      )}

      {isAiGroup && (
        <div 
          className="glass-panel animate-fade-in"
          style={{
            display: 'flex',
            gap: '0.5rem',
            padding: '0.45rem',
            borderRadius: '12px',
            background: 'rgba(14, 18, 26, 0.7)',
            border: '1px solid rgba(255, 0, 128, 0.25)',
            flexWrap: 'wrap'
          }}
        >
          <button
            onClick={() => setCategory('groovepop')}
            style={{
              flex: 1,
              minWidth: '140px',
              padding: '0.55rem 0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              borderRadius: '8px',
              border: activeCategory === 'groovepop' ? '1px solid #ff0080' : '1px solid transparent',
              background: activeCategory === 'groovepop' ? 'rgba(255, 0, 128, 0.22)' : 'transparent',
              color: activeCategory === 'groovepop' ? '#ff55b0' : 'var(--text-muted)',
              transition: 'all 0.15s ease'
            }}
          >
            <Sparkles size={16} color="#ff0080" />
            <span>Groove Pop</span>
            <span className="badge badge-purple" style={{ fontSize: '0.6rem' }}>TRANSFORMS</span>
          </button>

          <button
            onClick={() => setCategory('chat')}
            style={{
              flex: 1,
              minWidth: '140px',
              padding: '0.55rem 0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              borderRadius: '8px',
              border: activeCategory === 'chat' ? '1px solid #00e5ff' : '1px solid transparent',
              background: activeCategory === 'chat' ? 'rgba(0, 229, 255, 0.22)' : 'transparent',
              color: activeCategory === 'chat' ? '#00e5ff' : 'var(--text-muted)',
              transition: 'all 0.15s ease'
            }}
          >
            <Bot size={16} color="#00e5ff" />
            <span>EZ Assistant</span>
            <span className="badge badge-cyan" style={{ fontSize: '0.6rem' }}>AGENT & CHAT</span>
          </button>

          <button
            onClick={() => setCategory('guessface')}
            style={{
              flex: 1,
              minWidth: '140px',
              padding: '0.55rem 0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              borderRadius: '8px',
              border: activeCategory === 'guessface' ? '1px solid #ffd700' : '1px solid transparent',
              background: activeCategory === 'guessface' ? 'rgba(255, 215, 0, 0.2)' : 'transparent',
              color: activeCategory === 'guessface' ? '#ffd700' : 'var(--text-muted)',
              transition: 'all 0.15s ease'
            }}
          >
            <Gamepad2 size={16} color="#ffd700" />
            <span>GuessFace</span>
            <span className="badge badge-amber" style={{ fontSize: '0.6rem' }}>9-MODE API</span>
          </button>
        </div>
      )}
    </div>
  );
}

