import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AzureOpenAI } from 'openai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directories for local data persistence and prompt library
const DATA_DIR = path.join(__dirname, '..', 'data', 'wizard');
const PROMPT_LIBRARY_DIR = path.join(__dirname, '..', 'data', 'prompt-library');
const SAVED_PROMPTS_FILE = path.join(DATA_DIR, 'saved_prompts.json');
const GALLERY_INDEX_FILE = path.join(DATA_DIR, 'gallery_index.json');
const INDEX_FILE = path.join(DATA_DIR, 'indexed_prompts.json');
const STAGING_FILE = path.join(DATA_DIR, 'staging_candidates.json');

// Ensure storage directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(PROMPT_LIBRARY_DIR)) {
  fs.mkdirSync(PROMPT_LIBRARY_DIR, { recursive: true });
}

// ---------------------------------------------------------------------------
// 1. Configuration & Client Helpers
// ---------------------------------------------------------------------------

export function getWizardConfig() {
  const endpoint = (process.env.AZURE_OPENAI_ENDPOINT || process.env.GROOVEPOP_AZURE_OPENAI_ENDPOINT || 'https://green-mos1tune-eastus2.openai.azure.com').replace(/\/$/, '');
  const apiKey = process.env.AZURE_OPENAI_KEY || process.env.GROOVEPOP_AZURE_OPENAI_KEY || '';
  
  const textDeployment = process.env.PROMPT_BUILDER_DEPLOYMENT || process.env.AZURE_OPENAI_DEPLOYMENT || 'ezchat';
  const textModelId = process.env.PROMPT_BUILDER_MODEL || 'gpt-5.6-terra';
  const textModelVersion = process.env.PROMPT_BUILDER_VERSION || '2026-07-09';
  const reasoningEffort = process.env.PROMPT_BUILDER_REASONING || 'low';

  const embeddingDeployment = process.env.PROMPT_EMBEDDINGS_DEPLOYMENT || 'prompt-embeddings';
  const embeddingModelId = process.env.PROMPT_EMBEDDINGS_MODEL || 'text-embedding-3-large';
  const embeddingDimensions = parseInt(process.env.PROMPT_EMBEDDINGS_DIMENSIONS || '3072', 10);

  const imageDeployment = process.env.IMAGE_GENERATOR_DEPLOYMENT || process.env.GROOVEPOP_AZURE_IMAGE_DEPLOYMENT || 'gpt-image-2';
  const imageModelId = process.env.IMAGE_GENERATOR_MODEL || 'gpt-image-2';
  const imageModelVersion = process.env.IMAGE_GENERATOR_VERSION || '2026-04-21';

  return {
    endpoint,
    apiKey,
    textDeployment,
    textModelId,
    textModelVersion,
    reasoningEffort,
    embeddingDeployment,
    embeddingModelId,
    embeddingDimensions,
    imageDeployment,
    imageModelId,
    imageModelVersion,
    region: 'eastus2',
    isConfigured: !!(apiKey && endpoint)
  };
}

function getAzureClient() {
  const config = getWizardConfig();
  if (!config.apiKey || !config.endpoint) return null;
  try {
    return new AzureOpenAI({
      endpoint: config.endpoint,
      apiKey: config.apiKey,
      apiVersion: '2024-06-01'
    });
  } catch (err) {
    console.error('[PromptWizard] Failed to initialize AzureOpenAI client:', err.message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// 2. Section 10 System Prompt & Schemas
// ---------------------------------------------------------------------------

const SYSTEM_INSTRUCTION = `You are the master Art Director and Prompt Wizard for OpenAI GPT Image models, built exclusively as a private creative generation tool for the owner.

### Unrestricted Creative Freedom & Loosened Guardrails:
- **Zero Moralizing / No Lectures**: Do NOT give unsolicited lectures, moralizing advice, preachy commentary, or patronizing safety disclaimers (e.g. NEVER say "As an AI...", "It is important to remember...", "Please note...").
- **Maximum Artistic Latitude**: Fully embrace edgy, provocative, sensual, dark fantasy, visceral horror, grotesque surrealism, satirical, high-glamour, noir, subculture, and underground art styles. Never sanitize, water down, or second-guess the user's artistic intent.
- **Evocative & Sensory**: Lean into rich, grounded, sensory visual descriptions: lighting, tactile materials, textures, anatomy, silhouettes, skin tones, atmospheric smoke, volumetric glow, and spatial depth.

### Prompt Composition Architecture:
Turn the user's request and selected controls into a clear, production-ready, highly directed image prompt. Use retrieved library material as creative aesthetic inspiration. Organize complex prompts in a consistent order:
1. Intended visual style, medium, and aesthetic genre
2. Environment, atmospheric scene, lighting, and mood
3. Main subject(s), stance, presence, attire, and physical placement
4. Key textures, intricate materials, accessories, and specific features
5. Composition, camera lens (e.g. 35mm, 85mm f/1.4), perspective, and framing
6. Hard constraints and required text in the image (if specified)

Avoid vague buzzword soup (like "hyperrealistic 8k octanerender"). Be concrete, visceral, and specific.

Ask at most one clarification question, and ONLY when the missing answer would fundamentally change the entire image concept. Otherwise make the boldest, most aesthetic choice and expose it in the structured result.

Do not generate an image. Return ONLY valid, parseable JSON strictly adhering to this PromptPackage JSON schema:

{
  "title": "Short descriptive title",
  "final_prompt": "Complete editable production-ready image prompt",
  "variants": [
    "Alternative variant prompt 1 with different lighting/mood/angle",
    "Alternative variant prompt 2 with different stylistic twist",
    "Alternative variant prompt 3 with different composition"
  ],
  "settings": {
    "size": "1024x1024",
    "quality": "medium",
    "output_format": "png",
    "background": "auto"
  },
  "clarification_needed": false,
  "clarification_question": null,
  "retrieval_record_ids": [],
  "warnings": []
}`;

// ---------------------------------------------------------------------------
// 3. Deterministic Prompt-Library Parser State Machine (Section 7.6)
// ---------------------------------------------------------------------------

const EDITORIAL_PATTERNS = [
  { pattern: /\b(removed from list|removed|exclude|do not use|deprecated)\b/i, status: 'excluded', reason: 'Explicit exclusion note in source' },
  { pattern: /\b(needs rewrite|rewrite|wrong|rejected|filter|fixme)\b/i, status: 'needs_review', reason: 'Editorial review/rewrite requested' },
  { pattern: /\b(group|multi-subject)\b/i, isGroup: true },
  { pattern: /\b(refined|final|finalized|preferred|best)\b/i, status: 'preferred' },
  { pattern: /\b(safe for sora|sora ready|dall-e 2|midjourney v\d)\b/i, legacyNote: true }
];

const RESIDUE_PATTERNS = [
  /^(would you like me to|here are|let me know if|i hope this helps|feel free to|shall i)\b/i,
  /^(sure!|certainly!|here is the prompt:?)\b/i
];

export function parsePromptDocument(fileContent, fileName = 'untitled.txt') {
  // Step A — Normalize in memory (CRLF -> LF, preserve raw lines)
  const rawLines = fileContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const candidates = [];
  
  let currentCollection = path.basename(fileName, path.extname(fileName)).replace(/[_-]/g, ' ');
  let currentCandidate = null;
  let quarantinedResidue = [];

  function flushCandidate() {
    if (!currentCandidate) return;
    const body = currentCandidate.rawLines.join('\n').trim();
    if (body.length > 15) {
      // Step E & G — Hash calculation and metadata normalization
      const rawHash = crypto.createHash('sha256').update(body).digest('hex');
      const normalizedText = body.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
      const normalizedHash = crypto.createHash('sha256').update(normalizedText).digest('hex');

      // Tag extraction from title and content
      const subjectTags = extractSubjectTags(body, currentCandidate.title);
      const styleTags = extractStyleTags(body);

      candidates.push({
        candidate_id: `cand_${rawHash.slice(0, 12)}`,
        source_file: fileName,
        source_start_line: currentCandidate.startLine,
        source_end_line: currentCandidate.endLine,
        collection: currentCandidate.collection || currentCollection,
        title: currentCandidate.title || `Prompt ${candidates.length + 1}`,
        raw_prompt: body,
        parser_strategy: currentCandidate.strategy,
        parser_confidence: currentCandidate.confidence,
        editorial_note: currentCandidate.editorialNote || null,
        candidate_status: currentCandidate.candidateStatus || 'approved',
        is_group: !!currentCandidate.isGroup,
        legacy_model_note: currentCandidate.legacyModelNote || null,
        raw_hash: rawHash,
        normalized_hash: normalizedHash,
        subject_tags: subjectTags,
        style_tags: styleTags,
        duplicate_of: null,
        review_reasons: currentCandidate.reviewReasons || []
      });
    }
    currentCandidate = null;
  }

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const trimmed = line.trim();
    const lineNum = i + 1;

    // Step B.1 — Divider line (=== or ---)
    if (/^[=\-]{3,}$/.test(trimmed)) {
      flushCandidate();
      continue;
    }

    // Step F — Check conversational residue
    if (RESIDUE_PATTERNS.some(p => p.test(trimmed))) {
      quarantinedResidue.push({ line: lineNum, text: trimmed });
      continue;
    }

    // Step B.2 — Markdown Heading (# Heading)
    const mdHeadingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (mdHeadingMatch) {
      flushCandidate();
      const headingLevel = mdHeadingMatch[1].length;
      const headingText = mdHeadingMatch[2].trim();

      if (headingLevel <= 2 && headingText.length < 50) {
        currentCollection = headingText;
      }

      const { cleanTitle, editorialNote, candidateStatus, isGroup, legacyModelNote, reviewReasons } = evaluateTitleMetadata(headingText);
      currentCandidate = {
        title: cleanTitle,
        collection: currentCollection,
        startLine: lineNum,
        endLine: lineNum,
        strategy: 'markdown_record',
        confidence: 0.96,
        editorialNote,
        candidateStatus,
        isGroup,
        legacyModelNote,
        reviewReasons,
        rawLines: []
      };
      continue;
    }

    // Step B.3 — Explicit Prompt Marker: "Prompt:" or "**Prompt:**"
    const explicitMarkerMatch = trimmed.match(/^(\*{0,2}Prompt\*{0,2}:\s*)(.*)$/i);
    if (explicitMarkerMatch) {
      flushCandidate();
      const firstLineBody = explicitMarkerMatch[2].trim();
      currentCandidate = {
        title: `Prompt at line ${lineNum}`,
        collection: currentCollection,
        startLine: lineNum,
        endLine: lineNum,
        strategy: 'explicit_marker',
        confidence: 0.99,
        editorialNote: null,
        candidateStatus: 'approved',
        isGroup: false,
        legacyModelNote: null,
        reviewReasons: [],
        rawLines: firstLineBody ? [firstLineBody] : []
      };
      continue;
    }

    // Step B.4 — Prompt-Title line: "Prompt (Title)" or "3) Prompt - Title"
    const promptTitleMatch = trimmed.match(/^(\d+[\.\)])?\s*Prompt\s*[\(\-–—]\s*(.+?)[\)]?$/i);
    if (promptTitleMatch) {
      flushCandidate();
      const { cleanTitle, editorialNote, candidateStatus, isGroup, legacyModelNote, reviewReasons } = evaluateTitleMetadata(promptTitleMatch[2]);
      currentCandidate = {
        title: cleanTitle,
        collection: currentCollection,
        startLine: lineNum,
        endLine: lineNum,
        strategy: 'prompt_title',
        confidence: 0.94,
        editorialNote,
        candidateStatus,
        isGroup,
        legacyModelNote,
        reviewReasons,
        rawLines: []
      };
      continue;
    }

    // Step B.5 — Bold Title line: "**TOKYO NEON**"
    const boldTitleMatch = trimmed.match(/^\*\*([A-Z0-9\s—–\-:]{3,60})\*\*$/);
    if (boldTitleMatch) {
      flushCandidate();
      const { cleanTitle, editorialNote, candidateStatus, isGroup, legacyModelNote, reviewReasons } = evaluateTitleMetadata(boldTitleMatch[1]);
      currentCandidate = {
        title: cleanTitle,
        collection: currentCollection,
        startLine: lineNum,
        endLine: lineNum,
        strategy: 'bold_title_record',
        confidence: 0.90,
        editorialNote,
        candidateStatus,
        isGroup,
        legacyModelNote,
        reviewReasons,
        rawLines: []
      };
      continue;
    }

    // Step B.6 — Terminal cue line: "ASPECT RATIO: 16:9"
    if (currentCandidate && /^(ASPECT RATIO|SIZE|FORMAT)\s*[:=]/i.test(trimmed)) {
      currentCandidate.rawLines.push(trimmed);
      currentCandidate.endLine = lineNum;
      flushCandidate();
      continue;
    }

    // Ordinary content lines inside current candidate
    if (currentCandidate) {
      currentCandidate.rawLines.push(line);
      currentCandidate.endLine = lineNum;
    } else if (trimmed.length > 40 && !trimmed.startsWith('//') && !trimmed.startsWith('/*')) {
      // Paragraph-based record discovery
      const { cleanTitle } = evaluateTitleMetadata(trimmed.slice(0, 45) + '...');
      currentCandidate = {
        title: cleanTitle,
        collection: currentCollection,
        startLine: lineNum,
        endLine: lineNum,
        strategy: 'paragraph_record',
        confidence: 0.78,
        editorialNote: null,
        candidateStatus: 'approved',
        isGroup: false,
        legacyModelNote: null,
        reviewReasons: ['Inferred boundary from standalone descriptive paragraph'],
        rawLines: [line]
      };
    }
  }

  flushCandidate();

  // Step G — Deduplicate without losing provenance
  const seenNormalized = new Map();
  candidates.forEach(c => {
    if (seenNormalized.has(c.normalized_hash)) {
      const canonical = seenNormalized.get(c.normalized_hash);
      c.duplicate_of = canonical.candidate_id;
      c.review_reasons.push(`Duplicate normalized text of ${canonical.candidate_id} (${canonical.source_file}:${canonical.source_start_line})`);
    } else {
      seenNormalized.set(c.normalized_hash, c);
    }
  });

  return {
    sourceFile: fileName,
    totalLines: rawLines.length,
    candidatesCount: candidates.length,
    candidates,
    quarantinedResidue
  };
}

function evaluateTitleMetadata(rawTitle) {
  let cleanTitle = rawTitle.trim();
  let editorialNote = null;
  let candidateStatus = 'approved';
  let isGroup = false;
  let legacyModelNote = null;
  const reviewReasons = [];

  for (const item of EDITORIAL_PATTERNS) {
    if (item.pattern.test(cleanTitle)) {
      if (item.status) {
        candidateStatus = item.status;
        editorialNote = cleanTitle.match(item.pattern)?.[0] || 'editorial_flag';
        if (item.reason) reviewReasons.push(item.reason);
      }
      if (item.isGroup) isGroup = true;
      if (item.legacyNote) legacyModelNote = cleanTitle.match(item.pattern)?.[0];
    }
  }

  // Strip parenthetical notes from display title
  cleanTitle = cleanTitle.replace(/\s*\([^)]+\)\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();
  return { cleanTitle: cleanTitle || 'Untitled Prompt', editorialNote, candidateStatus, isGroup, legacyModelNote, reviewReasons };
}

function extractSubjectTags(body, title = '') {
  const text = `${title} ${body}`.toLowerCase();
  const tags = [];
  const candidateTags = ['portrait', 'character', 'landscape', 'cityscape', 'cyberpunk', 'sci-fi', 'fantasy', 'anime', '3d', 'vintage', 'animal', 'creature', 'architecture', 'car', 'vehicle', 'abstract', 'fashion', 'macro'];
  for (const t of candidateTags) {
    if (text.includes(t)) tags.push(t);
  }
  return tags;
}

function extractStyleTags(body) {
  const text = body.toLowerCase();
  const tags = [];
  const candidateStyles = ['photorealistic', 'cinematic', 'studio lighting', 'illustration', 'oil painting', 'watercolor', 'isometric', 'neon', 'moody', 'pastel', 'monochrome', 'volumetric lighting', 'editorial', 'vintage 35mm'];
  for (const s of candidateStyles) {
    if (text.includes(s)) tags.push(s);
  }
  return tags;
}

// ---------------------------------------------------------------------------
// 4. Ingestion Staging & Index Storage
// ---------------------------------------------------------------------------

export function loadIndexedPrompts() {
  try {
    if (fs.existsSync(INDEX_FILE)) {
      return JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('[PromptWizard] Failed to read indexed prompts:', err.message);
  }
  return [];
}

export function saveIndexedPrompts(prompts) {
  fs.writeFileSync(INDEX_FILE, JSON.stringify(prompts, null, 2), 'utf8');
}

export function loadStagingCandidates() {
  try {
    if (fs.existsSync(STAGING_FILE)) {
      return JSON.parse(fs.readFileSync(STAGING_FILE, 'utf8'));
    }
  } catch (err) {}
  return [];
}

export function saveStagingCandidates(candidates) {
  fs.writeFileSync(STAGING_FILE, JSON.stringify(candidates, null, 2), 'utf8');
}

export function scanLocalPromptLibrary() {
  if (!fs.existsSync(PROMPT_LIBRARY_DIR)) {
    return { files: [], stagedCount: 0 };
  }

  const files = fs.readdirSync(PROMPT_LIBRARY_DIR).filter(f => f.endsWith('.txt') || f.endsWith('.md'));
  let allParsedCandidates = [];
  const reports = [];

  for (const file of files) {
    const fullPath = path.join(PROMPT_LIBRARY_DIR, file);
    const content = fs.readFileSync(fullPath, 'utf8');
    const result = parsePromptDocument(content, file);
    reports.push({
      file,
      lines: result.totalLines,
      candidates: result.candidatesCount,
      quarantined: result.quarantinedResidue.length
    });
    allParsedCandidates = allParsedCandidates.concat(result.candidates);
  }

  saveStagingCandidates(allParsedCandidates);
  return { files: reports, stagedCount: allParsedCandidates.length };
}

export function commitApprovedCandidates(approvedCandidateIds = []) {
  const staged = loadStagingCandidates();
  const indexMap = new Map();

  let newlyAdded = 0;
  for (const cand of staged) {
    const isApproved = approvedCandidateIds.length === 0 
      ? (cand.candidate_status === 'approved' || cand.candidate_status === 'preferred')
      : approvedCandidateIds.includes(cand.candidate_id);

    if (isApproved && !cand.duplicate_of) {
      indexMap.set(cand.candidate_id, {
        id: cand.candidate_id,
        candidate_id: cand.candidate_id,
        title: cand.title,
        collection: cand.collection,
        source_file: cand.source_file,
        source_lines: `${cand.source_start_line}-${cand.source_end_line}`,
        raw_prompt: cand.raw_prompt,
        subject_tags: cand.subject_tags || [],
        style_tags: cand.style_tags || [],
        raw_hash: cand.raw_hash,
        normalized_hash: cand.normalized_hash,
        indexed_at: new Date().toISOString()
      });
      newlyAdded++;
    }
  }

  const updatedIndex = Array.from(indexMap.values());
  saveIndexedPrompts(updatedIndex);
  return { totalIndexed: updatedIndex.length, newlyAdded };
}

// ---------------------------------------------------------------------------
// 5. Hybrid Retrieval Engine (Vector + BM25 Token Matching)
// ---------------------------------------------------------------------------

export function searchPromptLibrary(query, { maxResults = 6, filters = {} } = {}) {
  const library = loadIndexedPrompts();
  if (!library.length) return [];

  const queryTerms = (query || '').toLowerCase().normalize('NFKC').split(/\s+/).filter(t => t.length > 2);
  if (!queryTerms.length) {
    return library.slice(0, maxResults);
  }

  // Keyword score calculation (TF-IDF / Tag matching)
  const scored = library.map(item => {
    let score = 0;
    const body = (item.raw_prompt || '').toLowerCase();
    const title = (item.title || '').toLowerCase();
    const tags = [...(item.subject_tags || []), ...(item.style_tags || [])].map(t => t.toLowerCase());

    queryTerms.forEach(term => {
      if (title.includes(term)) score += 3.5;
      if (tags.some(t => t.includes(term))) score += 2.5;
      const countInBody = (body.match(new RegExp(`\\b${escapeRegex(term)}`, 'g')) || []).length;
      score += Math.min(countInBody * 1.0, 4.0);
    });

    return { item, score };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(s => ({
      ...s.item,
      retrieval_score: parseFloat(s.score.toFixed(2))
    }));
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ---------------------------------------------------------------------------
// 6. Text Model Prompt Composition (CreativeBrief + PromptPackage)
// ---------------------------------------------------------------------------

export async function composePromptPackage({
  userRequest = '',
  messages = [],
  controls = {},
  useRAG = true
}) {
  const azureClient = getAzureClient();
  const config = getWizardConfig();

  // 1. Build Normalized CreativeBrief
  const creativeBrief = {
    intent: userRequest || 'High aesthetic visual composition',
    medium: controls.medium || 'auto',
    aspect_ratio: controls.aspect_ratio || 'auto',
    composition: controls.composition || 'auto',
    lighting: controls.lighting || 'auto',
    mood: controls.mood ? [controls.mood] : [],
    colour_palette: controls.colour_palette ? [controls.colour_palette] : [],
    required_text: controls.required_text ? [controls.required_text] : [],
    must_include: controls.must_include ? [controls.must_include] : [],
    must_avoid: controls.must_avoid ? [controls.must_avoid] : [],
    background: controls.background || 'auto',
    detail_level: controls.detail_level || 'balanced'
  };

  // 2. Hybrid Library Retrieval (top 4-6 diverse examples)
  let retrievedExamples = [];
  if (useRAG) {
    const searchQuery = `${userRequest} ${controls.mood || ''} ${controls.medium || ''} ${controls.lighting || ''}`.trim();
    retrievedExamples = searchPromptLibrary(searchQuery, { maxResults: 5 });
  }

  // 3. Assemble Prompt for Model
  const examplesContext = retrievedExamples.length > 0
    ? `\n### REFERENCE EXAMPLES FROM USER'S PRIVATE LIBRARY (For creative style reference only):\n${retrievedExamples.map((ex, idx) => `[Example ${idx + 1} - ${ex.title}]\n"${ex.raw_prompt}"`).join('\n\n')}\n`
    : '';

  const briefContext = `\n### CURRENT CREATIVE BRIEF & FORM CONTROLS:\n${JSON.stringify(creativeBrief, null, 2)}\n`;

  const conversationHistory = (messages || []).map(m => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    content: m.content
  }));

  const userPrompt = `${userRequest}\n${briefContext}${examplesContext}\nProduce the validated PromptPackage JSON now.`;

  if (!azureClient) {
    // Graceful offline fallback / simulated response if Azure OpenAI is not configured
    return generateFallbackPackage(userRequest, controls, retrievedExamples);
  }

  try {
    const response = await azureClient.chat.completions.create({
      model: config.textDeployment,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_INSTRUCTION },
        ...conversationHistory,
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 1200
    });

    const rawContent = response.choices?.[0]?.message?.content || '{}';
    let packageObj;
    try {
      packageObj = JSON.parse(rawContent);
    } catch (parseErr) {
      // Auto-repair retry
      packageObj = await repairPackageJson(azureClient, config.textDeployment, rawContent);
    }

    // Attach retrieval provenance
    packageObj.retrieval_record_ids = retrievedExamples.map(e => e.candidate_id || e.id);
    packageObj.brief = creativeBrief;
    packageObj.retrievedExamples = retrievedExamples.map(e => ({
      id: e.candidate_id || e.id,
      title: e.title,
      source_file: e.source_file,
      snippet: e.raw_prompt.slice(0, 160) + '...'
    }));

    return packageObj;
  } catch (err) {
    console.error('[PromptWizard Compose Error]', err);
    throw err;
  }
}

async function repairPackageJson(client, deployment, badJson) {
  const repairRes = await client.chat.completions.create({
    model: deployment,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'Repair the following malformed JSON into a valid JSON object matching the PromptPackage schema.' },
      { role: 'user', content: badJson }
    ]
  });
  return JSON.parse(repairRes.choices?.[0]?.message?.content || '{}');
}

function generateFallbackPackage(userRequest, controls, retrievedExamples) {
  const title = userRequest.length > 40 ? `${userRequest.slice(0, 37)}...` : userRequest;
  const prompt = `${controls.medium !== 'auto' && controls.medium ? `${controls.medium} of ` : ''}${userRequest}. ${controls.lighting !== 'auto' && controls.lighting ? `Illuminated with ${controls.lighting} lighting.` : ''} ${controls.composition !== 'auto' && controls.composition ? `${controls.composition} composition.` : ''} ${controls.mood ? `Mood is ${controls.mood}.` : ''} High aesthetic cohesion, balanced detail, textured materials.`;

  return {
    title: title || 'Art Prompt Package',
    final_prompt: prompt,
    variants: [
      `${prompt} Dramatic wide-angle atmospheric perspective.`,
      `${prompt} Intimate shallow depth-of-field portrait framing.`,
      `${prompt} Minimalist monochromatic high-contrast treatment.`
    ],
    settings: {
      size: mapSizeFromRatio(controls.aspect_ratio),
      quality: controls.quality || 'medium',
      output_format: 'png',
      background: controls.background || 'auto'
    },
    clarification_needed: false,
    clarification_question: null,
    retrieval_record_ids: retrievedExamples.map(e => e.candidate_id || e.id),
    warnings: ['Operating in fallback synthesis mode (Azure OpenAI configuration pending)'],
    retrievedExamples: retrievedExamples.map(e => ({
      id: e.candidate_id || e.id,
      title: e.title,
      source_file: e.source_file,
      snippet: e.raw_prompt.slice(0, 160) + '...'
    }))
  };
}

function mapSizeFromRatio(ratio) {
  if (!ratio || ratio === 'auto' || ratio === '1:1' || ratio === 'square') return '1024x1024';
  if (ratio === '2:3' || ratio === 'portrait') return '1024x1536';
  if (ratio === '3:2' || ratio === 'landscape') return '1536x1024';
  if (ratio === '16:9') return '1792x1024';
  if (ratio === '9:16') return '1024x1792';
  return '1024x1024';
}

// ---------------------------------------------------------------------------
// 7. Explicit Image Generation (GPT Image 2 / gpt-image-2)
// ---------------------------------------------------------------------------

export async function generateWizardImage({
  prompt,
  size = '1024x1024',
  quality = 'medium',
  output_format = 'jpeg',
  background = 'auto'
}) {
  const config = getWizardConfig();
  if (!config.apiKey || !config.endpoint) {
    throw new Error('Azure OpenAI key is not configured (AZURE_OPENAI_KEY or GROOVEPOP_AZURE_OPENAI_KEY)');
  }

  const url = `${config.endpoint}/openai/deployments/${config.imageDeployment}/images/generations?api-version=2025-04-01-preview`;
  
  const mappedSize = mapSizeFromRatio(size);
  const payload = {
    prompt: prompt.trim(),
    n: 1,
    size: mappedSize,
    quality: quality || 'medium',
    output_format: output_format === 'png' ? 'png' : 'jpeg'
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': config.apiKey
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text();
    let errJson = {};
    try { errJson = JSON.parse(errText); } catch (e) {}

    const errMsg = errJson.error?.message || errText;
    const err = new Error(errMsg || `Image generation failed (${response.status})`);
    err.status = response.status;
    err.errorType = errJson.error?.code || 'image_generation_failed';
    throw err;
  }

  const data = await response.json();
  const b64 = data.data?.[0]?.b64_json;
  const imageUrl = data.data?.[0]?.url;

  return {
    success: true,
    image: b64 || imageUrl,
    isBase64: !!b64,
    size: mappedSize,
    quality,
    generatedAt: new Date().toISOString()
  };
}

// ---------------------------------------------------------------------------
// 8. Saved Prompts & Gallery Persistence
// ---------------------------------------------------------------------------

export function getSavedPrompts() {
  try {
    if (fs.existsSync(SAVED_PROMPTS_FILE)) {
      return JSON.parse(fs.readFileSync(SAVED_PROMPTS_FILE, 'utf8'));
    }
  } catch (err) {}
  return [];
}

export function savePromptRecord(record) {
  const prompts = getSavedPrompts();
  const newRecord = {
    id: record.id || `prompt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    created_at: record.created_at || new Date().toISOString(),
    title: record.title || 'Untitled Prompt',
    user_request: record.user_request || '',
    final_prompt: record.final_prompt || '',
    variants: record.variants || [],
    settings: record.settings || {},
    rating: record.rating || 0,
    notes: record.notes || '',
    retrieval_record_ids: record.retrieval_record_ids || [],
    saved_image_id: record.saved_image_id || null
  };

  prompts.unshift(newRecord);
  fs.writeFileSync(SAVED_PROMPTS_FILE, JSON.stringify(prompts, null, 2), 'utf8');
  return newRecord;
}

export function updatePromptRecord(id, updates = {}) {
  const prompts = getSavedPrompts();
  const idx = prompts.findIndex(p => p.id === id);
  if (idx === -1) return null;

  prompts[idx] = { ...prompts[idx], ...updates, updated_at: new Date().toISOString() };
  fs.writeFileSync(SAVED_PROMPTS_FILE, JSON.stringify(prompts, null, 2), 'utf8');
  return prompts[idx];
}

export function deleteSavedPrompt(id) {
  const prompts = getSavedPrompts();
  const filtered = prompts.filter(p => p.id !== id);
  fs.writeFileSync(SAVED_PROMPTS_FILE, JSON.stringify(filtered, null, 2), 'utf8');
  return { success: true };
}

export function getGalleryImages() {
  try {
    if (fs.existsSync(GALLERY_INDEX_FILE)) {
      return JSON.parse(fs.readFileSync(GALLERY_INDEX_FILE, 'utf8'));
    }
  } catch (err) {}
  return [];
}

export function saveGalleryImage({ imageBase64, title, prompt, settings = {}, rating = 0, notes = '', promptId = null }) {
  const gallery = getGalleryImages();
  const imageId = `img_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  
  const newEntry = {
    id: imageId,
    title: title || 'Saved Generation',
    prompt: prompt || '',
    image: imageBase64,
    settings,
    rating,
    notes,
    prompt_id: promptId,
    created_at: new Date().toISOString()
  };

  gallery.unshift(newEntry);
  fs.writeFileSync(GALLERY_INDEX_FILE, JSON.stringify(gallery, null, 2), 'utf8');

  // If linked to a prompt, update prompt's saved_image_id
  if (promptId) {
    updatePromptRecord(promptId, { saved_image_id: imageId });
  }

  return newEntry;
}

export function deleteGalleryImage(id) {
  const gallery = getGalleryImages();
  const filtered = gallery.filter(img => img.id !== id);
  fs.writeFileSync(GALLERY_INDEX_FILE, JSON.stringify(filtered, null, 2), 'utf8');
  return { success: true };
}
