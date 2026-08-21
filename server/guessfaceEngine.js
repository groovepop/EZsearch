// GuessFace Engine & Mode-Run Pipeline Service for EZsearch
// Direct integration with Azure OpenAI (gpt-image-2 + groovepop-vision)
// Supports all 9 Game Modes, Manifests, Structured Caption Parsing & Aggregation Scoreboard

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { getAzureConfig, parseBase64Image, mapAspectRatio, buildFullPrompt } from './groovepopEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MANIFESTS_DIR = path.join(__dirname, '../data/guessface/manifests');
const STYLES_DIR = path.join(__dirname, '../data/guessface/styles');

// --- Prompts Definition (from GuessFace Engine) ---
export const CLASSIFY_PROMPT = `Look at this image and respond with exactly one word — either SINGLE or MULTIPLE.

SINGLE: one clear primary subject. A person alone, an animal alone, one object. Background figures or crowds do not count.
MULTIPLE: two or more subjects of equal visual importance. A person with a pet, two people together, two animals together, a group where all members matter equally.

Respond with only the single word. Nothing else.`;

export const ORIGINAL_CAPTION_SINGLE = `Write a brief poetic story (3-5 sentences) describing what is happening in this photo. Focus on: the subject's presence and energy, their outfit and accessories, the setting and atmosphere, and the mood or feeling of the moment. Write in present tense, third person. Be specific and sensory — describe what you see with evocative, grounded language. This story will guide an artistic transformation of the image, so capture the soul of the moment, not just the facts.`;

export const ORIGINAL_CAPTION_MULTIPLE = `Write a brief poetic story (3-5 sentences) describing what is happening in this photo. All subjects are of equal importance — identify them clearly and give each one genuine presence throughout. Focus on: the energy and dynamic between them, how they connect or contrast with each other, the way they share the space, the setting and atmosphere that frames them, and the mood of the moment. Write in present tense, third person. Be specific and sensory — describe what you see with evocative, grounded language. This story will guide an artistic transformation of the image, so capture the soul of what exists between them, not just the facts.`;

export const MODE_CAPTION_PROMPTS = {
  dnd: `Write a brief poetic sentence describing what is happening in this image using old english medieval language. Focus on: the subject's presence and energy, their outfit and accessories, the setting and atmosphere, and the mood or feeling of the moment. Write in present tense, third person. Be specific and sensory — describe what you see with evocative, grounded language.`,
  limerick: `Write a single 5-line limerick (AABBA rhyme scheme) describing this stylized AI-transformed portrait. Be vivid, playful, and specific to the image's subject and scene. Return only the limerick — five lines, nothing else.`,
  noir: `Write a short hard-boiled film noir narration (2-4 sentences) describing this stylized noir portrait. Channel a 1950s detective's voiceover the moment this character steps into frame — clipped, smoky, world-weary, and a little dangerous. Be vivid and specific to the subject, their look, wardrobe, and the scene around them. Present tense, third person.`,
  worldrecord: `create a brief yet playful synopsis of this world record`,
  movietrailer: `Write a short movie-trailer narration (2-4 sentences) for this stylized movie poster, in the voice of a dramatic "in a world…" trailer voiceover. Be vivid and specific to the film's apparent star, genre, tone, and scene, and build to a title-drop or punchy final beat. Present tense.`,
  asseenontv: `Read the product name and tagline displayed in this infomercial image. Return exactly two lines and nothing else:

PRODUCT: <product name>
TAGLINE: <tagline>

Do not describe the person, the studio, the audience, or the scene. Do not add commentary. If the text is not legible, invent a product name and tagline that fit the product being demonstrated.`,
  ghost: `Write a paranormal investigator's field report (3-5 sentences) on the entity in this photograph. Describe the apparition only — its form, bearing, apparent temperament, and any personal objects caught in the field around it. Clinical and faintly unnerved, as though filing to an archive nobody reads. Present tense, third person. Do not describe or refer to any other person.`,
  fortune: `Write a mystical prophecy (2-4 sentences) regarding this individual. Weave the rolled fate seed ({NUMBER}, {COLOR}, {DATE}) into an evocative urban astrological fortune. Present tense, second person.`,
  dossier: `Write surveillance field notes (3-5 sentences) in the voice of Agent {CODENAME}, a field operative of the Department of Absurd Intelligence. Describe each subject under observation in this dossier — their appearance, behaviour, and apparent role in the gathering. Deadpan bureaucratic tone treating trivial social behaviour as intelligence of grave national importance. Present tense, first person. Do not reveal your own identity.`
};

export const DOSSIER_OPERATIVE_CAPTION_PROMPT = `Write a personnel file summary (3-5 sentences) for Agent {CODENAME} of the Department of Absurd Intelligence, based on this operative file. Describe their appearance, bearing, and absurd specializations in deadpan bureaucratic tone, as written by a superior officer filing an internal assessment. Present tense, third person. Do not state the agent's real identity.`;

export const STOCK_CODENAMES = [
  "VELVET THUNDER", "BEIGE COBRA", "MOIST BADGER", "TURBO CARDIGAN",
  "SILENT CASSEROLE", "CHROME PIGEON", "DISCO FERRET", "AMBIENT WALRUS",
  "NEON SQUIRREL", "SHADOW WAFFLE"
];

const CURATED_COLORS = ["Obsidian Gold", "Crimson Violet", "Emerald Teal", "Midnight Indigo", "Solar Ochre", "Celestial Silver", "Electric Magenta"];

// --- In-Memory Stores ---
const activeModeRuns = new Map();
const activeParties = new Map();

// Helper: Parse As Seen On TV output
export function parseProductCaption(raw) {
  if (!raw) return null;
  const clean = (s) => s.replace(/\*\*/g, '').replace(/^["'`]|["'`]$/g, '').trim();
  const lines = raw.split('\n').map((l) => clean(l)).filter(Boolean);

  let product = '';
  let tagline = '';
  for (const line of lines) {
    const p = line.match(/^PRODUCT\s*[:\-]\s*(.+)$/i);
    const t = line.match(/^TAGLINE\s*[:\-]\s*(.+)$/i);
    if (p && !product) product = clean(p[1]);
    else if (t && !tagline) tagline = clean(t[1]);
  }
  if (!product && lines.length) {
    product = lines[0];
    tagline = tagline || lines[1] || '';
  }
  if (!product) return null;
  return { productName: product.slice(0, 120), tagline: tagline.slice(0, 200) };
}

// Mode Metadata Registry
export function getRegisteredModes() {
  const modes = [
    {
      modeId: 'dnd',
      displayName: 'D&D',
      aspectRatio: '3:4',
      defaultTimer: 30,
      theme: 'Medieval tabletop fantasy trading cards',
      captionFormat: 'Old English medieval sentence describing character presence & attire',
      status: 'active'
    },
    {
      modeId: 'limerick',
      displayName: 'Limerick',
      aspectRatio: '3:4',
      defaultTimer: 30,
      theme: 'Stylized painted fine-art portraits',
      captionFormat: '5-line AABBA rhyme scheme limerick describing subject & scene',
      status: 'active'
    },
    {
      modeId: 'noir',
      displayName: 'Film Noir',
      aspectRatio: '3:4',
      defaultTimer: 30,
      theme: '1950s black-and-white hardboiled detective portraits',
      captionFormat: '2–4 sentence clipped, smoky, world-weary detective voiceover',
      status: 'active'
    },
    {
      modeId: 'worldrecord',
      displayName: 'World Record',
      aspectRatio: '3:4',
      defaultTimer: 35,
      theme: 'Guinness-style official world record certificate & book page',
      captionFormat: 'Playful, deadpan synopsis of an absurd world record achievement',
      status: 'active'
    },
    {
      modeId: 'movietrailer',
      displayName: 'Movie Trailer',
      aspectRatio: '3:4',
      defaultTimer: 35,
      theme: 'High-octane cinematic movie one-sheet poster (43 genres/styles)',
      captionFormat: '2–4 sentence dramatic "In a world..." voiceover building to title drop',
      status: 'active'
    },
    {
      modeId: 'asseenontv',
      displayName: 'As Seen on TV',
      aspectRatio: '4:3',
      defaultTimer: 22,
      theme: '1990s late-night infomercial / CRT TV scanline aesthetic',
      captionFormat: 'Extracted structured text: PRODUCT and TAGLINE demonstrated in image',
      status: 'active'
    },
    {
      modeId: 'ghost',
      displayName: 'Guess the Ghost',
      aspectRatio: '3:4',
      defaultTimer: 30,
      theme: 'Darkroom solarization / photogram & 35mm film negative strip',
      captionFormat: 'Paranormal investigator field report; 2-beat reveal (haunting + spectre)',
      status: 'active'
    },
    {
      modeId: 'fortune',
      displayName: 'Fortune',
      aspectRatio: '3:4',
      defaultTimer: 30,
      theme: 'Analog photo collage / glitch art mythprint with rolled seeds',
      captionFormat: 'Mystical urban prophecy (2–4 sentences) with code-rolled seeds (number, color, date)',
      status: 'active'
    },
    {
      modeId: 'dossier',
      displayName: 'Dossier',
      aspectRatio: '4:3',
      defaultTimer: 45,
      theme: 'Satirical intelligence agency case file (Dept. of Absurd Intelligence)',
      captionFormat: 'Surveillance field notes by Agent {CODENAME}; groups of 2–3; secret spy finale',
      status: 'active'
    }
  ];

  // Try reading manifests from disk to enrich metadata
  try {
    return modes.map(m => {
      const manifestPath = path.join(MANIFESTS_DIR, `${m.modeId}.json`);
      if (fs.existsSync(manifestPath)) {
        try {
          const raw = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
          return {
            ...m,
            manifest: raw,
            manifestVersion: raw.manifestVersion,
            pipeline: raw.pipeline,
            captionParse: raw.captionParse,
            reveal: raw.reveal,
            hooks: raw.hooks
          };
        } catch (e) {
          return m;
        }
      }
      return m;
    });
  } catch (err) {
    return modes;
  }
}

// Load styles for a specific mode
export function getStylesForMode(modeId) {
  const stylePath = path.join(STYLES_DIR, `styles-${modeId}.json`);
  if (fs.existsSync(stylePath)) {
    try {
      return JSON.parse(fs.readFileSync(stylePath, 'utf8'));
    } catch (e) {
      console.warn(`[GuessFace] Failed to read styles for ${modeId}:`, e.message);
    }
  }
  return [];
}

// Vision captioning helper via Azure OpenAI
async function callAzureVision(buffer, mimeType, instruction) {
  const { apiKey, endpoint, captionDeployment } = getAzureConfig();
  const url = `${endpoint}/openai/deployments/${captionDeployment}/chat/completions?api-version=2024-02-15-preview`;
  const base64Data = buffer.toString('base64');
  const dataUrl = `data:${mimeType};base64,${base64Data}`;

  const payload = {
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: instruction },
          {
            type: 'image_url',
            image_url: { url: dataUrl }
          }
        ]
      }
    ],
    max_tokens: 350,
    temperature: 0.7
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30000)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Azure Vision error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const caption = data.choices?.[0]?.message?.content?.trim();
  if (!caption) {
    throw new Error('Azure Vision returned an empty caption response');
  }
  return caption;
}

// Image generation helper via Azure OpenAI gpt-image-2
async function callAzureImageGen(fullPrompt, aspectRatio = '3:4') {
  const { apiKey, endpoint, imageDeployment } = getAzureConfig();
  const url = `${endpoint}/openai/deployments/${imageDeployment}/images/generations?api-version=2024-02-15-preview`;
  const size = mapAspectRatio(aspectRatio);

  const payload = {
    prompt: fullPrompt,
    n: 1,
    size: size,
    response_format: 'b64_json'
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(60000)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Azure Image Gen error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error('Azure Image Gen returned no image data');
  }
  return b64;
}

// Assemble prompt with formatting
function buildTransformPrompt(originalCaption, styleLines) {
  const styleBlock = styleLines.map((l) => `"${l}",`).join('\n');
  return `${originalCaption}\n\n---\n\n${styleBlock}`;
}

// Execute standalone Mode-Run Pipeline
export async function executeGuessFaceModeRun(params) {
  const {
    modeId = 'dnd',
    subjects = [],
    seedValues = null,
    styleVariantKey = null,
    simulate = false
  } = params;

  const modeRunId = `run_${crypto.randomUUID()}`;
  const startTime = Date.now();
  let timings = { total: 0, transform: 0, mode_caption: 0 };

  const modeList = getRegisteredModes();
  const modeMeta = modeList.find((m) => m.modeId === modeId) || modeList[0];
  const stylesList = getStylesForMode(modeId);

  // Subject extraction
  const primarySubject = subjects[0] || { subjectId: 'subj_1', displayName: 'Player 1' };
  const rawImage = primarySubject.selfieBase64 || primarySubject.selfieBlobRef;

  // If simulation is requested or no image is supplied, return simulated result
  if (simulate || !rawImage || rawImage.startsWith('mock_')) {
    const mockCaptions = {
      dnd: 'A solitary wanderer clad in emerald velour strumming a lute of questionable tune upon the tavern bench.',
      limerick: 'There once was a rogue from the coast,\nWho drank with a tavern-hall ghost.\nWith a wink and a cheer,\nHe stole all their beer,\nAnd vanished before the next toast!',
      noir: 'Rain drumming on the fire escape like steady fingers on a cheap desk. She stood by the window, cigarette smoke curling into the lamplight, waiting for a past that was already catching up.',
      worldrecord: 'Official Certificate of Achievement: Awarded for the most unhinged cheese sculpture carved while maintaining continuous eye contact with a golden retriever (47 hours, 12 minutes).',
      movietrailer: 'IN A WORLD where deadlines cease to exist, one ordinary soul discovered the ultimate shortcut. This Summer... TOBIN IS UNSTOPPABLE.',
      asseenontv: 'PRODUCT: SLICE-O-MATIC 9000\nTAGLINE: CUTS THROUGH SHOE LEATHER LIKE HOT BUTTER — BUT WAIT, CALL NOW FOR DOUBLE THE BLADES!',
      ghost: 'Paranormal field log #409: Apparition detected in vicinity of vintage coffee apparatus. Entity demonstrates persistent attachment to wool knitwear and displays mild spectral annoyance.',
      fortune: `The celestial alignment reveals code ${seedValues?.number || 42} beneath the ${seedValues?.color || 'Obsidian Gold'} horizon on ${seedValues?.date || '2026-08-21'}. Expect an absurd twist of fate before midnight.`,
      dossier: 'Surveillance report by Agent VELVET THUNDER: Target observed engaging in high-velocity spreadsheet manipulation. Suspected operative specialization: classified snack procurement.'
    };

    const mockCaption = mockCaptions[modeId] || mockCaptions.dnd;
    const parsedFields = modeId === 'asseenontv' ? parseProductCaption(mockCaption) : null;

    const simResult = {
      modeRunId,
      status: 'complete',
      tenantId: 'tenant_ezsearch_test',
      modeId,
      subjects,
      result: {
        portraitBlobRefs: [`portraits/tenant_ezsearch/${modeRunId}/entry_1.jpg`],
        portraitBase64: null, // UI will display themed avatar/poster placeholder
        caption: mockCaption,
        captionFields: parsedFields,
        pairings: [{ entryType: 'standard', subjectIds: subjects.map(s => s.subjectId) }],
        revealOrder: subjects.map(s => s.subjectId),
        timingsMs: { total: 1200, transform: 800, mode_caption: 400 }
      },
      webhookDelivered: false,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString()
    };

    activeModeRuns.set(modeRunId, simResult);
    return simResult;
  }

  // --- Real Pipeline Execution via Azure OpenAI ---
  const parsedImage = parseBase64Image(rawImage);
  if (!parsedImage) {
    throw new Error('Invalid selfie image data format (must be Base64 JPEG/PNG)');
  }

  // 1. Classification & Original Poetic Caption
  let originalCaption = '';
  try {
    const classification = await callAzureVision(parsedImage.buffer, parsedImage.mimeType, CLASSIFY_PROMPT);
    const isSingle = !classification.toUpperCase().includes('MULTIPLE');
    const instruction = isSingle ? ORIGINAL_CAPTION_SINGLE : ORIGINAL_CAPTION_MULTIPLE;
    originalCaption = await callAzureVision(parsedImage.buffer, parsedImage.mimeType, instruction);
  } catch (err) {
    console.warn('[GuessFace] Vision classification fallback:', err.message);
    originalCaption = 'A creative portrait of a person showing expressive character and distinctive presence.';
  }

  // 2. Resolve Mode Style & Transform Prompt
  let selectedStyle = stylesList[0];
  if (styleVariantKey) {
    const matched = stylesList.find((s) => s.key === styleVariantKey);
    if (matched) selectedStyle = matched;
  } else if (stylesList.length > 1) {
    selectedStyle = stylesList[Math.floor(Math.random() * stylesList.length)];
  }

  let promptLines = selectedStyle?.prompt || [
    'high quality cinematic portrait',
    'stylized lighting and intricate composition'
  ];

  // Fortune seed injection / Dossier codename injection
  const codename = STOCK_CODENAMES[Math.floor(Math.random() * STOCK_CODENAMES.length)];
  const seedNum = seedValues?.number || Math.floor(Math.random() * 99) + 1;
  const seedColor = seedValues?.color || CURATED_COLORS[Math.floor(Math.random() * CURATED_COLORS.length)];
  const seedDate = seedValues?.date || new Date().toISOString().slice(0, 10);

  const fullTransformPrompt = buildTransformPrompt(originalCaption, promptLines);

  // 3. Azure Image Generation (gpt-image-2)
  const transformStart = Date.now();
  const transformedB64 = await callAzureImageGen(fullTransformPrompt, modeMeta.aspectRatio || '3:4');
  timings.transform = Date.now() - transformStart;

  // 4. Mode-Specific Game Caption Generation (groovepop-vision)
  const captionStart = Date.now();
  let modePrompt = MODE_CAPTION_PROMPTS[modeId] || MODE_CAPTION_PROMPTS.dnd;

  // Inject variables into mode caption prompt
  modePrompt = modePrompt
    .replaceAll('{CODENAME}', codename)
    .replaceAll('{NUMBER}', seedNum.toString())
    .replaceAll('{COLOR}', seedColor)
    .replaceAll('{DATE}', seedDate);

  const transformedBuffer = Buffer.from(transformedB64, 'base64');
  const gameCaption = await callAzureVision(transformedBuffer, 'image/jpeg', modePrompt);
  timings.mode_caption = Date.now() - captionStart;
  timings.total = Date.now() - startTime;

  // 5. Parse Structured Fields if applicable
  let captionFields = null;
  if (modeId === 'asseenontv') {
    captionFields = parseProductCaption(gameCaption);
  }

  const resultPayload = {
    id: modeRunId,
    modeRunId,
    tenantId: 'tenant_ezsearch_live',
    modeId,
    status: 'complete',
    subjects,
    result: {
      portraitBlobRefs: [`portraits/tenant_ezsearch/${modeRunId}/entry_1.jpg`],
      portraitBase64: `data:image/jpeg;base64,${transformedB64}`,
      caption: gameCaption,
      captionFields,
      pairings: [{ entryType: 'standard', subjectIds: subjects.map((s) => s.subjectId) }],
      revealOrder: subjects.map((s) => s.subjectId),
      timingsMs: timings,
      metadata: {
        codename: modeId === 'dossier' ? codename : undefined,
        seedValues: modeId === 'fortune' ? { number: seedNum, color: seedColor, date: seedDate } : undefined
      }
    },
    webhookDelivered: false,
    createdAt: new Date(startTime).toISOString(),
    completedAt: new Date().toISOString()
  };

  activeModeRuns.set(modeRunId, resultPayload);
  return resultPayload;
}

export function getModeRunById(id) {
  return activeModeRuns.get(id) || null;
}

// --- Party & Scoreboard Aggregation Service ---
export function createPartySession({ hostName = 'EZsearch Host' }) {
  const partyId = `party_${crypto.randomUUID()}`;
  const party = {
    id: partyId,
    partyId,
    tenantId: 'tenant_ezsearch',
    hostName,
    scoreboard: {},
    rounds: [],
    createdAt: new Date().toISOString(),
    status: 'active'
  };
  activeParties.set(partyId, party);
  return party;
}

export function reportPartyRound(partyId, { modeRunId, modeId, guesses = [] }) {
  let party = activeParties.get(partyId);
  if (!party) {
    party = createPartySession({ hostName: 'Auto-Created Party' });
    activeParties.set(partyId, party);
  }

  // Update scoreboard
  const updatedScoreboard = { ...(party.scoreboard || {}) };
  for (const g of guesses) {
    const guesser = g.guesserId || g.displayName || 'Anonymous';
    const pts = parseInt(g.pointsAwarded || (g.correct ? 1 : 0), 10);
    updatedScoreboard[guesser] = (updatedScoreboard[guesser] || 0) + pts;
  }

  party.scoreboard = updatedScoreboard;
  party.rounds.push({
    roundNumber: party.rounds.length + 1,
    modeRunId,
    modeId,
    guesses,
    reportedAt: new Date().toISOString()
  });

  return party;
}

export function getPartyById(partyId) {
  return activeParties.get(partyId) || null;
}

export function getPartyRounds(partyId) {
  const party = activeParties.get(partyId);
  return party ? party.rounds : [];
}
