import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Gamepad2,
  Sparkles,
  UploadCloud,
  ImageIcon,
  Play,
  Tv,
  Smartphone,
  Sliders,
  Users,
  Shield,
  Eye,
  RefreshCw,
  Check,
  AlertTriangle,
  Clock,
  Zap,
  Activity,
  Layers,
  ChevronRight,
  ChevronDown,
  Info,
  Trophy,
  Copy,
  Terminal,
  FileCode,
  Flame,
  Film,
  Camera,
  Ghost,
  Compass,
  FileText
} from 'lucide-react';
import {
  fetchGuessFaceHealth,
  fetchGuessFaceModes,
  fetchGuessFaceStyles,
  runGuessFaceMode,
  createGuessFaceParty,
  reportGuessFaceRound,
  fetchGuessFaceParty
} from '../services/api';

// Pre-defined sample test players
const SAMPLE_PLAYERS = [
  { id: 'subj_1', name: 'Tobin', avatar: '🧙‍♂️', role: 'Host' },
  { id: 'subj_2', name: 'Ada', avatar: '🕵️‍♀️', role: 'Player' },
  { id: 'subj_3', name: 'Marcus', avatar: '🤠', role: 'Player' },
  { id: 'subj_4', name: 'Elena', avatar: '👩‍🎤', role: 'Player' }
];

const CURATED_COLORS = ['Obsidian Gold', 'Crimson Violet', 'Emerald Teal', 'Midnight Indigo', 'Solar Ochre', 'Celestial Silver', 'Electric Magenta'];

export default function GuessFaceWidget() {
  // 1. Engine & Health State
  const [engineHealth, setEngineHealth] = useState({ checked: false, ok: false, modesCount: 9, service: '' });
  const [executionMode, setExecutionMode] = useState('internal'); // 'internal' | 'external' | 'simulation'
  const [externalEndpoint, setExternalEndpoint] = useState('http://localhost:7071');
  const [externalApiKey, setExternalApiKey] = useState('');

  // 2. Modes & Registry
  const [modesList, setModesList] = useState([]);
  const [selectedModeId, setSelectedModeId] = useState('dnd');
  const [modeStyles, setModeStyles] = useState([]);
  const [selectedStyleVariant, setSelectedStyleVariant] = useState('');
  const [loadingModes, setLoadingModes] = useState(false);

  // 3. Subjects & Selfie Input
  const [subjects, setSubjects] = useState([
    { subjectId: 'subj_1', displayName: 'Tobin', selfieBase64: null, previewUrl: null }
  ]);
  const [secondSubject, setSecondSubject] = useState({
    subjectId: 'subj_2',
    displayName: 'Ada',
    selfieBase64: null,
    previewUrl: null
  });
  const fileInputRef = useRef(null);
  const secondFileInputRef = useRef(null);

  // 4. Mode-Specific Custom Seeds
  const [fortuneNumber, setFortuneNumber] = useState(42);
  const [fortuneColor, setFortuneColor] = useState('Obsidian Gold');
  const [fortuneDate, setFortuneDate] = useState(() => new Date().toISOString().slice(0, 10));

  // 5. Execution Pipeline State
  const [loading, setLoading] = useState(false);
  const [executionPhase, setExecutionPhase] = useState(''); // 'classifying' | 'transforming' | 'captioning' | 'assembling'
  const [modeRunResult, setModeRunResult] = useState(null);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // 6. Viewport Sandbox Surface
  const [activeSurface, setActiveSurface] = useState('screen'); // 'screen' (TV) | 'live' (Mobile) | 'control' (Host) | 'inspector' (JSON)
  
  // TV Screen & Reveal Choreography
  const [revealBeat, setRevealBeat] = useState(0); // 0: Guessing / Hidden, 1: Drumroll / Glow, 2: Portrait Drop, 3: Identity & Score
  const [timerSeconds, setTimerSeconds] = useState(30);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef(null);

  // Mobile Player Simulation
  const [selectedGuess, setSelectedGuess] = useState('');
  const [dossierSelections, setDossierSelections] = useState([]);
  const [guessLocked, setGuessLocked] = useState(false);

  // Scoreboard / Aggregation Service
  const [currentParty, setCurrentParty] = useState(null);
  const [partyScoreboard, setPartyScoreboard] = useState({
    Tobin: 2,
    Ada: 3,
    Marcus: 1,
    Elena: 0
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Selected mode meta helper
  const activeModeMeta = useMemo(() => {
    return modesList.find((m) => m.modeId === selectedModeId) || {
      modeId: selectedModeId,
      displayName: selectedModeId.toUpperCase(),
      aspectRatio: '3:4',
      defaultTimer: 30,
      theme: 'Social Deception AI Game',
      captionFormat: 'Mode-specific game prompt'
    };
  }, [modesList, selectedModeId]);

  // Load Health & Modes on Mount
  useEffect(() => {
    let isMounted = true;
    setLoadingModes(true);

    fetchGuessFaceHealth()
      .then((h) => {
        if (isMounted) setEngineHealth({ checked: true, ok: !!h.ok, modesCount: h.modesCount || 9, service: h.service || '' });
      })
      .catch(() => {
        if (isMounted) setEngineHealth({ checked: true, ok: false, modesCount: 9, service: 'unreachable' });
      });

    fetchGuessFaceModes()
      .then((res) => {
        if (isMounted && res && res.modes) {
          setModesList(res.modes);
          if (res.modes.length > 0) {
            setSelectedModeId(res.modes[0].modeId);
          }
        }
      })
      .catch((e) => {
        console.warn('[GuessFace] Could not fetch modes list:', e);
      })
      .finally(() => {
        if (isMounted) setLoadingModes(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch Styles when selected mode changes
  useEffect(() => {
    let isMounted = true;
    fetchGuessFaceStyles(selectedModeId)
      .then((res) => {
        if (isMounted && res && res.styles) {
          setModeStyles(res.styles);
          if (res.styles.length > 0) {
            setSelectedStyleVariant(res.styles[0].key || '');
          }
        }
      })
      .catch(() => {
        if (isMounted) setModeStyles([]);
      });

    // Reset timer to mode default
    if (activeModeMeta.defaultTimer) {
      setTimerSeconds(activeModeMeta.defaultTimer);
    }
    setRevealBeat(0);
    setGuessLocked(false);
    setSelectedGuess('');
    setDossierSelections([]);
  }, [selectedModeId, activeModeMeta]);

  // Timer countdown hook
  useEffect(() => {
    if (timerActive && timerSeconds > 0) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setTimerActive(false);
            triggerRevealSequence();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [timerActive, timerSeconds]);

  // Client-Side Canvas Downsampling
  const processImageFile = (file, onComplete) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1024;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const downsampledBase64 = canvas.toDataURL('image/jpeg', 0.85);
        onComplete(downsampledBase64);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSelfieUpload = (e, isSecond = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    processImageFile(file, (base64) => {
      if (isSecond) {
        setSecondSubject((prev) => ({
          ...prev,
          selfieBase64: base64,
          previewUrl: base64
        }));
      } else {
        setSubjects((prev) => [
          {
            ...prev[0],
            selfieBase64: base64,
            previewUrl: base64
          }
        ]);
      }
      showToast('📸 Selfie downsampled (1024px) & ready!');
    });
  };

  // Run Pipeline
  const handleExecuteModeRun = async () => {
    setLoading(true);
    setError(null);
    setRevealBeat(0);
    setGuessLocked(false);
    setSelectedGuess('');
    setDossierSelections([]);

    const runSubjects = [
      {
        subjectId: subjects[0].subjectId,
        displayName: subjects[0].displayName,
        selfieBase64: subjects[0].selfieBase64 || (executionMode === 'simulation' ? 'mock_selfie' : null)
      }
    ];

    if (['ghost', 'dossier'].includes(selectedModeId) && secondSubject.selfieBase64) {
      runSubjects.push({
        subjectId: secondSubject.subjectId,
        displayName: secondSubject.displayName,
        selfieBase64: secondSubject.selfieBase64
      });
    }

    try {
      setExecutionPhase('Ingesting selfies & classifying...');
      const seedValues = selectedModeId === 'fortune' ? {
        number: fortuneNumber,
        color: fortuneColor,
        date: fortuneDate
      } : null;

      const payload = {
        modeId: selectedModeId,
        subjects: runSubjects,
        seedValues,
        styleVariantKey: selectedStyleVariant || null,
        simulate: executionMode === 'simulation',
        customEndpoint: executionMode === 'external' ? externalEndpoint : null,
        apiKey: executionMode === 'external' ? externalApiKey : ''
      };

      const result = await runGuessFaceMode(payload);
      setModeRunResult(result);
      setTimerSeconds(activeModeMeta.defaultTimer || 30);
      setTimerActive(true);
      showToast('✨ Mode-run generated successfully! Round started.');
    } catch (err) {
      console.error('[GuessFace Execute Error]', err);
      setError(err.message || 'Failed to execute GuessFace mode-run');
    } finally {
      setLoading(false);
      setExecutionPhase('');
    }
  };

  // 3-Beat Reveal Choreography Controller
  const triggerRevealSequence = () => {
    setTimerActive(false);
    setRevealBeat(1); // Beat 1: Drumroll / Suspense Glow

    setTimeout(() => {
      setRevealBeat(2); // Beat 2: Art Drop
      setTimeout(() => {
        setRevealBeat(3); // Beat 3: Name Pop & Scoreboard Bump
        // Simulate scoreboard bump
        if (selectedGuess === subjects[0].displayName) {
          setPartyScoreboard((prev) => ({
            ...prev,
            Tobin: (prev.Tobin || 0) + 1
          }));
        }
      }, 3000);
    }, 2000);
  };

  // Lock in Player Guess
  const handleLockInGuess = (playerName) => {
    if (guessLocked) return;
    if (selectedModeId === 'dossier') {
      let updated = [...dossierSelections];
      if (updated.includes(playerName)) {
        updated = updated.filter((p) => p !== playerName);
      } else if (updated.length < 2) {
        updated.push(playerName);
      }
      setDossierSelections(updated);
    } else {
      setSelectedGuess(playerName);
      setGuessLocked(true);
      showToast(`🔒 Guess locked: ${playerName}`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
      {/* 1. Header & Engine Status Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '1.1rem 1.4rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          borderLeft: '4px solid #ffd700',
          background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.08) 0%, rgba(121, 40, 202, 0.12) 100%)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #ffd700 0%, #ff0080 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(255, 215, 0, 0.4)'
            }}
          >
            <Gamepad2 size={24} color="#000" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                GuessFace <span style={{ color: '#ffd700' }}>Engine & API Workbench</span>
              </h2>
              <span className="badge badge-amber" style={{ fontSize: '0.65rem' }}>
                9 MODES
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
              Caption-first social-deception party game engine & multi-surface testbed
            </p>
          </div>
        </div>

        {/* Engine Switcher Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'flex',
              background: 'rgba(0, 0, 0, 0.4)',
              padding: '0.25rem',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <button
              onClick={() => setExecutionMode('internal')}
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                borderRadius: '7px',
                border: 'none',
                cursor: 'pointer',
                background: executionMode === 'internal' ? 'rgba(255, 215, 0, 0.25)' : 'transparent',
                color: executionMode === 'internal' ? '#ffd700' : 'var(--text-muted)'
              }}
            >
              Integrated Azure
            </button>
            <button
              onClick={() => setExecutionMode('simulation')}
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                borderRadius: '7px',
                border: 'none',
                cursor: 'pointer',
                background: executionMode === 'simulation' ? 'rgba(0, 230, 118, 0.25)' : 'transparent',
                color: executionMode === 'simulation' ? '#00e676' : 'var(--text-muted)'
              }}
            >
              Instant Sim
            </button>
            <button
              onClick={() => setExecutionMode('external')}
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                borderRadius: '7px',
                border: 'none',
                cursor: 'pointer',
                background: executionMode === 'external' ? 'rgba(0, 229, 255, 0.25)' : 'transparent',
                color: executionMode === 'external' ? '#00e5ff' : 'var(--text-muted)'
              }}
            >
              Functions (:7071)
            </button>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.75rem',
              padding: '0.35rem 0.75rem',
              borderRadius: '8px',
              background: engineHealth.ok ? 'rgba(0, 230, 118, 0.12)' : 'rgba(255, 170, 0, 0.12)',
              border: engineHealth.ok ? '1px solid rgba(0, 230, 118, 0.3)' : '1px solid rgba(255, 170, 0, 0.3)',
              color: engineHealth.ok ? '#00e676' : '#ffaa00'
            }}
          >
            <Activity size={13} />
            <span>{engineHealth.ok ? 'API Ready' : 'Sim Mode'}</span>
          </div>
        </div>
      </div>

      {/* External Endpoint Config Drawer if external selected */}
      {executionMode === 'external' && (
        <div className="glass-panel animate-fade-in" style={{ padding: '0.8rem 1.2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>
              GuessFace API Base URL:
            </label>
            <input
              type="text"
              className="search-input"
              value={externalEndpoint}
              onChange={(e) => setExternalEndpoint(e.target.value)}
              placeholder="http://localhost:7071 or https://<app>.azurewebsites.net"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
            />
          </div>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>
              Bearer Token (gf_live_...):
            </label>
            <input
              type="password"
              className="search-input"
              value={externalApiKey}
              onChange={(e) => setExternalApiKey(e.target.value)}
              placeholder="Enter tenant API key"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
            />
          </div>
        </div>
      )}

      {/* 2. The 9 Modes Carousel / Selector */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Select Game Mode ({modesList.length || 9})
          </span>
          <span style={{ fontSize: '0.75rem', color: '#ffd700' }}>
            Current: <strong>{activeModeMeta.displayName}</strong> ({activeModeMeta.aspectRatio} Aspect, {activeModeMeta.defaultTimer}s Timer)
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '0.5rem'
          }}
        >
          {modesList.map((m) => {
            const isSelected = m.modeId === selectedModeId;
            return (
              <button
                key={m.modeId}
                onClick={() => setSelectedModeId(m.modeId)}
                className="glass-panel"
                style={{
                  padding: '0.65rem 0.6rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.35rem',
                  cursor: 'pointer',
                  borderRadius: '10px',
                  border: isSelected ? '1px solid #ffd700' : '1px solid var(--border-glass)',
                  background: isSelected ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.25) 0%, rgba(255, 0, 128, 0.15) 100%)' : 'rgba(255, 255, 255, 0.02)',
                  color: isSelected ? '#ffd700' : 'var(--text-main)',
                  boxShadow: isSelected ? '0 0 15px rgba(255, 215, 0, 0.3)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  {m.modeId === 'ghost' && <Ghost size={15} color={isSelected ? '#ffd700' : '#00e5ff'} />}
                  {m.modeId === 'noir' && <Camera size={15} color={isSelected ? '#ffd700' : '#aaa'} />}
                  {m.modeId === 'movietrailer' && <Film size={15} color={isSelected ? '#ffd700' : '#ff0080'} />}
                  {m.modeId === 'fortune' && <Sparkles size={15} color={isSelected ? '#ffd700' : '#b388ff'} />}
                  {m.modeId === 'asseenontv' && <Tv size={15} color={isSelected ? '#ffd700' : '#00e676'} />}
                  {m.modeId === 'dossier' && <FileText size={15} color={isSelected ? '#ffd700' : '#ff5252'} />}
                  {!['ghost', 'noir', 'movietrailer', 'fortune', 'asseenontv', 'dossier'].includes(m.modeId) && <Gamepad2 size={15} />}
                  <span style={{ fontSize: '0.82rem', fontWeight: 800 }}>{m.displayName}</span>
                </div>
                <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                  {m.aspectRatio} • {m.defaultTimer}s
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Input & Setup Grid: Subjects, Seeds & Action */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
        {/* Subject 1 (Primary) */}
        <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '0.92rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#fff' }}>
              <Users size={16} color="var(--accent-cyan)" />
              <span>Primary Subject (Target)</span>
            </h3>
            <input
              type="text"
              value={subjects[0].displayName}
              onChange={(e) => {
                const val = e.target.value;
                setSubjects((prev) => [{ ...prev[0], displayName: val }]);
              }}
              className="search-input"
              style={{ width: '110px', fontSize: '0.78rem', padding: '0.2rem 0.5rem' }}
              placeholder="Name"
            />
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '2px dashed var(--border-glass)',
              borderRadius: '10px',
              padding: '1.2rem 0.8rem',
              textAlign: 'center',
              cursor: 'pointer',
              background: subjects[0].previewUrl ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.02)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => handleSelfieUpload(e, false)}
            />
            {subjects[0].previewUrl ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                <img
                  src={subjects[0].previewUrl}
                  alt="Selfie"
                  style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #ffd700' }}
                />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>Selfie Loaded</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--accent-green)' }}>✓ Canvas Downsampled (1024px)</div>
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: '0.68rem', padding: '0.2rem 0.5rem', marginTop: '0.3rem' }}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                  >
                    Change Image
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
                <UploadCloud size={24} color="var(--accent-cyan)" />
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fff' }}>Upload Target Selfie</span>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  Auto-downsampled to 1024px @ 0.85 JPEG
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Mode Parameters & Seeds */}
        <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          <h3 style={{ fontSize: '0.92rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#fff' }}>
            <Sliders size={16} color="#ffd700" />
            <span>Mode Settings & Style Pool</span>
          </h3>

          {/* Style Variant selection if available */}
          {modeStyles.length > 0 && (
            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>
                Style Variant ({modeStyles.length} Pool):
              </label>
              <select
                className="search-input"
                value={selectedStyleVariant}
                onChange={(e) => setSelectedStyleVariant(e.target.value)}
                style={{ fontSize: '0.78rem', padding: '0.35rem 0.6rem' }}
              >
                {modeStyles.map((st) => (
                  <option key={st.key} value={st.key}>
                    {st.key} {st.size ? `(${st.size})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Fortune Seed Inputs */}
          {selectedModeId === 'fortune' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Roll Number (1-99):</label>
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={fortuneNumber}
                  onChange={(e) => setFortuneNumber(parseInt(e.target.value, 10))}
                  className="search-input"
                  style={{ fontSize: '0.78rem', padding: '0.3rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Fate Color:</label>
                <select
                  value={fortuneColor}
                  onChange={(e) => setFortuneColor(e.target.value)}
                  className="search-input"
                  style={{ fontSize: '0.78rem', padding: '0.3rem' }}
                >
                  {CURATED_COLORS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={handleExecuteModeRun}
            disabled={loading}
            className="btn btn-primary"
            style={{
              padding: '0.7rem',
              fontWeight: 800,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              background: 'linear-gradient(135deg, #ffd700 0%, #ff0080 100%)',
              color: '#000',
              border: 'none',
              marginTop: 'auto'
            }}
          >
            {loading ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                <span>{executionPhase || 'Executing Mode Run...'}</span>
              </>
            ) : (
              <>
                <Play size={18} fill="#000" />
                <span>Run {activeModeMeta.displayName} Pipeline</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="glass-panel" style={{ padding: '0.8rem 1.2rem', borderColor: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--accent-red)' }}>
          <AlertTriangle size={18} />
          <span style={{ fontSize: '0.85rem' }}>{error}</span>
        </div>
      )}

      {/* 4. Multi-Surface Viewport Selector */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '0.5rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--border-glass)',
            paddingBottom: '0.5rem'
          }}
        >
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              onClick={() => setActiveSurface('screen')}
              className={`btn ${activeSurface === 'screen' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Tv size={15} />
              <span>TV Screen (/screen)</span>
            </button>

            <button
              onClick={() => setActiveSurface('live')}
              className={`btn ${activeSurface === 'live' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Smartphone size={15} />
              <span>Mobile Player (/live)</span>
            </button>

            <button
              onClick={() => setActiveSurface('control')}
              className={`btn ${activeSurface === 'control' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Sliders size={15} />
              <span>Host Control (/control)</span>
            </button>

            <button
              onClick={() => setActiveSurface('inspector')}
              className={`btn ${activeSurface === 'inspector' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Terminal size={15} />
              <span>JSON Telemetry</span>
            </button>
          </div>

          {/* Reveal Choreography Quick Trigger */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <button
              onClick={triggerRevealSequence}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem', color: '#ffd700', borderColor: 'rgba(255, 215, 0, 0.4)' }}
            >
              Trigger 3-Beat Reveal
            </button>
          </div>
        </div>

        {/* SURFACE 1: BIG SCREEN TV (/screen) */}
        {activeSurface === 'screen' && (
          <div
            className="glass-panel"
            style={{
              padding: '2rem 1.5rem',
              borderRadius: '16px',
              minHeight: '440px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              position: 'relative',
              overflow: 'hidden',
              background: selectedModeId === 'asseenontv'
                ? 'radial-gradient(circle, rgba(20, 30, 60, 0.9) 0%, rgba(5, 5, 15, 0.98) 100%)'
                : selectedModeId === 'noir'
                ? 'linear-gradient(180deg, #111 0%, #050505 100%)'
                : 'radial-gradient(circle, rgba(30, 20, 50, 0.9) 0%, rgba(10, 10, 20, 0.98) 100%)',
              border: revealBeat === 1 ? '2px solid #ffd700' : '1px solid var(--border-glass)',
              boxShadow: revealBeat === 1 ? '0 0 40px rgba(255, 215, 0, 0.4)' : 'none',
              transition: 'all 0.3s ease'
            }}
          >
            {/* As Seen on TV CRT Scanline Overlay */}
            {selectedModeId === 'asseenontv' && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                  background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.15), rgba(0,0,0,0.15) 1px, transparent 1px, transparent 2px)'
                }}
              />
            )}

            {/* TV Header with Mode Tag & Timer */}
            <div style={{ position: 'absolute', top: '1.2rem', left: '1.5rem', right: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="badge badge-purple" style={{ fontSize: '0.75rem', fontWeight: 800 }}>
                {activeModeMeta.displayName} ROUND
              </span>

              {/* Timer Pill */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.35rem 0.8rem',
                  borderRadius: '20px',
                  background: timerSeconds <= 5 ? 'rgba(255, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                  border: timerSeconds <= 5 ? '1px solid var(--accent-red)' : '1px solid rgba(255, 255, 255, 0.2)',
                  color: timerSeconds <= 5 ? 'var(--accent-red)' : '#fff',
                  fontWeight: 800,
                  fontSize: '0.9rem'
                }}
              >
                <Clock size={16} />
                <span>{timerSeconds}s</span>
              </div>
            </div>

            {/* Central Content Area */}
            {modeRunResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '780px', textAlign: 'center', zIndex: 2 }}>
                {/* As Seen on TV Structured Product Banner */}
                {selectedModeId === 'asseenontv' && modeRunResult.result?.captionFields && (
                  <div style={{ marginBottom: '1.2rem' }}>
                    <h1 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#ffd700', textShadow: '0 0 20px #ffd700', letterSpacing: '0.04em', margin: '0 0 0.4rem 0' }}>
                      {modeRunResult.result.captionFields.productName}
                    </h1>
                    <div style={{ background: '#ff0080', color: '#fff', padding: '0.3rem 1rem', borderRadius: '6px', fontWeight: 800, fontSize: '0.95rem', display: 'inline-block' }}>
                      {modeRunResult.result.captionFields.tagline}
                    </div>
                  </div>
                )}

                {/* Main Dynamic Caption */}
                {(!modeRunResult.result?.captionFields || selectedModeId !== 'asseenontv') && (
                  <p
                    style={{
                      fontSize: selectedModeId === 'limerick' ? '1.25rem' : '1.4rem',
                      lineHeight: '1.6',
                      fontWeight: 600,
                      color: '#fff',
                      fontStyle: selectedModeId === 'noir' ? 'italic' : 'normal',
                      fontFamily: selectedModeId === 'dossier' ? 'monospace' : 'inherit',
                      margin: '1.5rem 0',
                      whiteSpace: 'pre-line',
                      textShadow: '0 2px 10px rgba(0,0,0,0.5)'
                    }}
                  >
                    "{modeRunResult.result?.caption || 'Awaiting caption...'}"
                  </p>
                )}

                {/* Reveal Beat 2 & 3: Portrait Art Drop */}
                {revealBeat >= 2 && (
                  <div className="animate-fade-in" style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {modeRunResult.result?.portraitBase64 ? (
                      <img
                        src={modeRunResult.result.portraitBase64}
                        alt="Transformed Portrait"
                        style={{
                          width: '240px',
                          height: activeModeMeta.aspectRatio === '4:3' ? '180px' : '320px',
                          borderRadius: '12px',
                          objectFit: 'cover',
                          border: '3px solid #ffd700',
                          boxShadow: '0 0 30px rgba(255, 215, 0, 0.5)'
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '240px',
                          height: '240px',
                          borderRadius: '12px',
                          background: 'linear-gradient(135deg, #ffd700 0%, #ff0080 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '4rem'
                        }}
                      >
                        🎭
                      </div>
                    )}

                    {/* Beat 3: Name Pop */}
                    {revealBeat >= 3 && (
                      <div className="animate-fade-in" style={{ marginTop: '1rem' }}>
                        <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#ffd700' }}>
                          THE SECRET IDENTITY WAS
                        </div>
                        <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#fff', margin: '0.2rem 0 0 0' }}>
                          {subjects[0].displayName}!
                        </h2>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                <Tv size={48} color="rgba(255,255,255,0.2)" style={{ marginBottom: '1rem' }} />
                <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '0.4rem' }}>Big-Screen Display Idle</h3>
                <p style={{ fontSize: '0.85rem', maxWidth: '400px' }}>
                  Click <strong>Run {activeModeMeta.displayName} Pipeline</strong> above to initiate round deduction & presentation.
                </p>
              </div>
            )}

            {/* Real-time Guest Lock-in indicator dots */}
            <div style={{ position: 'absolute', bottom: '1.2rem', display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>LOCKED IN:</span>
              {SAMPLE_PLAYERS.map((p) => {
                const isLocked = p.name === 'Tobin' ? guessLocked : true;
                return (
                  <div
                    key={p.id}
                    title={`${p.name}: ${isLocked ? 'Locked in' : 'Thinking'}`}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: isLocked ? 'rgba(0, 230, 118, 0.25)' : 'rgba(255, 255, 255, 0.1)',
                      border: isLocked ? '1px solid var(--accent-green)' : '1px solid rgba(255, 255, 255, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem'
                    }}
                  >
                    {p.avatar}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SURFACE 2: MOBILE PLAYER (/live) */}
        {activeSurface === 'live' && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div
              className="glass-panel"
              style={{
                width: '100%',
                maxWidth: '380px',
                padding: '1.5rem',
                borderRadius: '24px',
                border: '2px solid rgba(255, 255, 255, 0.15)',
                boxShadow: '0 0 40px rgba(0, 0, 0, 0.5)'
              }}
            >
              {/* Phone Status bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '1.2rem' }}>
                <span>GuessFace Mobile</span>
                <span>⏱ {timerSeconds}s</span>
              </div>

              {/* Spotlight Lockout or Active Guessing */}
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <span className="badge badge-amber" style={{ fontSize: '0.7rem', marginBottom: '0.4rem' }}>
                  {activeModeMeta.displayName}
                </span>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', margin: '0.4rem 0' }}>
                  Who does this describe?
                </h3>
                {selectedModeId === 'dossier' && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>
                    Pick 2 Operatives ({dossierSelections.length}/2 Selected)
                  </span>
                )}
              </div>

              {/* Shuffled Guess Grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {SAMPLE_PLAYERS.map((p) => {
                  const isSelected = selectedModeId === 'dossier'
                    ? dossierSelections.includes(p.name)
                    : selectedGuess === p.name;
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleLockInGuess(p.name)}
                      disabled={guessLocked && selectedModeId !== 'dossier'}
                      style={{
                        padding: '0.75rem 1rem',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        cursor: guessLocked ? 'default' : 'pointer',
                        border: isSelected ? '1px solid #ffd700' : '1px solid var(--border-glass)',
                        background: isSelected ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                        color: isSelected ? '#ffd700' : '#fff',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span style={{ fontSize: '1.2rem' }}>{p.avatar}</span>
                        <span>{p.name}</span>
                      </div>
                      {isSelected && <Check size={18} color="#ffd700" />}
                    </button>
                  );
                })}
              </div>

              {/* Personalized Reveal Feedback */}
              {revealBeat >= 3 && (
                <div
                  className="glass-panel animate-fade-in"
                  style={{
                    marginTop: '1.2rem',
                    padding: '0.8rem',
                    textAlign: 'center',
                    background: selectedGuess === subjects[0].displayName ? 'rgba(0, 230, 118, 0.2)' : 'rgba(255, 0, 128, 0.2)',
                    borderColor: selectedGuess === subjects[0].displayName ? 'var(--accent-green)' : 'var(--accent-pink)'
                  }}
                >
                  {selectedGuess === subjects[0].displayName ? (
                    <div style={{ fontWeight: 800, color: 'var(--accent-green)', fontSize: '0.9rem' }}>
                      🎉 CORRECT! +1 PT
                    </div>
                  ) : (
                    <div style={{ fontWeight: 800, color: '#fff', fontSize: '0.85rem' }}>
                      🎭 DECEIVED! It was {subjects[0].displayName}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SURFACE 3: HOST ADMIN CONTROL (/control) & SCOREBOARD */}
        {activeSurface === 'control' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            <div className="glass-panel" style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Trophy size={18} color="#ffd700" />
                <span>Live Party Scoreboard</span>
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {Object.entries(partyScoreboard)
                  .sort(([, a], [, b]) => b - a)
                  .map(([name, score], idx) => (
                    <div
                      key={name}
                      style={{
                        padding: '0.6rem 0.8rem',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        border: idx === 0 ? '1px solid rgba(255, 215, 0, 0.4)' : '1px solid transparent'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 800, color: idx === 0 ? '#ffd700' : 'var(--text-muted)', width: '20px' }}>
                          #{idx + 1}
                        </span>
                        <span style={{ fontWeight: 700, color: '#fff' }}>{name}</span>
                      </div>
                      <span className="badge badge-amber" style={{ fontSize: '0.75rem', fontWeight: 800 }}>
                        {score} PTS
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Sliders size={18} color="var(--accent-cyan)" />
                <span>Host Actions & Overrides</span>
              </h3>
              <button
                onClick={triggerRevealSequence}
                className="btn btn-primary"
                style={{ padding: '0.6rem', fontSize: '0.85rem', fontWeight: 700 }}
              >
                Force Reveal Now (Cut Timer)
              </button>
              <button
                onClick={() => {
                  setTimerSeconds(activeModeMeta.defaultTimer || 30);
                  setTimerActive(true);
                  setRevealBeat(0);
                  showToast('⏱ Timer restarted');
                }}
                className="btn btn-secondary"
                style={{ padding: '0.6rem', fontSize: '0.85rem' }}
              >
                Restart Round Timer
              </button>
            </div>
          </div>
        )}

        {/* SURFACE 4: JSON TELEMETRY INSPECTOR */}
        {activeSurface === 'inspector' && (
          <div className="glass-panel" style={{ padding: '1.2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>
                Raw Mode Run Payload & Manifest Schema
              </span>
              {modeRunResult?.result?.timingsMs && (
                <span style={{ fontSize: '0.75rem', color: '#00e5ff' }}>
                  Total: {modeRunResult.result.timingsMs.total}ms (Transform: {modeRunResult.result.timingsMs.transform}ms, Caption: {modeRunResult.result.timingsMs.mode_caption}ms)
                </span>
              )}
            </div>
            <pre
              style={{
                background: 'rgba(0,0,0,0.6)',
                padding: '1rem',
                borderRadius: '8px',
                fontSize: '0.75rem',
                color: '#00e5ff',
                overflowX: 'auto',
                maxHeight: '380px'
              }}
            >
              {JSON.stringify(modeRunResult || activeModeMeta, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Copy/Toast Notification */}
      {toastMessage && (
        <div className="toast">
          <Check size={18} color="var(--accent-green)" />
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
