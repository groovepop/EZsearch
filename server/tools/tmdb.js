// TMDb API Tool - Search movies, TV shows, and people with rich metadata and popularity
// Endpoint: https://api.themoviedb.org/3/search/multi?query={query}
// Auth: Authorization: Bearer {TMDB_API_READ_ACCESS_TOKEN} header

export async function search_tmdb({ query } = {}) {
  const readToken = process.env.TMDB_API_READ_ACCESS_TOKEN;
  const apiKey = process.env.TMDB_API_KEY || '4e79d90809bd20865c4046709453bcfc';

  if (!query || !query.trim()) {
    return {
      source: 'tmdb',
      found: false,
      summary: 'Missing required parameter: query.',
      raw: null
    };
  }

  try {
    const url = `https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(query.trim())}&include_adult=false&language=en-US&page=1`;
    
    const headers = {
      'Accept': 'application/json'
    };

    if (readToken) {
      headers['Authorization'] = `Bearer ${readToken}`;
    } else {
      // Fallback to query param api_key if bearer token not supplied
      url += `&api_key=${apiKey}`;
    }

    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(8000)
    });

    if (!res.ok) {
      return {
        source: 'tmdb',
        found: false,
        summary: `TMDb HTTP error: ${res.status} ${res.statusText}`,
        raw: null
      };
    }

    const data = await res.json();
    const results = data.results || [];

    if (results.length === 0) {
      return {
        source: 'tmdb',
        found: false,
        summary: `No results found on TMDb for "${query}".`,
        raw: data
      };
    }

    const top = results[0];
    const mediaType = top.media_type || 'unknown';
    let summary = '';

    if (mediaType === 'movie') {
      summary = `🍿 [Movie] ${top.title || top.original_title} (${(top.release_date || 'N/A').substring(0, 4)})
• TMDB Score: ${top.vote_average ? top.vote_average.toFixed(1) : 'N/A'}/10 (${top.vote_count || 0} votes) | Popularity: ${Math.round(top.popularity || 0)}
• Overview: ${top.overview || 'No overview available.'}`;
    } else if (mediaType === 'tv') {
      summary = `📺 [TV Series] ${top.name || top.original_name} (${(top.first_air_date || 'N/A').substring(0, 4)})
• TMDB Score: ${top.vote_average ? top.vote_average.toFixed(1) : 'N/A'}/10 (${top.vote_count || 0} votes) | Popularity: ${Math.round(top.popularity || 0)}
• Overview: ${top.overview || 'No overview available.'}`;
    } else if (mediaType === 'person') {
      const knownFor = (top.known_for || [])
        .map(k => `${k.title || k.name || 'Unknown'} (${(k.release_date || k.first_air_date || '').substring(0, 4) || 'N/A'})`)
        .join(', ');
      summary = `👤 [Person] ${top.name} (Known for: ${top.known_for_department || 'Acting'})
• Popularity: ${Math.round(top.popularity || 0)}
• Notable Works: ${knownFor || 'N/A'}`;
    } else {
      summary = `🎬 ${top.title || top.name} (${mediaType}) - Popularity: ${Math.round(top.popularity || 0)}`;
    }

    if (results.length > 1) {
      const otherMatches = results.slice(1, 4).map(r => `${r.title || r.name} [${r.media_type}]`).join(', ');
      summary += `\n• Other matches: ${otherMatches}`;
    }

    return {
      source: 'tmdb',
      found: true,
      summary,
      raw: data
    };
  } catch (err) {
    return {
      source: 'tmdb',
      found: false,
      summary: `Failed to query TMDb: ${err.message}`,
      raw: null
    };
  }
}
