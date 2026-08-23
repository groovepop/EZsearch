// Automated Unit & Integration Tests for APOD Daily Banner Worker
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getTorontoDate,
  fetchApodMetadata,
  compositeBrandAndDate,
  EZ_HUB_APOD_PROMPT_V1,
  getCurrentManifest
} from '../bannerWorker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTests() {
  console.log('🧪 Starting APOD Daily Banner Unit & Integration Tests...\n');
  let passed = 0;
  let total = 0;

  // Test 1: getTorontoDate format
  total++;
  try {
    const torontoDate = getTorontoDate();
    assert.match(torontoDate, /^\d{4}-\d{2}-\d{2}$/, 'Toronto date must match YYYY-MM-DD format');
    console.log(`✅ [1/5] getTorontoDate() returned valid date: ${torontoDate}`);
    passed++;
  } catch (err) {
    console.error('❌ [1/5] getTorontoDate failed:', err.message);
  }

  // Test 2: Prompt Template Version & Format
  total++;
  try {
    assert.ok(EZ_HUB_APOD_PROMPT_V1.includes('1536 by 512'), 'Prompt must specify 1536 by 512');
    assert.ok(EZ_HUB_APOD_PROMPT_V1.includes('{title}'), 'Prompt must have {title} placeholder');
    assert.ok(EZ_HUB_APOD_PROMPT_V1.includes('{date}'), 'Prompt must have {date} placeholder');
    assert.ok(EZ_HUB_APOD_PROMPT_V1.includes('branding safe zone'), 'Prompt must reserve safe zone');
    console.log('✅ [2/5] EZ_HUB_APOD_PROMPT_V1 template structure validated');
    passed++;
  } catch (err) {
    console.error('❌ [2/5] Prompt template validation failed:', err.message);
  }

  // Test 3: APOD Metadata Ingestion
  total++;
  try {
    const metadata = await fetchApodMetadata('2026-08-20');
    assert.ok(metadata.date, 'APOD metadata must contain date');
    assert.ok(metadata.title, 'APOD metadata must contain title');
    assert.ok(metadata.sourceUrl, 'APOD metadata must contain sourceUrl');
    assert.ok(metadata.sourceUrl.startsWith('https://'), 'APOD sourceUrl must use HTTPS');
    console.log(`✅ [3/5] fetchApodMetadata() successfully retrieved: "${metadata.title}" (${metadata.date})`);
    passed++;
  } catch (err) {
    console.error('❌ [3/5] fetchApodMetadata failed:', err.message);
  }

  // Test 4: Brand & Date Compositor (1536x512 WebP)
  total++;
  try {
    const sharp = (await import('sharp')).default;
    // Create a 1536x512 mock image buffer
    const mockImage = await sharp({
      create: {
        width: 1536,
        height: 512,
        channels: 4,
        background: { r: 10, g: 18, b: 35, alpha: 1 }
      }
    }).jpeg().toBuffer();

    const composited = await compositeBrandAndDate(mockImage, '2026-08-22');
    assert.strictEqual(composited.width, 1536, 'Width must be exactly 1536');
    assert.strictEqual(composited.height, 512, 'Height must be exactly 512');
    assert.ok(composited.sha256, 'SHA-256 hash must be generated');
    assert.ok(composited.imageBuffer.length < 1.5 * 1024 * 1024, 'Output must be under 1.5MB');
    console.log(`✅ [4/5] compositeBrandAndDate() produced exact 1536x512 WebP (Size: ${composited.imageBuffer.length} B, Hash: ${composited.sha256.substring(0, 16)}...)`);
    passed++;
  } catch (err) {
    console.error('❌ [4/5] Brand Compositor test failed:', err.message);
  }

  // Test 5: Fallback Manifest Retrieval
  total++;
  try {
    const manifest = await getCurrentManifest();
    assert.ok(manifest.apodDate, 'Manifest must have apodDate');
    assert.ok(manifest.apodTitle, 'Manifest must have apodTitle');
    assert.ok(manifest.assetPath, 'Manifest must have assetPath');
    console.log(`✅ [5/5] getCurrentManifest() returned active manifest (isFallback: ${manifest.isFallback})`);
    passed++;
  } catch (err) {
    console.error('❌ [5/5] getCurrentManifest failed:', err.message);
  }

  console.log(`\n====================================================`);
  console.log(`🎯 Test Results: ${passed}/${total} Passed (${Math.round((passed / total) * 100)}%)`);
  console.log(`====================================================`);

  const report = `Test Run: ${new Date().toISOString()}\nPassed: ${passed}/${total}\nStatus: ${passed === total ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`;
  fs.writeFileSync(path.join(__dirname, '..', '..', 'scratch', 'test_results.txt'), report);

  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
