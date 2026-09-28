// Daily NASA APOD → GPT Image 2 Branded Banner Service & Worker
// Pipeline: APOD Fetch -> Image Normalization -> GPT Image 2 Edit -> Brand Compositor -> Private Storage / API

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Prompt Template (Versioned Constant)
export const EZ_HUB_APOD_PROMPT_V1 = `Create an editorial web-header artwork using the supplied Astronomy Picture of the Day image as the visual reference and primary subject.

Canvas: exactly 3:1 ultra-wide landscape, designed for a 1536 by 512 pixel web banner. Preserve the most recognizable astronomical subject, color palette, and scientific mood of the source, but recompose it into a premium cinematic digital editorial banner. Preserve astronomy as the focus; do not invent people, brand mascots, UI controls, or unrelated objects.

Composition: maintain clear focal detail across the center and right two-thirds. Reserve the lower-left 30 percent as a calm, dark-to-translucent high-contrast branding safe zone. It may contain elegant abstract light, texture, or a subtle framing device, but no readable letters, numbers, dates, logos, watermarks, or signatures. Keep enough negative space for a high-contrast logo and date overlay.

Visual treatment: sophisticated, contemporary, high-end digital editorial; astronomy colors derived from the reference; rich contrast; clean edge-to-edge composition; no border; no collage panels; no duplicated celestial bodies.

Input APOD title for visual context only: "{title}".
Input APOD date for visual context only: "{date}".`;

// Storage / Cache configuration
const LOCAL_STORAGE_DIR = path.join(__dirname, '..', 'data', 'apod-cache');
if (!fs.existsSync(LOCAL_STORAGE_DIR)) {
  try {
    fs.mkdirSync(LOCAL_STORAGE_DIR, { recursive: true });
  } catch (e) {}
}

// In-Memory state
let latestCompletedManifest = null;
let isWorkerRunning = false;
let hourlyInterval = null;

// Dynamic import helpers for Sharp and Azure Storage
let sharpModule = null;
async function getSharp() {
  if (!sharpModule) {
    sharpModule = (await import('sharp')).default;
  }
  return sharpModule;
}

let blobModule = null;
async function getBlobStorageClient() {
  const storageAccount = process.env.AZURE_STORAGE_ACCOUNT_NAME || process.env.STORAGE_ACCOUNT || 'ezsearchbanners';
  try {
    if (!blobModule) {
      const { BlobServiceClient } = await import('@azure/storage-blob');
      const { DefaultAzureCredential } = await import('@azure/identity');
      
      const blobServiceClient = new BlobServiceClient(
        `https://${storageAccount}.blob.core.windows.net`,
        new DefaultAzureCredential(),
        {
          retryOptions: { maxTries: 2, tryTimeoutInMs: 3000 }
        }
      );
      blobModule = {
        client: blobServiceClient,
        container: blobServiceClient.getContainerClient('apod-banners')
      };
    }
    return blobModule;
  } catch (err) {
    console.warn(`[Banner Worker] Azure Storage Blob Client initialization skipped (${err.message}). Using local cache persistence.`);
    return null;
  }
}

/**
 * Returns current Toronto calendar date as YYYY-MM-DD
 */
export function getTorontoDate(dateObj = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(dateObj); // YYYY-MM-DD
}

/**
 * 1. Fetch APOD metadata from NASA API
 */
export async function fetchApodMetadata(targetDate = null) {
  const apiKey = process.env.NASA_API_KEY || process.env.NASA_KEY || 'DEMO_KEY';
  let url = `https://api.nasa.gov/planetary/apod?api_key=${apiKey}&thumbs=true`;
  if (targetDate) {
    url += `&date=${targetDate}`;
  }

  console.log(`[APOD Pipeline] Requesting APOD metadata (${targetDate || 'today'})...`);
  const res = await fetch(url, {
    signal: AbortSignal.timeout(30000),
    headers: { 'Accept': 'application/json' }
  });

  // On rate limit, fall back to scraping the APOD HTML page directly
  if (res.status === 429) {
    console.warn(`[APOD Pipeline] NASA API rate-limited (429). Falling back to HTML scraper...`);
    return fetchApodMetadataFromHtml(targetDate);
  }

  if (!res.ok) {
    const errText = await res.text();
    // Also fall back to scraper on server errors
    if (res.status >= 500) {
      console.warn(`[APOD Pipeline] NASA API error (${res.status}). Trying HTML scraper fallback...`);
      return fetchApodMetadataFromHtml(targetDate);
    }
    throw new Error(`NASA APOD API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const date = data.date || targetDate || getTorontoDate();
  const title = (data.title || 'NASA Astronomy Picture of the Day').trim();
  const credit = (data.copyright || 'NASA Astronomy Picture of the Day').replace(/\r?\n/g, ' ').trim();
  const mediaType = data.media_type || 'image';

  // Determine safe raster image source URL
  let sourceUrl = '';
  if (mediaType === 'image') {
    sourceUrl = data.url; // Use standard url, NOT hdurl
  } else if (mediaType === 'video') {
    sourceUrl = data.thumbnail_url;
  }

  if (!sourceUrl) {
    // Video APOD with no thumbnail — fall back to scraper
    console.warn(`[APOD Pipeline] No usable image from API for ${date} (${mediaType}). Trying scraper...`);
    return fetchApodMetadataFromHtml(targetDate);
  }

  return { date, title, credit, sourceUrl, mediaType };
}

/**
 * Fallback: Scrape APOD HTML page directly to extract image URL and title
 */
async function fetchApodMetadataFromHtml(targetDate = null) {
  // If a specific past date is needed, APOD HTML archive URLs use format: apYYMMDD.html
  let apodUrl = 'https://apod.nasa.gov/apod/astropix.html';
  if (targetDate) {
    const d = new Date(targetDate + 'T12:00:00Z');
    const yy = String(d.getUTCFullYear()).slice(2);
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    apodUrl = `https://apod.nasa.gov/apod/ap${yy}${mm}${dd}.html`;
  }

  console.log(`[APOD Scraper] Fetching ${apodUrl}`);
  const res = await fetch(apodUrl, {
    signal: AbortSignal.timeout(30000),
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EZHub-BannerWorker/1.0)' }
  });

  if (!res.ok) {
    throw new Error(`APOD HTML scraper failed: HTTP ${res.status} for ${apodUrl}`);
  }

  const html = await res.text();
  const date = targetDate || getTorontoDate();

  // Extract image URL — prefer <a href> linking to full image
  const imgHrefMatch = html.match(/<a\s+href="(image\/[^"]+\.(jpg|jpeg|png|gif|webp))"/i);
  const imgSrcMatch = html.match(/<img[^>]+src="(image\/[^"]+\.(jpg|jpeg|png|gif|webp))"/i);
  const imgPath = imgHrefMatch ? imgHrefMatch[1] : (imgSrcMatch ? imgSrcMatch[1] : null);

  // Check for video embed
  const ytMatch = html.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/i);
  const mp4Match = html.match(/src="([^"]+\.mp4)"/i);

  let sourceUrl = '';
  let mediaType = 'image';

  if (imgPath) {
    sourceUrl = `https://apod.nasa.gov/apod/${imgPath}`;
    mediaType = 'image';
  } else if (ytMatch) {
    // Use YouTube maxresdefault thumbnail
    sourceUrl = `https://img.youtube.com/vi/${ytMatch[1]}/maxresdefault.jpg`;
    mediaType = 'video';
  } else if (mp4Match) {
    // Raw video with no image — use cosmic fallback
    console.warn(`[APOD Scraper] Raw MP4 video detected for ${date}. Using cosmic fallback image.`);
    sourceUrl = null;
    mediaType = 'video';
  }

  // Extract title from <b> tag in the page body
  const titleMatch = html.match(/<b>\s*([\s\S]+?)\s*<\/b>/i);
  const title = titleMatch
    ? titleMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    : 'NASA Astronomy Picture of the Day';

  if (!sourceUrl) {
    // Raw video APOD with no extractable image — use local cosmic fallback
    console.warn(`[APOD Scraper] No image found for ${date}. Using cosmic backdrop fallback.`);
    const fallbackPath = path.join(__dirname, '..', 'public', 'banners', 'banner-main.jpg');
    return {
      date,
      title,
      credit: 'NASA Astronomy Picture of the Day',
      sourceUrl: '__LOCAL_FALLBACK__',
      mediaType: 'fallback',
      fallbackPath
    };
  }

  return { date, title, credit: 'NASA Astronomy Picture of the Day', sourceUrl, mediaType };
}



/**
 * 2. Ingest & normalize APOD source image
 */
export async function downloadAndNormalizeSourceImage(sourceUrl, fallbackPath = null) {
  const sharp = await getSharp();

  // Handle local cosmic fallback for video APODs
  if (sourceUrl === '__LOCAL_FALLBACK__' || !sourceUrl) {
    const localPath = fallbackPath || path.join(__dirname, '..', 'public', 'banners', 'banner-main.jpg');
    console.log(`[APOD Pipeline] Using local cosmic fallback image: ${localPath}`);
    const buffer = fs.readFileSync(localPath);
    return sharp(buffer).resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true }).png().toBuffer();
  }

  if (!sourceUrl.startsWith('https://')) {
    throw new Error('APOD source URL must use HTTPS');
  }
  const maxBytes = 25 * 1024 * 1024; // 25 MB limit
  console.log(`[APOD Pipeline] Ingesting remote raster: ${sourceUrl}`);

  const res = await fetch(sourceUrl, {
    signal: AbortSignal.timeout(30000),
    headers: {
      'User-Agent': 'EZHUB-BannerWorker/1.0',
      'Accept': 'image/jpeg, image/png, image/webp'
    }
  });

  if (!res.ok) {
    throw new Error(`Failed to download source APOD image: HTTP ${res.status}`);
  }

  const arrayBuf = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuf);

  if (buffer.length > maxBytes) {
    throw new Error(`Source image exceeded max size limit of 25MB (got ${buffer.length} bytes)`);
  }

  // Validate MIME magic bytes / decodability with sharp
  let metadata;
  try {
    metadata = await sharp(buffer).metadata();
  } catch (err) {
    throw new Error(`Invalid or corrupted source image bytes: ${err.message}`);
  }

  const validFormats = ['jpeg', 'png', 'webp'];
  if (!validFormats.includes(metadata.format)) {
    throw new Error(`Unsupported source image format: "${metadata.format}". Only JPEG, PNG, or WebP permitted.`);
  }

  // Normalize: auto-rotate by EXIF, resize proportionally to max 2048px on long edge, output clean PNG
  const normalizedBuffer = await sharp(buffer)
    .rotate()
    .resize({
      width: 2048,
      height: 2048,
      fit: 'inside',
      withoutEnlargement: true
    })
    .png()
    .toBuffer();

  return normalizedBuffer;
}

function getLogoBuffer() {
  const possiblePaths = [
    path.join(__dirname, 'assets', 'ezhub-logo.jpg'),
    path.join(__dirname, '..', 'public', 'assets', 'branding', 'ez-hub-official-logo.jpg'),
    path.join(__dirname, '..', 'public', 'ezhub-logo.jpg')
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return fs.readFileSync(p);
  }
  return null;
}

/**
 * 3. Call GPT Image 2 Multi-Image Edit with attached EZ HUB logo
 */
export async function generateGptImage2Edit(imageBuffer, { title, date }) {
  // Provider configuration check
  const azureEndpoint = (process.env.GROOVEPOP_AZURE_OPENAI_ENDPOINT || 'https://green-mos1tune-eastus2.openai.azure.com').replace(/\/$/, '');
  const azureKey = process.env.GROOVEPOP_AZURE_OPENAI_KEY || process.env.AZURE_GROK_KEY || process.env.AZURE_OPENAI_KEY;
  const imageDeployment = process.env.GROOVEPOP_AZURE_IMAGE_DEPLOYMENT || 'gpt-image-2';
  const directOpenAiKey = process.env.OPENAI_API_KEY;

  console.log(`[APOD Pipeline] Submitting 2-image logo embed to gpt-image-2 (size: 1536x512, date: ${date})...`);

  const formData = new FormData();
  formData.append('image[]', new Blob([imageBuffer], { type: 'image/jpeg' }), 'apod.jpeg');

  const logoBuf = getLogoBuffer();
  if (logoBuf) {
    formData.append('image[]', new Blob([logoBuf], { type: 'image/jpeg' }), 'logo.jpeg');
  }

  const promptText = `Create a 1536x512 ultra-wide web banner using the first image as the astronomical background. Embed the EZ HUB logo from the second image creatively, labeled with the current date: ${date}.`;

  formData.append('prompt', promptText);
  formData.append('n', '1');
  formData.append('size', '1536x512');
  formData.append('quality', 'medium');
  formData.append('output_format', 'jpeg');
  formData.append('output_compression', '85');

  let response;
  if (azureKey) {
    const url = `${azureEndpoint}/openai/deployments/${imageDeployment}/images/edits?api-version=2025-04-01-preview`;
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'api-key': azureKey
      },
      body: formData,
      signal: AbortSignal.timeout(90000)
    });
  } else if (directOpenAiKey) {
    formData.append('model', 'gpt-image-2');
    const url = 'https://api.openai.com/v1/images/edits';
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${directOpenAiKey}`
      },
      body: formData,
      signal: AbortSignal.timeout(90000)
    });
  } else {
    throw new Error('No valid OpenAI or Azure OpenAI image provider credentials configured.');
  }

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`GPT Image 2 Edit call failed (${response.status}): ${errText}`);
  }

  const json = await response.json();
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error('GPT Image 2 returned empty or invalid image payload.');
  }

  return Buffer.from(b64, 'base64');
}

/**
 * 4. Encode output to validated WebP buffer
 */
export async function compositeBrandAndDate(rawGeneratedBuffer, apodDate) {
  const sharp = await getSharp();

  let finalWebpBuffer = await sharp(rawGeneratedBuffer)
    .resize(1536, 512, { fit: 'cover' })
    .webp({ quality: 85, effort: 4 })
    .toBuffer();

  const meta = await sharp(finalWebpBuffer).metadata();
  const sha256 = crypto.createHash('sha256').update(finalWebpBuffer).digest('hex');

  return {
    imageBuffer: finalWebpBuffer,
    width: meta.width,
    height: meta.height,
    sha256
  };
}

/**
 * 5. Persist daily banner and manifest to Storage & local cache
 */
export async function persistDailyBanner({
  date,
  title,
  credit,
  sourceUrl,
  imageBuffer,
  width,
  height,
  sha256
}) {
  const manifest = {
    schemaVersion: 1,
    apodDate: date,
    apodTitle: title,
    credit: credit,
    sourceUrl: sourceUrl,
    assetPath: `${date}/banner.webp`,
    contentType: 'image/webp',
    width,
    height,
    sha256,
    model: 'gpt-image-2',
    promptVersion: 'EZ_HUB_APOD_PROMPT_V1',
    generatedAt: new Date().toISOString(),
    isFallback: false
  };

  // 1. Write to local cache directory
  try {
    const dayDir = path.join(LOCAL_STORAGE_DIR, date);
    if (!fs.existsSync(dayDir)) {
      fs.mkdirSync(dayDir, { recursive: true });
    }
    fs.writeFileSync(path.join(dayDir, 'banner.webp'), imageBuffer);
    fs.writeFileSync(path.join(dayDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
    fs.writeFileSync(path.join(LOCAL_STORAGE_DIR, 'current.json'), JSON.stringify(manifest, null, 2));
    console.log(`[APOD Pipeline] Saved locally to data/apod-cache/${date}`);
  } catch (err) {
    console.warn(`[APOD Pipeline] Local persistence error: ${err.message}`);
  }

  // 2. Write to Azure Blob Storage (if configured)
  const blobStorage = await getBlobStorageClient();
  if (blobStorage) {
    try {
      const containerClient = blobStorage.container;
      await containerClient.createIfNotExists();

      // Upload banner.webp
      const imageBlockBlob = containerClient.getBlockBlobClient(`${date}/banner.webp`);
      await imageBlockBlob.uploadData(imageBuffer, {
        blobHTTPHeaders: {
          blobContentType: 'image/webp',
          blobCacheControl: 'public, max-age=31536000, immutable'
        }
      });

      // Upload date manifest.json
      const manifestBlockBlob = containerClient.getBlockBlobClient(`${date}/manifest.json`);
      const manifestStr = JSON.stringify(manifest, null, 2);
      await manifestBlockBlob.uploadData(Buffer.from(manifestStr), {
        blobHTTPHeaders: {
          blobContentType: 'application/json',
          blobCacheControl: 'public, max-age=300'
        }
      });

      // Update current.json last
      const currentBlockBlob = containerClient.getBlockBlobClient('current.json');
      await currentBlockBlob.uploadData(Buffer.from(manifestStr), {
        blobHTTPHeaders: {
          blobContentType: 'application/json',
          blobCacheControl: 'public, max-age=300'
        }
      });

      console.log(`[APOD Pipeline] Uploaded asset and manifests to Azure Blob Storage (apod-banners/${date})`);
    } catch (blobErr) {
      console.warn(`[APOD Pipeline] Azure Blob Storage upload failed: ${blobErr.message}`);
    }
  }

  latestCompletedManifest = manifest;
  return manifest;
}

/**
 * Check if manifest for date already exists (Idempotency)
 */
export async function getExistingManifest(date) {
  // Check in-memory
  if (latestCompletedManifest && latestCompletedManifest.apodDate === date) {
    return latestCompletedManifest;
  }

  // Check local filesystem
  const localManifestPath = path.join(LOCAL_STORAGE_DIR, date, 'manifest.json');
  if (fs.existsSync(localManifestPath)) {
    try {
      const raw = fs.readFileSync(localManifestPath, 'utf-8');
      const data = JSON.parse(raw);
      latestCompletedManifest = data;
      return data;
    } catch (e) {}
  }

  // Check Azure Blob Storage
  const blobStorage = await getBlobStorageClient();
  if (blobStorage) {
    try {
      const manifestClient = blobStorage.container.getBlockBlobClient(`${date}/manifest.json`);
      const exists = await manifestClient.exists();
      if (exists) {
        const downloadRes = await manifestClient.downloadToBuffer();
        const data = JSON.parse(downloadRes.toString('utf-8'));
        latestCompletedManifest = data;
        return data;
      }
    } catch (e) {}
  }

  return null;
}

/**
 * Get current active manifest (or fallback)
 */
export async function getCurrentManifest() {
  const torontoDate = getTorontoDate();

  // If memory cache has today's non-fallback banner, return it
  if (latestCompletedManifest && latestCompletedManifest.apodDate === torontoDate && !latestCompletedManifest.isFallback) {
    return latestCompletedManifest;
  }

  // Check local/blob cache for today's date
  const todayManifest = await getExistingManifest(torontoDate);
  if (todayManifest && !todayManifest.isFallback) {
    latestCompletedManifest = todayManifest;
    return todayManifest;
  }

  // If today's banner hasn't been generated yet, kick off background generation immediately
  if (!isWorkerRunning) {
    console.log(`[APOD Pipeline] Today's banner (${torontoDate}) not yet generated. Starting background worker...`);
    isWorkerRunning = true;
    runDailyBannerPipeline(torontoDate)
      .catch(err => console.warn(`[APOD Pipeline] On-demand background generation error: ${err.message}`))
      .finally(() => { isWorkerRunning = false; });
  }

  // Return the most recent completed manifest if available
  if (latestCompletedManifest && !latestCompletedManifest.isFallback) {
    return latestCompletedManifest;
  }

  // Try reading current.json locally
  const localCurrent = path.join(LOCAL_STORAGE_DIR, 'current.json');
  if (fs.existsSync(localCurrent)) {
    try {
      const raw = fs.readFileSync(localCurrent, 'utf-8');
      latestCompletedManifest = JSON.parse(raw);
      return latestCompletedManifest;
    } catch (e) {}
  }

  // Try reading from Blob Storage
  const blobStorage = await getBlobStorageClient();
  if (blobStorage) {
    try {
      const currentClient = blobStorage.container.getBlockBlobClient('current.json');
      if (await currentClient.exists()) {
        const buf = await currentClient.downloadToBuffer();
        latestCompletedManifest = JSON.parse(buf.toString('utf-8'));
        return latestCompletedManifest;
      }
    } catch (e) {}
  }

  // Static Fallback Manifest
  return {
    schemaVersion: 1,
    apodDate: torontoDate,
    apodTitle: 'NASA Astronomy Picture of the Day',
    credit: 'NASA Astronomy Picture of the Day',
    sourceUrl: 'https://apod.nasa.gov/apod/astropix.html',
    assetPath: 'fallback',
    imageUrl: '/banners/banner-main.jpg',
    isFallback: true
  };
}

/**
 * Retrieve Image Buffer for given date
 */
export async function getBannerImageBuffer(date) {
  // Try reading from local cache
  const localPath = path.join(LOCAL_STORAGE_DIR, date, 'banner.webp');
  if (fs.existsSync(localPath)) {
    return fs.readFileSync(localPath);
  }

  // Try reading from Azure Blob Storage
  const blobStorage = await getBlobStorageClient();
  if (blobStorage) {
    try {
      const blobClient = blobStorage.container.getBlockBlobClient(`${date}/banner.webp`);
      if (await blobClient.exists()) {
        return await blobClient.downloadToBuffer();
      }
    } catch (e) {}
  }

  return null;
}

/**
 * Full Pipeline Execution (idempotent for given Toronto date)
 */
export async function runDailyBannerPipeline(targetDate = null, forceRebuild = false) {
  const torontoDate = targetDate || getTorontoDate();
  console.log(`[APOD Pipeline] Running pipeline for Toronto date: ${torontoDate} (force: ${forceRebuild})`);

  // Idempotency check: exit early if already completed
  if (!forceRebuild) {
    const existing = await getExistingManifest(torontoDate);
    if (existing && !existing.isFallback) {
      console.log(`[APOD Pipeline] Banner already exists for ${torontoDate}. Skipping generation.`);
      return { success: true, manifest: existing, generated: false };
    }
  }

  try {
    // 1. Fetch APOD metadata
    const metadata = await fetchApodMetadata(torontoDate);

    // 2. Download and normalize source raster
    const normalizedPng = await downloadAndNormalizeSourceImage(metadata.sourceUrl, metadata.fallbackPath || null);

    // 3. Generate image edit with gpt-image-2
    const generatedBuffer = await generateGptImage2Edit(normalizedPng, {
      title: metadata.title,
      date: metadata.date
    });

    // 4. Composite brand & date
    const composited = await compositeBrandAndDate(generatedBuffer, metadata.date);

    // 5. Persist to storage & manifests
    const manifest = await persistDailyBanner({
      date: metadata.date,
      title: metadata.title,
      credit: metadata.credit,
      sourceUrl: metadata.sourceUrl,
      imageBuffer: composited.imageBuffer,
      width: composited.width,
      height: composited.height,
      sha256: composited.sha256
    });

    console.log(`[APOD Pipeline] Successfully generated and published banner for ${metadata.date}!`);
    return { success: true, manifest, generated: true };
  } catch (err) {
    console.error(`[APOD Pipeline Error] Pipeline failed for ${torontoDate}:`, err.message);
    throw err;
  }
}

/**
 * Schedule continuous background check every 10 minutes
 */
export function startBannerScheduler() {
  if (hourlyInterval) return;

  const checkAndRun = async () => {
    if (isWorkerRunning) return;
    const torontoDate = getTorontoDate();
    const existing = await getExistingManifest(torontoDate);
    if (existing && !existing.isFallback) {
      return;
    }

    console.log(`[APOD Scheduler] Daily check triggered for ${torontoDate}...`);
    isWorkerRunning = true;
    try {
      await runDailyBannerPipeline(torontoDate);
    } catch (err) {
      console.warn(`[APOD Scheduler] Execution error: ${err.message}`);
    } finally {
      isWorkerRunning = false;
    }
  };

  // Run non-blocking initial check after server boot
  setTimeout(() => {
    checkAndRun().catch(err => console.warn('[APOD Scheduler] Non-blocking initial check warning:', err.message));
  }, 5000);

  // Check every 10 minutes
  hourlyInterval = setInterval(() => {
    checkAndRun().catch(err => console.warn('[APOD Scheduler] Periodic check error:', err.message));
  }, 10 * 60 * 1000);

  console.log('[APOD Scheduler] Initialized banner scheduler (checks every 10 minutes).');
}
