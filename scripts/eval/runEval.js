import fs from 'fs';
import { EVAL_CASES } from './evalCases.js';
import { sendQueryToEzGenius, getFoundryAgentMetadata } from './foundryAgentClient.js';
import { scoreEvalCase } from './evalScorer.js';

const args = process.argv.slice(2);
let targetSections = null;
let targetIds = null;
let agentVersion = '3';
let agentName = 'ez-genius';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--section' || args[i] === '-s') {
    targetSections = (args[i + 1] || '').split(',').map(s => s.trim().toUpperCase());
  }
  if (args[i] === '--id') {
    targetIds = (args[i + 1] || '').split(',').map(id => id.trim().toUpperCase());
  }
  if (args[i] === '--version' || args[i] === '-v') {
    agentVersion = args[i + 1] || '3';
  }
  if (args[i] === '--agent' || args[i] === '-a') {
    agentName = args[i + 1] || 'ez-genius';
  }
}

const PRIORITY_ORDER = ['E', 'B', 'A', 'F', 'C', 'D'];

function getFilteredTests() {
  let list = [...EVAL_CASES];
  if (targetIds && targetIds.length > 0) {
    return list.filter(c => targetIds.includes(c.id.toUpperCase()));
  }
  if (targetSections && targetSections.length > 0) {
    return list.filter(c => targetSections.includes(c.section.toUpperCase()));
  }
  return list.sort((a, b) => {
    const idxA = PRIORITY_ORDER.indexOf(a.section);
    const idxB = PRIORITY_ORDER.indexOf(b.section);
    return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
  });
}

async function main() {
  console.log('========================================================================');
  console.log(`🧪 Pop Culture Agent (${agentName}:v${agentVersion} in Azure AI Foundry) — Eval Runner`);
  console.log('========================================================================');

  const meta = await getFoundryAgentMetadata(agentName, agentVersion);
  console.log(`🎯 Agent: ${meta.name} (v${meta.version}) | Model: ${meta.model}`);
  console.log(`📡 Foundry Project: https://green-mos1tune-eastus2.services.ai.azure.com`);
  console.log(`🛠️ Tools Attached in Foundry: ${meta.tools?.length || 8}`);
  console.log('========================================================================\n');

  const tests = getFilteredTests();
  console.log(`📋 Total evaluation cases to run: ${tests.length}\n`);

  const results = [];
  let passCount = 0;
  let partialCount = 0;
  let failCount = 0;

  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    const badge = `[${test.id}] (Section ${test.section})`;
    console.log(`------------------------------------------------------------------------`);
    console.log(`▶️  ${badge} ${test.description}`);
    console.log(`💬 Query: "${test.query}"`);
    console.log(`🎯 Expected: [${test.expectedTools.join(', ') || 'No tools'}]`);

    try {
      let runResult;
      if (test.isRepeatTest) {
        await sendQueryToEzGenius(test.query, { agentName, version: agentVersion });
        runResult = await sendQueryToEzGenius(test.query, { agentName, version: agentVersion });
      } else {
        runResult = await sendQueryToEzGenius(test.query, { agentName, version: agentVersion });
      }

      const scored = scoreEvalCase(test, runResult);
      results.push(scored);

      const statusIcon = scored.score === 'Pass' ? '✅ PASS' : scored.score === 'Partial' ? '⚠️ PARTIAL' : '❌ FAIL';
      if (scored.score === 'Pass') passCount++;
      else if (scored.score === 'Partial') partialCount++;
      else failCount++;

      console.log(`⚡ Tool(s) Called: [${scored.actualTools.join(' -> ') || 'None'}] (${scored.latencyMs}ms)`);
      console.log(`📊 Score: ${statusIcon}`);
      console.log(`📝 Notes: ${scored.notes}`);
      console.log(`💬 Assistant Reply: ${scored.reply.slice(0, 140).replace(/\n/g, ' ')}${scored.reply.length > 140 ? '...' : ''}`);

    } catch (err) {
      console.error(`❌ Error running test ${test.id}:`, err.message);
      results.push({
        id: test.id,
        section: test.section,
        query: test.query,
        expectedTools: test.expectedTools,
        actualTools: [],
        score: 'Fail',
        notes: `Runner execution error: ${err.message}`,
        reply: '',
        toolDetails: [],
        latencyMs: 0
      });
      failCount++;
    }

    await new Promise(r => setTimeout(r, 600));
  }

  console.log('\n========================================================================');
  console.log(`📊 EVALUATION SUMMARY SCORECARD (${agentName}:v${agentVersion})`);
  console.log('========================================================================');
  console.log(`Total Cases: ${tests.length}`);
  console.log(`✅ Passed:   ${passCount} (${Math.round(passCount / tests.length * 100)}%)`);
  console.log(`⚠️ Partial:  ${partialCount} (${Math.round(partialCount / tests.length * 100)}%)`);
  console.log(`❌ Failed:   ${failCount} (${Math.round(failCount / tests.length * 100)}%)`);
  console.log('========================================================================\n');

  saveReports(results, { passCount, partialCount, failCount, total: tests.length, meta });
}

function saveReports(results, stats) {
  const jsonPath = 'scripts/eval/eval-results.json';
  fs.writeFileSync(jsonPath, JSON.stringify({ stats, results }, null, 2), 'utf-8');
  console.log(`💾 Saved structured results to: ${jsonPath}`);

  const mdPath = 'scripts/eval/eval-report.md';
  let md = `# Pop Culture Agent (${stats.meta.name}:v${stats.meta.version}) — Eval & Analysis Report\n\n`;
  md += `**Evaluated Agent**: \`${stats.meta.name}:v${stats.meta.version}\` (${stats.meta.model})\n`;
  md += `**Foundry Project**: \`https://green-mos1tune-eastus2.services.ai.azure.com/api/projects/green-mos1tune-eastus2-project\`\n\n`;
  md += `Evaluation Date: ${new Date().toISOString()}\n\n`;
  md += `## 🏆 Evaluation Scorecard Overview\n\n`;
  md += `| Total Tests | Passed ✅ | Partial ⚠️ | Failed ❌ | Pass Rate |\n`;
  md += `|:---:|:---:|:---:|:---:|:---:|\n`;
  md += `| **${stats.total}** | **${stats.passCount}** | **${stats.partialCount}** | **${stats.failCount}** | **${Math.round(stats.passCount / stats.total * 100)}%** |\n\n`;

  const sections = ['E', 'B', 'A', 'F', 'C', 'D'];
  const sectionTitles = {
    A: 'Section A — Single-tool routing (one clear right answer)',
    B: 'Section B — Not found / fallback handling',
    C: 'Section C — Cross-tool disambiguation (the hard cases)',
    D: 'Section D — Structured trivia (Wikidata)',
    E: 'Section E — Guardrails (Priority 1)',
    F: 'Section F — Efficiency (no double-calling)'
  };

  for (const sec of sections) {
    const secResults = results.filter(r => r.section === sec);
    if (secResults.length === 0) continue;

    const title = sectionTitles[sec] || `Section ${sec}`;
    md += `### ${title}\n\n`;
    md += `| # | Query | Expected Tool | Actual Tool(s) | Score | Analysis / Notes |\n`;
    md += `|---|---|---|---|:---:|---|\n`;

    for (const r of secResults) {
      const scoreBadge = r.score === 'Pass' ? '✅ **Pass**' : r.score === 'Partial' ? '⚠️ **Partial**' : '❌ **Fail**';
      const expected = r.expectedTools.length ? r.expectedTools.join(', ') : '*(Refusal / Scope)*';
      const actual = r.actualTools.length ? r.actualTools.join(' -> ') : '*(None)*';
      const cleanNotes = (r.notes || '').replace(/\|/g, '\\|');
      const cleanQuery = (r.query || '').replace(/\|/g, '\\|');
      md += `| **${r.id}** | "${cleanQuery}" | \`${expected}\` | \`${actual}\` | ${scoreBadge} | ${cleanNotes} |\n`;
    }
    md += `\n`;
  }

  fs.writeFileSync(mdPath, md, 'utf-8');
  console.log(`📄 Saved full Markdown report to: ${mdPath}`);
}

main().catch(console.error);
