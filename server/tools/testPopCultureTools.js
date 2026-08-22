// Test Harness for Pop Culture Agent Tools (Phase 1)
// Run with: node server/tools/testPopCultureTools.js

try {
  if (process.loadEnvFile) process.loadEnvFile();
} catch (e) {}

import { search_omdb } from './omdb.js';
import { search_tmdb } from './tmdb.js';
import { search_tvmaze } from './tvmaze.js';
import { search_wikipedia } from './wikipedia.js';
import { query_wikidata, SPARQL_TEMPLATES } from './wikidata.js';
import { search_rawg } from './rawg.js';
import { search_genius } from './genius.js';

async function runTests() {
  console.log('====================================================');
  console.log('🧪 Pop Culture Tools Test Harness (Phase 1)');
  console.log('====================================================\n');

  const tests = [
    {
      name: '1. OMDb (Movie rating/plot)',
      fn: () => search_omdb({ title: 'Inception', year: '2010' })
    },
    {
      name: '2. TMDb (Multi-search: Breaking Bad)',
      fn: () => search_tmdb({ query: 'Breaking Bad' })
    },
    {
      name: '3. TVMaze (TV schedule & cast: Stranger Things)',
      fn: () => search_tvmaze({ show_name: 'Stranger Things' })
    },
    {
      name: '4. Wikipedia REST (Fallback: Hamilton musical)',
      fn: () => search_wikipedia({ topic: 'Hamilton (musical)' })
    },
    {
      name: '5. Wikidata SPARQL (Best Picture Winners)',
      fn: () => query_wikidata({ sparql_query: SPARQL_TEMPLATES.BEST_PICTURE_WINNERS(3) })
    },
    {
      name: '6. RAWG (Video Game: Portal 2)',
      fn: () => search_rawg({ game_name: 'Portal 2' })
    },
    {
      name: '7. Genius (Song metadata: Bohemian Rhapsody)',
      fn: () => search_genius({ query: 'Bohemian Rhapsody Queen' })
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const t of tests) {
    console.log(`----------------------------------------------------`);
    console.log(`Running: ${t.name}...`);
    try {
      const res = await t.fn();
      console.log(`[Source]: ${res.source} | [Found]: ${res.found ? '✅ TRUE' : '❌ FALSE'}`);
      console.log(`[Summary]:\n${res.summary}`);
      if (res.found) {
        passed++;
      } else {
        failed++;
      }
    } catch (err) {
      console.error(`❌ Exception:`, err.message);
      failed++;
    }
    console.log('');
  }

  console.log('====================================================');
  console.log(`📊 Test Results: ${passed}/${tests.length} Passed, ${failed} Failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
