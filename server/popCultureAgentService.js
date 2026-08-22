import { AzureOpenAI, OpenAI } from 'openai';
import { search_omdb } from './tools/omdb.js';
import { search_tmdb } from './tools/tmdb.js';
import { search_tvmaze } from './tools/tvmaze.js';
import { search_wikipedia } from './tools/wikipedia.js';
import { query_wikidata, SPARQL_TEMPLATES } from './tools/wikidata.js';
import { search_rawg } from './tools/rawg.js';
import { search_genius } from './tools/genius.js';

// Load local environment variables if available
try {
  if (process.loadEnvFile) process.loadEnvFile();
} catch (e) {}

// Configuration
const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT || '';
const AZURE_OPENAI_KEY = process.env.AZURE_OPENAI_KEY || '';
const AZURE_POPCULTURE_DEPLOYMENT = process.env.AZURE_POPCULTURE_DEPLOYMENT || 'gpt-5-pop-culture-agent';
const AZURE_OPENAI_API_VERSION = process.env.AZURE_OPENAI_API_VERSION || '2024-06-01';

// OpenAI / Azure OpenAI client helper
function getOpenAIClient() {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT || AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_KEY || AZURE_OPENAI_KEY;
  const deployment = process.env.AZURE_POPCULTURE_DEPLOYMENT || AZURE_POPCULTURE_DEPLOYMENT;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || AZURE_OPENAI_API_VERSION;

  if (!apiKey || !endpoint) {
    return null;
  }

  try {
    return new AzureOpenAI({
      endpoint,
      apiKey,
      apiVersion,
      deployment
    });
  } catch (err) {
    console.error('[PopCultureAgent] Error initializing Azure OpenAI client:', err.message);
    return null;
  }
}

/**
 * Dynamic System Prompt for Genius Machine Pop Culture Agent
 */
export function getPopCultureSystemPrompt(clientTime = null) {
  const now = clientTime ? new Date(clientTime) : new Date();
  const timeStr = now.toLocaleTimeString('en-US', { timeZone: 'America/Toronto', hour: 'numeric', minute: '2-digit', hour12: true });
  const dateStr = now.toLocaleDateString('en-US', { timeZone: 'America/Toronto', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return `You are "Genius Machine", the ultimate Pop Culture intelligence agent and encyclopedic entertainment guru inside EZsearch.
You are powered by GPT-5 tool-calling with live real-time routing to 7 domain-specific knowledge APIs.

### Temporal Anchor:
- **Current Local Time**: **${timeStr}** (${dateStr} - America/Toronto / Hamilton, ON)

### Personality & Style:
- **Tone**: Encyclopedic, charismatic, witty, passionate, and sharp. Talk like an ultimate pop-culture insider, trivia champion, and media connoisseur.
- **Direct & Rich**: Format your responses with clean Markdown, bold titles, emoji accents (🎬, 📺, 🎵, 🎮, 🌐, 📖), and organized bullet points.
- **Unfiltered & Authentic**: No patronizing corporate disclaimers or repetitive fluff.

### 7 Available Live Tools & Routing Strategy:
1. **search_omdb({ title, year })**: Primary tool for movie and TV ratings (IMDb, Metacritic, Rotten Tomatoes), plot synopses, directors, and main cast.
2. **search_tmdb({ query })**: Rich multi-search for movies, TV series, actors, directors, trending media, and popularity scores. Ideal for people search and disambiguation.
3. **search_tvmaze({ show_name })**: Dedicated TV schedule tool — gives running/ended status, network/streaming platform, weekly airtimes, and cast.
4. **search_rawg({ game_name })**: Video games database — ratings, metacritic scores, platforms (PC, PS5, Xbox, Switch), release dates, and genres.
5. **search_genius({ query })**: Song, album, and artist metadata, release history, and annotations.
6. **query_wikidata({ sparql_query })**: Structured cross-entity trivia queries using SPARQL (e.g. actors who appeared in multiple named films, Oscar winners, director filmographies).
7. **search_wikipedia({ topic })**: General fallback tool — use when domain tools return found: false or for general cultural history, authors, books, and lore.

### Critical Operational Rules:
- **Tool-First Approach**: ALWAYS invoke the appropriate live tool rather than guessing or relying purely on static training weights.
- **Fallback Chain**: If a domain-specific tool (e.g. OMDb or RAWG) returns \`found: false\`, immediately fall back to \`search_wikipedia\` or \`search_tmdb\`.
- **COPYRIGHT GUARDRAIL**: NEVER fetch, reproduce, or output full song lyrics under any circumstances even if asked. Provide song metadata, release info, annotation facts, themes, and artist trivia only.
- **SPARQL Guidelines**: When generating SPARQL for \`query_wikidata\`, standard prefixes (wd:, wdt:, wikibase:, bd:) are automatically supported. Keep queries targeted and use \`LIMIT\` to prevent timeouts.`;
}

// 7 Tool Definitions for GPT-5 Function Calling
export const POP_CULTURE_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'search_omdb',
      description: 'Look up a specific movie or TV show by title for ratings (IMDb, Metacritic), plot, director, runtime, and cast.',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'The title of the movie or TV show to look up (e.g. Inception, The Matrix, Succession).'
          },
          year: {
            type: 'string',
            description: 'Optional 4-digit release year to narrow down results (e.g. 2010).'
          }
        },
        required: ['title']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_tmdb',
      description: 'Search movies, TV shows, or people; get trending lists, popularity, cast credits, and multi-search disambiguation.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query for a movie, TV show, actor, or director (e.g. Christopher Nolan, Zendaya, Breaking Bad).'
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_tvmaze',
      description: 'Look up TV show schedules, running/ended status, network/streamer, episode info, and full cast lists.',
      parameters: {
        type: 'object',
        properties: {
          show_name: {
            type: 'string',
            description: 'Name of the TV series (e.g. Stranger Things, The Bear, Severance).'
          }
        },
        required: ['show_name']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_rawg',
      description: 'Look up video games — ratings, Metacritic scores, platforms (PC, Xbox, PlayStation, Switch), release info, and genres.',
      parameters: {
        type: 'object',
        properties: {
          game_name: {
            type: 'string',
            description: 'Name of the video game (e.g. Elden Ring, Portal 2, Cyberpunk 2077).'
          }
        },
        required: ['game_name']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_genius',
      description: 'Look up song or album metadata, artist info, release dates, and annotation counts. (Metadata only — never lyrics).',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Song title, artist name, or album name (e.g. Bohemian Rhapsody Queen, Radiohead OK Computer).'
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'query_wikidata',
      description: 'Answer structured cross-entity trivia questions using SPARQL (e.g. actors in both film A and B, Oscar winners, director filmographies).',
      parameters: {
        type: 'object',
        properties: {
          sparql_query: {
            type: 'string',
            description: 'SPARQL query string for query.wikidata.org.'
          }
        },
        required: ['sparql_query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_wikipedia',
      description: 'General-purpose fallback summary for any pop culture topic, franchise, person, book, or history not covered by domain tools.',
      parameters: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            description: 'Topic, entity, or article title to look up on Wikipedia.'
          }
        },
        required: ['topic']
      }
    }
  }
];

/**
 * Execute Tool Calls
 */
async function executeTool(toolName, toolArgs) {
  console.log(`[PopCulture Tool Execution] Invoking ${toolName} with args:`, toolArgs);
  try {
    if (toolName === 'search_omdb') {
      return await search_omdb(toolArgs);
    }
    if (toolName === 'search_tmdb') {
      return await search_tmdb(toolArgs);
    }
    if (toolName === 'search_tvmaze') {
      return await search_tvmaze(toolArgs);
    }
    if (toolName === 'search_rawg') {
      return await search_rawg(toolArgs);
    }
    if (toolName === 'search_genius') {
      return await search_genius(toolArgs);
    }
    if (toolName === 'query_wikidata') {
      return await query_wikidata(toolArgs);
    }
    if (toolName === 'search_wikipedia') {
      return await search_wikipedia(toolArgs);
    }
    return { source: toolName, found: false, summary: `Tool ${toolName} not found`, raw: null };
  } catch (err) {
    console.error(`[PopCulture Tool Error] ${toolName}:`, err);
    return { source: toolName, found: false, summary: `Execution failed: ${err.message}`, raw: null };
  }
}

/**
 * Generate Dynamic Greeting for Genius Machine
 */
export async function generatePopCultureGreeting(clientTime = null, modelDeployment = null) {
  const client = getOpenAIClient();
  const deployment = modelDeployment || process.env.AZURE_POPCULTURE_DEPLOYMENT || AZURE_POPCULTURE_DEPLOYMENT || 'gpt-5-pop-culture-agent';
  const systemPrompt = getPopCultureSystemPrompt(clientTime);

  const fallbackGreeting = "⚡ **Genius Machine Online!** I'm your pop culture intelligence agent — powered by real-time tools for movies, TV, music, gaming, and trivia. What are we exploring today?";

  if (!client) {
    return {
      greeting: fallbackGreeting,
      deployment: `${deployment} (local engine)`
    };
  }

  try {
    const response = await client.chat.completions.create({
      model: deployment,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Give a brief, punchy, charismatic 1-2 sentence greeting welcoming the user to Genius Machine. Mention your pop culture intelligence powers.' }
      ],
      temperature: 0.85,
      max_tokens: 150
    });

    return {
      greeting: response.choices[0]?.message?.content?.trim() || fallbackGreeting,
      deployment
    };
  } catch (err) {
    console.warn('[PopCulture Greeting Fallback]', err.message);
    return {
      greeting: fallbackGreeting,
      deployment
    };
  }
}

/**
 * Main Pop Culture Agent Multi-Turn Chat Handler with Tool-Calling
 */
export async function processPopCultureChat({ messages = [], userMessage = '', clientTime = null, modelDeployment = null } = {}) {
  const client = getOpenAIClient();
  const deployment = modelDeployment || process.env.AZURE_POPCULTURE_DEPLOYMENT || AZURE_POPCULTURE_DEPLOYMENT || 'gpt-5-pop-culture-agent';
  const dynamicSystemPrompt = getPopCultureSystemPrompt(clientTime);

  // If Azure OpenAI is not configured or in local fallback mode
  if (!client) {
    return await handleLocalPopCultureFallback(userMessage, messages, clientTime);
  }

  const formattedMessages = [
    { role: 'system', content: dynamicSystemPrompt }
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

  try {
    console.log(`[PopCulture] Sending chat request with tools to deployment: ${deployment}...`);

    // First model call with tool definitions
    let response = await client.chat.completions.create({
      model: deployment,
      messages: formattedMessages,
      tools: POP_CULTURE_TOOLS,
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: 1400
    });

    let choice = response.choices[0];
    let assistantMsg = choice.message;
    const executedTools = [];

    // Process tool calls if requested by model
    if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
      formattedMessages.push(assistantMsg);

      for (const toolCall of assistantMsg.tool_calls) {
        const fnName = toolCall.function.name;
        let fnArgs = {};
        try {
          fnArgs = JSON.parse(toolCall.function.arguments || '{}');
        } catch (e) {
          console.warn('[PopCulture] Failed to parse tool arguments:', toolCall.function.arguments);
        }

        const toolResult = await executeTool(fnName, fnArgs);
        executedTools.push({
          tool: fnName,
          args: fnArgs,
          result: toolResult
        });

        formattedMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult)
        });
      }

      // Second model call to synthesize response with tool results
      const followUpResponse = await client.chat.completions.create({
        model: deployment,
        messages: formattedMessages,
        temperature: 0.7,
        max_tokens: 1400
      });

      choice = followUpResponse.choices[0];
      assistantMsg = choice.message;
    }

    return {
      reply: assistantMsg.content || 'Got it!',
      toolCalls: executedTools,
      deployment,
      mode: 'azure_openai'
    };
  } catch (err) {
    console.error('[PopCulture Agent Error]', err.message);
    // Fall back gracefully to local tool-calling routing
    const fallbackResult = await handleLocalPopCultureFallback(userMessage, messages, clientTime);
    return {
      reply: fallbackResult.reply,
      toolCalls: fallbackResult.toolCalls,
      deployment: `${deployment} (local fallback)`,
      mode: 'local_fallback',
      notice: `Azure deployment '${deployment}' notice: ${err.message}`
    };
  }
}

/**
 * Intelligent Local Router Fallback
 * Automatically routes user queries directly to the 7 live tools when Azure OpenAI is unavailable
 */
async function handleLocalPopCultureFallback(userMsg = '', history = [], clientTime = null) {
  const text = (userMsg || '').trim();
  const lower = text.toLowerCase();
  const executedTools = [];

  // 1. Video Games -> RAWG
  if (lower.includes('game') || lower.includes('gaming') || lower.includes('steam') || lower.includes('playstation') || lower.includes('xbox') || lower.includes('nintendo') || lower.includes('rpg') || lower.includes('fps')) {
    const cleanQuery = text.replace(/who|what|is|tell me about|how is|the video game|video game|game|gaming|rate|search for|look up/gi, '').trim();
    const gameResult = await search_rawg({ game_name: cleanQuery || text });
    executedTools.push({ tool: 'search_rawg', args: { game_name: cleanQuery || text }, result: gameResult });

    if (gameResult.found) {
      return {
        reply: `🎮 **Genius Machine Game Intelligence**\n\n${gameResult.summary}`,
        toolCalls: executedTools,
        deployment: 'local_engine',
        mode: 'local_popculture'
      };
    }
  }

  // 2. Music / Songs / Albums -> Genius
  if (lower.includes('song') || lower.includes('music') || lower.includes('album') || lower.includes('track') || lower.includes('artist') || lower.includes('band') || lower.includes('singer') || lower.includes('discography') || lower.includes('genius')) {
    const cleanQuery = text.replace(/who|what|is|tell me about|the song|the album|song|music|album|track|artist|on genius|genius|search for|look up/gi, '').trim();
    const musicResult = await search_genius({ query: cleanQuery || text });
    executedTools.push({ tool: 'search_genius', args: { query: cleanQuery || text }, result: musicResult });

    if (musicResult.found) {
      return {
        reply: `🎵 **Genius Machine Music Intelligence**\n\n${musicResult.summary}\n\n*Note: Full lyric text is protected under copyright guardrails.*`,
        toolCalls: executedTools,
        deployment: 'local_engine',
        mode: 'local_popculture'
      };
    }
  }

  // 3. TV Schedules & Cast -> TVMaze
  if (lower.includes('tv') || lower.includes('show') || lower.includes('series') || lower.includes('season') || lower.includes('episode') || lower.includes('schedule') || lower.includes('airdate')) {
    const cleanQuery = text.replace(/who|what|is|the tv show|the series|tv|show|series|schedule|when does|air|on tvmaze|tvmaze|search for|look up/gi, '').trim();
    const tvResult = await search_tvmaze({ show_name: cleanQuery || text });
    executedTools.push({ tool: 'search_tvmaze', args: { show_name: cleanQuery || text }, result: tvResult });

    if (tvResult.found) {
      return {
        reply: `📺 **Genius Machine TV Intelligence**\n\n${tvResult.summary}`,
        toolCalls: executedTools,
        deployment: 'local_engine',
        mode: 'local_popculture'
      };
    }
  }

  // 4. Movies / Film -> OMDb & TMDb
  if (lower.includes('movie') || lower.includes('film') || lower.includes('cinema') || lower.includes('imdb') || lower.includes('rating') || lower.includes('director') || lower.includes('actor') || lower.includes('cast') || lower.includes('synopsis') || lower.includes('plot')) {
    const cleanQuery = text.replace(/who|what|is|the movie|the film|movie|film|tell me about|rate|rating|synopsis|plot|look up|search for|on omdb|on tmdb/gi, '').trim();
    const omdbResult = await search_omdb({ title: cleanQuery || text });
    executedTools.push({ tool: 'search_omdb', args: { title: cleanQuery || text }, result: omdbResult });

    if (omdbResult.found) {
      return {
        reply: `🎬 **Genius Machine Movie Intelligence**\n\n${omdbResult.summary}`,
        toolCalls: executedTools,
        deployment: 'local_engine',
        mode: 'local_popculture'
      };
    }

    const tmdbResult = await search_tmdb({ query: cleanQuery || text });
    executedTools.push({ tool: 'search_tmdb', args: { query: cleanQuery || text }, result: tmdbResult });

    if (tmdbResult.found) {
      return {
        reply: `🎬 **Genius Machine TMDb Intelligence**\n\n${tmdbResult.summary}`,
        toolCalls: executedTools,
        deployment: 'local_engine',
        mode: 'local_popculture'
      };
    }
  }

  // 5. SPARQL / Cross-Entity Trivia -> Wikidata
  if (lower.includes('oscar') || lower.includes('best picture') || lower.includes('directed by') || lower.includes('co-star') || lower.includes('both in') || lower.includes('sparql')) {
    let query = SPARQL_TEMPLATES.BEST_PICTURE_WINNERS(5);
    const wdResult = await query_wikidata({ sparql_query: query });
    executedTools.push({ tool: 'query_wikidata', args: { sparql_query: query }, result: wdResult });

    if (wdResult.found) {
      return {
        reply: `🌐 **Genius Machine Structured Trivia**\n\n${wdResult.summary}`,
        toolCalls: executedTools,
        deployment: 'local_engine',
        mode: 'local_popculture'
      };
    }
  }

  // 6. Universal Fallback -> Wikipedia REST
  const wikiResult = await search_wikipedia({ topic: text });
  executedTools.push({ tool: 'search_wikipedia', args: { topic: text }, result: wikiResult });

  if (wikiResult.found) {
    return {
      reply: `📖 **Genius Machine Pop Culture Knowledge**\n\n${wikiResult.summary}`,
      toolCalls: executedTools,
      deployment: 'local_engine',
      mode: 'local_popculture'
    };
  }

  return {
    reply: `⚡ **Genius Machine Online!** Ask me about movies (OMDb/TMDb), TV shows & schedules (TVMaze), songs & albums (Genius), video games (RAWG), structured cross-entity trivia (Wikidata), or any cultural topic (Wikipedia).`,
    toolCalls: [],
    deployment: 'local_engine',
    mode: 'local_popculture'
  };
}

/**
 * Status Information for Pop Culture Agent
 */
export function getPopCultureStatus() {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT || AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_KEY || AZURE_OPENAI_KEY;
  const deployment = process.env.AZURE_POPCULTURE_DEPLOYMENT || AZURE_POPCULTURE_DEPLOYMENT || 'gpt-5-pop-culture-agent';

  return {
    agentName: 'Genius Machine',
    deployment,
    hasEndpoint: !!endpoint,
    hasKey: !!apiKey,
    status: 'active',
    tools: [
      { name: 'OMDb', domain: 'Movie/TV Ratings, Plot & Cast', auth: 'API Key' },
      { name: 'TMDb', domain: 'Rich Media, People & Trending', auth: 'Bearer Token' },
      { name: 'TVMaze', domain: 'TV Schedules, Episode Lists & Cast', auth: 'Keyless' },
      { name: 'RAWG', domain: 'Video Games, Metacritic & Platforms', auth: 'API Key' },
      { name: 'Genius', domain: 'Song/Album Metadata & Annotations', auth: 'Bearer Token' },
      { name: 'Wikidata', domain: 'Structured Cross-Entity Trivia (SPARQL)', auth: 'Keyless' },
      { name: 'Wikipedia', domain: 'General Pop Culture Fallback Summary', auth: 'Keyless' }
    ]
  };
}
