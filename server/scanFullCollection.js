import { scanLocalPromptLibrary, commitApprovedCandidates, searchPromptLibrary, loadIndexedPrompts } from './promptWizardService.js';

console.log('🚀 Starting Full Ingestion Scan across all 87 prompt files...');
const startTime = Date.now();

const scan = scanLocalPromptLibrary();
const scanDuration = ((Date.now() - startTime) / 1000).toFixed(2);

console.log(`\n📊 Scan Complete in ${scanDuration}s:`);
console.log(`- Total Files Scanned: ${scan.files.length}`);
console.log(`- Total Staged Candidates: ${scan.stagedCount}`);

console.log('\nTop 15 files by candidate count:');
const sortedFiles = [...scan.files].sort((a, b) => b.candidates - a.candidates);
sortedFiles.slice(0, 15).forEach((f, idx) => {
  console.log(`  ${idx + 1}. ${f.file.padEnd(35)} -> ${f.candidates.toString().padStart(4)} candidates (${f.lines} lines, ${f.quarantined} quarantined residue)`);
});

console.log('\nPublishing / Committing approved candidates to the active search index...');
const commitStart = Date.now();
const commit = commitApprovedCandidates();
const commitDuration = ((Date.now() - commitStart) / 1000).toFixed(2);

console.log(`\n✅ Indexed ${commit.totalIndexed} total prompts into active RAG database (${commitDuration}s).`);

console.log('\nTesting hybrid search across the 87 collections:');
const testQueries = [
  'Japanese kintsugi gold lacquer portrait',
  'psychedelic nouveau cosmic goddess',
  'clown life carnival aesthetic',
  'snow white gothic dark fairy tale',
  'cyberpunk neon techwear'
];

testQueries.forEach(q => {
  const results = searchPromptLibrary(q, { maxResults: 3 });
  console.log(`\n🔍 Query: "${q}" -> Found ${results.length} matches:`);
  results.forEach((r, idx) => {
    console.log(`   ${idx + 1}. [Score: ${r.retrieval_score}] ${r.title} (${r.source_file}:${r.source_lines})`);
  });
});
