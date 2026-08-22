// Wikipedia REST API Tool - General-purpose fallback summary for any topic, person, or entity
// Endpoint: https://en.wikipedia.org/api/rest_v1/page/summary/{topic}
// Auth: None required

export async function search_wikipedia({ topic } = {}) {
  if (!topic || !topic.trim()) {
    return {
      source: 'wikipedia',
      found: false,
      summary: 'Missing required parameter: topic.',
      raw: null
    };
  }

  try {
    // Normalize spaces to underscores for Wikipedia REST endpoints
    const formattedTopic = topic.trim().replace(/\s+/g, '_');
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(formattedTopic)}`;

    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'EZsearch-PopCultureAgent/1.0 (https://github.com/groovepop/EZsearch; contact@groovepop.com)'
      },
      signal: AbortSignal.timeout(8000)
    });

    if (res.status === 404) {
      return {
        source: 'wikipedia',
        found: false,
        summary: `No Wikipedia summary found for "${topic}".`,
        raw: null
      };
    }

    if (!res.ok) {
      return {
        source: 'wikipedia',
        found: false,
        summary: `Wikipedia HTTP error: ${res.status} ${res.statusText}`,
        raw: null
      };
    }

    const data = await res.json();
    if (data.type === 'disambiguation') {
      return {
        source: 'wikipedia',
        found: true,
        summary: `📖 ${data.title} (Disambiguation Page)\n• ${data.extract || 'Multiple topics match this name.'}\n• More info: ${data.content_urls?.desktop?.page || ''}`,
        raw: data
      };
    }

    const summary = `📖 ${data.title}${data.description ? ` — *${data.description}*` : ''}
• ${data.extract || 'No extract text available.'}
• Read more: ${data.content_urls?.desktop?.page || ''}`;

    return {
      source: 'wikipedia',
      found: true,
      summary,
      raw: data
    };
  } catch (err) {
    return {
      source: 'wikipedia',
      found: false,
      summary: `Failed to query Wikipedia: ${err.message}`,
      raw: null
    };
  }
}
