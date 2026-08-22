import { scanLocalPromptLibrary, commitApprovedCandidates, searchPromptLibrary, getWizardConfig } from './promptWizardService.js';

console.log('Testing Prompt Wizard Backend...');
console.log('Config:', getWizardConfig());

const scan = scanLocalPromptLibrary();
console.log('Scanned Files:', scan.files);
console.log('Total Staged Candidates:', scan.stagedCount);

const commit = commitApprovedCandidates();
console.log('Committed Candidates:', commit);

const searchResults = searchPromptLibrary('cyberpunk neon alley');
console.log('Search "cyberpunk neon alley" found:', searchResults.length);
searchResults.forEach((r, idx) => {
  console.log(` ${idx + 1}. [Score: ${r.retrieval_score}] ${r.title} (${r.source_file})`);
});
