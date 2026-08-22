import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Wand2,
  Sparkles,
  Layers,
  Image as ImageIcon,
  Sliders,
  Send,
  RefreshCw,
  Copy,
  Check,
  Download,
  Bookmark,
  Trash2,
  Star,
  Search,
  UploadCloud,
  FileText,
  ShieldCheck,
  AlertTriangle,
  Info,
  Maximize2,
  X,
  ExternalLink,
  ChevronRight,
  Eye,
  Settings,
  FolderOpen,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock
} from 'lucide-react';
import {
  fetchWizardStatus,
  composeWizardPrompt,
  generateWizardImage,
  fetchWizardLibrary,
  searchWizardLibrary,
  scanWizardPromptLibrary,
  ingestWizardContent,
  fetchWizardStaged,
  commitWizardApproved,
  fetchWizardSavedPrompts,
  saveWizardPrompt,
  updateWizardPromptRating,
  deleteWizardSavedPrompt,
  fetchWizardGallery,
  saveWizardGalleryImage,
  deleteWizardGalleryImage
} from '../services/api';

const QUICK_INSPIRATIONS = [
  { label: '🏮 Cyberpunk Neo-Tokyo Rain', prompt: 'A neon-drenched alleyway in Neo-Tokyo during a torrential downpour, glowing kanji signs reflecting on wet asphalt, steam rising from ramen carts' },
  { label: '👑 Studio Editorial Portrait', prompt: 'High-fashion editorial studio portrait of a model with delicate gold leaf accents, sculptural lighting, shallow 85mm depth of field' },
  { label: '🌿 Solarpunk Botanical Oasis', prompt: 'A utopian solarpunk city atrium with cascading hanging gardens, solar-glass domes, and clear streams running through polished brass arches' },
  { label: '🧸 3D Isometric Hacker Nook', prompt: 'Isometric 3D diorama render of a cozy retrofuturistic hacker desk with glowing CRT screens, miniature bonsai, and ambient purple rim lights' },
  { label: '☕ Vintage Matchbox Illustration', prompt: 'Mid-century Showa-era Japanese matchbox label graphic art of a vintage astronaut sipping coffee, risograph print texture' }
];

const MEDIUM_OPTIONS = ['auto', 'photograph', 'illustration', 'painting', '3D render', 'graphic design'];
const ASPECT_OPTIONS = ['auto', '1:1', '2:3', '3:2', '16:9', '9:16'];
const COMPOSITION_OPTIONS = ['auto', 'close-up', 'medium', 'wide', 'top-down', 'low-angle', 'symmetrical'];
const LIGHTING_OPTIONS = ['auto', 'natural', 'studio', 'golden hour', 'cinematic neon', 'low-key dramatic', 'volumetric'];
const MOOD_PRESETS = ['Ethereal', 'Gritty', 'Mystical', 'Cyberpunk', 'Warm & Nostalgic', 'Playful', 'Noir'];
const PALETTE_PRESETS = ['Pastel', 'Neon Cyber', 'Monochromatic', 'Warm Autumn', 'Muted Earthy', 'Vibrant Pop'];

export default function PromptWizardWidget() {
  // Navigation Sub-tab
  const [activeTab, setActiveTab] = useState('studio'); // 'studio' | 'gallery' | 'library' | 'diagnostics'

  // Diagnostic Status
  const [statusData, setStatusData] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // 1. Studio State
  const [userChatInput, setUserChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    {
      role: 'assistant',
      content: "👋 Greetings! I'm your **Prompt Wizard & Art Director**. Describe the image you want to create in plain words or adjust the visual controls on the right. I'll search your prompt library and compose an optimized, production-ready prompt package for GPT Image 2.",
      timestamp: Date.now()
    }
  ]);
  const [controls, setControls] = useState({
    medium: 'auto',
    aspect_ratio: 'auto',
    composition: 'auto',
    lighting: 'auto',
    mood: '',
    colour_palette: '',
    detail_level: 'balanced',
    required_text: '',
    background: 'auto',
    num_variants: 2,
    quality: 'medium'
  });
  const [useRAG, setUseRAG] = useState(true);
  const [isComposing, setIsComposing] = useState(false);

  // Result Prompt Package State
  const [currentPackage, setCurrentPackage] = useState(null);
  const [editablePrompt, setEditablePrompt] = useState('');
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(-1); // -1 is primary
  const [promptRating, setPromptRating] = useState(0);
  const [isPromptSaved, setIsPromptSaved] = useState(false);

  // Decoupled Image Generation State
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [imageError, setImageError] = useState(null);
  const [retryCountdown, setRetryCountdown] = useState(0);
  const [isImageSaved, setIsImageSaved] = useState(false);
  const [previewModalImage, setPreviewModalImage] = useState(null);

  // 2. Saved Prompts & Gallery State
  const [savedPromptsList, setSavedPromptsList] = useState([]);
  const [galleryImages, setGalleryImages] = useState([]);
  const [gallerySearchTerm, setGallerySearchTerm] = useState('');
  const [galleryFilterRating, setGalleryFilterRating] = useState(0);
  const [selectedGalleryDetail, setSelectedGalleryDetail] = useState(null);

  // 3. Prompt Library & Ingestion State
  const [libraryPrompts, setLibraryPrompts] = useState([]);
  const [librarySearchQuery, setLibrarySearchQuery] = useState('');
  const [librarySearchResults, setLibrarySearchResults] = useState([]);
  const [stagedCandidates, setStagedCandidates] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const fileUploadRef = useRef(null);

  const messagesEndRef = useRef(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3200);
  };

  // Initial Data Fetching
  const refreshStatus = useCallback(async () => {
    try {
      const st = await fetchWizardStatus();
      setStatusData(st);
    } catch (e) {
      console.warn('[Wizard Status Error]', e);
    }
  }, []);

  const loadSavedData = useCallback(async () => {
    try {
      const [pRes, gRes] = await Promise.all([fetchWizardSavedPrompts(), fetchWizardGallery()]);
      if (pRes?.prompts) setSavedPromptsList(pRes.prompts);
      if (gRes?.images) setGalleryImages(gRes.images);
    } catch (e) {
      console.warn('[Wizard Saved Data Error]', e);
    }
  }, []);

  const loadLibraryData = useCallback(async () => {
    try {
      const [libRes, stagedRes] = await Promise.all([fetchWizardLibrary(), fetchWizardStaged()]);
      if (libRes?.prompts) setLibraryPrompts(libRes.prompts);
      if (stagedRes?.staged) setStagedCandidates(stagedRes.staged);
    } catch (e) {
      console.warn('[Wizard Library Data Error]', e);
    }
  }, []);

  useEffect(() => {
    refreshStatus();
    loadSavedData();
    loadLibraryData();
  }, [refreshStatus, loadSavedData, loadLibraryData]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isComposing]);

  // -------------------------------------------------------------------------
  // Studio Actions: Build & Compose Prompt
  // -------------------------------------------------------------------------

  const handleBuildPrompt = async (textOverride = null) => {
    const text = (textOverride || userChatInput).trim();
    if (!text && !currentPackage) {
      showToast('⚠️ Please enter an image idea or request');
      return;
    }

    const newUserMsg = text ? { role: 'user', content: text, timestamp: Date.now() } : null;
    const updatedMessages = newUserMsg ? [...chatMessages, newUserMsg] : [...chatMessages];
    if (newUserMsg) {
      setChatMessages(updatedMessages);
      setUserChatInput('');
    }

    setIsComposing(true);
    setSelectedVariantIndex(-1);
    setIsPromptSaved(false);

    try {
      const apiHistory = updatedMessages.slice(-8).map(m => ({ role: m.role, content: m.content }));
      const res = await composeWizardPrompt({
        userRequest: text || 'Refine the prompt based on controls',
        messages: apiHistory,
        controls,
        useRAG
      });

      if (res?.package) {
        const pkg = res.package;
        setCurrentPackage(pkg);
        setEditablePrompt(pkg.final_prompt || '');
        setPromptRating(0);

        // Append assistant response to chat
        const assistantMsg = {
          role: 'assistant',
          content: pkg.clarification_needed && pkg.clarification_question
            ? `❓ **Clarification Question:**\n${pkg.clarification_question}\n\n*Meanwhile, here is a draft prompt package below based on best inferences:*`
            : `✨ **Prompt Package Composed: "${pkg.title}"**\nReady for review and editing in the studio below.`,
          timestamp: Date.now()
        };
        setChatMessages(prev => [...prev, assistantMsg]);
        showToast('🪄 Production Prompt Package Ready!');
      } else {
        throw new Error('No prompt package returned from server');
      }
    } catch (err) {
      console.error('[Build Prompt Error]', err);
      showToast(`❌ Prompt composition failed: ${err.message}`);
      setChatMessages(prev => [
        ...prev,
        { role: 'assistant', content: `⚠️ Failed to compose prompt: ${err.message}`, timestamp: Date.now() }
      ]);
    } finally {
      setIsComposing(false);
    }
  };

  const handleSelectVariant = (index) => {
    setSelectedVariantIndex(index);
    if (index === -1) {
      setEditablePrompt(currentPackage?.final_prompt || '');
    } else if (currentPackage?.variants?.[index]) {
      setEditablePrompt(currentPackage.variants[index]);
    }
    showToast(index === -1 ? 'Selected Primary Prompt' : `Swapped to Variant #${index + 1}`);
  };

  const handleCopyPrompt = () => {
    if (!editablePrompt) return;
    navigator.clipboard.writeText(editablePrompt);
    showToast('📋 Prompt copied to clipboard!');
  };

  const handleSavePrompt = async () => {
    if (!editablePrompt) return;
    try {
      const record = {
        title: currentPackage?.title || 'Custom Prompt',
        user_request: chatMessages.filter(m => m.role === 'user').slice(-1)[0]?.content || '',
        final_prompt: editablePrompt,
        variants: currentPackage?.variants || [],
        settings: {
          size: controls.aspect_ratio,
          quality: controls.quality,
          medium: controls.medium
        },
        rating: promptRating,
        retrieval_record_ids: currentPackage?.retrieval_record_ids || []
      };

      const res = await saveWizardPrompt(record);
      if (res?.record) {
        setIsPromptSaved(true);
        loadSavedData();
        showToast('⭐ Prompt successfully saved to history!');
      }
    } catch (e) {
      showToast(`❌ Failed to save prompt: ${e.message}`);
    }
  };

  // -------------------------------------------------------------------------
  // Explicit Image Generation (Decoupled Workflow)
  // -------------------------------------------------------------------------

  const handleGenerateImage = async () => {
    if (!editablePrompt) {
      showToast('⚠️ Build or enter an editable prompt first');
      return;
    }

    setIsGeneratingImage(true);
    setImageError(null);
    setGeneratedImage(null);
    setIsImageSaved(false);

    const executeCall = async (isRetry = false) => {
      try {
        const res = await generateWizardImage({
          prompt: editablePrompt,
          size: controls.aspect_ratio,
          quality: controls.quality,
          output_format: 'jpeg',
          background: controls.background
        });

        if (res?.image) {
          setGeneratedImage(res.image);
          showToast('🎨 Image Generated via GPT Image 2!');
        } else {
          throw new Error('Image generation did not return image data');
        }
      } catch (err) {
        console.error('[Wizard Image Generation Error]', err);
        const isRateLimited = err.status === 429 || (err.message && err.message.includes('429'));
        if (isRateLimited && !isRetry) {
          let count = 8;
          setRetryCountdown(count);
          const interval = setInterval(() => {
            count -= 1;
            setRetryCountdown(count);
            if (count <= 0) clearInterval(interval);
          }, 1000);

          await new Promise(r => setTimeout(r, 8000));
          return executeCall(true);
        }

        setImageError(err.message || 'Image generation failed');
        showToast(`❌ Image generation error: ${err.message}`);
      } finally {
        setIsGeneratingImage(false);
        setRetryCountdown(0);
      }
    };

    executeCall(false);
  };

  const handleDownloadImage = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage.startsWith('http') ? generatedImage : `data:image/jpeg;base64,${generatedImage}`;
    const cleanTitle = (currentPackage?.title || 'wizard_image').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.download = `${cleanTitle}_${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('💾 Image downloaded to disk!');
  };

  const handleSaveImageToGallery = async () => {
    if (!generatedImage) return;
    try {
      const res = await saveWizardGalleryImage({
        imageBase64: generatedImage,
        title: currentPackage?.title || 'Wizard Creation',
        prompt: editablePrompt,
        settings: {
          aspect_ratio: controls.aspect_ratio,
          quality: controls.quality,
          medium: controls.medium
        },
        rating: promptRating
      });

      if (res?.image) {
        setIsImageSaved(true);
        loadSavedData();
        showToast('🖼️ Image durably saved to Private Gallery!');
      }
    } catch (e) {
      showToast(`❌ Failed to save image: ${e.message}`);
    }
  };

  // -------------------------------------------------------------------------
  // Prompt Library Actions
  // -------------------------------------------------------------------------

  const handleScanLibraryFolder = async () => {
    setIsScanning(true);
    try {
      const res = await scanWizardPromptLibrary();
      if (res?.scanReport) {
        loadLibraryData();
        showToast(`📂 Scanned ${res.scanReport.files.length} prompt files (${res.scanReport.stagedCount} candidates staged)`);
      }
    } catch (e) {
      showToast(`❌ Scan failed: ${e.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  const handleCommitStaged = async () => {
    setIsCommitting(true);
    try {
      const res = await commitWizardApproved([]);
      if (res?.success) {
        loadLibraryData();
        refreshStatus();
        showToast(`✅ Published ${res.newlyAdded} prompts to search index (Total: ${res.totalIndexed})`);
      }
    } catch (e) {
      showToast(`❌ Commit failed: ${e.message}`);
    } finally {
      setIsCommitting(false);
    }
  };

  const handleSearchLibrary = async () => {
    if (!librarySearchQuery.trim()) {
      setLibrarySearchResults([]);
      return;
    }
    try {
      const res = await searchWizardLibrary(librarySearchQuery, 12);
      if (res?.results) {
        setLibrarySearchResults(res.results);
      }
    } catch (e) {
      showToast(`❌ Search error: ${e.message}`);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target.result;
      try {
        const res = await ingestWizardContent({ content, fileName: file.name });
        if (res?.parsedReport) {
          loadLibraryData();
          showToast(`📄 Parsed ${res.parsedReport.candidatesCount} candidates from ${file.name}`);
        }
      } catch (err) {
        showToast(`❌ Ingestion failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  // Filtered Gallery Images
  const filteredGallery = useMemo(() => {
    let list = [...galleryImages];
    if (galleryFilterRating > 0) {
      list = list.filter(item => (item.rating || 0) >= galleryFilterRating);
    }
    if (gallerySearchTerm.trim()) {
      const q = gallerySearchTerm.toLowerCase();
      list = list.filter(item => (item.title || '').toLowerCase().includes(q) || (item.prompt || '').toLowerCase().includes(q));
    }
    return list;
  }, [galleryImages, galleryFilterRating, gallerySearchTerm]);

  return (
    <div className="wizard-studio animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', paddingBottom: '3rem' }}>
      
      {/* 1. Header Section Banner */}
      <div className="section-banner-card">
        <img 
          src="/banners/banner-wizard.jpg" 
          alt="AI Art Prompt Wizard" 
          style={{ maxHeight: '140px', objectFit: 'contain', background: '#090514' }}
        />
      </div>

      {/* 2. Top Navigation Hub Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '1.1rem 1.4rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.14) 0%, rgba(121, 40, 202, 0.18) 50%, rgba(0, 229, 255, 0.08) 100%)',
          border: '1px solid rgba(168, 85, 247, 0.3)',
          borderRadius: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #a855f7 0%, #7928ca 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(168, 85, 247, 0.45)'
            }}
          >
            <Wand2 size={24} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', margin: 0 }}>
                AI PROMPT WIZARD
              </h2>
              <span className="badge badge-purple" style={{ fontSize: '0.65rem', padding: '0.2rem 0.55rem', background: 'rgba(168, 85, 247, 0.25)', border: '1px solid #a855f7' }}>
                GPT-5.6 TERRA + RAG
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.2rem' }}>
              Art director prompt synthesizer, searchable prompt library & GPT Image 2 engine
            </p>
          </div>
        </div>

        {/* Sub-tab Navigation Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('studio')}
            className={`btn ${activeTab === 'studio' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.45rem 0.9rem', fontSize: '0.82rem' }}
          >
            <Wand2 size={14} />
            <span>Prompt Studio</span>
          </button>

          <button
            onClick={() => setActiveTab('gallery')}
            className={`btn ${activeTab === 'gallery' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.45rem 0.9rem', fontSize: '0.82rem' }}
          >
            <ImageIcon size={14} />
            <span>Saved Gallery & History</span>
            {galleryImages.length > 0 && (
              <span className="badge badge-purple" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', marginLeft: '0.2rem' }}>
                {galleryImages.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('library')}
            className={`btn ${activeTab === 'library' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.45rem 0.9rem', fontSize: '0.82rem' }}
          >
            <FolderOpen size={14} />
            <span>Prompt Library & Ingestion</span>
            {libraryPrompts.length > 0 && (
              <span className="badge badge-cyan" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', marginLeft: '0.2rem' }}>
                {libraryPrompts.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`btn ${activeTab === 'diagnostics' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.45rem 0.8rem', fontSize: '0.82rem' }}
            title="Azure Foundry Diagnostics & System Instructions"
          >
            <Settings size={14} />
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* SUB-VIEW 1: PROMPT STUDIO (COMPOSER & IMAGE GENERATOR) */}
      {/* ===================================================================== */}
      {activeTab === 'studio' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          
          {/* Quick Inspiration Presets */}
          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.3rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap' }}>
              <Sparkles size={13} color="#a855f7" /> Quick Ideas:
            </span>
            {QUICK_INSPIRATIONS.map((item, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setUserChatInput(item.prompt);
                  handleBuildPrompt(item.prompt);
                }}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.76rem', whiteSpace: 'nowrap', borderRadius: '20px' }}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Studio Main Grid: Left Chat & Art Director vs Right Creative Controls */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.2rem' }}>
            
            {/* LEFT: Conversational Art Director Chat */}
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '480px', borderRadius: '16px' }}>
              <div style={{ padding: '0.9rem 1.2rem', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Wand2 size={16} color="#a855f7" />
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>1. Conversational Art Director</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={useRAG} 
                      onChange={(e) => setUseRAG(e.target.checked)} 
                      style={{ accentColor: '#a855f7' }}
                    />
                    <span>Use Prompt Library (RAG)</span>
                  </label>
                </div>
              </div>

              {/* Chat Stream Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {chatMessages.map((msg, idx) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div
                      key={idx}
                      style={{
                        alignSelf: isUser ? 'flex-end' : 'flex-start',
                        maxWidth: '88%',
                        padding: '0.75rem 1rem',
                        borderRadius: isUser ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                        background: isUser ? 'linear-gradient(135deg, #a855f7 0%, #7928ca 100%)' : 'rgba(255, 255, 255, 0.05)',
                        border: isUser ? 'none' : '1px solid var(--border-glass)',
                        color: '#fff',
                        fontSize: '0.85rem',
                        lineHeight: 1.45
                      }}
                    >
                      <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                    </div>
                  );
                })}
                {isComposing && (
                  <div style={{ alignSelf: 'flex-start', padding: '0.6rem 0.9rem', borderRadius: '12px', background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.3)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: '#c084fc' }}>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Searching library & synthesizing prompt package...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input & Build Button */}
              <div style={{ padding: '0.8rem', borderTop: '1px solid var(--border-glass)', display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Describe your art idea (e.g. moody cyberpunk detective in rain)..."
                  value={userChatInput}
                  onChange={(e) => setUserChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleBuildPrompt();
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '0.65rem 0.9rem',
                    borderRadius: '10px',
                    border: '1px solid var(--border-glass)',
                    background: 'rgba(0, 0, 0, 0.35)',
                    color: '#fff',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                />
                <button
                  onClick={() => handleBuildPrompt()}
                  disabled={isComposing}
                  className="btn btn-primary"
                  style={{
                    background: 'linear-gradient(135deg, #a855f7 0%, #7928ca 100%)',
                    color: '#fff',
                    padding: '0.65rem 1.1rem',
                    fontSize: '0.85rem',
                    boxShadow: '0 0 15px rgba(168, 85, 247, 0.35)'
                  }}
                >
                  {isComposing ? <RefreshCw size={15} className="animate-spin" /> : <Wand2 size={15} />}
                  <span>Build Prompt</span>
                </button>
              </div>
            </div>

            {/* RIGHT: Synchronized Visual Creative Controls */}
            <div className="glass-panel" style={{ padding: '1.2rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '0.9rem', maxHeight: '480px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.6rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Sliders size={16} color="var(--accent-cyan)" />
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>2. Visual Creative Controls</span>
                </div>
                <button
                  onClick={() => setControls({
                    medium: 'auto',
                    aspect_ratio: 'auto',
                    composition: 'auto',
                    lighting: 'auto',
                    mood: '',
                    colour_palette: '',
                    detail_level: 'balanced',
                    required_text: '',
                    background: 'auto',
                    num_variants: 2,
                    quality: 'medium'
                  })}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.72rem', cursor: 'pointer' }}
                >
                  Reset Controls
                </button>
              </div>

              {/* Control Rows */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {/* Visual Medium */}
                <div>
                  <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>Visual Medium</label>
                  <select
                    value={controls.medium}
                    onChange={(e) => setControls({ ...controls, medium: e.target.value })}
                    style={{ width: '100%', padding: '0.45rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.8rem' }}
                  >
                    {MEDIUM_OPTIONS.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
                  </select>
                </div>

                {/* Aspect Ratio */}
                <div>
                  <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>Aspect Ratio</label>
                  <select
                    value={controls.aspect_ratio}
                    onChange={(e) => setControls({ ...controls, aspect_ratio: e.target.value })}
                    style={{ width: '100%', padding: '0.45rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.8rem' }}
                  >
                    {ASPECT_OPTIONS.map(a => <option key={a} value={a}>{a.toUpperCase()}</option>)}
                  </select>
                </div>

                {/* Composition */}
                <div>
                  <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>Composition</label>
                  <select
                    value={controls.composition}
                    onChange={(e) => setControls({ ...controls, composition: e.target.value })}
                    style={{ width: '100%', padding: '0.45rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.8rem' }}
                  >
                    {COMPOSITION_OPTIONS.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                  </select>
                </div>

                {/* Lighting */}
                <div>
                  <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>Lighting</label>
                  <select
                    value={controls.lighting}
                    onChange={(e) => setControls({ ...controls, lighting: e.target.value })}
                    style={{ width: '100%', padding: '0.45rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.8rem' }}
                  >
                    {LIGHTING_OPTIONS.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
                  </select>
                </div>
              </div>

              {/* Mood Presets */}
              <div>
                <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem', fontWeight: 600 }}>Mood / Vibe</label>
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                  {MOOD_PRESETS.map(m => (
                    <button
                      key={m}
                      onClick={() => setControls({ ...controls, mood: controls.mood === m ? '' : m })}
                      style={{
                        padding: '0.25rem 0.55rem',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        border: controls.mood === m ? '1px solid #a855f7' : '1px solid rgba(255,255,255,0.08)',
                        background: controls.mood === m ? 'rgba(168, 85, 247, 0.25)' : 'rgba(255,255,255,0.03)',
                        color: controls.mood === m ? '#c084fc' : 'var(--text-muted)'
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Or custom mood (e.g. melancholic rain, cyberpunk trance)..."
                  value={controls.mood}
                  onChange={(e) => setControls({ ...controls, mood: e.target.value })}
                  style={{ width: '100%', padding: '0.45rem 0.7rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.78rem' }}
                />
              </div>

              {/* Colour Palette */}
              <div>
                <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem', fontWeight: 600 }}>Colour Palette</label>
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                  {PALETTE_PRESETS.map(p => (
                    <button
                      key={p}
                      onClick={() => setControls({ ...controls, colour_palette: controls.colour_palette === p ? '' : p })}
                      style={{
                        padding: '0.25rem 0.55rem',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        border: controls.colour_palette === p ? '1px solid var(--accent-cyan)' : '1px solid rgba(255,255,255,0.08)',
                        background: controls.colour_palette === p ? 'rgba(0, 229, 255, 0.2)' : 'rgba(255,255,255,0.03)',
                        color: controls.colour_palette === p ? 'var(--accent-cyan)' : 'var(--text-muted)'
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text in Image Requirement & Quality */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>Required Text in Image</label>
                  <input
                    type="text"
                    placeholder="e.g. 'NEO TOKYO' (exact words)"
                    value={controls.required_text}
                    onChange={(e) => setControls({ ...controls, required_text: e.target.value })}
                    style={{ width: '100%', padding: '0.45rem 0.7rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.78rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>Target Quality</label>
                  <select
                    value={controls.quality}
                    onChange={(e) => setControls({ ...controls, quality: e.target.value })}
                    style={{ width: '100%', padding: '0.45rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.8rem' }}
                  >
                    <option value="low">Standard / Fast</option>
                    <option value="medium">Medium (Balanced)</option>
                    <option value="high">High (Ultra Detail)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Result Prompt Package & Decoupled Generation Bar */}
          {currentPackage && (
            <div className="glass-panel animate-fade-in" style={{ padding: '1.4rem', borderRadius: '16px', border: '1px solid rgba(168, 85, 247, 0.3)', background: 'linear-gradient(180deg, rgba(168, 85, 247, 0.08) 0%, rgba(18, 22, 31, 0.8) 100%)' }}>
              
              {/* Header with Title & Variants Switcher */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.8rem', marginBottom: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span className="badge badge-purple" style={{ fontSize: '0.68rem', padding: '0.2rem 0.5rem' }}>PROMPT PACKAGE</span>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                      {currentPackage.title || 'Structured Art Prompt'}
                    </h3>
                  </div>
                </div>

                {/* Variant Switcher Tabs */}
                <div style={{ display: 'flex', gap: '0.35rem', background: 'rgba(0,0,0,0.3)', padding: '0.25rem', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
                  <button
                    onClick={() => handleSelectVariant(-1)}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: selectedVariantIndex === -1 ? '1px solid #a855f7' : '1px solid transparent',
                      background: selectedVariantIndex === -1 ? 'rgba(168, 85, 247, 0.3)' : 'transparent',
                      color: selectedVariantIndex === -1 ? '#fff' : 'var(--text-muted)'
                    }}
                  >
                    Primary Prompt
                  </button>
                  {currentPackage.variants?.map((v, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectVariant(idx)}
                      style={{
                        padding: '0.35rem 0.75rem',
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: selectedVariantIndex === idx ? '1px solid #a855f7' : '1px solid transparent',
                        background: selectedVariantIndex === idx ? 'rgba(168, 85, 247, 0.3)' : 'transparent',
                        color: selectedVariantIndex === idx ? '#fff' : 'var(--text-muted)'
                      }}
                    >
                      Variant #{idx + 1}
                    </button>
                  ))}
                </div>
              </div>

              {/* Editable Prompt Body Area */}
              <div style={{ position: 'relative', marginBottom: '1rem' }}>
                <textarea
                  rows={5}
                  value={editablePrompt}
                  onChange={(e) => setEditablePrompt(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.9rem 1rem',
                    borderRadius: '12px',
                    background: 'rgba(8, 10, 16, 0.85)',
                    border: '1px solid var(--border-glass)',
                    color: '#f1f5f9',
                    fontSize: '0.92rem',
                    lineHeight: 1.55,
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    outline: 'none'
                  }}
                />
                <div style={{ position: 'absolute', right: '0.8rem', bottom: '0.8rem', display: 'flex', gap: '0.4rem' }}>
                  <button
                    onClick={handleCopyPrompt}
                    className="btn btn-secondary"
                    style={{ padding: '0.3rem 0.7rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                  >
                    <Copy size={13} />
                    <span>Copy</span>
                  </button>
                </div>
              </div>

              {/* RAG Reference Provenance Chips */}
              {currentPackage.retrievedExamples && currentPackage.retrievedExamples.length > 0 && (
                <div style={{ marginBottom: '1rem', background: 'rgba(0,0,0,0.25)', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--accent-cyan)', display: 'block', marginBottom: '0.35rem' }}>
                    📚 RETRIEVED LIBRARY EXAMPLES (PROVENANCE):
                  </span>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {currentPackage.retrievedExamples.map((ex, idx) => (
                      <div key={idx} style={{ fontSize: '0.74rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)', padding: '0.25rem 0.55rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <strong style={{ color: '#fff' }}>{ex.title}</strong> ({ex.source_file})
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Prompt Actions Bar & Decoupled Image Generation Trigger */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderTop: '1px solid var(--border-glass)', paddingTop: '1rem' }}>
                
                {/* Rating & Save Prompt */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: '0.2rem' }}>Rate:</span>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={16}
                        onClick={() => setPromptRating(star)}
                        fill={star <= promptRating ? '#ffd700' : 'none'}
                        color={star <= promptRating ? '#ffd700' : 'var(--text-dim)'}
                        style={{ cursor: 'pointer' }}
                      />
                    ))}
                  </div>

                  <button
                    onClick={handleSavePrompt}
                    disabled={isPromptSaved}
                    className={`btn ${isPromptSaved ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '0.4rem 0.85rem', fontSize: '0.78rem' }}
                  >
                    {isPromptSaved ? <Check size={14} /> : <Bookmark size={14} />}
                    <span>{isPromptSaved ? 'Saved to History' : 'Save Prompt'}</span>
                  </button>
                </div>

                {/* Explicit Image Generation Button (Separation of Concerns) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                    <div>Model: <strong style={{ color: '#fff' }}>GPT Image 2</strong></div>
                    <div>{controls.aspect_ratio} · {controls.quality} quality</div>
                  </div>

                  <button
                    onClick={handleGenerateImage}
                    disabled={isGeneratingImage || retryCountdown > 0}
                    className="btn btn-primary"
                    style={{
                      background: 'linear-gradient(135deg, #ff0080 0%, #7928ca 100%)',
                      color: '#fff',
                      padding: '0.65rem 1.3rem',
                      fontSize: '0.9rem',
                      fontWeight: 800,
                      boxShadow: '0 0 20px rgba(255, 0, 128, 0.4)'
                    }}
                  >
                    {isGeneratingImage ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        <span>{retryCountdown > 0 ? `Retrying in ${retryCountdown}s...` : 'Rendering Image...'}</span>
                      </>
                    ) : (
                      <>
                        <ImageIcon size={16} />
                        <span>Generate Image</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 4. Generated Image Temporary Result Area */}
          {(generatedImage || isGeneratingImage || imageError) && (
            <div className="glass-panel animate-fade-in" style={{ padding: '1.4rem', borderRadius: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ImageIcon size={18} color="var(--accent-pink)" />
                  <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>Generated Image Result (Temporary)</span>
                </div>
                {generatedImage && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => setPreviewModalImage(generatedImage)}
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                    >
                      <Maximize2 size={13} />
                      <span>Full View</span>
                    </button>
                    <button
                      onClick={handleDownloadImage}
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                    >
                      <Download size={13} />
                      <span>Download</span>
                    </button>
                    <button
                      onClick={handleSaveImageToGallery}
                      disabled={isImageSaved}
                      className={`btn ${isImageSaved ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '0.35rem 0.85rem', fontSize: '0.78rem' }}
                    >
                      {isImageSaved ? <Check size={13} /> : <Bookmark size={13} />}
                      <span>{isImageSaved ? 'Saved to Gallery' : 'Save Image'}</span>
                    </button>
                  </div>
                )}
              </div>

              {isGeneratingImage ? (
                <div style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
                  <RefreshCw size={36} className="animate-spin" color="var(--accent-pink)" style={{ marginBottom: '1rem' }} />
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    {retryCountdown > 0 ? `Rate limited — retrying engine in ${retryCountdown}s...` : 'Calling Azure GPT Image 2 model deployment...'}
                  </p>
                </div>
              ) : imageError ? (
                <div style={{ textAlign: 'center', padding: '2rem', border: '1px solid var(--accent-red)', borderRadius: '12px', background: 'rgba(255, 23, 68, 0.08)' }}>
                  <AlertTriangle size={32} color="var(--accent-red)" style={{ marginBottom: '0.6rem' }} />
                  <h4 style={{ color: '#fff', marginBottom: '0.3rem' }}>Image Generation Failed</h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '500px', margin: '0 auto 1rem auto' }}>{imageError}</p>
                  <button onClick={handleGenerateImage} className="btn btn-primary" style={{ padding: '0.45rem 1rem', fontSize: '0.82rem' }}>
                    Try Again
                  </button>
                </div>
              ) : generatedImage ? (
                <div style={{ display: 'flex', justifyContent: 'center', background: '#000', borderRadius: '12px', padding: '0.8rem', overflow: 'hidden' }}>
                  <img
                    src={generatedImage.startsWith('http') ? generatedImage : `data:image/jpeg;base64,${generatedImage}`}
                    alt="Generated Art"
                    style={{ maxWidth: '100%', maxHeight: '550px', objectFit: 'contain', borderRadius: '8px' }}
                  />
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUB-VIEW 2: SAVED GALLERY & HISTORY */}
      {/* ===================================================================== */}
      {activeTab === 'gallery' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          
          {/* Gallery Toolbar: Search & Star Filter */}
          <div className="glass-panel" style={{ padding: '1rem 1.3rem', borderRadius: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.8rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, minWidth: '240px' }}>
              <Search size={16} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Search saved creations by prompt or title..."
                value={gallerySearchTerm}
                onChange={(e) => setGallerySearchTerm(e.target.value)}
                style={{ width: '100%', padding: '0.45rem 0.8rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.82rem' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Rating Filter:</span>
              <button
                onClick={() => setGalleryFilterRating(0)}
                className={`btn ${galleryFilterRating === 0 ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.72rem' }}
              >
                All ({galleryImages.length})
              </button>
              <button
                onClick={() => setGalleryFilterRating(5)}
                className={`btn ${galleryFilterRating === 5 ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.72rem' }}
              >
                ⭐⭐⭐⭐⭐ 5 Stars
              </button>
            </div>
          </div>

          {/* Gallery Grid */}
          {filteredGallery.length === 0 ? (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 1.5rem', borderRadius: '16px' }}>
              <ImageIcon size={42} color="var(--text-dim)" style={{ marginBottom: '0.8rem' }} />
              <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '0.3rem' }}>No Saved Gallery Images</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                When you generate an image in the Prompt Studio, click "Save Image" to keep it in your durable private gallery.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.2rem' }}>
              {filteredGallery.map((item) => (
                <div
                  key={item.id}
                  className="glass-card"
                  style={{ borderRadius: '14px', overflow: 'hidden', display: 'flex', flexDirection: 'column', cursor: 'pointer' }}
                  onClick={() => setSelectedGalleryDetail(item)}
                >
                  <div style={{ position: 'relative', height: '220px', background: '#000' }}>
                    <img
                      src={item.image.startsWith('http') ? item.image : `data:image/jpeg;base64,${item.image}`}
                      alt={item.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    {item.rating > 0 && (
                      <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.7)', padding: '0.2rem 0.5rem', borderRadius: '12px', fontSize: '0.72rem', color: '#ffd700', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <Star size={12} fill="#ffd700" /> {item.rating}
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1 }}>
                    <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.title}
                    </h4>
                    <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.4 }}>
                      {item.prompt}
                    </p>
                    <div style={{ marginTop: 'auto', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                      <span>{new Date(item.created_at).toLocaleDateString()}</span>
                      <span style={{ color: 'var(--accent-cyan)' }}>View Details →</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Gallery Detail Modal */}
          {selectedGalleryDetail && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.85)',
                backdropFilter: 'blur(12px)',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1.5rem'
              }}
              onClick={() => setSelectedGalleryDetail(null)}
            >
              <div
                className="glass-panel"
                style={{
                  maxWidth: '900px',
                  width: '100%',
                  maxHeight: '90vh',
                  overflowY: 'auto',
                  borderRadius: '20px',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.2rem',
                  background: '#0d1017'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                    {selectedGalleryDetail.title}
                  </h3>
                  <button onClick={() => setSelectedGalleryDetail(null)} className="btn-icon">
                    <X size={18} />
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.2rem' }}>
                  <div style={{ background: '#000', borderRadius: '12px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img
                      src={selectedGalleryDetail.image.startsWith('http') ? selectedGalleryDetail.image : `data:image/jpeg;base64,${selectedGalleryDetail.image}`}
                      alt={selectedGalleryDetail.title}
                      style={{ maxWidth: '100%', maxHeight: '420px', objectFit: 'contain' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    <div>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>PROMPT</span>
                      <p style={{ fontSize: '0.85rem', color: '#f1f5f9', background: 'rgba(255,255,255,0.04)', padding: '0.8rem', borderRadius: '8px', lineHeight: 1.5, marginTop: '0.2rem' }}>
                        {selectedGalleryDetail.prompt}
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(selectedGalleryDetail.prompt);
                          showToast('📋 Prompt copied to clipboard!');
                        }}
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.78rem' }}
                      >
                        <Copy size={13} />
                        <span>Copy Prompt</span>
                      </button>

                      <button
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = selectedGalleryDetail.image.startsWith('http') ? selectedGalleryDetail.image : `data:image/jpeg;base64,${selectedGalleryDetail.image}`;
                          link.download = `${selectedGalleryDetail.title.replace(/[^a-z0-9]/gi, '_')}.jpg`;
                          link.click();
                        }}
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.78rem' }}
                      >
                        <Download size={13} />
                        <span>Download Image</span>
                      </button>

                      <button
                        onClick={async () => {
                          await deleteWizardGalleryImage(selectedGalleryDetail.id);
                          setSelectedGalleryDetail(null);
                          loadSavedData();
                          showToast('🗑️ Image deleted from gallery');
                        }}
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.78rem', color: 'var(--accent-red)' }}
                      >
                        <Trash2 size={13} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUB-VIEW 3: PROMPT LIBRARY & INGESTION HUB */}
      {/* ===================================================================== */}
      {activeTab === 'library' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          
          {/* Top Actions: Local Folder Scan & File Dropzone */}
          <div className="glass-panel" style={{ padding: '1.2rem', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                Prompt Library & Deterministic Parser
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                Indexes local .txt & .md prompt collections into structured reference candidates for RAG.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              <button
                onClick={handleScanLibraryFolder}
                disabled={isScanning}
                className="btn btn-secondary"
                style={{ padding: '0.45rem 0.9rem', fontSize: '0.82rem' }}
              >
                <FolderOpen size={14} className={isScanning ? 'animate-spin' : ''} />
                <span>Scan data/prompt-library/ Folder</span>
              </button>

              <button
                onClick={() => fileUploadRef.current?.click()}
                className="btn btn-secondary"
                style={{ padding: '0.45rem 0.9rem', fontSize: '0.82rem' }}
              >
                <UploadCloud size={14} />
                <span>Upload .txt / .md</span>
              </button>
              <input
                ref={fileUploadRef}
                type="file"
                accept=".txt,.md"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />

              <button
                onClick={handleCommitStaged}
                disabled={isCommitting || stagedCandidates.length === 0}
                className="btn btn-primary"
                style={{ padding: '0.45rem 1rem', fontSize: '0.82rem', background: 'linear-gradient(135deg, #00e5ff 0%, #0099ff 100%)', color: '#000' }}
              >
                <CheckCircle2 size={14} />
                <span>Publish Approved ({stagedCandidates.length} Staged)</span>
              </button>
            </div>
          </div>

          {/* Hybrid Search Test Bar */}
          <div className="glass-panel" style={{ padding: '1rem 1.2rem', borderRadius: '14px', display: 'flex', gap: '0.6rem' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Test hybrid search over indexed library (e.g. 'cyberpunk neon', 'studio portrait')..."
                value={librarySearchQuery}
                onChange={(e) => setLibrarySearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchLibrary()}
                style={{ width: '100%', padding: '0.55rem 0.8rem 0.55rem 2.3rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.85rem' }}
              />
            </div>
            <button onClick={handleSearchLibrary} className="btn btn-secondary" style={{ padding: '0.55rem 1rem', fontSize: '0.82rem' }}>
              Search Index
            </button>
          </div>

          {/* Search Results Preview if Active */}
          {librarySearchResults.length > 0 && (
            <div className="glass-panel" style={{ padding: '1.2rem', borderRadius: '14px' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '0.8rem' }}>
                🔍 Search Results ({librarySearchResults.length} matches)
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.8rem' }}>
                {librarySearchResults.map((r, idx) => (
                  <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', padding: '0.8rem', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                      <strong style={{ fontSize: '0.84rem', color: '#fff' }}>{r.title}</strong>
                      <span className="badge badge-purple" style={{ fontSize: '0.62rem' }}>Score: {r.retrieval_score}</span>
                    </div>
                    <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{r.raw_prompt}</p>
                    <div style={{ marginTop: '0.4rem', fontSize: '0.7rem', color: 'var(--text-dim)' }}>{r.source_file}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ingestion & Staging Candidate Table (Section 7.8) */}
          <div className="glass-panel" style={{ padding: '1.2rem', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.9rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={16} color="var(--accent-purple)" />
                <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#fff' }}>Staging Candidates Review ({stagedCandidates.length})</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Active Indexed Prompts: <strong style={{ color: 'var(--accent-cyan)' }}>{libraryPrompts.length}</strong>
              </span>
            </div>

            {stagedCandidates.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '2rem' }}>
                No candidates staged. Click "Scan data/prompt-library/ Folder" or upload a .txt / .md file above.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-glass)', textAlign: 'left', color: '#fff' }}>
                      <th style={{ padding: '0.6rem' }}>Status</th>
                      <th style={{ padding: '0.6rem' }}>Title & Collection</th>
                      <th style={{ padding: '0.6rem' }}>Strategy & Confidence</th>
                      <th style={{ padding: '0.6rem' }}>Source & Lines</th>
                      <th style={{ padding: '0.6rem' }}>Prompt Snippet</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stagedCandidates.slice(0, 25).map((cand, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '0.6rem' }}>
                          <span
                            className={`badge ${cand.candidate_status === 'approved' || cand.candidate_status === 'preferred' ? 'badge-green' : 'badge-amber'}`}
                            style={{ fontSize: '0.65rem' }}
                          >
                            {cand.candidate_status}
                          </span>
                        </td>
                        <td style={{ padding: '0.6rem', color: '#fff' }}>
                          <div><strong>{cand.title}</strong></div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{cand.collection}</div>
                        </td>
                        <td style={{ padding: '0.6rem' }}>
                          <div>{cand.parser_strategy}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)' }}>{(cand.parser_confidence * 100).toFixed(0)}%</div>
                        </td>
                        <td style={{ padding: '0.6rem', whiteSpace: 'nowrap' }}>
                          <div>{cand.source_file}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>L{cand.source_start_line}–{cand.source_end_line}</div>
                        </td>
                        <td style={{ padding: '0.6rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {cand.raw_prompt}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUB-VIEW 4: DIAGNOSTICS & FOUNDRY CONFIG */}
      {/* ===================================================================== */}
      {activeTab === 'diagnostics' && (
        <div className="glass-panel animate-fade-in" style={{ padding: '1.5rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Settings size={20} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', margin: 0 }}>
              Azure Foundry & Model Diagnostics
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a855f7' }}>PROMPT COMPOSER (TEXT)</span>
              <div style={{ marginTop: '0.4rem', fontSize: '0.85rem', color: '#fff' }}>
                <div>Deployment: <strong>{statusData?.config?.textDeployment || 'prompt-builder (ezchat)'}</strong></div>
                <div>Model: <strong>{statusData?.config?.textModelId || 'gpt-5.6-terra'}</strong></div>
                <div>Version: <strong>{statusData?.config?.textModelVersion || '2026-07-09'}</strong></div>
                <div>Reasoning Effort: <strong>low</strong></div>
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>IMAGE GENERATION MODEL</span>
              <div style={{ marginTop: '0.4rem', fontSize: '0.85rem', color: '#fff' }}>
                <div>Deployment: <strong>{statusData?.config?.imageDeployment || 'gpt-image-2'}</strong></div>
                <div>Model: <strong>{statusData?.config?.imageModelId || 'gpt-image-2'}</strong></div>
                <div>Version: <strong>{statusData?.config?.imageModelVersion || '2026-04-21'}</strong></div>
                <div>Status: <strong style={{ color: '#00e676' }}>Generally Available</strong></div>
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-pink)' }}>RETRIEVAL EMBEDDINGS</span>
              <div style={{ marginTop: '0.4rem', fontSize: '0.85rem', color: '#fff' }}>
                <div>Deployment: <strong>{statusData?.config?.embeddingDeployment || 'prompt-embeddings'}</strong></div>
                <div>Model: <strong>{statusData?.config?.embeddingModelId || 'text-embedding-3-large'}</strong></div>
                <div>Dimensions: <strong>{statusData?.config?.embeddingDimensions || '3072'}</strong></div>
                <div>Hybrid Mode: <strong>Vector + BM25 Enabled</strong></div>
              </div>
            </div>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>SYSTEM INSTRUCTION REFERENCE (SECTION 10):</span>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', lineHeight: 1.5, marginTop: '0.3rem' }}>
              Art director prompt synthesis, structured PromptPackage JSON schema validation, automatic clarification question threshold, hard separation of image generation credits.
            </p>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast" style={{ background: '#12161f', border: '1px solid #a855f7', color: '#fff' }}>
          <Sparkles size={16} color="#a855f7" />
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{toastMessage}</span>
        </div>
      )}

      {/* Full Preview Modal */}
      {previewModalImage && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.9)',
            backdropFilter: 'blur(16px)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem'
          }}
          onClick={() => setPreviewModalImage(null)}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewModalImage(null)}
              style={{ position: 'absolute', top: '-40px', right: '0', background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
            >
              <X size={24} />
            </button>
            <img
              src={previewModalImage.startsWith('http') ? previewModalImage : `data:image/jpeg;base64,${previewModalImage}`}
              alt="Full Preview"
              style={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain', borderRadius: '12px' }}
            />
          </div>
        </div>
      )}

    </div>
  );
}
