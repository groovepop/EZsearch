import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Sparkles,
  UploadCloud,
  ImageIcon,
  RefreshCw,
  Sliders,
  Download,
  Copy,
  Check,
  AlertTriangle,
  Search,
  Users,
  User,
  Shuffle,
  Eye,
  Layers,
  Activity,
  Info,
  X,
  ChevronDown,
  ChevronUp,
  Wand2,
  Cpu,
  Zap,
  ArrowRight,
  ShieldCheck,
  FileImage
} from 'lucide-react';
import soloStylesData from '../data/styles.json';
import multiStylesData from '../data/styles-multi.json';
import {
  transformGroovePopImage,
  captionGroovePopImage,
  fetchGroovePopEngineHealth
} from '../services/api';

export default function GroovePopWidget() {
  // 1. Subject mode: 'solo' (styles.json) or 'multi' (styles-multi.json)
  const [subjectMode, setSubjectMode] = useState('solo');
  const activeStylesList = useMemo(() => {
    return subjectMode === 'solo' ? soloStylesData : multiStylesData;
  }, [subjectMode]);

  // 2. Upload / Image state
  const [uploadedImage, setUploadedImage] = useState(null);
  const [imageMeta, setImageMeta] = useState({ name: '', width: 0, height: 0, sizeKb: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // 3. Style & Variant selection
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFamilyKey, setSelectedFamilyKey] = useState(() => activeStylesList[0]?.family_key || '');
  const [selectedVariantKey, setSelectedVariantKey] = useState(() => activeStylesList[0]?.variants?.[0]?.key || '');

  // 4. Advanced inputs
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [captionInstruction, setCaptionInstruction] = useState('');

  // 5. Execution, Loading, and Retry states
  const [loading, setLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState(''); // 'captioning' | 'transforming' | 'retrying'
  const [retryCountdown, setRetryCountdown] = useState(0);
  const [captionOnlyLoading, setCaptionOnlyLoading] = useState(false);

  // 6. Results
  const [resultImage, setResultImage] = useState(null);
  const [resultCaption, setResultCaption] = useState(null);
  const [processingTimeMs, setProcessingTimeMs] = useState(null);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [viewMode, setViewMode] = useState('split'); // 'split' | 'result' | 'original'

  // 7. Engine status / health
  const [engineHealth, setEngineHealth] = useState({ checked: false, ok: false, service: '' });

  // Toast Helper
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Check Engine Health on mount
  useEffect(() => {
    let isMounted = true;
    fetchGroovePopEngineHealth()
      .then((data) => {
        if (isMounted) {
          setEngineHealth({
            checked: true,
            ok: !!data?.ok,
            service: data?.service || 'groovepop-engine-api'
          });
        }
      })
      .catch(() => {
        if (isMounted) {
          setEngineHealth({ checked: true, ok: false, service: 'unreachable' });
        }
      });
    return () => { isMounted = false; };
  }, []);

  // Filtered Style Families
  const filteredFamilies = useMemo(() => {
    if (!searchQuery.trim()) return activeStylesList;
    const q = searchQuery.toLowerCase().trim();
    return activeStylesList.filter((f) => {
      const labelMatch = (f.family_label || '').toLowerCase().includes(q);
      const subthemeMatch = (f.subtheme || '').toLowerCase().includes(q);
      const variantMatch = (f.variants || []).some(v => 
        (v.label || '').toLowerCase().includes(q) ||
        (v.key || '').toLowerCase().includes(q) ||
        (v.prompt || []).some(p => p.toLowerCase().includes(q))
      );
      return labelMatch || subthemeMatch || variantMatch;
    });
  }, [activeStylesList, searchQuery]);

  // Current Selected Family
  const currentFamily = useMemo(() => {
    return activeStylesList.find(f => f.family_key === selectedFamilyKey) || activeStylesList[0] || null;
  }, [activeStylesList, selectedFamilyKey]);

  // Current Selected Variant
  const currentVariant = useMemo(() => {
    if (!currentFamily || !currentFamily.variants?.length) return null;
    return currentFamily.variants.find(v => v.key === selectedVariantKey) || currentFamily.variants[0];
  }, [currentFamily, selectedVariantKey]);

  // Keep variant valid when switching family or mode
  useEffect(() => {
    if (currentFamily && (!currentVariant || !currentFamily.variants.some(v => v.key === selectedVariantKey))) {
      setSelectedVariantKey(currentFamily.variants?.[0]?.key || '');
    }
  }, [currentFamily, currentVariant, selectedVariantKey]);

  // If active family is not in filtered list, pick the first filtered family
  useEffect(() => {
    if (filteredFamilies.length > 0 && !filteredFamilies.some(f => f.family_key === selectedFamilyKey)) {
      setSelectedFamilyKey(filteredFamilies[0].family_key);
      setSelectedVariantKey(filteredFamilies[0].variants?.[0]?.key || '');
    }
  }, [filteredFamilies, selectedFamilyKey]);

  // Handle Image File Loading
  const processImageFile = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) {
      showToast('⚠️ Please provide a valid image file (JPEG, PNG, WEBP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      setUploadedImage(dataUrl);

      // Measure dimensions
      const img = new Image();
      img.onload = () => {
        setImageMeta({
          name: file.name,
          width: img.width,
          height: img.height,
          sizeKb: Math.round(file.size / 1024)
        });
      };
      img.src = dataUrl;
      setError(null);
      showToast(`📸 Loaded: ${file.name}`);
    };
    reader.readAsDataURL(file);
  }, []);

  // Global & Dropzone Clipboard Paste Listener
  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            processImageFile(blob);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [processImageFile]);

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  // Randomize Style & Variant
  const handleRandomizeStyle = () => {
    if (!activeStylesList.length) return;
    const randomFamily = activeStylesList[Math.floor(Math.random() * activeStylesList.length)];
    setSelectedFamilyKey(randomFamily.family_key);
    if (randomFamily.variants?.length) {
      const randomVar = randomFamily.variants[Math.floor(Math.random() * randomFamily.variants.length)];
      setSelectedVariantKey(randomVar.key);
    }
    showToast(`🎲 Random Style: ${randomFamily.family_label} · ${randomFamily.subtheme}`);
  };

  // Resolve Flat Style Prompt String
  const resolvedStylePrompt = useMemo(() => {
    if (!currentVariant?.prompt) return '';
    return currentVariant.prompt.map(line => `"${line}",`).join('\n');
  }, [currentVariant]);

  // Full Transform Execution with Automatic 8s Retry on HTTP 429
  const handleTransform = async () => {
    if (!uploadedImage) {
      showToast('⚠️ Please upload or paste a photo first');
      return;
    }
    if (!currentFamily || !currentVariant) {
      showToast('⚠️ Please select a style preset');
      return;
    }

    setLoading(true);
    setError(null);
    setLoadingPhase('captioning');

    const styleLabel = `${currentFamily.family_label} · ${currentFamily.subtheme} (${currentVariant.label})`;
    const aspectRatio = currentVariant.size || '1024x1024';

    const executeCall = async (isRetry = false) => {
      try {
        if (!isRetry) {
          setLoadingPhase('analyzing photo & composing poetic story...');
        } else {
          setLoadingPhase('retrying engine transformation...');
        }

        const res = await transformGroovePopImage({
          image: uploadedImage,
          stylePrompt: resolvedStylePrompt,
          styleLabel,
          aspectRatio,
          clientApp: 'ezsearch',
          captionInstruction: captionInstruction.trim() || undefined
        });

        if (res.success && res.transformedImage) {
          setResultImage(res.transformedImage);
          setResultCaption(res.caption || '');
          setProcessingTimeMs(res.processingTimeMs || null);
          showToast('✨ Visual Transformation Complete!');
        } else {
          throw new Error(res.message || 'Transformation failed to return image data');
        }
      } catch (err) {
        console.error('[GroovePop Transformation Error]', err);
        const errMsg = err.message || '';
        const isRateLimited = err.status === 429 ||
          err.errorType === 'rate_limited' ||
          errMsg.includes('429') ||
          errMsg.includes('rate limit') ||
          errMsg.includes('EngineOverloaded');

        if (isRateLimited && !isRetry) {
          setLoadingPhase('retrying');
          let count = 8;
          setRetryCountdown(count);

          const interval = setInterval(() => {
            count -= 1;
            setRetryCountdown(count);
            if (count <= 0) {
              clearInterval(interval);
            }
          }, 1000);

          await new Promise(r => setTimeout(r, 8000));
          return executeCall(true);
        }

        // Map user-friendly error messages
        let userFacingError = errMsg;
        if (isRateLimited) {
          userFacingError = "Azure OpenAI engine is currently under high load. Please wait a minute and try again.";
        } else if (err.errorType === 'content_policy' || errMsg.includes('content_filter') || errMsg.includes('ResponsibleAI')) {
          userFacingError = "This image or prompt triggered Azure content safety policies. Please try a different photo.";
        } else if (errMsg.includes('timeout') || errMsg.includes('504')) {
          userFacingError = "The engine took longer than expected. Please retry in a few seconds.";
        }

        setError({
          type: err.errorType || 'generation_failed',
          message: userFacingError
        });
      } finally {
        setLoading(false);
        setLoadingPhase('');
        setRetryCountdown(0);
      }
    };

    executeCall(false);
  };

  // Standalone Caption Execution
  const handleCaptionOnly = async () => {
    if (!uploadedImage) {
      showToast('⚠️ Please upload or paste a photo first');
      return;
    }

    setCaptionOnlyLoading(true);
    setError(null);
    try {
      const res = await captionGroovePopImage({
        image: uploadedImage,
        clientApp: 'ezsearch',
        captionInstruction: captionInstruction.trim() || undefined
      });

      if (res.success && res.caption) {
        setResultCaption(res.caption);
        showToast('📝 Generated Poetic Story Caption!');
      } else {
        throw new Error(res.message || 'Failed to generate caption');
      }
    } catch (err) {
      console.error('[GroovePop Caption Error]', err);
      setError({
        type: err.errorType || 'caption_failed',
        message: err.message || 'Vision captioning failed.'
      });
    } finally {
      setCaptionOnlyLoading(false);
    }
  };

  // Copy Caption to Clipboard
  const handleCopyCaption = () => {
    if (!resultCaption) return;
    navigator.clipboard.writeText(resultCaption);
    showToast('📋 Poetic caption copied to clipboard!');
  };

  // Download Transformed Image
  const handleDownload = () => {
    if (!resultImage) return;
    const link = document.createElement('a');
    link.href = `data:image/jpeg;base64,${resultImage}`;
    const cleanFamily = (currentFamily?.family_key || 'groovepop').replace(/[^a-z0-9]/gi, '_');
    const cleanVariant = (currentVariant?.key || 'style').replace(/[^a-z0-9]/gi, '_');
    link.download = `groovepop_${cleanFamily}_${cleanVariant}_${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('💾 Transformed image downloaded!');
  };

  return (
    <div className="groovepop-studio animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', paddingBottom: '2.5rem' }}>
      {/* 1. Header Banner */}
      <div
        className="glass-panel"
        style={{
          padding: '1.4rem 1.6rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          background: 'linear-gradient(135deg, rgba(255, 0, 128, 0.12) 0%, rgba(121, 40, 202, 0.15) 50%, rgba(0, 229, 255, 0.08) 100%)',
          border: '1px solid rgba(255, 0, 128, 0.25)',
          borderRadius: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #ff0080 0%, #7928ca 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(255, 0, 128, 0.4)'
            }}
          >
            <Sparkles size={26} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', margin: 0 }}>
                GROOVE POP Studio
              </h2>
              <span className="badge badge-purple" style={{ fontSize: '0.65rem', padding: '0.2rem 0.55rem' }}>
                GPT-IMAGE-2
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Two-call Azure vision story captioning & aesthetic style transformation engine
            </p>
          </div>
        </div>

        {/* Engine Health Status Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div
            className="glass-panel"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.45rem 0.85rem',
              borderRadius: '20px',
              fontSize: '0.78rem',
              fontWeight: 600,
              border: engineHealth.ok ? '1px solid rgba(0, 230, 118, 0.3)' : '1px solid rgba(255, 183, 3, 0.3)',
              background: engineHealth.ok ? 'rgba(0, 230, 118, 0.08)' : 'rgba(255, 183, 3, 0.08)',
              color: engineHealth.ok ? '#00e676' : 'var(--accent-amber)'
            }}
          >
            <Activity size={14} className={loading ? 'animate-spin' : ''} />
            <span>Engine: {engineHealth.ok ? 'Online (Azure Ready)' : 'Local / Standby'}</span>
          </div>

          <button
            onClick={handleRandomizeStyle}
            className="btn btn-secondary"
            style={{
              padding: '0.45rem 0.9rem',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              borderRadius: '20px'
            }}
            title="Randomize style & variant"
          >
            <Shuffle size={14} />
            <span>Random Style</span>
          </button>
        </div>
      </div>

      {/* 2. Main Studio Grid: Left Column (Upload & Library) / Right Column (Transform & Preview) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.2rem' }}>
        
        {/* Left Column: Upload & Style Picker */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          
          {/* A. Image Upload Card */}
          <div
            className="glass-panel"
            style={{
              padding: '1.2rem',
              borderRadius: '16px',
              border: isDragging ? '2px dashed var(--accent-cyan)' : '1px solid var(--border-glass)',
              background: isDragging ? 'rgba(0, 229, 255, 0.08)' : 'var(--bg-glass)',
              transition: 'all 0.2s ease'
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.9rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ImageIcon size={18} color="var(--accent-pink)" />
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>1. Source Photo</span>
              </div>
              {uploadedImage && (
                <button
                  onClick={() => {
                    setUploadedImage(null);
                    setImageMeta({ name: '', width: 0, height: 0, sizeKb: 0 });
                  }}
                  className="btn btn-secondary"
                  style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  <X size={13} />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {uploadedImage ? (
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div
                  style={{
                    position: 'relative',
                    width: '120px',
                    height: '120px',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: '1px solid var(--border-glow)',
                    background: '#000',
                    flexShrink: 0
                  }}
                >
                  <img
                    src={uploadedImage}
                    alt="Source preview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#fff', wordBreak: 'break-all' }}>
                    {imageMeta.name || 'Pasted / Uploaded Image'}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                    {imageMeta.width > 0 && <span>📐 {imageMeta.width} × {imageMeta.height} px</span>}
                    {imageMeta.sizeKb > 0 && <span>📦 {imageMeta.sizeKb} KB</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.3rem' }}>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                    >
                      Replace Image
                    </button>
                    <button
                      onClick={handleCaptionOnly}
                      disabled={captionOnlyLoading || loading}
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                      title="Run standalone vision story caption without image transformation"
                    >
                      {captionOnlyLoading ? <RefreshCw size={13} className="animate-spin" /> : <Eye size={13} />}
                      <span>Caption Only</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: '2.2rem 1.5rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  border: '1px dashed rgba(255, 255, 255, 0.15)',
                  borderRadius: '12px',
                  background: 'rgba(0, 0, 0, 0.2)',
                  transition: 'background 0.2s ease'
                }}
              >
                <UploadCloud size={38} color="var(--accent-pink)" style={{ marginBottom: '0.6rem', opacity: 0.9 }} />
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#fff', marginBottom: '0.2rem' }}>
                  Click to browse or drop an image here
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Supports JPEG, PNG, WEBP · Clipboard paste (<kbd style={{ background: 'rgba(255,255,255,0.1)', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>Ctrl+V</kbd>) enabled
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  processImageFile(e.target.files[0]);
                }
              }}
            />
          </div>

          {/* B. Subject Mode & Style Library Picker */}
          <div className="glass-panel" style={{ padding: '1.2rem', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Layers size={18} color="var(--accent-cyan)" />
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>2. Style Tag Library</span>
              </div>

              {/* Subject Mode Switcher: Solo vs Multi */}
              <div
                style={{
                  display: 'flex',
                  background: 'rgba(0, 0, 0, 0.35)',
                  padding: '0.2rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-glass)'
                }}
              >
                <button
                  onClick={() => setSubjectMode('solo')}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    border: subjectMode === 'solo' ? '1px solid var(--accent-pink)' : '1px solid transparent',
                    background: subjectMode === 'solo' ? 'rgba(255, 0, 128, 0.25)' : 'transparent',
                    color: subjectMode === 'solo' ? '#ff40a0' : 'var(--text-muted)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <User size={13} />
                  <span>Solo Portrait</span>
                </button>

                <button
                  onClick={() => setSubjectMode('multi')}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    border: subjectMode === 'multi' ? '1px solid var(--accent-cyan)' : '1px solid transparent',
                    background: subjectMode === 'multi' ? 'rgba(0, 229, 255, 0.25)' : 'transparent',
                    color: subjectMode === 'multi' ? 'var(--accent-cyan)' : 'var(--text-muted)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Users size={13} />
                  <span>Group / Multi</span>
                </button>
              </div>
            </div>

            {/* Search Filter for Styles */}
            <div style={{ position: 'relative', marginBottom: '0.9rem' }}>
              <Search size={15} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder={`Search ${activeStylesList.length} aesthetic styles (e.g. Warhol, Cyberpunk, Impasto, Ghibli)...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.8rem 0.6rem 2.3rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-glass)',
                  background: 'rgba(0, 0, 0, 0.3)',
                  color: '#fff',
                  fontSize: '0.82rem',
                  outline: 'none'
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '0.7rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer'
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Style Families Horizontal / Scrollable Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                gap: '0.5rem',
                maxHeight: '230px',
                overflowY: 'auto',
                paddingRight: '0.3rem',
                marginBottom: '1rem'
              }}
            >
              {filteredFamilies.map((fam) => {
                const isSelected = fam.family_key === selectedFamilyKey;
                return (
                  <button
                    key={fam.family_key}
                    onClick={() => {
                      setSelectedFamilyKey(fam.family_key);
                      setSelectedVariantKey(fam.variants?.[0]?.key || '');
                    }}
                    style={{
                      padding: '0.6rem 0.7rem',
                      borderRadius: '10px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      border: isSelected ? '1px solid var(--accent-pink)' : '1px solid rgba(255, 255, 255, 0.07)',
                      background: isSelected
                        ? 'linear-gradient(135deg, rgba(255, 0, 128, 0.22) 0%, rgba(121, 40, 202, 0.22) 100%)'
                        : 'rgba(255, 255, 255, 0.03)',
                      color: isSelected ? '#fff' : 'var(--text-muted)',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.2rem'
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: isSelected ? '#fff' : 'var(--text-main)' }}>
                      {fam.family_label}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: isSelected ? '#ff80bf' : 'var(--text-dim)' }}>
                      {fam.subtheme}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Variant Selector for Current Family */}
            {currentFamily && currentFamily.variants && currentFamily.variants.length > 0 && (
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.25)',
                  padding: '0.85rem',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.08)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                    VARIANT & RATIO (FROM LIBRARY)
                  </span>
                  {currentVariant && (
                    <span className="badge badge-cyan" style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}>
                      📐 {currentVariant.size || '1024x1024'}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {currentFamily.variants.map((v) => {
                    const isVarSelected = v.key === selectedVariantKey;
                    return (
                      <button
                        key={v.key}
                        onClick={() => setSelectedVariantKey(v.key)}
                        style={{
                          padding: '0.4rem 0.75rem',
                          borderRadius: '8px',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: isVarSelected ? '1px solid var(--accent-cyan)' : '1px solid rgba(255, 255, 255, 0.08)',
                          background: isVarSelected ? 'rgba(0, 229, 255, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                          color: isVarSelected ? 'var(--accent-cyan)' : 'var(--text-muted)',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {v.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* C. Collapsible Advanced Options */}
          <div className="glass-panel" style={{ padding: '0.9rem 1.2rem', borderRadius: '14px' }}>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                fontSize: '0.82rem',
                fontWeight: 600
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Sliders size={14} color="var(--accent-purple)" />
                <span>Advanced Caption Override & Prompt Preview</span>
              </div>
              {showAdvanced ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>

            {showAdvanced && (
              <div style={{ marginTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                    Custom Caption Instruction (Optional Prompt Override)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Write a brief poetic story describing what is happening in this photo at Festival of Friends, Hamilton ON..."
                    value={captionInstruction}
                    onChange={(e) => setCaptionInstruction(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-glass)',
                      background: 'rgba(0, 0, 0, 0.3)',
                      color: '#fff',
                      fontSize: '0.78rem',
                      resize: 'vertical',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                    Resolved Style Prompt ({currentVariant?.prompt?.length || 0} lines)
                  </label>
                  <pre
                    style={{
                      background: 'rgba(0, 0, 0, 0.4)',
                      padding: '0.6rem 0.8rem',
                      borderRadius: '8px',
                      fontSize: '0.72rem',
                      color: 'var(--accent-cyan)',
                      whiteSpace: 'pre-wrap',
                      maxHeight: '120px',
                      overflowY: 'auto',
                      border: '1px solid rgba(0, 229, 255, 0.15)'
                    }}
                  >
                    {resolvedStylePrompt || 'No style selected'}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Execution, Transform Action & Results Display */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          
          {/* Main Action Button */}
          <div
            className="glass-panel"
            style={{
              padding: '1.2rem',
              borderRadius: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.9rem',
              background: 'linear-gradient(135deg, rgba(121, 40, 202, 0.12) 0%, rgba(255, 0, 128, 0.12) 100%)',
              border: '1px solid rgba(255, 0, 128, 0.2)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#fff' }}>
                  Ready to Transform
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Selected: <strong style={{ color: 'var(--accent-pink)' }}>{currentFamily?.family_label}</strong> · {currentVariant?.label} ({currentVariant?.size || '1024x1024'})
                </div>
              </div>

              <button
                onClick={handleTransform}
                disabled={loading || !uploadedImage}
                className="btn btn-primary"
                style={{
                  padding: '0.75rem 1.6rem',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #ff0080 0%, #7928ca 100%)',
                  border: 'none',
                  boxShadow: '0 0 25px rgba(255, 0, 128, 0.4)',
                  cursor: loading || !uploadedImage ? 'not-allowed' : 'pointer',
                  opacity: loading || !uploadedImage ? 0.6 : 1
                }}
              >
                {loading ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Wand2 size={18} />
                    <span>Transform Image</span>
                  </>
                )}
              </button>
            </div>

            {/* Live Loading Status Banner */}
            {loading && (
              <div
                className="glass-panel"
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: '10px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid var(--border-glow)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.8rem'
                }}
              >
                <RefreshCw size={20} className="animate-spin" color="var(--accent-cyan)" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>
                    {loadingPhase === 'retrying'
                      ? `Rate limit hit — cooling down & auto-retrying in ${retryCountdown}s...`
                      : 'GROOVE POP Engine Pipeline Active'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Phase: {loadingPhase || 'Classifying subject & rendering aesthetic edits...'}
                  </div>
                </div>
              </div>
            )}

            {/* Error Message Box */}
            {error && (
              <div
                className="glass-panel"
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: '10px',
                  background: 'rgba(255, 23, 68, 0.12)',
                  border: '1px solid var(--accent-red)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.6rem'
                }}
              >
                <AlertTriangle size={18} color="var(--accent-red)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ff4d6d' }}>
                    {error.type === 'rate_limited' ? 'Rate Limit Delay' : 'Transformation Error'}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                    {error.message}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Results Display Area */}
          <div className="glass-panel" style={{ padding: '1.2rem', borderRadius: '16px', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.9rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Eye size={18} color="var(--accent-green)" />
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>3. Transformed Result</span>
                {processingTimeMs && (
                  <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>
                    ⚡ {(processingTimeMs / 1000).toFixed(1)}s
                  </span>
                )}
              </div>

              {resultImage && (
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  {/* View Mode Switcher */}
                  <div
                    style={{
                      display: 'flex',
                      background: 'rgba(0,0,0,0.3)',
                      padding: '0.15rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-glass)'
                    }}
                  >
                    <button
                      onClick={() => setViewMode('split')}
                      style={{
                        padding: '0.25rem 0.55rem',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        border: 'none',
                        background: viewMode === 'split' ? 'rgba(255,255,255,0.15)' : 'transparent',
                        color: viewMode === 'split' ? '#fff' : 'var(--text-muted)',
                        cursor: 'pointer'
                      }}
                    >
                      Split
                    </button>
                    <button
                      onClick={() => setViewMode('result')}
                      style={{
                        padding: '0.25rem 0.55rem',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        border: 'none',
                        background: viewMode === 'result' ? 'rgba(255,255,255,0.15)' : 'transparent',
                        color: viewMode === 'result' ? '#fff' : 'var(--text-muted)',
                        cursor: 'pointer'
                      }}
                    >
                      Result Only
                    </button>
                  </div>

                  <button
                    onClick={handleDownload}
                    className="btn btn-secondary"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                  >
                    <Download size={13} />
                    <span>Download</span>
                  </button>
                </div>
              )}
            </div>

            {/* Result Visual Canvas */}
            {resultImage ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: viewMode === 'split' && uploadedImage ? '1fr 1fr' : '1fr',
                    gap: '0.8rem',
                    background: '#07090e',
                    padding: '0.8rem',
                    borderRadius: '12px',
                    border: '1px solid var(--border-glass)'
                  }}
                >
                  {viewMode === 'split' && uploadedImage && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textAlign: 'center' }}>
                        ORIGINAL
                      </span>
                      <div style={{ borderRadius: '8px', overflow: 'hidden', maxHeight: '380px', display: 'flex', justifyContent: 'center', background: '#000' }}>
                        <img
                          src={uploadedImage}
                          alt="Original"
                          style={{ width: '100%', height: '100%', objectFit: 'contain', maxHeight: '380px' }}
                        />
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-pink)', textAlign: 'center' }}>
                      TRANSFORMED ({currentFamily?.family_label})
                    </span>
                    <div style={{ borderRadius: '8px', overflow: 'hidden', maxHeight: '380px', display: 'flex', justifyContent: 'center', background: '#000', boxShadow: '0 0 30px rgba(255, 0, 128, 0.15)' }}>
                      <img
                        src={`data:image/jpeg;base64,${resultImage}`}
                        alt="Transformed Result"
                        style={{ width: '100%', height: '100%', objectFit: 'contain', maxHeight: '380px' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Poetic Story Caption Box */}
                {resultCaption && (
                  <div
                    className="glass-panel"
                    style={{
                      padding: '1rem',
                      borderRadius: '12px',
                      background: 'rgba(0, 0, 0, 0.35)',
                      border: '1px solid rgba(0, 229, 255, 0.2)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Sparkles size={13} />
                        <span>Poetic Vision Caption (groovepop-vision)</span>
                      </div>
                      <button
                        onClick={handleCopyCaption}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          fontSize: '0.72rem'
                        }}
                      >
                        <Copy size={13} />
                        <span>Copy Story</span>
                      </button>
                    </div>

                    <p
                      style={{
                        margin: 0,
                        fontSize: '0.88rem',
                        lineHeight: 1.5,
                        color: 'var(--text-main)',
                        fontStyle: 'italic'
                      }}
                    >
                      "{resultCaption}"
                    </p>
                  </div>
                )}
              </div>
            ) : resultCaption && !resultImage ? (
              <div
                className="glass-panel"
                style={{
                  padding: '1.2rem',
                  borderRadius: '12px',
                  background: 'rgba(0, 0, 0, 0.35)',
                  border: '1px solid rgba(0, 229, 255, 0.2)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                    ✨ Standalone Vision Story Caption
                  </div>
                  <button
                    onClick={handleCopyCaption}
                    className="btn btn-secondary"
                    style={{ padding: '0.25rem 0.6rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                  >
                    <Copy size={13} />
                    <span>Copy</span>
                  </button>
                </div>
                <p style={{ margin: 0, fontSize: '0.92rem', lineHeight: 1.55, color: '#fff', fontStyle: 'italic' }}>
                  "{resultCaption}"
                </p>
              </div>
            ) : (
              <div
                style={{
                  padding: '4rem 1.5rem',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.8rem',
                  color: 'var(--text-dim)'
                }}
              >
                <FileImage size={42} style={{ opacity: 0.3 }} />
                <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  No Transformation Yet
                </div>
                <div style={{ fontSize: '0.78rem', maxWidth: '320px' }}>
                  Upload a photo on the left, pick an aesthetic style, and tap <strong>Transform Image</strong>.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast">
          <Check size={18} color="var(--accent-green)" />
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
