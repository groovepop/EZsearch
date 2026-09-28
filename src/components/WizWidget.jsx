import React, { useState, useEffect, useRef } from 'react';
import { ExternalLink, RefreshCw, Lightbulb, Power, ArrowUpDown, Square, Play, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';

export default function WizWidget() {
  const [iframeKey, setIframeKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [statusData, setStatusData] = useState(null);
  const [actionMessage, setActionMessage] = useState('');
  const pollTimerRef = useRef(null);

  const fetchStatus = async () => {
    try {
      // First try local proxy endpoint
      const res = await fetch('/api/wiz/status');
      if (res.ok) {
        const data = await res.json();
        if (data.online) {
          setIsOnline(true);
          setStatusData(data);
          return true;
        }
      }
      
      // Fallback direct probe
      const directRes = await fetch('http://127.0.0.1:8765/api/status', { mode: 'cors' }).catch(() => null);
      if (directRes && directRes.ok) {
        const data = await directRes.json();
        setIsOnline(true);
        setStatusData(data);
        return true;
      }

      setIsOnline(false);
      setStatusData(null);
      return false;
    } catch (e) {
      setIsOnline(false);
      return false;
    }
  };

  useEffect(() => {
    fetchStatus();

    // Poll every 3 seconds while mounted
    pollTimerRef.current = setInterval(fetchStatus, 3000);
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  const handleRefresh = () => {
    setIsLoading(true);
    fetchStatus();
    setIframeKey((prev) => prev + 1);
  };

  const handleLaunch = async () => {
    setIsLaunching(true);
    setActionMessage('Launching WiZ background controller...');
    try {
      await fetch('/api/wiz/launch', { method: 'POST' });
      // Poll rapidly for up to 8 seconds
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        const active = await fetchStatus();
        if (active || attempts >= 8) {
          clearInterval(interval);
          setIsLaunching(false);
          if (active) {
            setActionMessage('Controller started successfully!');
            setTimeout(() => setActionMessage(''), 3000);
            setIframeKey((prev) => prev + 1);
          } else {
            setActionMessage('Could not verify controller startup. Please check C:\\Users\\tobin\\Downloads\\wiz');
            setTimeout(() => setActionMessage(''), 5000);
          }
        }
      }, 1000);
    } catch (err) {
      setIsLaunching(false);
      setActionMessage('Failed to trigger launch: ' + err.message);
      setTimeout(() => setActionMessage(''), 4000);
    }
  };

  const handleTogglePower = async (turnOn) => {
    try {
      await fetch('/api/wiz/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: 'both', power: turnOn })
      });
      fetchStatus();
      setActionMessage(turnOn ? 'Turned both bulbs ON' : 'Turned both bulbs OFF');
      setTimeout(() => setActionMessage(''), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSwap = async () => {
    try {
      await fetch('/api/wiz/swap', { method: 'POST' });
      fetchStatus();
      setActionMessage('Swapped Top & Bottom bulbs');
      setTimeout(() => setActionMessage(''), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStopEffect = async () => {
    try {
      await fetch('/api/wiz/effects/stop', { method: 'POST' });
      fetchStatus();
      setActionMessage('Custom effect stopped');
      setTimeout(() => setActionMessage(''), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  const topBulb = statusData?.bulbs?.top;
  const botBulb = statusData?.bulbs?.bottom;
  const isEffectRunning = statusData?.effect?.is_running;
  const effectName = statusData?.effect?.effect_name || statusData?.effect?.pattern;

  const getBulbRgb = (bulb) => {
    if (!bulb?.state?.power) return 'rgba(100, 116, 139, 0.4)';
    const rgb = bulb?.state?.rgb;
    if (rgb && rgb.length === 3) {
      return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
    }
    return '#ffd700';
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '1.25rem', marginBottom: '2rem' }}>
      {/* WiZ Section Banner */}
      <div 
        className="section-banner-card" 
        style={{ 
          marginBottom: '1.2rem', 
          border: '1px solid rgba(255, 170, 0, 0.35)', 
          boxShadow: '0 0 24px rgba(255, 170, 0, 0.15)',
          borderRadius: '14px',
          overflow: 'hidden'
        }}
      >
        <img 
          src="/banners/banner-wiz.jpg" 
          alt="WiZ Dual Lamp Studio" 
          style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', background: '#04060c' }}
          onError={(e) => {
            // Fallback gracefully if image path needs retry
            if (!e.currentTarget.src.includes('banner-main.jpg')) {
              e.currentTarget.src = '/banners/banner-main.jpg';
            }
          }}
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
          padding: '0.85rem 1.1rem',
          background: 'rgba(255, 170, 0, 0.08)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 170, 0, 0.25)',
          marginBottom: '1rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '9px',
            background: 'linear-gradient(135deg, #ffaa00 0%, #ff4500 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 14px rgba(255, 170, 0, 0.45)'
          }}>
            <Lightbulb size={18} color="#fff" />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.98rem', fontWeight: 800, color: '#fff', letterSpacing: '0.02em' }}>
                WiZ Lamp Studio
              </span>
              <span 
                className="badge" 
                style={{ 
                  background: isOnline ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', 
                  color: isOnline ? '#10b981' : '#ef4444', 
                  border: `1px solid ${isOnline ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                  fontSize: '0.65rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}
              >
                <span 
                  style={{ 
                    width: '6px', 
                    height: '6px', 
                    borderRadius: '50%', 
                    background: isOnline ? '#10b981' : '#ef4444',
                    boxShadow: isOnline ? '0 0 6px #10b981' : 'none'
                  }} 
                />
                {isOnline ? 'ONLINE (127.0.0.1:8765)' : 'OFFLINE'}
              </span>

              {isEffectRunning && (
                <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>
                  ⚡ {effectName || 'CUSTOM EFFECT'}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginTop: '0.15rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                Dual Full-Colour Lamp Controller
              </span>

              {isOnline && topBulb && botBulb && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {/* Top Bulb Indicator */}
                  <span 
                    title={`Top: ${topBulb.ip} (${topBulb.state?.power ? `${topBulb.state?.brightness_pct}%` : 'OFF'})`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      fontSize: '0.72rem',
                      background: 'rgba(255,255,255,0.06)',
                      padding: '0.1rem 0.45rem',
                      borderRadius: '10px',
                      color: 'var(--text-dim)'
                    }}
                  >
                    <span 
                      style={{ 
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '50%', 
                        background: getBulbRgb(topBulb),
                        boxShadow: topBulb.state?.power ? `0 0 8px ${getBulbRgb(topBulb)}` : 'none'
                      }} 
                    />
                    Top: {topBulb.state?.power ? `${topBulb.state?.brightness_pct}%` : 'OFF'}
                  </span>

                  {/* Bottom Bulb Indicator */}
                  <span 
                    title={`Bottom: ${botBulb.ip} (${botBulb.state?.power ? `${botBulb.state?.brightness_pct}%` : 'OFF'})`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      fontSize: '0.72rem',
                      background: 'rgba(255,255,255,0.06)',
                      padding: '0.1rem 0.45rem',
                      borderRadius: '10px',
                      color: 'var(--text-dim)'
                    }}
                  >
                    <span 
                      style={{ 
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '50%', 
                        background: getBulbRgb(botBulb),
                        boxShadow: botBulb.state?.power ? `0 0 8px ${getBulbRgb(botBulb)}` : 'none'
                      }} 
                    />
                    Bottom: {botBulb.state?.power ? `${botBulb.state?.brightness_pct}%` : 'OFF'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
          {actionMessage && (
            <span style={{ fontSize: '0.75rem', color: '#ffaa00', marginRight: '0.3rem', fontWeight: 600 }}>
              {actionMessage}
            </span>
          )}

          {!isOnline && (
            <button
              className="btn btn-primary"
              onClick={handleLaunch}
              disabled={isLaunching}
              style={{
                padding: '0.45rem 0.85rem',
                fontSize: '0.82rem',
                background: 'linear-gradient(135deg, #ffaa00 0%, #ff4500 100%)',
                borderColor: '#ffaa00',
                color: '#fff'
              }}
            >
              {isLaunching ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
              <span>{isLaunching ? 'Starting...' : 'Launch Studio'}</span>
            </button>
          )}

          {isOnline && (
            <>
              <button
                className="btn btn-secondary"
                onClick={() => handleTogglePower(true)}
                title="Turn both bulbs ON"
                style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem' }}
              >
                <Power size={13} color="var(--accent-green)" />
                <span>ON</span>
              </button>

              <button
                className="btn btn-secondary"
                onClick={() => handleTogglePower(false)}
                title="Turn both bulbs OFF"
                style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem' }}
              >
                <Power size={13} color="var(--accent-red)" />
                <span>OFF</span>
              </button>

              <button
                className="btn btn-secondary"
                onClick={handleSwap}
                title="Swap Top and Bottom physical bulb assignment"
                style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem' }}
              >
                <ArrowUpDown size={13} />
                <span>Swap</span>
              </button>

              {isEffectRunning && (
                <button
                  className="btn btn-secondary"
                  onClick={handleStopEffect}
                  title="Stop custom animation effect"
                  style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem', color: '#ef4444' }}
                >
                  <Square size={13} fill="#ef4444" />
                  <span>Stop FX</span>
                </button>
              )}
            </>
          )}

          <button
            className="btn btn-secondary"
            onClick={handleRefresh}
            title="Reload WiZ Studio view"
            style={{ padding: '0.45rem 0.8rem', fontSize: '0.82rem' }}
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
              padding: '0.45rem 0.85rem',
              fontSize: '0.82rem',
              background: 'linear-gradient(135deg, #ffaa00 0%, #ff6b35 100%)',
              borderColor: '#ffaa00',
              color: '#fff'
            }}
          >
            <ExternalLink size={14} />
            <span>Popout</span>
          </a>
        </div>
      </div>

      {/* Main View Container */}
      {!isOnline ? (
        <div 
          style={{
            padding: '3.5rem 1.5rem',
            textAlign: 'center',
            background: 'rgba(10, 12, 18, 0.75)',
            borderRadius: '12px',
            border: '1px dashed rgba(255, 170, 0, 0.3)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
          }}
        >
          <div 
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(255, 170, 0, 0.12)',
              border: '1px solid rgba(255, 170, 0, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.2rem auto',
              boxShadow: '0 0 20px rgba(255, 170, 0, 0.2)'
            }}
          >
            <Lightbulb size={28} color="#ffaa00" />
          </div>

          <h3 style={{ fontSize: '1.25rem', color: '#fff', marginBottom: '0.5rem', fontWeight: 700 }}>
            WiZ Controller Service is Offline
          </h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '580px', margin: '0 auto 1.5rem auto', fontSize: '0.88rem', lineHeight: '1.5' }}>
            The background controller manages your vertically stacked dual WiZ full-colour smart bulbs (<code style={{ color: '#00e5ff' }}>192.168.2.16</code> & <code style={{ color: '#00e5ff' }}>192.168.2.17</code>) via direct UDP on port 38899 with zero cloud dependency.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
            <button 
              className="btn btn-primary" 
              onClick={handleLaunch}
              disabled={isLaunching}
              style={{
                padding: '0.65rem 1.4rem',
                fontSize: '0.9rem',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #ffaa00 0%, #ff4500 100%)',
                borderColor: '#ffaa00',
                color: '#fff',
                boxShadow: '0 0 16px rgba(255, 170, 0, 0.35)'
              }}
            >
              {isLaunching ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
              <span>{isLaunching ? 'Starting Controller...' : 'Launch WiZ Studio Now'}</span>
            </button>

            <button 
              className="btn btn-secondary" 
              onClick={handleRefresh}
              style={{ padding: '0.65rem 1.2rem', fontSize: '0.9rem' }}
            >
              <RefreshCw size={15} />
              <span>Check Again</span>
            </button>
          </div>

          <div style={{ marginTop: '1.5rem', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
            💡 Quick Tip: You can also double-click <code>Launch_WiZ_Lamp.vbs</code> in <code>C:\Users\tobin\Downloads\wiz</code> to run silently in the background.
          </div>
        </div>
      ) : (
        <div 
          style={{
            position: 'relative',
            width: '100%',
            height: '85vh',
            minHeight: '780px',
            borderRadius: '12px',
            overflow: 'hidden',
            border: '1px solid rgba(255, 170, 0, 0.3)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 20px rgba(255, 170, 0, 0.12)',
            background: '#090b10'
          }}
        >
          <iframe
            key={iframeKey}
            src="http://127.0.0.1:8765"
            title="WiZ Dual Lamp Controller"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'block',
              background: '#090b10'
            }}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            onLoad={() => setIsLoading(false)}
          />
        </div>
      )}
    </div>
  );
}
