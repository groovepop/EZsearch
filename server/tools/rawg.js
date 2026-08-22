// RAWG Video Games Database API Tool - Search games for ratings, platforms, genres, and release info
// Endpoint: https://api.rawg.io/api/games?key={RAWG_API_KEY}&search={game_name}
// Auth: API key query parameter

export async function search_rawg({ game_name } = {}) {
  const apiKey = process.env.RAWG_API_KEY || '26e43c8dc6e04b60951e69bf396d00ef';

  if (!game_name || !game_name.trim()) {
    return {
      source: 'rawg',
      found: false,
      summary: 'Missing required parameter: game_name.',
      raw: null
    };
  }

  try {
    const url = `https://api.rawg.io/api/games?key=${apiKey}&search=${encodeURIComponent(game_name.trim())}&page_size=5`;

    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000)
    });

    if (!res.ok) {
      return {
        source: 'rawg',
        found: false,
        summary: `RAWG HTTP error: ${res.status} ${res.statusText}`,
        raw: null
      };
    }

    const data = await res.json();
    const results = data.results || [];

    if (results.length === 0) {
      return {
        source: 'rawg',
        found: false,
        summary: `No video games found on RAWG for "${game_name}".`,
        raw: data
      };
    }

    const top = results[0];
    const platforms = (top.platforms || []).map(p => p.platform?.name).filter(Boolean).join(', ');
    const genres = (top.genres || []).map(g => g.name).filter(Boolean).join(', ');

    let summary = `🎮 ${top.name} (${(top.released || 'N/A').substring(0, 4)})
• Rating: RAWG ${top.rating ? `${top.rating}/5` : 'N/A'} (${top.ratings_count || 0} ratings) | Metacritic: ${top.metacritic || 'N/A'}
• Platforms: ${platforms || 'N/A'}
• Genres: ${genres || 'N/A'}${top.esrb_rating?.name ? ` | ESRB: ${top.esrb_rating.name}` : ''}`;

    if (results.length > 1) {
      const otherMatches = results.slice(1, 4).map(g => `${g.name} (${(g.released || '').substring(0, 4) || 'N/A'})`).join(', ');
      summary += `\n• Other titles: ${otherMatches}`;
    }

    return {
      source: 'rawg',
      found: true,
      summary,
      raw: data
    };
  } catch (err) {
    return {
      source: 'rawg',
      found: false,
      summary: `Failed to query RAWG: ${err.message}`,
      raw: null
    };
  }
}
