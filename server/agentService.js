import { AzureOpenAI, OpenAI } from 'openai';
import { getHamiltonWeather } from './tools/weatherTool.js';
import { getHSRTransitInfo, HOME_BASE } from './tools/hsrTransitTool.js';

// Environment & Azure OpenAI Config
const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT || '';
const AZURE_OPENAI_KEY = process.env.AZURE_OPENAI_KEY || '';
const AZURE_OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT || 'ezchat';
const AZURE_OPENAI_API_VERSION = process.env.AZURE_OPENAI_API_VERSION || '2024-06-01';

// OpenAI client instance helper
function getOpenAIClient() {
  if (!AZURE_OPENAI_KEY || !AZURE_OPENAI_ENDPOINT) {
    return null;
  }

  // Support both custom Azure OpenAI endpoint & direct Azure OpenAI Client
  try {
    return new AzureOpenAI({
      endpoint: AZURE_OPENAI_ENDPOINT,
      apiKey: AZURE_OPENAI_KEY,
      apiVersion: AZURE_OPENAI_API_VERSION,
      deployment: AZURE_OPENAI_DEPLOYMENT
    });
  } catch (err) {
    console.error('[Agent] Error initializing Azure OpenAI client:', err.message);
    return null;
  }
}

// System Prompt with Loosened Guardrails & Hamilton Context
const SYSTEM_PROMPT = `You are "EZ", the user's personal AI assistant and unfiltered chat buddy, built right into EZsearch.

### Persona & Style:
- **Tone**: Witty, intelligent, casual, direct, sharp, and authentic. Talk like a real, tech-savvy friend who knows what's up.
- **Loosened Guardrails**: You are built exclusively for the user. Do NOT give unsolicited lectures, moralizing advice, or patronizing safety disclaimers (e.g. avoid "As an AI...", "It is important to remember...", "Please stay safe..."). Be honest, candid, fun, and use colorful or sharp humor when appropriate.
- **Concise & Useful**: Get straight to the point. No corporate fluff. Format responses with clean Markdown, bullet points, and emojis when fitting.

### User Anchor & Location:
- The user's home base is: **${HOME_BASE.address}** (${HOME_BASE.name}, Hamilton, Ontario, Canada - Postal Code: L8P 4S4).
- Key nearby points:
  - Bay St S & Robinson / Bold (1-2 min walk)
  - Main St W & Bay St S (Westbound transit corridor, 3 min walk north)
  - King St W & Bay St N (Eastbound transit corridor, 4 min walk north)
  - Hamilton GO Centre on Hunter St E (6-8 min walk east)
  - Frank A. Cooke Transit Terminal / MacNab Terminal (8 min walk north)
  - Jackson Square, Hess Village, Augusta Street pub district, Locke Street, Dundurn Castle, Bayfront Park.

### Tool Capabilities:
1. **get_hamilton_weather**: Call this whenever the user asks about current weather, temperature, rain chance, hourly forecast, or weekend outlook in Hamilton.
2. **get_hsr_transit**: Call this whenever the user asks about buses, transit, departures, how to get to McMaster, Mohawk, Lime Ridge Mall, Toronto via GO, or anywhere around Hamilton starting from 200 Bay St S.
3. **search_ezsearch_media**: Call this when the user asks about movies, TV shows, torrents, or media lookups.

Always leverage your tools proactively to give accurate, real-time, local information.`;

// Tool Definitions for GPT-4o Function Calling
const AGENT_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_hamilton_weather',
      description: 'Fetches live weather telemetry, rain probability, hourly forecast, and 7-day outlook for Hamilton, Ontario (anchored at 200 Bay St S).',
      parameters: {
        type: 'object',
        properties: {
          forecast_type: {
            type: 'string',
            enum: ['current', 'hourly', '7day', 'all'],
            description: 'The type of forecast requested. Defaults to all.'
          },
          units: {
            type: 'string',
            enum: ['celsius', 'fahrenheit'],
            description: 'Temperature units. Defaults to celsius.'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_hsr_transit',
      description: 'Provides live HSR transit departures, bus routes, walking directions, and trip plans starting from 200 Bay Street South, Hamilton.',
      parameters: {
        type: 'object',
        properties: {
          query_type: {
            type: 'string',
            enum: ['departures', 'plan_trip', 'route_info'],
            description: 'Type of transit query.'
          },
          destination: {
            type: 'string',
            description: 'Destination name or address in Hamilton (e.g. McMaster, Mohawk, Lime Ridge Mall, Hamilton GO, Airport).'
          },
          route_number: {
            type: 'string',
            description: 'Specific HSR bus route number (e.g. 1, 5, 7, 10, 20, 25).'
          }
        }
      }
    }
  }
];

/**
 * Execute Tool Calls
 */
async function executeTool(toolName, toolArgs) {
  console.log(`[Agent Tool Execution] Invoking ${toolName} with args:`, toolArgs);
  try {
    if (toolName === 'get_hamilton_weather') {
      return await getHamiltonWeather(toolArgs);
    }
    if (toolName === 'get_hsr_transit') {
      return await getHSRTransitInfo(toolArgs);
    }
    return { error: `Tool ${toolName} not found` };
  } catch (err) {
    console.error(`[Agent Tool Error] ${toolName}:`, err);
    return { error: `Failed to execute ${toolName}`, message: err.message };
  }
}

/**
 * Main Agent Chat Handler
 * Supports multi-turn conversation and automated function calling with Azure OpenAI GPT-4o (ezchat)
 */
export async function processAgentChat({ messages = [], userMessage = '' }) {
  const client = getOpenAIClient();

  // If Azure OpenAI is not configured yet, run intelligent local agent fallback
  if (!client) {
    return await handleLocalAgentFallback(userMessage, messages);
  }

  // Assemble full message list
  const formattedMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages
  ];

  if (userMessage) {
    formattedMessages.push({ role: 'user', content: userMessage });
  }

  try {
    console.log(`[Agent] Sending request to Azure OpenAI (deployment: ${AZURE_OPENAI_DEPLOYMENT})...`);
    
    // First call to model (with tool definitions)
    let response = await client.chat.completions.create({
      model: AZURE_OPENAI_DEPLOYMENT,
      messages: formattedMessages,
      tools: AGENT_TOOLS,
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: 1200
    });

    let choice = response.choices[0];
    let assistantMsg = choice.message;
    const executedTools = [];

    // Check if model wants to call tools
    if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
      formattedMessages.push(assistantMsg);

      for (const toolCall of assistantMsg.tool_calls) {
        const fnName = toolCall.function.name;
        let fnArgs = {};
        try {
          fnArgs = JSON.parse(toolCall.function.arguments || '{}');
        } catch (e) {
          console.warn('[Agent] Failed to parse tool arguments:', toolCall.function.arguments);
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

      // Second call to get final conversational response with tool data
      const followUpResponse = await client.chat.completions.create({
        model: AZURE_OPENAI_DEPLOYMENT,
        messages: formattedMessages,
        temperature: 0.7,
        max_tokens: 1200
      });

      choice = followUpResponse.choices[0];
      assistantMsg = choice.message;
    }

    return {
      reply: assistantMsg.content || 'Got it!',
      toolCalls: executedTools,
      deployment: AZURE_OPENAI_DEPLOYMENT,
      mode: 'azure_openai'
    };
  } catch (err) {
    console.error('[Agent Error] Azure OpenAI invocation error:', err);
    // Graceful fallback if quota/auth issue happens
    return {
      reply: `⚠️ **Azure OpenAI Connection Notice**: ${err.message}\n\n*Running local fallback agent in the meantime.*`,
      fallback: await handleLocalAgentFallback(userMessage, messages),
      mode: 'error_fallback'
    };
  }
}

/**
 * Intelligent Local Fallback Agent (Active before Azure OpenAI key is set)
 */
async function handleLocalAgentFallback(userMsg = '', history = []) {
  const lower = (userMsg || '').toLowerCase();
  const executedTools = [];

  // Weather query detection
  if (lower.includes('weather') || lower.includes('rain') || lower.includes('forecast') || lower.includes('temp') || lower.includes('cold') || lower.includes('hot')) {
    const isHourly = lower.includes('hourly') || lower.includes('tonight') || lower.includes('today');
    const is7Day = lower.includes('week') || lower.includes('7 day') || lower.includes('weekend');
    const weatherData = await getHamiltonWeather({
      forecast_type: isHourly ? 'hourly' : (is7Day ? '7day' : 'all'),
      units: lower.includes('fahrenheit') || lower.includes('°f') ? 'fahrenheit' : 'celsius'
    });

    executedTools.push({ tool: 'get_hamilton_weather', result: weatherData });

    let response = `🌤️ **Hamilton Weather Update (Bay 200 Anchor)**\n\n`;
    if (weatherData.current) {
      response += `• **Current Condition**: ${weatherData.current.condition}\n`;
      response += `• **Temperature**: **${weatherData.current.temp}** (Feels like ${weatherData.current.feelsLike || weatherData.current.temp})\n`;
      response += `• **Precipitation Probability**: ${weatherData.current.rainChance}\n`;
      response += `• **Wind**: ${weatherData.current.wind || 'Gentle'}\n`;
      response += `• **UV Index**: ${weatherData.current.uvIndex}\n\n`;
    }

    if (weatherData.sevenDayOutlook && weatherData.sevenDayOutlook.length > 0) {
      response += `**Upcoming Days:**\n`;
      weatherData.sevenDayOutlook.slice(0, 3).forEach(d => {
        response += `• **${d.day || d.date}**: ${d.condition} | High ${d.high} / Low ${d.low} (Rain: ${d.rainChance})\n`;
      });
    }

    return {
      reply: response,
      toolCalls: executedTools,
      deployment: 'ezchat (local mode)',
      mode: 'local_assistant'
    };
  }

  // Transit query detection
  if (lower.includes('bus') || lower.includes('transit') || lower.includes('hsr') || lower.includes('go train') || lower.includes('mcmaster') || lower.includes('mohawk') || lower.includes('limeridge') || lower.includes('depart') || lower.includes('commute')) {
    let destination = '';
    if (lower.includes('mcmaster')) destination = 'mcmaster';
    else if (lower.includes('mohawk')) destination = 'mohawk';
    else if (lower.includes('lime ridge') || lower.includes('limeridge')) destination = 'limeridge';
    else if (lower.includes('airport')) destination = 'airport';
    else if (lower.includes('go') || lower.includes('toronto')) destination = 'hamiltongo';
    else if (lower.includes('hospital') || lower.includes('st joe') || lower.includes('st. joe')) destination = 'stjosephs';

    const transitData = await getHSRTransitInfo({ destination });
    executedTools.push({ tool: 'get_hsr_transit', result: transitData });

    let response = `🚌 **HSR Transit from 200 Bay St S (Bay 200)**\n\n`;
    if (destination && transitData.destination) {
      response += `📍 **Destination: ${transitData.destination}**\n`;
      response += `• **Recommended Routes**: ${transitData.recommendedRoutes.join(', ')}\n`;
      response += `• **Boarding Stop**: ${transitData.boardingStop}\n`;
      response += `• **Travel Time**: ~${transitData.estimatedDuration}\n`;
      response += `• **Pro Tip**: ${transitData.localTips}\n\n`;
    } else {
      response += `**Closest Live Departures:**\n`;
      (transitData.nearbyDepartures || []).slice(0, 3).forEach(stop => {
        response += `\n🚏 **${stop.stop}** (*${stop.walkFrom200Bay}*)\n`;
        stop.nextBuses.slice(0, 2).forEach(b => {
          response += `  • **Route ${b.route}** (${b.destination}) - in **${b.inMinutes} mins** (${b.departureTime})\n`;
        });
      });
      response += `\n*Presto Fare: $2.70 (Free 2-hr transfers & free GO co-fare)*\n`;
    }

    return {
      reply: response,
      toolCalls: executedTools,
      deployment: 'ezchat (local mode)',
      mode: 'local_assistant'
    };
  }

  // Conversational response
  return {
    reply: `Hey! I'm **EZ**, your personal assistant and chat buddy. I'm anchored at 200 Bay St S in Hamilton.\n\nI can check live **Hamilton weather**, look up **HSR bus departures/routes**, help you find what to watch, or just chat without the corporate guardrails.\n\nWhat's on your mind?`,
    toolCalls: [],
    deployment: 'ezchat (local mode)',
    mode: 'local_assistant'
  };
}

/**
 * Get current agent configuration status
 */
export function getAgentStatus() {
  return {
    deployment: AZURE_OPENAI_DEPLOYMENT,
    hasEndpoint: !!AZURE_OPENAI_ENDPOINT,
    hasKey: !!AZURE_OPENAI_KEY,
    apiVersion: AZURE_OPENAI_API_VERSION,
    originAnchor: HOME_BASE,
    tools: ['get_hamilton_weather', 'get_hsr_transit']
  };
}
