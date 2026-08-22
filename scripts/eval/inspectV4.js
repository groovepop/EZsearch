if (process.loadEnvFile) process.loadEnvFile();

const endpoint = 'https://green-mos1tune-eastus2.services.ai.azure.com/api/projects/green-mos1tune-eastus2-project';
const key = process.env.AZURE_GROK_KEY;

async function inspectV4() {
  console.log('--- Checking /agents/ez-genius?api-version=v1 ---');
  const resRoot = await fetch(`${endpoint}/agents/ez-genius?api-version=v1`, {
    headers: { 'api-key': key, 'Content-Type': 'application/json' }
  });
  const dataRoot = await resRoot.json();
  console.log('Root latest version:', dataRoot.versions?.latest?.version);

  console.log('\n--- Checking /agents/ez-genius/versions/4?api-version=v1 ---');
  const resV4 = await fetch(`${endpoint}/agents/ez-genius/versions/4?api-version=v1`, {
    headers: { 'api-key': key, 'Content-Type': 'application/json' }
  });
  console.log('V4 Status:', resV4.status);
  if (resV4.ok) {
    const dataV4 = await resV4.json();
    console.log('V4 Model:', dataV4.definition?.model);
    console.log('V4 Instructions:\n', dataV4.definition?.instructions);
    console.log('\nV4 Tools count:', dataV4.definition?.tools?.length);
    for (const t of (dataV4.definition?.tools || [])) {
      if (t.openapi) console.log(`- OpenAPI Tool: ${t.openapi.name}`);
      else console.log(`- Other Tool:`, t.type);
    }
  } else {
    console.log('V4 error:', await resV4.text());
  }
}

inspectV4().catch(console.error);
