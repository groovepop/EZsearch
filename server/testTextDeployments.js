try { if (process.loadEnvFile) process.loadEnvFile(); } catch (e) {}

import { AzureOpenAI } from 'openai';

const endpoint = 'https://green-mos1tune-eastus2.openai.azure.com';
const apiKey = process.env.AZURE_GROK_KEY || process.env.GROOVEPOP_AZURE_OPENAI_KEY;

console.log('Testing Azure text deployments on green-mos1tune-eastus2...');
console.log('API Key present:', !!apiKey);

const client = new AzureOpenAI({
  endpoint,
  apiKey,
  apiVersion: '2024-06-01'
});

async function testDeployment(deploymentName, isGpt5 = false) {
  console.log(`\nTesting deployment: "${deploymentName}"...`);
  try {
    const params = {
      model: deploymentName,
      messages: [
        { role: 'system', content: 'Return JSON: {"test": "hello"}' },
        { role: 'user', content: 'Say hello' }
      ]
    };
    if (isGpt5) {
      params.max_completion_tokens = 200;
    } else {
      params.max_tokens = 200;
      params.response_format = { type: 'json_object' };
      params.temperature = 0.7;
    }

    const res = await client.chat.completions.create(params);
    console.log(`✅ Success for "${deploymentName}":`, res.choices[0]?.message?.content);
  } catch (err) {
    console.error(`❌ Failed for "${deploymentName}":`, err.status, err.message);
  }
}

async function runAll() {
  await testDeployment('gpt-4o', false);
  await testDeployment('gpt-chat-latest', false);
  await testDeployment('gpt-5', true);
  await testDeployment('o4-mini', false);
}

runAll();
