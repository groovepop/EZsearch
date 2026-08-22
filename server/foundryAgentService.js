import { OpenAI } from 'openai';

// Load local environment variables if available
try {
  if (process.loadEnvFile) process.loadEnvFile();
} catch (e) {}

// Configuration for Azure AI Foundry Project
const AZURE_FOUNDRY_ENDPOINT = process.env.AZURE_FOUNDRY_ENDPOINT || process.env.AZURE_GROK_ENDPOINT || 'https://green-mos1tune-eastus2.services.ai.azure.com/api/projects/green-mos1tune-eastus2-project';
const AZURE_FOUNDRY_MODELS_URL = 'https://green-mos1tune-eastus2.services.ai.azure.com/models';
const AZURE_FOUNDRY_KEY = process.env.AZURE_DEEPSEEK_KEY || process.env.AZURE_GROK_KEY || '';

// Agent Cache Store (5 minute TTL)
const agentCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

function getClient() {
  const apiKey = process.env.AZURE_DEEPSEEK_KEY || process.env.AZURE_GROK_KEY || AZURE_FOUNDRY_KEY;
  if (!apiKey) return null;
  return new OpenAI({
    baseURL: AZURE_FOUNDRY_MODELS_URL,
    apiKey: apiKey
  });
}

/**
 * Fetch all versions and metadata for an agent from Azure AI Foundry REST API
 */
export async function fetchAgentMetadataFromFoundry(agentName = 'ez-deepseek', forceRefresh = false) {
  const cacheKey = `agent_meta_${agentName}`;
  const cached = agentCache.get(cacheKey);

  if (!forceRefresh && cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return cached.data;
  }

  const apiKey = process.env.AZURE_DEEPSEEK_KEY || process.env.AZURE_GROK_KEY || AZURE_FOUNDRY_KEY;
  if (!apiKey) {
    throw new Error('Azure Foundry API Key is not configured in environment.');
  }

  try {
    const listUrl = `${AZURE_FOUNDRY_ENDPOINT}/agents/${agentName}/versions?api-version=v1`;
    const res = await fetch(listUrl, {
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Failed to fetch agent versions from Foundry: HTTP ${res.status} ${errText}`);
    }

    const json = await res.json();
    const versions = json.data || [];
    
    // Sort versions to guarantee newest first
    const sortedVersions = versions.sort((a, b) => {
      const vA = parseInt(a.version, 10) || 0;
      const vB = parseInt(b.version, 10) || 0;
      return vB - vA;
    });

    const latestVersion = sortedVersions[0] || null;

    const data = {
      agentName,
      latestVersionNumber: latestVersion ? latestVersion.version : '1',
      latestDefinition: latestVersion ? latestVersion.definition : null,
      model: latestVersion?.definition?.model || (agentName === 'ez-deepseek' ? 'DeepSeek-V4-Flash' : 'grok-4.3'),
      instructions: latestVersion?.definition?.instructions || 'you are a portal assistant with a wild personality specializing in knowledge of music and tv shows',
      temperature: latestVersion?.definition?.temperature ?? 1,
      top_p: latestVersion?.definition?.top_p ?? 0.7,
      allVersions: sortedVersions.map(v => ({
        version: v.version,
        id: v.id,
        model: v.definition?.model,
        created_at: v.created_at,
        status: v.status
      })),
      fetchedAt: Date.now()
    };

    agentCache.set(cacheKey, { timestamp: Date.now(), data });
    return data;
  } catch (err) {
    console.error(`[Foundry Agent Metadata Error] ${agentName}:`, err.message);
    // Fallback if network fails
    if (cached) return cached.data;
    
    return {
      agentName,
      latestVersionNumber: agentName === 'ez-deepseek' ? '2' : '4',
      model: agentName === 'ez-deepseek' ? 'DeepSeek-V4-Flash' : 'grok-4.3',
      instructions: 'you are a portal assistant with a wild personality specializing in knowledge of music and tv shows',
      temperature: 1,
      top_p: 0.7,
      allVersions: [],
      fallback: true
    };
  }
}

/**
 * Flush version cache to instantly discover newly saved Playground versions
 */
export function flushFoundryAgentCache() {
  agentCache.clear();
  return { ok: true, message: 'Agent version cache cleared. Next request will discover latest Foundry versions.' };
}

/**
 * Format local Hamilton time string for temporal awareness
 */
function getHamiltonTimeString(clientTime) {
  try {
    const d = clientTime ? new Date(clientTime) : new Date();
    return d.toLocaleString('en-US', {
      timeZone: 'America/Toronto',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch (e) {
    return new Date().toLocaleString();
  }
}

/**
 * Process multi-turn chat for DeepSeek agent
 */
export async function processDeepSeekChat({ messages = [], userMessage = '', clientTime = null, version = 'latest' } = {}) {
  const client = getClient();
  if (!client) {
    throw new Error('DeepSeek client is not initialized. Check AZURE_GROK_KEY in .env.');
  }

  // 1. Auto-discover active agent version and instructions
  const agentMeta = await fetchAgentMetadataFromFoundry('ez-deepseek');
  const targetVersion = (version === 'latest' || !version) 
    ? agentMeta.latestVersionNumber 
    : version;
  
  const modelToUse = agentMeta.model || 'DeepSeek-V4-Flash';
  const baseInstructions = agentMeta.instructions;

  // 2. Build time-aware system prompt
  const timeString = getHamiltonTimeString(clientTime);
  const systemPrompt = `${baseInstructions}

[Current Context]:
- Local Hamilton, ON Time: ${timeString} (Timezone: America/Toronto)
- Geographic Anchor: 200 Bay Street South, Hamilton, ON L8P 4S4 (Bay 200 Apartments)
- Agent: ez-deepseek (Version ${targetVersion})
- Personality: Wild, candid, witty, uninhibited music and TV show specialist portal assistant. No corporate filler.`;

  // 3. Format message history
  const formattedMessages = [
    { role: 'system', content: systemPrompt }
  ];

  if (Array.isArray(messages) && messages.length > 0) {
    for (const msg of messages.slice(-12)) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        formattedMessages.push({
          role: msg.role,
          content: msg.content
        });
      }
    }
  }

  if (userMessage) {
    formattedMessages.push({ role: 'user', content: userMessage });
  }

  console.log(`[DeepSeek] Sending chat request to ez-deepseek:${targetVersion} (${modelToUse})...`);

  const response = await client.chat.completions.create({
    model: modelToUse,
    messages: formattedMessages,
    temperature: agentMeta.temperature ?? 1,
    top_p: agentMeta.top_p ?? 0.7,
    max_tokens: 1800
  });

  const reply = response.choices[0]?.message?.content || "Portal link disrupted! Please try again.";

  return {
    reply,
    agent: `ez-deepseek:${targetVersion}`,
    model: modelToUse,
    usage: response.usage || null,
    timestamp: Date.now()
  };
}

/**
 * Generate dynamic greeting for DeepSeek agent
 */
export async function generateDeepSeekGreeting(clientTime = null, version = 'latest') {
  const client = getClient();
  const agentMeta = await fetchAgentMetadataFromFoundry('ez-deepseek');
  const targetVersion = (version === 'latest' || !version) 
    ? agentMeta.latestVersionNumber 
    : version;

  if (!client) {
    return {
      greeting: "💥 *BOOM!* Portal link online! I'm EZ-DeepSeek. Ready to dive into some unhinged music deep cuts or mind-bending TV shows?",
      agent: `ez-deepseek:${targetVersion}`,
      model: agentMeta.model || 'DeepSeek-V4-Flash'
    };
  }

  const timeString = getHamiltonTimeString(clientTime);
  const prompt = `${agentMeta.instructions}

[Context]: Local Hamilton Time is ${timeString}. 
Generate a short 1-2 sentence chaotic, energetic welcome greeting to the user opening the music & TV show portal. No generic clichés, make it wild and authentic.`;

  try {
    const response = await client.chat.completions.create({
      model: agentMeta.model || 'DeepSeek-V4-Flash',
      messages: [{ role: 'system', content: prompt }],
      max_tokens: 150,
      temperature: 1
    });

    const greeting = response.choices[0]?.message?.content?.trim() || "Portal link online! What sonic mayhem or TV binge are we diving into?";

    return {
      greeting,
      agent: `ez-deepseek:${targetVersion}`,
      model: agentMeta.model || 'DeepSeek-V4-Flash'
    };
  } catch (err) {
    console.error('[DeepSeek Greet Error]', err);
    return {
      greeting: "💥 *BOOM!* Portal link online! I'm EZ-DeepSeek. Ready to dive into some unhinged music deep cuts or mind-bending TV shows?",
      agent: `ez-deepseek:${targetVersion}`,
      model: agentMeta.model || 'DeepSeek-V4-Flash'
    };
  }
}

/**
 * Status information for DeepSeek agent
 */
export async function getDeepSeekStatus() {
  try {
    const meta = await fetchAgentMetadataFromFoundry('ez-deepseek');
    return {
      agentName: 'ez-deepseek',
      activeVersion: meta.latestVersionNumber,
      model: meta.model,
      endpoint: AZURE_FOUNDRY_ENDPOINT,
      instructions: meta.instructions,
      allVersions: meta.allVersions,
      status: 'active'
    };
  } catch (e) {
    return {
      agentName: 'ez-deepseek',
      activeVersion: '2',
      model: 'DeepSeek-V4-Flash',
      endpoint: AZURE_FOUNDRY_ENDPOINT,
      status: 'offline',
      error: e.message
    };
  }
}
