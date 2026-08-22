import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Trash2, 
  Sparkles, 
  Film, 
  Tv, 
  Music, 
  Gamepad2, 
  Globe, 
  BookOpen, 
  Zap, 
  Copy, 
  Check, 
  Flame, 
  Layers, 
  Database,
  Search,
  ExternalLink
} from 'lucide-react';
import { 
  sendPopCultureMessage, 
  fetchPopCultureStatus, 
  fetchPopCultureGreeting 
} from '../services/api';

const QUICK_PROMPTS = [
  { label: "🎬 Rate & Synopsis: Inception", prompt: "Look up Inception (2010) on OMDb. Give me the IMDb rating, Metascore, director, and plot synopsis." },
  { label: "🍿 Christopher Nolan Multi-Search", prompt: "Search TMDb for Christopher Nolan and summarize his top movies, popularity score, and biography." },
  { label: "📺 Stranger Things Cast & Schedule", prompt: "Look up Stranger Things on TVMaze and give me the network, status, schedule, and main cast." },
  { label: "🎮 Portal 2 Platforms & Metacritic", prompt: "Search RAWG for Portal 2. What are the platforms, ratings, and Metacritic score?" },
  { label: "🎵 Bohemian Rhapsody Genius Metadata", prompt: "Search Genius for Bohemian Rhapsody by Queen. Give me the release date, annotation count, and track insights." },
  { label: "🌐 Academy Award Best Picture Winners", prompt: "Query Wikidata SPARQL to find recent Academy Award for Best Picture winning films." },
  { label: "📖 Cyberpunk Genre Cultural Lore", prompt: "Search Wikipedia for the Cyberpunk genre and give me a breakdown of its origins and core themes." }
];

export default function PopCultureWidget() {
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('genius_machine_messages_v1');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeToolStatus, setActiveToolStatus] = useState('');
  const [agentStatus, setAgentStatus] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    fetchPopCultureStatus()
      .then(st => setAgentStatus(st))
      .catch(e => console.warn('[Genius Status Error]', e));

    if (messages.length === 0) {
      setLoading(true);
      setActiveToolStatus('⚡ Initializing Genius Machine...');
      fetchPopCultureGreeting()
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
        .catch(e => console.warn('[Genius Greeting Error]', e))
        .finally(() => {
          setLoading(false);
          setActiveToolStatus('');
        });
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('genius_machine_messages_v1', JSON.stringify(messages));
    } catch (e) {
      console.warn('[LocalStorage Error]', e);
    }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

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

    const lower = text.toLowerCase();
    if (lower.includes('game') || lower.includes('steam') || lower.includes('playstation') || lower.includes('xbox') || lower.includes('nintendo')) {
      setActiveToolStatus('🎮 Querying RAWG Video Games Database...');
    } else if (lower.includes('song') || lower.includes('music') || lower.includes('album') || lower.includes('track') || lower.includes('genius')) {
      setActiveToolStatus('🎵 Querying Genius Music Metadata...');
    } else if (lower.includes('tv') || lower.includes('show') || lower.includes('schedule') || lower.includes('air') || lower.includes('season')) {
      setActiveToolStatus('📺 Querying TVMaze Schedule & Cast...');
    } else if (lower.includes('sparql') || lower.includes('wikidata') || lower.includes('oscar') || lower.includes('co-star') || lower.includes('both in')) {
      setActiveToolStatus('🌐 Executing Wikidata SPARQL Query...');
    } else if (lower.includes('movie') || lower.includes('film') || lower.includes('imdb') || lower.includes('omdb') || lower.includes('tmdb') || lower.includes('actor') || lower.includes('director')) {
      setActiveToolStatus('🎬 Querying OMDb & TMDb Multi-Search...');
    } else {
      setActiveToolStatus('⚡ Routing via GPT-5 Tool Calling...');
    }

    try {
      const apiHistory = newMessages.slice(-10).map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await sendPopCultureMessage({
        messages: apiHistory.slice(0, -1),
        userMessage: text
      });

      const assistantReply = {
        role: 'assistant',
        content: res.reply || "Pop culture query executed.",
        toolCalls: res.toolCalls || [],
        deployment: res.deployment || 'gpt-5-pop-culture-agent',
        mode: res.mode,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, assistantReply]);
    } catch (err) {
      console.error('[Genius Machine Send Error]', err);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ **Error connecting to Genius Machine**: ${err.message}. Running local tool fallback engine.`,
          isError: true,
          timestamp: Date.now()
        }
      ]);
    } finally {
      setLoading(false);
      setActiveToolStatus('');
    }
  };

  const handleClearHistory = () => {
    if (window.confirm('Clear Genius Machine conversation history?')) {
      setMessages([]);
      localStorage.removeItem('genius_machine_messages_v1');
      setLoading(true);
      setActiveToolStatus('⚡ Initializing Genius Machine...');
      fetchPopCultureGreeting()
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
        .catch(e => console.warn('[Greeting Error]', e))
        .finally(() => {
          setLoading(false);
          setActiveToolStatus('');
        });
    }
  };

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const formatTimestamp = (ts) => {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const getToolIcon = (toolName) => {
    switch (toolName) {
      case 'search_omdb':
      case 'omdb':
        return <Film size={13} color="#00e5ff" />;
      case 'search_tmdb':
      case 'tmdb':
        return <Film size={13} color="#ff0080" />;
      case 'search_tvmaze':
      case 'tvmaze':
        return <Tv size={13} color="#00e676" />;
      case 'search_rawg':
      case 'rawg':
        return <Gamepad2 size={13} color="#ff9100" />;
      case 'search_genius':
      case 'genius':
        return <Music size={13} color="#ffd700" />;
      case 'query_wikidata':
      case 'wikidata':
        return <Globe size={13} color="#7928ca" />;
      case 'search_wikipedia':
      case 'wikipedia':
        return <BookOpen size={13} color="#00b0ff" />;
      default:
        return <Sparkles size={13} color="#00e5ff" />;
    }
  };

  const renderFormattedText = (content) => {
    if (!content) return null;
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-');
      const cleanLine = isBullet ? line.trim().replace(/^[•\-]\s*/, '') : line;
      const parts = cleanLine.split(/(\*\*.*?\*\*|\*.*?\*)/g);

      const renderedParts = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={pIdx} style={{ color: '#fff', fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('*') && part.endsWith('*')) {
          return <em key={pIdx} style={{ color: 'var(--accent-cyan)' }}>{part.slice(1, -1)}</em>;
        }
        return part;
      });

      if (isBullet) {
        return (
          <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.35rem', paddingLeft: '0.4rem' }}>
            <span style={{ color: 'var(--accent-cyan)' }}>•</span>
            <div>{renderedParts}</div>
          </div>
        );
      }

      if (!line.trim()) {
        return <div key={idx} style={{ height: '0.6rem' }} />;
      }

      return (
        <div key={idx} style={{ marginBottom: '0.35rem', lineHeight: '1.55' }}>
          {renderedParts}
        </div>
      );
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', marginBottom: '2rem' }}>
      {/* Section Header Banner */}
      <div className="section-banner-card">
        <img 
          src="/banners/banner-genius.jpg" 
          alt="Genius Machine - Pop Culture Foundry Agent" 
          style={{ width: '100%', maxHeight: '240px', objectFit: 'cover', borderRadius: '16px' }}
        />
      </div>

      {/* Top Bar: Agent Telemetry & 7 Engine Status */}
      <div className="glass-panel" style={{
        padding: '1.2rem 1.6rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        border: '1px solid rgba(0, 229, 255, 0.3)',
        background: 'linear-gradient(135deg, rgba(0, 229, 255, 0.08) 0%, rgba(121, 40, 202, 0.08) 100%)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #00e5ff 0%, #7928ca 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 25px rgba(0, 229, 255, 0.5)'
          }}>
            <Sparkles size={26} color="#fff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: '#fff' }}>
                Genius <span className="gradient-text">Machine</span>
              </h2>
              <span className="badge badge-purple" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}>
                GPT-5 TOOL-CALLING
              </span>
              <span className="badge badge-cyan" style={{ fontSize: '0.68rem' }}>
                7 LIVE ENGINES
              </span>
              <span className="badge badge-green" style={{ fontSize: '0.68rem' }}>
                COPYRIGHT SAFE
              </span>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
              Pop Culture Foundry Agent • OMDb • TMDb • TVMaze • RAWG • Genius • Wikidata SPARQL • Wikipedia
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleClearHistory}
            className="btn btn-secondary"
            title="Clear Chat History"
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Trash2 size={14} />
            <span>Clear History</span>
          </button>
        </div>
      </div>

      {/* 7 Engine Active Badges Strip */}
      <div className="glass-panel" style={{ padding: '0.8rem 1.2rem' }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Database size={14} color="var(--accent-cyan)" />
          <span>7 INTEGRATED LIVE KNOWLEDGE ENGINES</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div className="badge badge-cyan" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.65rem' }}>
            <Film size={13} /> <span>OMDb (Ratings/Plot)</span>
          </div>
          <div className="badge badge-pink" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.65rem' }}>
            <Film size={13} /> <span>TMDb (Multi-Search)</span>
          </div>
          <div className="badge badge-green" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.65rem' }}>
            <Tv size={13} /> <span>TVMaze (Schedules/Cast)</span>
          </div>
          <div className="badge badge-amber" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.65rem' }}>
            <Gamepad2 size={13} /> <span>RAWG (Video Games)</span>
          </div>
          <div className="badge badge-yellow" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.65rem', color: '#ffd700', borderColor: 'rgba(255, 215, 0, 0.4)' }}>
            <Music size={13} /> <span>Genius (Music Metadata)</span>
          </div>
          <div className="badge badge-purple" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.65rem' }}>
            <Globe size={13} /> <span>Wikidata (SPARQL Trivia)</span>
          </div>
          <div className="badge badge-blue" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.65rem', color: '#00b0ff', borderColor: 'rgba(0, 176, 255, 0.4)' }}>
            <BookOpen size={13} /> <span>Wikipedia (Fallback)</span>
          </div>
        </div>
      </div>

      {/* Quick Prompt Chips Bar */}
      <div className="glass-panel" style={{ padding: '0.8rem 1.2rem' }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Sparkles size={14} color="var(--accent-cyan)" />
          <span>POP CULTURE PROMPT CHIPS</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {QUICK_PROMPTS.map((qp, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(qp.prompt)}
              disabled={loading}
              className="btn btn-secondary"
              style={{
                fontSize: '0.78rem',
                padding: '0.45rem 0.85rem',
                borderRadius: '20px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.12)'
              }}
            >
              {qp.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Conversation Window */}
      <div className="glass-panel" style={{
        padding: '1.4rem',
        minHeight: '480px',
        maxHeight: '680px',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '16px'
      }}>
        {/* Messages Feed */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingRight: '0.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.1rem'
        }}>
          {messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={index}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isUser ? 'flex-end' : 'flex-start',
                  maxWidth: '100%'
                }}
              >
                <div style={{
                  maxWidth: '85%',
                  padding: '0.9rem 1.2rem',
                  borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: isUser 
                    ? 'linear-gradient(135deg, #0070f3 0%, #7928ca 100%)' 
                    : 'rgba(255, 255, 255, 0.05)',
                  border: isUser 
                    ? '1px solid rgba(0, 229, 255, 0.35)' 
                    : '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#fff',
                  fontSize: '0.92rem',
                  boxShadow: isUser 
                    ? '0 6px 20px rgba(0, 112, 243, 0.3)' 
                    : '0 4px 15px rgba(0, 0, 0, 0.25)',
                  position: 'relative'
                }}>
                  {renderFormattedText(msg.content)}

                  {/* Tool Invocations Badge */}
                  {msg.toolCalls && msg.toolCalls.length > 0 && (
                    <div style={{
                      marginTop: '0.8rem',
                      paddingTop: '0.6rem',
                      borderTop: '1px solid rgba(255, 255, 255, 0.12)',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.4rem'
                    }}>
                      {msg.toolCalls.map((tc, tcIdx) => (
                        <span
                          key={tcIdx}
                          className="badge badge-purple"
                          style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.2rem 0.55rem' }}
                        >
                          {getToolIcon(tc.tool)}
                          <span>Tool: <strong>{tc.tool}</strong></span>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Copy Button */}
                  {!isUser && (
                    <button
                      onClick={() => copyToClipboard(msg.content, index)}
                      title="Copy response"
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '4px 6px',
                        cursor: 'pointer',
                        color: 'var(--text-muted)'
                      }}
                    >
                      {copiedIndex === index ? <Check size={12} color="#00e676" /> : <Copy size={12} />}
                    </button>
                  )}
                </div>

                <span style={{
                  fontSize: '0.7rem',
                  color: 'var(--text-muted)',
                  marginTop: '0.3rem',
                  padding: '0 0.4rem'
                }}>
                  {isUser ? 'You' : 'Genius Machine (GPT-5)'} • {formatTimestamp(msg.timestamp)}
                </span>
              </div>
            );
          })}

          {/* Active Loading & Thinking Status */}
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.4rem' }}>
              <div style={{
                padding: '0.75rem 1.1rem',
                borderRadius: '18px 18px 18px 4px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(0, 229, 255, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                fontSize: '0.88rem',
                color: 'var(--accent-cyan)'
              }}>
                <Sparkles size={16} className="spin-slow" />
                <span>{activeToolStatus || 'Routing via GPT-5 Tool Calling...'}</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div style={{
          marginTop: '1.2rem',
          paddingTop: '1rem',
          borderTop: '1px solid var(--border-glass)'
        }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            style={{ display: 'flex', gap: '0.7rem', alignItems: 'center' }}
          >
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask about movies (OMDb/TMDb), TV shows (TVMaze), games (RAWG), songs (Genius), or trivia (Wikidata)..."
              disabled={loading}
              style={{
                flex: 1,
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                borderRadius: '12px',
                padding: '0.85rem 1.2rem',
                color: '#fff',
                fontSize: '0.92rem',
                outline: 'none',
                transition: 'all 0.2s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent-cyan)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.18)'}
            />

            <button
              type="submit"
              disabled={!inputText.trim() || loading}
              className="btn btn-primary"
              style={{
                padding: '0.85rem 1.4rem',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.9rem',
                opacity: !inputText.trim() || loading ? 0.5 : 1
              }}
            >
              <span>Send</span>
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
