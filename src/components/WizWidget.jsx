import React, { useState } from 'react';
import { ExternalLink, RefreshCw, Lightbulb } from 'lucide-react';

export default function WizWidget() {
  const [iframeKey, setIframeKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const handleRefresh = () => {
    setIsLoading(true);
    setIframeKey((prev) => prev + 1);
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '1.25rem', marginBottom: '2rem' }}>
      {/* WiZ Section Banner */}
      <div 
        className="section-banner-card" 
        style={{ 
          marginBottom: '1.2rem',
          border: '1px solid rgba(255, 170, 0, 0.3)',
          boxShadow: '0 0 20px rgba(255, 170, 0, 0.15)',
          borderRadius: '12px',
          overflow: 'hidden'
        }}
      >
        <img 
          src="/banners/banner-wiz.jpg" 
          alt="WiZ Lamp Studio" 
          style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', background: '#04060c' }}
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
          background: 'rgba(255, 170, 0, 0.08)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 170, 0, 0.25)',
          marginBottom: '1rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #ffaa00 0%, #ff4500 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 12px rgba(255, 170, 0, 0.4)'
          }}>
            <Lightbulb size={17} color="#fff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff', letterSpacing: '0.02em' }}>
                WiZ Lamp Studio
              </span>
              <span className="badge" style={{ background: 'rgba(255, 170, 0, 0.2)', color: '#ffaa00', border: '1px solid rgba(255, 170, 0, 0.4)', fontSize: '0.65rem' }}>
                LOCAL STUDIO
              </span>
            </div>
            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              Dual Smart Bulb Controller (http://127.0.0.1:8765)
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <button
            className="btn btn-secondary"
            onClick={handleRefresh}
            title="Reload WiZ Studio view"
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Reload</span>
          </button>

          <a
            href="http://127.0.0.1:8765"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{
              padding: '0.45rem 0.95rem',
              fontSize: '0.82rem',
              background: 'linear-gradient(135deg, #ffaa00 0%, #ff4500 100%)',
              borderColor: '#ffaa00',
              color: '#fff'
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
          height: '85vh',
          minHeight: '750px',
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid rgba(255, 170, 0, 0.3)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 20px rgba(255, 170, 0, 0.15)',
          background: '#0a0a0f'
        }}
      >
        <iframe
          key={iframeKey}
          src="http://127.0.0.1:8765"
          title="WiZ Lamp Studio"
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            display: 'block',
            background: '#0a0a0f'
          }}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          onLoad={() => setIsLoading(false)}
        />
      </div>
    </div>
  );
}
