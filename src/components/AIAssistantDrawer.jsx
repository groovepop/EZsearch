import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Send, 
  X, 
  Trash2, 
  Sparkles, 
  Bus, 
  CloudSun, 
  Navigation, 
  ChevronDown, 
  Maximize2, 
  Minimize2, 
  Compass, 
  Film,
  Zap,
  Info
} from 'lucide-react';
import { sendAgentMessage, fetchAgentStatus } from '../services/api';

const QUICK_PROMPTS = [
  { label: "🌤️ Hamilton Weather", prompt: "What's the weather in Hamilton right now and what's the forecast for the next couple days?" },
  { label: "🚌 Next Bus from 200 Bay", prompt: "What are the next upcoming HSR bus departures from 200 Bay St S?" },
  { label: "🎓 Trip to McMaster", prompt: "How do I take HSR transit from 200 Bay St to McMaster University?" },
  { label: "🛍️ Trip to Lime Ridge", prompt: "What's the best bus route from my place to Lime Ridge Mall?" },
  { label: "🎬 Movie Recommendation", prompt: "Recommend a high-rated thriller or sci-fi movie to watch tonight" }
];

export default function AIAssistantDrawer({ isOpen, setIsOpen }) {
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('ezchat_messages_v1');
      return saved ? JSON.parse(saved) : [
        {
          role: 'assistant',
          content: `Hey! I'm **EZ**, your personal assistant and chat buddy. I'm anchored right at **200 Bay Street South, Hamilton (L8P 4S4)**.\n\nAsk me about **live Hamilton weather**, **HSR bus routes/departures**, what to watch, or anything you're working on. Guardrails are loosened, so let's keep it real.`,
          timestamp: Date.now()
        }
      ];
    } catch (e) {
      return [];
    }
  });

  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [agentConfig, setAgentConfig] = useState(null);
  const [activeToolStatus, setActiveToolStatus] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    fetchAgentStatus()
      .then(cfg => setAgentConfig(cfg))
      .catch(e => console.warn('[Agent Config Error]', e));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('ezchat_messages_v1', JSON.stringify(messages));
    } catch (e) {
      console.warn('[LocalStorage Error]', e);
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [isOpen, messages, loading]);

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

    // Dynamic tool status hint
    const lower = text.toLowerCase();
    if (lower.includes('weather') || lower.includes('rain') || lower.includes('temp') || lower.includes('forecast')) {
      setActiveToolStatus('🌤️ Calling Hamilton Weather Tool...');
    } else if (lower.includes('bus') || lower.includes('hsr') || lower.includes('transit') || lower.includes('mcmaster') || lower.includes('mohawk') || lower.includes('route')) {
      setActiveToolStatus('🚌 Querying HSR Transit from 200 Bay St S...');
    } else {
      setActiveToolStatus('⚡ Thinking with GPT-4o (ezchat)...');
    }

    try {
      // Send chat history (mapped to role/content)
      const apiHistory = newMessages.slice(-10).map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await sendAgentMessage({
        messages: apiHistory.slice(0, -1),
        userMessage: text
      });

      const assistantReply = {
        role: 'assistant',
        content: res.reply || "Got it!",
        toolCalls: res.toolCalls || [],
        deployment: res.deployment || 'ezchat',
        mode: res.mode,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, assistantReply]);
    } catch (err) {
      console.error('[Agent Send Error]', err);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ **Error connecting to assistant**: ${err.message}. Please verify your Azure OpenAI deployment or local server status.`,
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
    if (window.confirm('Clear conversation history?')) {
      const resetMsg = [
        {
          role: 'assistant',
          content: `Chat cleared! Ready for whatever you need. Ask about Hamilton weather, HSR buses from 200 Bay St, or anything else.`,
          timestamp: Date.now()
        }
      ];
      setMessages(resetMsg);
      localStorage.setItem('ezchat_messages_v1', JSON.stringify(resetMsg));
    }
  };

  const formatTimestamp = (ts) => {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  // Render markdown-like bold and bullet formatting
  const renderFormattedText = (content) => {
    if (!content) return null;
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      // Render bullet points
      const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-');
      const cleanLine = isBullet ? line.trim().replace(/^[•\-]\s*/, '') : line;

      // Simple regex bold replacement
      const parts = cleanLine.split(/(\*\*.*?\*\*)/g);

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
          <div key={idx} style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.25rem', paddingLeft: '0.4rem' }}>
            <span style={{ color: 'var(--accent-cyan)' }}>•</span>
            <div>{renderedParts}</div>
          </div>
        );
      }

      if (!line.trim()) {
        return <div key={idx} style={{ height: '0.5rem' }} />;
      }

      return (
        <div key={idx} style={{ marginBottom: '0.25rem', lineHeight: '1.45' }}>
          {renderedParts}
        </div>
      );
    });
  };

  return (
    <>
      {/* Floating Summon Bubble (Visible when drawer is closed) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          title="Open EZ Chat (Personal Assistant & Chat Buddy)"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.8rem 1.2rem',
            borderRadius: '50px',
            background: 'linear-gradient(135deg, #00e5ff 0%, #7928ca 100%)',
            color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 8px 30px rgba(0, 229, 255, 0.4), 0 0 15px rgba(121, 40, 202, 0.5)',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.92rem',
            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px) scale(1.03)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0) scale(1)'}
        >
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Bot size={18} color="#fff" />
          </div>
          <span>EZ Chat</span>
          <span className="badge badge-cyan" style={{ fontSize: '0.65rem', background: 'rgba(0, 0, 0, 0.3)' }}>
            GPT-4o
          </span>
        </button>
      )}

      {/* Slide-out / Expandable Chat Drawer */}
      {isOpen && (
        <div
          className="glass-panel"
          style={{
            position: 'fixed',
            bottom: isExpanded ? '10px' : '20px',
            right: isExpanded ? '10px' : '20px',
            width: isExpanded ? 'calc(100vw - 20px)' : '460px',
            maxWidth: '100vw',
            height: isExpanded ? 'calc(100vh - 20px)' : '640px',
            maxHeight: 'calc(100vh - 40px)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '20px',
            border: '1px solid rgba(0, 229, 255, 0.35)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(0, 229, 255, 0.25)',
            background: 'rgba(10, 14, 26, 0.95)',
            backdropFilter: 'blur(25px)',
            overflow: 'hidden',
            transition: 'all 0.25s ease'
          }}
        >
          {/* Drawer Header */}
          <div style={{
            padding: '0.9rem 1.2rem',
            borderBottom: '1px solid var(--border-glass)',
            background: 'rgba(255, 255, 255, 0.03)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #00e5ff 0%, #7928ca 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 15px rgba(0, 229, 255, 0.4)'
              }}>
                <Bot size={20} color="#fff" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: '#fff' }}>
                    EZ <span className="gradient-text">Assistant</span>
                  </h3>
                  <span className="badge badge-purple" style={{ fontSize: '0.62rem' }}>
                    {agentConfig?.deployment || 'ezchat'}
                  </span>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Navigation size={10} color="var(--accent-cyan)" />
                  <span>200 Bay St S, Hamilton</span>
                </div>
              </div>
            </div>

            {/* Window Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <button
                onClick={handleClearHistory}
                title="Clear Chat History"
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', borderRadius: '8px' }}
              >
                <Trash2 size={13} />
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? "Collapse" : "Expand"}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', borderRadius: '8px' }}
              >
                {isExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close Assistant"
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', borderRadius: '8px' }}
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Quick Prompt Chips */}
          <div style={{
            padding: '0.6rem 1rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            gap: '0.4rem',
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            scrollbarWidth: 'none'
          }}>
            {QUICK_PROMPTS.map((qp, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(qp.prompt)}
                disabled={loading}
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '20px',
                  padding: '0.3rem 0.75rem',
                  fontSize: '0.72rem',
                  color: 'var(--text-dim)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  transition: 'all 0.15s ease',
                  flexShrink: 0
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent-cyan)';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.color = 'var(--text-dim)';
                }}
              >
                {qp.label}
              </button>
            ))}
          </div>

          {/* Messages Container */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.9rem'
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
                    padding: '0.75rem 1rem',
                    borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: isUser 
                      ? 'linear-gradient(135deg, #0070f3 0%, #7928ca 100%)' 
                      : 'rgba(255, 255, 255, 0.05)',
                    border: isUser 
                      ? '1px solid rgba(0, 229, 255, 0.3)' 
                      : '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#fff',
                    fontSize: '0.85rem',
                    boxShadow: isUser 
                      ? '0 4px 15px rgba(0, 112, 243, 0.25)' 
                      : '0 4px 15px rgba(0, 0, 0, 0.2)'
                  }}>
                    {renderFormattedText(msg.content)}

                    {/* Tool Badges if any */}
                    {msg.toolCalls && msg.toolCalls.length > 0 && (
                      <div style={{
                        marginTop: '0.6rem',
                        paddingTop: '0.5rem',
                        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '0.3rem'
                      }}>
                        {msg.toolCalls.map((tc, tcIdx) => (
                          <span
                            key={tcIdx}
                            className="badge badge-green"
                            style={{ fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                          >
                            {tc.tool === 'get_hamilton_weather' && <CloudSun size={11} />}
                            {tc.tool === 'get_hsr_transit' && <Bus size={11} />}
                            <span>Used {tc.tool}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <span style={{
                    fontSize: '0.65rem',
                    color: 'var(--text-muted)',
                    marginTop: '0.25rem',
                    padding: '0 0.3rem'
                  }}>
                    {isUser ? 'You' : 'EZ'} • {formatTimestamp(msg.timestamp)}
                  </span>
                </div>
              );
            })}

            {/* Active Loading & Tool Status */}
            {loading && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.3rem' }}>
                <div style={{
                  padding: '0.6rem 0.9rem',
                  borderRadius: '16px 16px 16px 4px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(0, 229, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.8rem',
                  color: 'var(--accent-cyan)'
                }}>
                  <Sparkles size={14} className="spin-slow" />
                  <span>{activeToolStatus || 'Thinking...'}</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div style={{
            padding: '0.8rem 1rem',
            borderTop: '1px solid var(--border-glass)',
            background: 'rgba(255, 255, 255, 0.02)'
          }}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
            >
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ask EZ about weather, HSR buses, or chat..."
                disabled={loading}
                style={{
                  flex: 1,
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '12px',
                  padding: '0.7rem 1rem',
                  color: '#fff',
                  fontSize: '0.85rem',
                  outline: 'none',
                  transition: 'all 0.2s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent-cyan)'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)'}
              />

              <button
                type="submit"
                disabled={!inputText.trim() || loading}
                className="btn btn-primary"
                style={{
                  padding: '0.7rem 1rem',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: !inputText.trim() || loading ? 0.5 : 1
                }}
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
