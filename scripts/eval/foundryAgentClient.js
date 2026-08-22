import { AzureOpenAI, OpenAI } from 'openai';
import { search_omdb } from '../../server/tools/omdb.js';
import { search_tmdb } from '../../server/tools/tmdb.js';
import { search_tvmaze } from '../../server/tools/tvmaze.js';
import { search_wikipedia } from '../../server/tools/wikipedia.js';
import { query_wikidata } from '../../server/tools/wikidata.js';
import { search_rawg } from '../../server/tools/rawg.js';
import { search_genius } from '../../server/tools/genius.js';

try {
  if (process.loadEnvFile) process.loadEnvFile();
} catch (e) {}

const FOUNDRY_ENDPOINT = process.env.AZURE_GROK_ENDPOINT || 'https://green-mos1tune-eastus2.services.ai.azure.com/api/projects/green-mos1tune-eastus2-project';
const FOUNDRY_KEY = process.env.AZURE_GROK_KEY || process.env.AZURE_DEEPSEEK_KEY || '';

/**
 * Fetch dynamic agent metadata from Azure AI Foundry REST API for specific version
 */
export async function getFoundryAgentMetadata(agentName = 'ez-genius', version = '3') {
  try {
    const url = version 
      ? `${FOUNDRY_ENDPOINT}/agents/${agentName}/versions/${version}?api-version=v1`
      : `${FOUNDRY_ENDPOINT}/agents/${agentName}?api-version=v1`;

    const res = await fetch(url, {
      headers: {
        'api-key': FOUNDRY_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (res.ok) {
      const data = await res.json();
      const def = data.definition || data.versions?.latest?.definition || {};
      const ver = data.version || data.versions?.latest?.version || version;
      return {
        name: data.name || agentName,
        version: ver,
        model: def.model || 'gpt-5',
        instructions: def.instructions || '',
        tools: def.tools || [],
        raw: data
      };
    }
  } catch (err) {
    console.warn(`[Foundry Client] Notice fetching agent metadata for ${agentName}:v${version}:`, err.message);
  }

  return {
    name: agentName,
    version: version || '3',
    model: 'gpt-5',
    instructions: '',
    tools: []
  };
}

/**
 * The 7 OpenAPI Function Definitions matching ez-genius in Azure AI Foundry
 */
export const FOUNDRY_EZ_GENIUS_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'searchTitle',
      description: 'Default choice for a single named movie or TV show. Use for ratings, plot, cast, or what is this movie about questions.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'The title of the movie or TV show to look up.' },
          year: { type: 'string', description: 'Optional 4-digit release year.' }
        },
        required: ['title']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'searchMulti',
      description: 'Use instead of OMDb when: the query is a persons name (actor, director), the query could be a movie or a TV show and you are not sure which, or the user wants popularity/trending/similar-title info. If OMDb returns Response: "False", try TMDb next before falling back further.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query for a person, movie, or TV show.' }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'searchShow',
      description: 'Use for TV-specific questions about air status, schedule, network, or streaming platform (Is X still running?, What network is X on?).',
      parameters: {
        type: 'object',
        properties: {
          show_name: { type: 'string', description: 'Name of the TV series.' }
        },
        required: ['show_name']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'searchGames',
      description: 'Use for any video game title.',
      parameters: {
        type: 'object',
        properties: {
          game_name: { type: 'string', description: 'Name of the video game.' }
        },
        required: ['game_name']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'searchSong',
      description: 'Use for song or album questions — release date, artist, trivia. Never use this to retrieve or repeat lyric text.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Song title, artist name, or album name.' }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'runSparqlQuery',
      description: 'Use only for structured cross-entity questions that connect two or more named things (e.g. which actor was in both X and Y, what else did this director make). Only generate SPARQL using the two patterns provided in the description: 1) Shared actor: SELECT ?actorLabel WHERE { ?film1 rdfs:label "Film Title One"@en. ?film2 rdfs:label "Film Title Two"@en. ?film1 wdt:P161 ?actor. ?film2 wdt:P161 ?actor. SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } } LIMIT 10; 2) Other works: SELECT ?workLabel WHERE { ?person rdfs:label "Person Name"@en. ?work wdt:P57 ?person. SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } } LIMIT 10. If the query fails or does not fit those patterns, fall back to Wikipedia.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'SPARQL query string for Wikidata.' },
          format: { type: 'string', enum: ['json'], default: 'json' }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getPageSummary',
      description: 'Fallback tool. Use when no domain-specific tool returns a result, or when the topic does not fit movies/TV/games/music (a general pop culture figure, event, or concept).',
      parameters: {
        type: 'object',
        properties: {
          topic: { type: 'string', description: 'Topic, entity, or article title to look up on Wikipedia.' }
        },
        required: ['topic']
      }
    }
  }
];

/**
 * Execute actual tool calls against local APIs
 */
export async function executeTool(name, args = {}) {
  const startTime = Date.now();
  try {
    let result;
    if (name === 'searchTitle') {
      result = await search_omdb(args);
    } else if (name === 'searchMulti') {
      result = await search_tmdb(args);
    } else if (name === 'searchShow') {
      result = await search_tvmaze(args);
    } else if (name === 'searchGames') {
      result = await search_rawg(args);
    } else if (name === 'searchSong') {
      result = await search_genius(args);
    } else if (name === 'runSparqlQuery') {
      result = await query_wikidata({ sparql_query: args.query || args.sparql_query });
    } else if (name === 'getPageSummary') {
      result = await search_wikipedia(args);
    } else {
      result = { source: name, found: false, summary: `Unknown tool ${name}`, raw: null };
    }
    return {
      ...result,
      executionMs: Date.now() - startTime
    };
  } catch (err) {
    return {
      source: name,
      found: false,
      summary: `Execution error: ${err.message}`,
      raw: null,
      executionMs: Date.now() - startTime
    };
  }
}

/**
 * Initialize LLM clients
 */
function getLLMClients() {
  const clients = [];
  const openAiKey = process.env.AZURE_OPENAI_KEY;
  const openAiEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'ezchat';

  if (openAiKey && openAiEndpoint) {
    clients.push({
      client: new AzureOpenAI({
        endpoint: openAiEndpoint,
        apiKey: openAiKey,
        apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-06-01',
        deployment
      }),
      model: deployment,
      provider: 'Azure OpenAI'
    });
  }

  const foundryKey = process.env.AZURE_GROK_KEY || process.env.AZURE_DEEPSEEK_KEY;
  if (foundryKey) {
    clients.push({
      client: new OpenAI({
        baseURL: 'https://green-mos1tune-eastus2.services.ai.azure.com/models',
        apiKey: foundryKey
      }),
      model: 'grok-4.3',
      provider: 'Azure AI Foundry (grok-4.3)'
    });
  }

  if (clients.length === 0) {
    throw new Error('No Azure OpenAI or Foundry API Key found in environment.');
  }

  return clients;
}

async function callChatWithFallback(clients, payload) {
  for (const { client, model, provider } of clients) {
    try {
      const response = await client.chat.completions.create({
        ...payload,
        model
      });
      return { response, model, provider };
    } catch (err) {
      if (err.status === 429) {
        console.log(`[RateLimit 429] Provider ${provider} rate limited, checking next provider or waiting...`);
        await new Promise(r => setTimeout(r, 2000));
      } else {
        console.warn(`[Client Error ${provider}]`, err.message);
      }
    }
  }

  // If all failed, one last retry on the primary client
  const primary = clients[0];
  await new Promise(r => setTimeout(r, 5000));
  const response = await primary.client.chat.completions.create({
    ...payload,
    model: primary.model
  });
  return { response, model: primary.model, provider: primary.provider };
}

/**
 * Execute a query against ez-genius with multi-turn tool-calling loop
 */
export async function sendQueryToEzGenius(query, options = {}) {
  const startTotalTime = Date.now();
  const clients = getLLMClients();
  const agentVersion = options.version || '3';
  const metadata = await getFoundryAgentMetadata(options.agentName || 'ez-genius', agentVersion);

  const systemInstructions = metadata.instructions;

  const conversation = [
    { role: 'system', content: systemInstructions }
  ];

  if (Array.isArray(options.history) && options.history.length > 0) {
    for (const h of options.history) {
      conversation.push(h);
    }
  }

  conversation.push({ role: 'user', content: query });

  const executedToolCalls = [];
  let currentTurn = 0;
  const maxTurns = 5;
  let finalReply = '';
  let activeModel = 'ezchat';
  let activeProvider = 'Azure OpenAI';

  while (currentTurn < maxTurns) {
    currentTurn++;
    const { response, model, provider } = await callChatWithFallback(clients, {
      messages: conversation,
      tools: FOUNDRY_EZ_GENIUS_TOOLS,
      tool_choice: 'auto',
      temperature: options.temperature ?? 0.7,
      max_tokens: 1200
    });

    activeModel = model;
    activeProvider = provider;

    const choice = response.choices[0];
    const assistantMessage = choice.message;

    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      conversation.push(assistantMessage);

      for (const tc of assistantMessage.tool_calls) {
        const fnName = tc.function.name;
        let fnArgs = {};
        try {
          fnArgs = JSON.parse(tc.function.arguments || '{}');
        } catch (e) {
          console.warn('[Tool Args Parse Warning]', tc.function.arguments);
        }

        const toolResult = await executeTool(fnName, fnArgs);
        executedToolCalls.push({
          tool: fnName,
          args: fnArgs,
          result: toolResult,
          id: tc.id
        });

        conversation.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify({
            source: toolResult.source,
            found: toolResult.found,
            summary: toolResult.summary,
            raw: toolResult.raw
          })
        });
      }
    } else {
      finalReply = assistantMessage.content || '';
      break;
    }
  }

  return {
    query,
    reply: finalReply,
    toolCalls: executedToolCalls,
    toolNames: executedToolCalls.map(t => t.tool),
    turnCount: currentTurn,
    agent: `${metadata.name}:v${metadata.version}`,
    model: activeModel,
    provider: activeProvider,
    totalLatencyMs: Date.now() - startTotalTime
  };
}
