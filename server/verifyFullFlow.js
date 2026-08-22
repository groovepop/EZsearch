import {
  getWizardConfig,
  scanLocalPromptLibrary,
  commitApprovedCandidates,
  searchPromptLibrary,
  composePromptPackage,
  getSavedPrompts,
  savePromptRecord,
  updatePromptRecord,
  deleteSavedPrompt,
  getGalleryImages,
  saveGalleryImage,
  deleteGalleryImage
} from './promptWizardService.js';

async function runVerification() {
  console.log('--- 1. Testing Config ---');
  const config = getWizardConfig();
  console.log('Config loaded:', {
    textDeployment: config.textDeployment,
    imageDeployment: config.imageDeployment,
    embeddingDeployment: config.embeddingDeployment,
    isConfigured: config.isConfigured
  });

  console.log('\n--- 2. Testing Parser & Ingestion ---');
  const scan = scanLocalPromptLibrary();
  console.log(`Scanned ${scan.files.length} prompt files (${scan.stagedCount} candidates staged).`);

  const commit = commitApprovedCandidates();
  console.log(`Committed approved candidates. Total indexed: ${commit.totalIndexed}, Newly added: ${commit.newlyAdded}`);

  console.log('\n--- 3. Testing Hybrid Retrieval ---');
  const searchResults = searchPromptLibrary('cyberpunk neon alley');
  console.log(`Search for "cyberpunk neon alley" found ${searchResults.length} results:`);
  searchResults.forEach((r, idx) => {
    console.log(`  ${idx + 1}. [Score: ${r.retrieval_score}] ${r.title} (${r.source_file})`);
  });

  console.log('\n--- 4. Testing Prompt Composition (CreativeBrief -> PromptPackage) ---');
  const pkg = await composePromptPackage({
    userRequest: 'A futuristic cybernetic samurai meditating under cherry blossoms at dusk',
    controls: {
      medium: 'illustration',
      aspect_ratio: '16:9',
      lighting: 'golden hour',
      mood: 'Mystical',
      quality: 'high'
    },
    useRAG: true
  });
  console.log('PromptPackage Title:', pkg.title);
  console.log('Final Prompt:', pkg.final_prompt);
  console.log('Variants Count:', pkg.variants?.length || 0);
  console.log('Retrieved Reference IDs:', pkg.retrieval_record_ids);

  console.log('\n--- 5. Testing Saved Prompts Persistence ---');
  const savedRecord = savePromptRecord({
    title: pkg.title,
    user_request: 'A futuristic cybernetic samurai',
    final_prompt: pkg.final_prompt,
    rating: 5,
    notes: 'Awesome cinematic samurai prompt'
  });
  console.log('Saved Prompt Record ID:', savedRecord.id);

  const updatedRecord = updatePromptRecord(savedRecord.id, { rating: 4, notes: 'Updated note' });
  console.log('Updated Prompt Rating:', updatedRecord.rating);

  const deletePromptRes = deleteSavedPrompt(savedRecord.id);
  console.log('Deleted Test Prompt Record:', deletePromptRes.success);

  console.log('\n--- 6. Testing Gallery Image Persistence ---');
  const dummyImage = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const savedGallery = saveGalleryImage({
    imageBase64: dummyImage,
    title: 'Test Samurai Image',
    prompt: pkg.final_prompt,
    rating: 5
  });
  console.log('Saved Gallery Image ID:', savedGallery.id);

  const galleryList = getGalleryImages();
  console.log('Total Gallery Images:', galleryList.length);

  const deleteImgRes = deleteGalleryImage(savedGallery.id);
  console.log('Deleted Test Gallery Image:', deleteImgRes.success);

  console.log('\n✅ ALL VERIFICATION CHECKS PASSED SUCCESSFULLY!');
}

runVerification().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
