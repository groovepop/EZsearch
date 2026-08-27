import React, { useState, useEffect } from 'react';
import { 
  Film, 
  RefreshCw, 
  ExternalLink, 
  Flame, 
  Sparkles, 
  Search, 
  Dices, 
  Copy, 
  Check, 
  Palette, 
  Eye, 
  BookOpen, 
  Clapperboard
} from 'lucide-react';
import { fetchDarksideDaily, fetchDarksideRandomFact, fetchDarksideFacts } from '../services/api';

const HOLLYWOOD_CATEGORIES = ['All', 'Cursed Sets', 'Studio Power Plays', 'Scandals', 'Tragedy', 'Mysterious Deaths', 'Feuds', 'Cults & Occult'];
const HOLLYWOOD_THEMES = [
  { id: 'noir', label: 'Film Noir', color: '#94a3b8', bg: '#0d1117', border: '#475569', accent: '#94a3b8', glow: 'rgba(148, 163, 184, 0.2)' },
  { id: 'gold', label: 'Classic Gold', color: '#eab308', bg: '#17120a', border: '#ca8a04', accent: '#facc15', glow: 'rgba(234, 179, 8, 0.25)' },
  { id: 'crimson', label: 'Velvet Crimson', color: '#ef4444', bg: '#180505', border: '#ef4444', accent: '#f87171', glow: 'rgba(239, 68, 68, 0.25)' }
];

export default function DarkSideHollywoodWidget() {
  const [theme, setTheme] = useState('noir');
  const [showPrompt, setShowPrompt] = useState(false);
  const [isPromptExpanded, setIsPromptExpanded] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Daily Offering State
  const [dailyData, setDailyData] = useState(null);
  const [dailyLoading, setDailyLoading] = useState(true);
  const [dailyError, setDailyError] = useState(null);

  // Explorer & Roulette State
  const [activeView, setActiveView] = useState('daily'); // 'daily' | 'roulette' | 'browse'
  const [randomCard, setRandomCard] = useState(null);
  const [randomLoading, setRandomLoading] = useState(false);
  const [randomCategory, setRandomCategory] = useState('');
  const [randomWildness, setRandomWildness] = useState(5);

  // Search & Browse State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [browseResults, setBrowseResults] = useState([]);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const activeThemeConfig = HOLLYWOOD_THEMES.find(t => t.id === theme) || HOLLYWOOD_THEMES[0];

  const loadDaily = async () => {
    setDailyLoading(true);
    setDailyError(null);
    try {
      const data = await fetchDarksideDaily('hollywood');
      setDailyData(data);
    } catch (err) {
      console.warn('[Darkside Hollywood Daily Load Error]', err);
      setDailyError(err.message || 'Failed to load today\'s offering.');
    } finally {
      setDailyLoading(false);
    }
  };

  useEffect(() => {
    loadDaily();
  }, [refreshKey]);

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
  };

  const drawRandomCard = async () => {
    setRandomLoading(true);
    try {
      const res = await fetchDarksideRandomFact('hollywood', {
        wildness_rating: randomWildness,
        category: randomCategory || undefined
      });
      setRandomCard(res.fact || res);
    } catch (err) {
      console.warn('[Hollywood Random Draw Error]', err);
    } finally {
      setRandomLoading(false);
    }
  };

  const executeBrowse = async (query = '', cat = 'All') => {
    setBrowseLoading(true);
    try {
      const params = { limit: 20 };
      if (query.trim()) params.search = query.trim();
      if (cat !== 'All') params.category = cat;
      const res = await fetchDarksideFacts('hollywood', params);
      setBrowseResults(res.facts || (Array.isArray(res) ? res : []));
    } catch (err) {
      console.warn('[Hollywood Browse Error]', err);
      setBrowseResults([]);
    } finally {
      setBrowseLoading(false);
    }
  };

  useEffect(() => {
    if (activeView === 'browse' && browseResults.length === 0) {
      executeBrowse('', selectedCategory);
    }
  }, [activeView]);

  const copyToClipboard = (text, id) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '1.25rem', marginBottom: '2rem' }}>
      {/* Dark Side of Hollywood Banner Header */}
      <div className="section-banner-card" style={{ marginBottom: '1.2rem', border: '1px solid rgba(234, 179, 8, 0.3)', boxShadow: '0 0 25px rgba(234, 179, 8, 0.15)' }}>
        <img 
          src="/banners/banner-dshollywood.jpg" 
          alt="Dark Side of Hollywood Banner" 
          style={{ width: '100%', maxHeight: '180px', objectFit: 'contain', background: '#04060c' }}
        />
      </div>

      {/* Control Header */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          padding: '0.75rem 1rem',
          background: 'rgba(234, 179, 8, 0.08)',
          borderRadius: '12px',
          border: '1px solid rgba(234, 179, 8, 0.25)',
          marginBottom: '1.25rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '9px',
            background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 14px rgba(234, 179, 8, 0.45)'
          }}>
            <Film size={18} color="#000" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span style={{ fontSize: '0.98rem', fontWeight: 800, color: '#fff', letterSpacing: '0.02em' }}>
                Dark Side of Hollywood
              </span>
              <span className="badge" style={{ background: 'rgba(234, 179, 8, 0.2)', color: '#facc15', border: '1px solid rgba(234, 179, 8, 0.4)', fontSize: '0.65rem' }}>
                NOIR & AI CINEMA
              </span>
            </div>
            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              Cursed Sets, Studio Power Plays, Scandals & Tragic Cinema Lore
            </span>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(0,0,0,0.4)', padding: '0.25rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            className={`btn ${activeView === 'daily' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveView('daily')}
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', background: activeView === 'daily' ? 'linear-gradient(135deg, #eab308, #ca8a04)' : undefined, color: activeView === 'daily' ? '#000' : undefined, fontWeight: activeView === 'daily' ? 700 : undefined }}
          >
            <Sparkles size={13} />
            <span>Daily 5-Flame</span>
          </button>
          <button
            className={`btn ${activeView === 'roulette' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => {
              setActiveView('roulette');
              if (!randomCard) drawRandomCard();
            }}
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', background: activeView === 'roulette' ? 'linear-gradient(135deg, #eab308, #ca8a04)' : undefined, color: activeView === 'roulette' ? '#000' : undefined, fontWeight: activeView === 'roulette' ? 700 : undefined }}
          >
            <Dices size={13} />
            <span>Card Draw</span>
          </button>
          <button
            className={`btn ${activeView === 'browse' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveView('browse')}
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', background: activeView === 'browse' ? 'linear-gradient(135deg, #eab308, #ca8a04)' : undefined, color: activeView === 'browse' ? '#000' : undefined, fontWeight: activeView === 'browse' ? 700 : undefined }}
          >
            <Clapperboard size={13} />
            <span>Lore Explorer</span>
          </button>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            className="btn btn-secondary"
            onClick={handleRefresh}
            title="Reload Daily Offering"
            style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
          >
            <RefreshCw size={13} className={dailyLoading ? 'animate-spin' : ''} />
            <span>Reload</span>
          </button>

          <a
            href="http://20.236.29.216:5000"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{
              padding: '0.4rem 0.85rem',
              fontSize: '0.8rem',
              background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
              borderColor: '#eab308',
              color: '#000',
              fontWeight: 700
            }}
          >
            <ExternalLink size={13} color="#000" />
            <span>Darkside Portal</span>
          </a>
        </div>
      </div>

      {/* View 1: Daily Offering 5-Flame AI Art & Lore Card */}
      {activeView === 'daily' && (
        <div className="animate-fade-in">
          {/* Customization Toolbar */}
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              flexWrap: 'wrap', 
              gap: '0.75rem', 
              marginBottom: '1.25rem',
              padding: '0.6rem 1rem',
              background: 'rgba(10, 14, 22, 0.6)',
              borderRadius: '10px',
              border: '1px solid var(--border-glass)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Palette size={13} color="#facc15" /> Theme:
              </span>
              {HOLLYWOOD_THEMES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  style={{
                    padding: '0.25rem 0.6rem',
                    fontSize: '0.74rem',
                    borderRadius: '6px',
                    border: `1px solid ${theme === t.id ? t.color : 'rgba(255,255,255,0.1)'}`,
                    background: theme === t.id ? 'rgba(234, 179, 8, 0.2)' : 'rgba(255,255,255,0.03)',
                    color: theme === t.id ? '#fff' : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontWeight: theme === t.id ? 700 : 500
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={showPrompt}
                  onChange={(e) => setShowPrompt(e.target.checked)}
                  style={{ accentColor: '#eab308', cursor: 'pointer' }}
                />
                <Eye size={13} color="#facc15" />
                <span>Show Art Prompt</span>
              </label>

              <span className="badge badge-amber" style={{ fontSize: '0.68rem', padding: '0.2rem 0.5rem' }}>
                🔥 5 Flames Extreme
              </span>
            </div>
          </div>

          {/* Daily Card Container with Dynamic Theme */}
          <div 
            style={{
              padding: '2rem 1rem',
              background: 'radial-gradient(circle at center, rgba(234, 179, 8, 0.08) 0%, rgba(5, 7, 12, 0.95) 100%)',
              borderRadius: '16px',
              border: '1px solid rgba(234, 179, 8, 0.25)',
              boxShadow: 'inset 0 0 30px rgba(0,0,0,0.8)',
              display: 'flex',
              justifyContent: 'center'
            }}
          >
            {dailyLoading ? (
              <div 
                style={{
                  width: '100%',
                  maxWidth: '460px',
                  background: activeThemeConfig.bg,
                  border: `1.5px solid ${activeThemeConfig.border}`,
                  borderRadius: '14px',
                  padding: '16px',
                  boxShadow: `0 12px 35px -5px ${activeThemeConfig.glow}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: activeThemeConfig.accent }}>🎬 Daily Darkside</span>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Loading Today's 5-Flame Offering...</span>
                </div>
                <div style={{ width: '100%', aspectRatio: '4/3', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <RefreshCw size={28} className="animate-spin" color={activeThemeConfig.accent} />
                </div>
                <div style={{ height: '18px', width: '70%', background: 'rgba(255,255,255,0.06)', borderRadius: '4px' }}></div>
                <div style={{ height: '14px', width: '90%', background: 'rgba(255,255,255,0.04)', borderRadius: '4px' }}></div>
                <div style={{ height: '14px', width: '80%', background: 'rgba(255,255,255,0.04)', borderRadius: '4px' }}></div>
              </div>
            ) : dailyError ? (
              <div 
                style={{
                  width: '100%',
                  maxWidth: '460px',
                  background: activeThemeConfig.bg,
                  border: `1.5px solid ${activeThemeConfig.border}`,
                  borderRadius: '14px',
                  padding: '24px 16px',
                  textAlign: 'center',
                  color: '#f8fafc'
                }}
              >
                <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>⚠️</div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#ef4444', marginBottom: '6px' }}>Unable to load daily offering</h4>
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '14px' }}>{dailyError}</p>
                <button className="btn btn-primary" onClick={loadDaily} style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem' }}>
                  Retry
                </button>
              </div>
            ) : dailyData ? (
              <div 
                className="widget-card"
                style={{
                  width: '100%',
                  maxWidth: '460px',
                  background: activeThemeConfig.bg,
                  border: `1.5px solid ${activeThemeConfig.border}`,
                  borderRadius: '14px',
                  padding: '16px',
                  color: '#f8fafc',
                  boxShadow: `0 12px 35px -5px ${activeThemeConfig.glow}, 0 4px 6px -2px rgba(0,0,0,0.6)`,
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <a href={dailyData.fullAppUrl || 'http://20.236.29.216:5000'} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 800, fontSize: '0.85rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: activeThemeConfig.accent, display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}>
                    <span>🎬 Daily Darkside</span>
                  </a>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500 }}>
                    Today's Offering • {dailyData.selectionDate || 'Latest'}
                  </span>
                </div>

                {/* 4:3 Aspect Ratio Image */}
                {dailyData.image && (
                  <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', borderRadius: '10px', overflow: 'hidden', background: '#020617', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '14px' }}>
                    <img 
                      src={dailyData.image} 
                      alt={dailyData.fact?.headline || 'Daily Darkside Artwork'} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.4s ease' }}
                    />
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)', padding: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      <span style={{ background: activeThemeConfig.accent, color: '#000', fontSize: '0.7rem', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {dailyData.fact?.category || 'Hollywood'}
                      </span>
                      <span style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', color: '#fbbf24', fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
                        {'🔥'.repeat(dailyData.fact?.wildness || 5)} 5/5
                      </span>
                    </div>
                  </div>
                )}

                {/* Subject & Era */}
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f8fafc', marginBottom: '4px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <span>{dailyData.fact?.subject || 'Hollywood Lore'}</span>
                  {dailyData.fact?.era && <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>{dailyData.fact.era}</span>}
                </div>

                {/* Headline */}
                <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#e2e8f0', lineHeight: 1.35, marginBottom: '10px' }}>
                  {dailyData.fact?.headline}
                </h3>

                {/* Optional AI Art Prompt Collapsible */}
                {(showPrompt || isPromptExpanded) && dailyData.artPrompt && (
                  <div style={{ background: 'rgba(0,0,0,0.45)', border: `1px solid ${activeThemeConfig.border}`, borderRadius: '8px', padding: '10px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: activeThemeConfig.accent, textTransform: 'uppercase' }}>
                        🎨 gpt-5.6-luna Concept Prompt
                      </span>
                      <button 
                        onClick={() => copyToClipboard(dailyData.artPrompt, 'daily-prompt-h')}
                        style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '3px' }}
                      >
                        {copiedId === 'daily-prompt-h' ? <Check size={11} color="var(--accent-green)" /> : <Copy size={11} />}
                        <span>{copiedId === 'daily-prompt-h' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <p style={{ fontSize: '0.76rem', color: '#cbd5e1', lineHeight: 1.45, fontStyle: 'italic' }}>
                      "{dailyData.artPrompt}"
                    </p>
                  </div>
                )}

                {/* Summary */}
                <div style={{ fontSize: '0.84rem', color: '#94a3b8', lineHeight: 1.6, maxHeight: '180px', overflowY: 'auto', paddingRight: '6px', marginBottom: '14px' }}>
                  {dailyData.fact?.summary}
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '10px' }}>
                  <button 
                    onClick={() => setIsPromptExpanded(p => !p)}
                    style={{ background: 'transparent', border: 'none', color: activeThemeConfig.accent, cursor: 'pointer', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
                  >
                    <Sparkles size={12} />
                    <span>{isPromptExpanded ? 'Hide AI Prompt' : 'View AI Art Prompt'}</span>
                  </button>

                  <a href={dailyData.fullAppUrl || 'http://20.236.29.216:5000'} target="_blank" rel="noopener noreferrer" style={{ color: activeThemeConfig.accent, textDecoration: 'none', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <span>Open Darkside App</span>
                    <ExternalLink size={11} />
                  </a>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* View 2: Random Card Draw (Roulette) */}
      {activeView === 'roulette' && (
        <div className="animate-fade-in">
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              flexWrap: 'wrap', 
              gap: '0.75rem', 
              marginBottom: '1.25rem',
              padding: '0.75rem 1rem',
              background: 'rgba(10, 14, 22, 0.6)',
              borderRadius: '10px',
              border: '1px solid var(--border-glass)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Filter Category:</span>
              <select
                value={randomCategory}
                onChange={(e) => setRandomCategory(e.target.value)}
                style={{
                  background: 'rgba(0,0,0,0.6)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fff',
                  padding: '0.3rem 0.6rem',
                  borderRadius: '6px',
                  fontSize: '0.78rem'
                }}
              >
                <option value="">All Hollywood Categories</option>
                {HOLLYWOOD_CATEGORIES.filter(c => c !== 'All').map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '0.4rem' }}>Wildness:</span>
              <select
                value={randomWildness}
                onChange={(e) => setRandomWildness(Number(e.target.value))}
                style={{
                  background: 'rgba(0,0,0,0.6)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fff',
                  padding: '0.3rem 0.6rem',
                  borderRadius: '6px',
                  fontSize: '0.78rem'
                }}
              >
                {[5, 4, 3, 2, 1].map(r => (
                  <option key={r} value={r}>{'🔥'.repeat(r)} ({r} Flames)</option>
                ))}
              </select>
            </div>

            <button
              className="btn btn-primary"
              onClick={drawRandomCard}
              disabled={randomLoading}
              style={{
                padding: '0.45rem 1rem',
                fontSize: '0.82rem',
                background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
                borderColor: '#eab308',
                color: '#000',
                fontWeight: 700
              }}
            >
              <Dices size={15} className={randomLoading ? 'animate-spin' : ''} />
              <span>{randomLoading ? 'Drawing Card...' : 'Draw Another Card'}</span>
            </button>
          </div>

          {/* Card Result */}
          {randomCard && (
            <div 
              className="glass-card" 
              style={{
                maxWidth: '650px',
                margin: '0 auto',
                padding: '1.5rem',
                border: '1.5px solid rgba(234, 179, 8, 0.4)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.7), 0 0 20px rgba(234, 179, 8, 0.2)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.6rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="badge badge-amber">{randomCard.category || 'Hollywood'}</span>
                  {randomCard.era && <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>{randomCard.era}</span>}
                  {randomCard.is_myth && <span className="badge badge-purple">Urban Legend</span>}
                </div>
                <span style={{ fontSize: '0.82rem', color: '#ffb703', fontWeight: 700 }}>
                  {'🔥'.repeat(randomCard.wildness || randomWildness)} Rating {randomCard.wildness || randomWildness}/5
                </span>
              </div>

              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '0.6rem', lineHeight: 1.3 }}>
                {randomCard.headline}
              </h3>

              {randomCard.subject && (
                <div style={{ fontSize: '0.82rem', color: '#facc15', fontWeight: 600, marginBottom: '0.75rem' }}>
                  Subject: {randomCard.subject}
                </div>
              )}

              <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: 1.6, marginBottom: '1.2rem', whiteSpace: 'pre-line' }}>
                {randomCard.summary}
              </p>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => copyToClipboard(`${randomCard.headline}\n\n${randomCard.summary}`, randomCard.id || 'card')}
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.76rem' }}
                >
                  {copiedId === (randomCard.id || 'card') ? <Check size={13} color="var(--accent-green)" /> : <Copy size={13} />}
                  <span>{copiedId === (randomCard.id || 'card') ? 'Copied' : 'Copy Text'}</span>
                </button>

                <a
                  href={`http://20.236.29.216:5000/?factId=${randomCard.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '0.78rem', color: '#facc15', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  <span>Open in Full App</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* View 3: Lore Explorer & Search */}
      {activeView === 'browse' && (
        <div className="animate-fade-in">
          <div 
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '0.75rem', 
              marginBottom: '1.25rem',
              padding: '0.85rem 1rem',
              background: 'rgba(10, 14, 22, 0.6)',
              borderRadius: '10px',
              border: '1px solid var(--border-glass)'
            }}
          >
            {/* Search Input Bar */}
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Search Hollywood scandals, cursed sets, actor/director lore (e.g. Marilyn Monroe, Twilight Zone)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') executeBrowse(searchTerm, selectedCategory);
                  }}
                  style={{
                    width: '100%',
                    padding: '0.55rem 1rem 0.55rem 2.4rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(0,0,0,0.5)',
                    color: '#fff',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              <button
                className="btn btn-primary"
                onClick={() => executeBrowse(searchTerm, selectedCategory)}
                disabled={browseLoading}
                style={{
                  padding: '0.55rem 1.1rem',
                  fontSize: '0.82rem',
                  background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
                  color: '#000',
                  fontWeight: 700
                }}
              >
                <Search size={14} />
                <span>Search</span>
              </button>
            </div>

            {/* Category Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              {HOLLYWOOD_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    executeBrowse(searchTerm, cat);
                  }}
                  style={{
                    padding: '0.25rem 0.65rem',
                    fontSize: '0.74rem',
                    borderRadius: '20px',
                    border: selectedCategory === cat ? '1px solid #eab308' : '1px solid rgba(255,255,255,0.08)',
                    background: selectedCategory === cat ? 'rgba(234, 179, 8, 0.25)' : 'rgba(255,255,255,0.02)',
                    color: selectedCategory === cat ? '#fff' : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontWeight: selectedCategory === cat ? 700 : 500
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Results Grid */}
          {browseLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <RefreshCw size={28} className="animate-spin" color="#eab308" style={{ marginBottom: '0.8rem' }} />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Querying Dark Side of Hollywood database...</p>
            </div>
          ) : browseResults.length === 0 ? (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <Film size={32} color="var(--text-dim)" style={{ marginBottom: '0.8rem' }} />
              <h4 style={{ color: '#fff', marginBottom: '0.3rem' }}>No Chronicles Found</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Try broadening your search term or selecting 'All' categories.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
              {browseResults.map((item) => (
                <div 
                  key={item.id} 
                  className="glass-card" 
                  style={{
                    padding: '1.1rem',
                    border: '1px solid rgba(234, 179, 8, 0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <span className="badge badge-amber" style={{ fontSize: '0.62rem' }}>{item.category}</span>
                        {item.era && <span className="badge" style={{ fontSize: '0.62rem', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>{item.era}</span>}
                      </div>
                      <span style={{ fontSize: '0.74rem', color: '#ffb703', fontWeight: 700 }}>
                        {'🔥'.repeat(item.wildness || 3)}
                      </span>
                    </div>

                    <h4 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#fff', marginBottom: '0.4rem', lineHeight: 1.3 }}>
                      {item.headline}
                    </h4>

                    {item.subject && (
                      <div style={{ fontSize: '0.76rem', color: '#facc15', marginBottom: '0.5rem', fontWeight: 600 }}>
                        {item.subject}
                      </div>
                    )}

                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '0.8rem', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {item.summary}
                    </p>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.6rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <button
                      className="btn-icon"
                      onClick={() => copyToClipboard(`${item.headline}\n\n${item.summary}`, item.id)}
                      title="Copy summary"
                      style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                    >
                      {copiedId === item.id ? <Check size={12} color="var(--accent-green)" /> : <Copy size={12} />}
                      <span>{copiedId === item.id ? 'Copied' : 'Copy'}</span>
                    </button>

                    <a
                      href={`http://20.236.29.216:5000/?factId=${item.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '0.74rem', color: '#facc15', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      <span>Explore</span>
                      <ExternalLink size={11} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
