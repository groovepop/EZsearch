import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Trash2, 
  Sparkles, 
  Tv, 
  Music, 
  Zap, 
  Flame, 
  ArrowRight,
  Copy,
  Check,
  RefreshCw,
  Cpu,
  Layers
} from 'lucide-react';
import { 
  sendDeepSeekMessage, 
  fetchDeepSeekStatus, 
  fetchDeepSeekGreeting, 
  fetchDeepSeekVersions, 
  refreshFoundryVersions 
} from '../services/api';

const QUICK_PROMPTS = [
  { label: "⚡ Sonic Chaos & Deep Cuts", prompt: "Recommend a wild, aggressive underground music album that breaks every rule in the book." },
  { label: "📺 Psychological Mind-Bender", prompt: "What psychological thriller or surreal dark TV series will completely shatter my reality?" },
  { label: "🌀 Unfiltered Pop Roast", prompt: "Roast the state of modern television and over-produced algorithmic pop music with zero filter." },
  { label: "🍿 Cult Classic Soundtracks", prompt: "What obscure cult film has an unforgettable music score that deserves way more love?" },
  { label: "🌌 Legendary Studio Lore", prompt: "Tell me an unbelievable behind-the-scenes music recording or television disaster story." }
];

export default function DeepSeekWidget() {
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('ez_deepseek_messages_v1');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [deepseekStatus, setDeepseekStatus] = useState(null);
  const [selectedVersion, setSelectedVersion] = useState('latest');
  const [versionsData, setVersionsData] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Load initial status and dynamic versions
  const loadStatusAndVersions = async (force = false) => {
    try {
      const [status, versions] = await Promise.all([
        fetchDeepSeekStatus(),
        fetchDeepSeekVersions(force)
      ]);
      setDeepseekStatus(status);
      if (versions) setVersionsData(versions);
    } catch (e) {
      console.warn('[DeepSeek Status Error]', e);
    }
  };

  useEffect(() => {
    loadStatusAndVersions();

    if (messages.length === 0) {
      setLoading(true);
      fetchDeepSeekGreeting(selectedVersion)
        .then(res => {
          if (res && res.greeting) {
            setMessages([
              {
                role: 'assistant',
                content: res.greeting,
                timestamp: Date.now()
              }
            ]);
          }
        })
        .catch(e => console.warn('[DeepSeek Greeting Error]', e))
        .finally(() => setLoading(false));
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('ez_deepseek_messages_v1', JSON.stringify(messages));
    } catch (e) {
      console.warn('[LocalStorage Error]', e);
    }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSyncFoundry = async () => {
    setIsSyncing(true);
    try {
      await refreshFoundryVersions();
      await loadStatusAndVersions(true);
    } catch (e) {
      console.error('[Foundry Sync Error]', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputText).trim();
    if (!text || loading) return;

    const userMsg = {
      role: 'user',
      content: text,
      timestamp: Date.now()
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputText('');
    setLoading(true);

    try {
      const apiHistory = newMessages.slice(-10).map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await sendDeepSeekMessage({
        messages: apiHistory.slice(0, -1),
        userMessage: text,
        version: selectedVersion
      });

      const assistantReply = {
        role: 'assistant',
        content: res.reply || "DeepSeek portal transmission received!",
        agent: res.agent || 'ez-deepseek:latest',
        model: res.model || 'DeepSeek-V4-Flash',
        timestamp: Date.now()
      };

      setMessages([...newMessages, assistantReply]);
    } catch (err) {
      console.error('[DeepSeek Chat Error]', err);
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: `⚠️ **Portal Disruption**: ${err.message || 'Failed to reach ez-deepseek.'}`,
          timestamp: Date.now()
        }
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleClearHistory = () => {
    if (window.confirm("Clear your conversation with EZ-DeepSeek?")) {
      setMessages([]);
      localStorage.removeItem('ez_deepseek_messages_v1');
      fetchDeepSeekGreeting(selectedVersion).then(res => {
        if (res && res.greeting) {
          setMessages([
            {
              role: 'assistant',
              content: res.greeting,
              timestamp: Date.now()
            }
          ]);
        }
      });
    }
  };

  const copyToClipboard = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const activeVersionDisplay = versionsData?.latestVersionNumber 
    ? `v${versionsData.latestVersionNumber}` 
    : (deepseekStatus?.activeVersion ? `v${deepseekStatus.activeVersion}` : 'v2');

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* 1. Hero Banner */}
      <div className="section-banner-card" style={{ border: '1px solid rgba(0, 229, 255, 0.3)', boxShadow: '0 0 25px rgba(0, 229, 255, 0.15)' }}>
        <img 
          src="/banners/banner-ds4.jpg" 
          alt="EZ DeepSeek Banner" 
          style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '180px', objectFit: 'cover' }}
        />
      </div>

      {/* 2. Chat Widget Container */}
      <div className="glass-panel" style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: '620px', 
        padding: '0', 
        overflow: 'hidden',
        border: '1px solid rgba(0, 229, 255, 0.25)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)'
      }}>
        {/* Header Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.85rem 1.25rem',
          background: 'linear-gradient(180deg, rgba(0, 229, 255, 0.12) 0%, rgba(16, 24, 39, 0.8) 100%)',
          borderBottom: '1px solid rgba(0, 229, 255, 0.2)',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #00e5ff 0%, #10b981 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(0, 229, 255, 0.45)'
            }}>
              <Cpu size={22} color="#fff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#fff', letterSpacing: '0.02em' }}>
                  EZ <span style={{ color: '#00e5ff', textShadow: '0 0 12px rgba(0, 229, 255, 0.5)' }}>DeepSeek</span>
                </h3>
                <span className="badge" style={{ background: 'rgba(0, 229, 255, 0.2)', color: '#00e5ff', border: '1px solid rgba(0, 229, 255, 0.4)', fontSize: '0.65rem', padding: '0.15rem 0.5rem' }}>
                  ez-deepseek
                </span>
                <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.4)', fontSize: '0.65rem', padding: '0.15rem 0.5rem' }}>
                  DeepSeek-V4-Flash
                </span>
                <span className="badge badge-purple" style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem' }}>
                  Auto-Sync {activeVersionDisplay}
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.15rem' }}>
                <Tv size={11} color="#00e5ff" />
                <span>Portal Assistant</span>
                <span style={{ opacity: 0.5 }}>•</span>
                <Music size={11} color="#34d399" />
                <span>Wild Music & TV Specialist</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {/* Version Dynamic Selector */}
            {versionsData?.allVersions?.length > 1 && (
              <select
                value={selectedVersion}
                onChange={(e) => setSelectedVersion(e.target.value)}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  color: '#fff',
                  border: '1px solid rgba(0, 229, 255, 0.3)',
                  borderRadius: '8px',
                  padding: '0.3rem 0.6rem',
                  fontSize: '0.72rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="latest" style={{ background: '#10141e' }}>Latest Auto ({activeVersionDisplay})</option>
                {versionsData.allVersions.map((v) => (
                  <option key={v.version} value={v.version} style={{ background: '#10141e' }}>
                    Version {v.version} ({v.model || 'DeepSeek'})
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={handleSyncFoundry}
              disabled={isSyncing}
              title="Sync latest agent version from Azure AI Foundry Playground"
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', borderRadius: '8px' }}
            >
              <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} style={{ marginRight: '0.25rem' }} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Foundry'}</span>
            </button>

            <button
              onClick={handleClearHistory}
              title="Clear Conversation"
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', borderRadius: '8px' }}
            >
              <Trash2 size={12} style={{ marginRight: '0.25rem' }} />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Quick Starters Carousel */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.6rem 1.25rem',
          background: 'rgba(10, 15, 24, 0.5)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          overflowX: 'auto',
          scrollbarWidth: 'none'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem', color: '#00e5ff', fontWeight: 700, whiteSpace: 'nowrap' }}>
            <Flame size={13} />
            <span>PORTAL PICKS:</span>
          </div>
          {QUICK_PROMPTS.map((qp, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(qp.prompt)}
              disabled={loading}
              style={{
                background: 'rgba(0, 229, 255, 0.08)',
                color: '#fff',
                border: '1px solid rgba(0, 229, 255, 0.25)',
                borderRadius: '20px',
                padding: '0.25rem 0.75rem',
                fontSize: '0.72rem',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 229, 255, 0.25)';
                e.currentTarget.style.borderColor = '#00e5ff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(0, 229, 255, 0.08)';
                e.currentTarget.style.borderColor = 'rgba(0, 229, 255, 0.25)';
              }}
            >
              <span>{qp.label}</span>
              <ArrowRight size={10} opacity={0.6} />
            </button>
          ))}
        </div>

        {/* Chat Messages List */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          maxHeight: '480px'
        }}>
          {messages.map((m, idx) => {
            const isUser = m.role === 'user';
            return (
              <div 
                key={idx} 
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isUser ? 'flex-end' : 'flex-start',
                  gap: '0.3rem'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.68rem',
                  color: 'var(--text-dim)',
                  paddingLeft: isUser ? 0 : '0.25rem',
                  paddingRight: isUser ? '0.25rem' : 0
                }}>
                  {!isUser && <Cpu size={11} color="#00e5ff" />}
                  <span>{isUser ? 'You' : 'EZ-DeepSeek'}</span>
                  {m.timestamp && (
                    <span>• {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  )}
                </div>

                <div 
                  style={{
                    maxWidth: '85%',
                    padding: '0.85rem 1.15rem',
                    borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: isUser 
                      ? 'linear-gradient(135deg, rgba(0, 229, 255, 0.3) 0%, rgba(16, 185, 129, 0.4) 100%)' 
                      : 'rgba(17, 24, 39, 0.85)',
                    border: isUser 
                      ? '1px solid rgba(0, 229, 255, 0.5)' 
                      : '1px solid rgba(0, 229, 255, 0.25)',
                    boxShadow: isUser 
                      ? '0 4px 14px rgba(0, 229, 255, 0.2)' 
                      : '0 4px 16px rgba(0, 0, 0, 0.35)',
                    color: '#fff',
                    fontSize: '0.92rem',
                    lineHeight: '1.55',
                    position: 'relative'
                  }}
                  className="chat-message-bubble"
                >
                  <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {m.content}
                  </div>

                  {!isUser && (
                    <button
                      onClick={() => copyToClipboard(m.content, idx)}
                      title="Copy response"
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '6px',
                        color: 'var(--text-muted)',
                        padding: '0.2rem 0.4rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.2rem',
                        fontSize: '0.65rem'
                      }}
                    >
                      {copiedIndex === idx ? <Check size={11} color="var(--accent-green)" /> : <Copy size={11} />}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#00e5ff', fontSize: '0.85rem', padding: '0.5rem' }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                border: '2px solid #00e5ff',
                borderTopColor: 'transparent',
                animation: 'spin 0.8s linear infinite'
              }} />
              <span style={{ fontWeight: 600 }}>⚡ DeepSeek-V4-Flash portal syncing...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Footer */}
        <div style={{
          padding: '0.85rem 1.25rem',
          background: 'rgba(10, 15, 24, 0.95)',
          borderTop: '1px solid rgba(0, 229, 255, 0.2)'
        }}>
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}
          >
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask EZ-DeepSeek for chaotic music picks, mind-bending TV, or portal madness..."
              disabled={loading}
              style={{
                flex: 1,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(0, 229, 255, 0.3)',
                borderRadius: '12px',
                padding: '0.75rem 1rem',
                color: '#fff',
                fontSize: '0.9rem',
                outline: 'none',
                transition: 'all 0.2s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = '#00e5ff'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(0, 229, 255, 0.3)'}
            />

            <button
              type="submit"
              disabled={!inputText.trim() || loading}
              className="btn btn-primary"
              style={{
                padding: '0.75rem 1.25rem',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #00e5ff 0%, #10b981 100%)',
                border: 'none',
                boxShadow: '0 0 15px rgba(0, 229, 255, 0.4)',
                cursor: !inputText.trim() || loading ? 'not-allowed' : 'pointer',
                opacity: !inputText.trim() || loading ? 0.6 : 1
              }}
            >
              <Send size={16} style={{ marginRight: '0.35rem' }} />
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
