import React, { useState } from 'react';
import { ExternalLink, RefreshCw, Music } from 'lucide-react';

export default function VibeQWidget() {
  const [iframeKey, setIframeKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const handleRefresh = () => {
    setIsLoading(true);
    setIframeKey((prev) => prev + 1);
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '1.25rem', marginBottom: '2rem' }}>
      {/* VibeQ Section Banner */}
      <div className="section-banner-card" style={{ marginBottom: '1.2rem' }}>
        <img 
          src="/banners/banner-vibeq.jpg" 
          alt="VibeQ Music Engine" 
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
          background: 'rgba(255, 0, 122, 0.08)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 0, 122, 0.25)',
          marginBottom: '1rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #ff007a 0%, #7928ca 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 12px rgba(255, 0, 122, 0.4)'
          }}>
            <Music size={17} color="#fff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff', letterSpacing: '0.02em' }}>
                VibeQ Music Streamer
              </span>
              <span className="badge" style={{ background: 'rgba(255, 0, 122, 0.2)', color: '#ff55b0', border: '1px solid rgba(255, 0, 122, 0.4)', fontSize: '0.65rem' }}>
                LIVE AUDIO
              </span>
            </div>
            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              Interactive Music Experience & Playlist Engine
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <button
            className="btn btn-secondary"
            onClick={handleRefresh}
            title="Reload VibeQ player"
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Reload</span>
          </button>

          <a
            href="https://vibeq.hooray.lol/music"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{
              padding: '0.45rem 0.95rem',
              fontSize: '0.82rem',
              background: 'linear-gradient(135deg, #ff007a 0%, #7928ca 100%)',
              borderColor: '#ff007a'
            }}
          >
            <ExternalLink size={14} />
            <span>Open Popout</span>
          </a>
        </div>
      </div>

      {/* Embedded Iframe Container */}
      <div 
        style={{
          position: 'relative',
          width: '100%',
          height: '82vh',
          minHeight: '680px',
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid rgba(255, 0, 122, 0.3)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 20px rgba(255, 0, 122, 0.15)',
          background: '#0a0a0f'
        }}
      >
        <iframe
          key={iframeKey}
          src="https://vibeq.hooray.lol/music"
          title="VibeQ Music Player"
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            display: 'block',
            background: '#0a0a0f'
          }}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture; microphone"
          onLoad={() => setIsLoading(false)}
        />
      </div>
    </div>
  );
}
