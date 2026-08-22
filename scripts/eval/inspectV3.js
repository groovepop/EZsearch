if (process.loadEnvFile) process.loadEnvFile();

const endpoint = 'https://green-mos1tune-eastus2.services.ai.azure.com/api/projects/green-mos1tune-eastus2-project';
const key = process.env.AZURE_GROK_KEY;

async function inspectV3Full() {
  const res = await fetch(`${endpoint}/agents/ez-genius/versions/3?api-version=v1`, {
    headers: { 'api-key': key, 'Content-Type': 'application/json' }
  });
  const data = await res.json();
  console.log('=== V3 Definition ===');
  console.log('Model:', data.definition?.model);
  console.log('Instructions:\n', data.definition?.instructions);
  console.log('\n=== Tools count ===', data.definition?.tools?.length);
  for (const t of (data.definition?.tools || [])) {
    if (t.openapi) {
      console.log(`- OpenAPI Tool: ${t.openapi.name} (${t.openapi.description || ''})`);
    } else {
      console.log(`- Other Tool:`, t.type);
    }
  }
}

inspectV3Full().catch(console.error);
