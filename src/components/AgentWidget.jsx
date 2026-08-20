import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Send, 
  Trash2, 
  Sparkles, 
  Bus, 
  CloudSun, 
  Navigation, 
  Zap, 
  ShieldAlert, 
  MessageSquare,
  Clock,
  Compass,
  MapPin,
  Flame,
  ArrowRight
} from 'lucide-react';
import { sendAgentMessage, fetchAgentStatus, fetchAgentGreeting } from '../services/api';

const QUICK_PROMPTS = [
  { label: "🔭 Sky Tonight & ISS Passes", prompt: "What can I see in the sky tonight in Hamilton? Give me the best ISS and satellite passes correlated with cloud cover and viewing scores." },
  { label: "🌌 Aurora / Northern Lights Alert", prompt: "What is the NOAA Space Weather Kp index right now and is there any chance of seeing Northern Lights in Hamilton?" },
  { label: "🌤️ Hamilton Weather & Rain", prompt: "What's the weather in Hamilton right now and what's the forecast for the next couple days?" },
  { label: "🚌 Next Bus from 200 Bay St", prompt: "What are the next upcoming HSR bus departures from 200 Bay St S?" },
  { label: "🎓 Trip to McMaster University", prompt: "How do I take HSR transit from 200 Bay St to McMaster University?" },
  { label: "🛍️ Route to Lime Ridge Mall", prompt: "What's the best bus route from my place on Bay St to Lime Ridge Mall?" },
  { label: "🎬 Movie Recommendation", prompt: "Recommend a high-rated thriller or sci-fi movie to watch tonight and tell me where to find it." },
  { label: "💬 Casual Banter / Loosened Guardrails", prompt: "Hey EZ, what's good? Give me your honest unfiltered thoughts on Hamilton transit and weather today." }
];

export default function AgentWidget() {
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('ezchat_messages_v3');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [selectedModel, setSelectedModel] = useState(() => {
    return localStorage.getItem('ezchat_model') || 'gpt-5-4';
  });

  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [agentConfig, setAgentConfig] = useState(null);
  const [activeToolStatus, setActiveToolStatus] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    fetchAgentStatus()
      .then(cfg => setAgentConfig(cfg))
      .catch(e => console.warn('[Agent Config Error]', e));

    if (messages.length === 0) {
      setLoading(true);
      setActiveToolStatus('⚡ Initializing EZ...');
      fetchAgentGreeting(selectedModel)
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
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('ezchat_messages_v3', JSON.stringify(messages));
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
    if (lower.includes('sky') || lower.includes('iss') || lower.includes('satellite') || lower.includes('aurora') || lower.includes('northern light') || lower.includes('meteor') || lower.includes('stargaz')) {
      setActiveToolStatus('🔭 Calculating ISS Orbit, NOAA Space Weather & Cloud Cover...');
    } else if (lower.includes('weather') || lower.includes('rain') || lower.includes('temp') || lower.includes('forecast')) {
      setActiveToolStatus('🌤️ Calling Hamilton Weather Tool...');
    } else if (lower.includes('bus') || lower.includes('hsr') || lower.includes('transit') || lower.includes('mcmaster') || lower.includes('mohawk') || lower.includes('route') || lower.includes('depart')) {
      setActiveToolStatus('🚌 Querying HSR Transit from 200 Bay St S...');
    } else {
      const modelLabel = selectedModel === 'gpt-5-4' ? 'GPT-5.4' : (selectedModel === 'gpt-5' ? 'GPT-5' : 'GPT-4o');
      setActiveToolStatus(`⚡ Thinking with ${modelLabel}...`);
    }

    try {
      const apiHistory = newMessages.slice(-10).map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await sendAgentMessage({
        messages: apiHistory.slice(0, -1),
        userMessage: text,
        modelDeployment: selectedModel
      });

      const assistantReply = {
        role: 'assistant',
        content: res.reply || "Got it!",
        toolCalls: res.toolCalls || [],
        deployment: res.deployment || selectedModel,
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
      setMessages([]);
      localStorage.removeItem('ezchat_messages_v3');
      setLoading(true);
      setActiveToolStatus('⚡ Initializing EZ...');
      fetchAgentGreeting()
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

  const formatTimestamp = (ts) => {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const renderFormattedText = (content) => {
    if (!content) return null;
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-');
      const cleanLine = isBullet ? line.trim().replace(/^[•\-]\s*/, '') : line;
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
        <div key={idx} style={{ marginBottom: '0.35rem', lineHeight: '1.5' }}>
          {renderedParts}
        </div>
      );
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', marginBottom: '2rem' }}>
      {/* Top Banner: Agent Telemetry & Anchor Card */}
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
            <Bot size={26} color="#fff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: '#fff' }}>
                EZ <span className="gradient-text">Chat Buddy</span>
              </h2>
              <span className="badge badge-purple" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}>
                GPT-4o ({agentConfig?.deployment || 'ezchat'})
              </span>
              <span className="badge badge-green" style={{ fontSize: '0.68rem' }}>
                GUARDRAILS LOOSENED
              </span>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <MapPin size={13} color="var(--accent-cyan)" />
              <span>Anchor Origin: <strong>200 Bay Street South, Hamilton, ON (L8P 4S4)</strong></span>
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(0, 0, 0, 0.4)', padding: '0.3rem 0.6rem', borderRadius: '10px', border: '1px solid rgba(0, 229, 255, 0.25)' }}>
            <Sparkles size={14} color="var(--accent-cyan)" />
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Model:</label>
            <select
              value={selectedModel}
              onChange={(e) => {
                const m = e.target.value;
                setSelectedModel(m);
                localStorage.setItem('ezchat_model', m);
              }}
              style={{
                background: 'transparent',
                color: 'var(--accent-cyan)',
                border: 'none',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                outline: 'none',
                padding: '0.1rem 0.2rem'
              }}
            >
              <option value="gpt-5-4" style={{ background: '#111', color: '#fff' }}>GPT-5.4 (Flagship)</option>
              <option value="gpt-5" style={{ background: '#111', color: '#fff' }}>GPT-5 (Standard)</option>
              <option value="ezchat" style={{ background: '#111', color: '#fff' }}>GPT-4o (ezchat)</option>
            </select>
          </div>

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

      {/* Quick Prompt Chips Bar */}
      <div className="glass-panel" style={{ padding: '0.8rem 1.2rem' }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Sparkles size={14} color="var(--accent-cyan)" />
          <span>QUICK ACTIONS & LOCAL TOOLS</span>
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
                  maxWidth: '82%',
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
                    : '0 4px 15px rgba(0, 0, 0, 0.25)'
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
                          className="badge badge-green"
                          style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.2rem 0.5rem' }}
                        >
                          {tc.tool === 'get_hamilton_weather' && <CloudSun size={13} />}
                          {tc.tool === 'get_hsr_transit' && <Bus size={13} />}
                          <span>Executed: {tc.tool}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <span style={{
                  fontSize: '0.7rem',
                  color: 'var(--text-muted)',
                  marginTop: '0.3rem',
                  padding: '0 0.4rem'
                }}>
                  {isUser ? 'You' : 'EZ (GPT-4o)'} • {formatTimestamp(msg.timestamp)}
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
                <span>{activeToolStatus || 'Thinking with GPT-4o (ezchat)...'}</span>
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
              placeholder="Ask EZ about Hamilton weather, HSR buses from 200 Bay St, or anything else..."
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
