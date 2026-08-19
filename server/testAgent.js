import { getHamiltonWeather } from './tools/weatherTool.js';
import { getHSRTransitInfo } from './tools/hsrTransitTool.js';
import { processAgentChat, getAgentStatus } from './agentService.js';

async function runTests() {
  console.log('--- Testing Agent Status ---');
  console.log(getAgentStatus());

  console.log('\n--- Testing Hamilton Weather Tool ---');
  try {
    const weather = await getHamiltonWeather({ forecast_type: 'all' });
    console.log('Weather result:', JSON.stringify(weather, null, 2).slice(0, 300) + '...');
  } catch (err) {
    console.error('Weather error:', err.message);
  }

  console.log('\n--- Testing HSR Transit Tool (Departures) ---');
  try {
    const departures = await getHSRTransitInfo();
    console.log('Departures result:', JSON.stringify(departures, null, 2).slice(0, 300) + '...');
  } catch (err) {
    console.error('Transit error:', err.message);
  }

  console.log('\n--- Testing HSR Transit Tool (McMaster Trip) ---');
  try {
    const mcmasterTrip = await getHSRTransitInfo({ destination: 'McMaster' });
    console.log('Trip result:', JSON.stringify(mcmasterTrip, null, 2));
  } catch (err) {
    console.error('Transit error:', err.message);
  }

  console.log('\n--- Testing Agent Chat (Local Fallback & Routing) ---');
  try {
    const chatResult = await processAgentChat({ userMessage: 'How do I take the bus from 200 Bay St to McMaster?' });
    console.log('Chat reply:\n', chatResult.reply);
  } catch (err) {
    console.error('Chat error:', err.message);
  }
}

runTests();
