import { OpenAI } from 'openai';
import https from 'https';

// Load local environment variables if available
try {
  if (process.loadEnvFile) process.loadEnvFile();
} catch (e) {}

// Configuration for EZ-Grok Agent on Azure AI Services
const AZURE_GROK_ENDPOINT = process.env.AZURE_GROK_ENDPOINT || 'https://green-mos1tune-eastus2.services.ai.azure.com/api/projects/green-mos1tune-eastus2-project';
const AZURE_GROK_MODELS_URL = 'https://green-mos1tune-eastus2.services.ai.azure.com/models';
const AZURE_GROK_KEY = process.env.AZURE_GROK_KEY || '';
const AGENT_NAME = process.env.AZURE_GROK_AGENT_NAME || 'ez-grok';
const AGENT_VERSION = process.env.AZURE_GROK_AGENT_VERSION || '4';
const AGENT_MODEL = 'grok-4.3';

// The saved system prompt instructions for ez-grok:4
const SAVED_AGENT_INSTRUCTIONS = "you are a portal assistant with a wild personality specializing in knowledge of music and tv shows";

// OpenAI client instance for Azure AI Services Model Inference
function getGrokClient() {
  const apiKey = process.env.AZURE_GROK_KEY || AZURE_GROK_KEY;
  if (!apiKey) return null;

  try {
    return new OpenAI({
      baseURL: AZURE_GROK_MODELS_URL,
      apiKey: apiKey
    });
  } catch (err) {
    console.error('[Grok Service] Error initializing OpenAI client for Grok:', err.message);
    return null;
  }
}

/**
 * Generate dynamic greeting in EZ-Grok's authentic wild music/TV portal persona
 */
export async function generateGrokGreeting(clientTime = null) {
  const client = getGrokClient();
  const now = clientTime ? new Date(clientTime) : new Date();
  const timeStr = now.toLocaleTimeString('en-US', { timeZone: 'America/Toronto', hour: 'numeric', minute: '2-digit', hour12: true });

  if (!client) {
    return {
      greeting: `🌀 *KZZZT!* The portal is open! I'm **EZ-Grok**, your wild interdimensional portal guide for music and TV. What cosmic tunes or binge-worthy shows are we firing up right now?`,
      agent: `${AGENT_NAME}:${AGENT_VERSION}`
    };
  }

  try {
    const response = await client.chat.completions.create({
      model: AGENT_MODEL,
      messages: [
        { role: 'system', content: `${SAVED_AGENT_INSTRUCTIONS}. The local time is ${timeStr}.` },
        { role: 'user', content: 'Give a brief, 1-2 sentence wild, electric welcome greeting as the portal assistant. Keep it punchy, full of character, and invite me to dive into some music or shows.' }
      ],
      temperature: 0.95,
      max_tokens: 150
    });

    return {
      greeting: response.choices[0]?.message?.content?.trim() || "🌀 *KZZZT!* The portal is live! I'm EZ-Grok. What music or TV universe are we blasting into tonight?",
      agent: `${AGENT_NAME}:${AGENT_VERSION}`,
      model: AGENT_MODEL
    };
  } catch (err) {
    console.error('[Grok Greeting Error]', err.message);
    return {
      greeting: `🌀 *KZZZT!* The portal is live! I'm **EZ-Grok** (Grok 4.3). Tell me what music or TV madness you're in the mood for!`,
      agent: `${AGENT_NAME}:${AGENT_VERSION}`,
      model: AGENT_MODEL
    };
  }
}

/**
 * Process chat messages with ez-grok:4
 */
export async function processGrokChat({ messages = [], userMessage = '', clientTime = null }) {
  const client = getGrokClient();
  const now = clientTime ? new Date(clientTime) : new Date();
  const timeStr = now.toLocaleTimeString('en-US', { timeZone: 'America/Toronto', hour: 'numeric', minute: '2-digit', hour12: true });
  const dateStr = now.toLocaleDateString('en-US', { timeZone: 'America/Toronto', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  if (!client) {
    return {
      reply: `⚠️ **Grok Connection Error**: Azure AI Grok API Key is not configured.\n\n*Running local portal fallback.*`,
      agent: `${AGENT_NAME}:${AGENT_VERSION}`,
      model: AGENT_MODEL
    };
  }

  // System prompt using the exact saved instructions from ez-grok:4
  const systemMessage = {
    role: 'system',
    content: `${SAVED_AGENT_INSTRUCTIONS}. Current Local Time in Hamilton: ${timeStr}, ${dateStr}. Give candid, wild, insightful, and electric recommendations with zero corporate filter.`
  };

  const formattedMessages = [
    systemMessage,
    ...messages
  ];

  if (userMessage) {
    formattedMessages.push({ role: 'user', content: userMessage });
  }

  try {
    console.log(`[Grok] Sending chat request to ${AGENT_NAME}:${AGENT_VERSION} (${AGENT_MODEL})...`);
    const response = await client.chat.completions.create({
      model: AGENT_MODEL,
      messages: formattedMessages,
      temperature: 0.9,
      max_tokens: 1200
    });

    const reply = response.choices[0]?.message?.content || "Portal transmission complete!";

    return {
      reply,
      agent: `${AGENT_NAME}:${AGENT_VERSION}`,
      model: AGENT_MODEL,
      endpoint: AZURE_GROK_ENDPOINT
    };
  } catch (err) {
    console.error('[Grok Chat Error]', err.message);
    return {
      reply: `⚠️ **Portal Transmission Disrupted**: ${err.message}\n\nPlease check the Grok endpoint connection or try again in a moment.`,
      agent: `${AGENT_NAME}:${AGENT_VERSION}`,
      model: AGENT_MODEL,
      error: err.message
    };
  }
}

/**
 * Get EZ-Grok Agent Status
 */
export function getGrokStatus() {
  return {
    agentName: AGENT_NAME,
    agentVersion: AGENT_VERSION,
    model: AGENT_MODEL,
    endpoint: AZURE_GROK_ENDPOINT,
    instructions: SAVED_AGENT_INSTRUCTIONS,
    status: 'active'
  };
}
