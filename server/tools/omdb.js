// OMDb API Tool - Search movies and TV shows for ratings, plot, director, cast
// Endpoint: https://www.omdbapi.com/?t={title}&apikey={OMDB_API_KEY}

export async function search_omdb({ title, year = null } = {}) {
  const apiKey = process.env.OMDB_API_KEY || '20ac16bc';
  if (!title || !title.trim()) {
    return {
      source: 'omdb',
      found: false,
      summary: 'Missing required parameter: title.',
      raw: null
    };
  }

  try {
    let cleanTitle = title.trim();
    let yearParam = year ? year.toString().trim() : null;

    // Auto-detect year in title (e.g. "Inception (2010)" or "Inception 2010")
    const yearMatch = cleanTitle.match(/\b(19\d\d|20\d\d)\b/);
    if (!yearParam && yearMatch) {
      yearParam = yearMatch[1];
      cleanTitle = cleanTitle.replace(/\(?\b(19\d\d|20\d\d)\b\)?/, '').trim();
    }

    let url = `https://www.omdbapi.com/?t=${encodeURIComponent(cleanTitle)}&apikey=${apiKey}`;
    if (yearParam) {
      url += `&y=${encodeURIComponent(yearParam)}`;
    }

    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000)
    });

    if (!res.ok) {
      return {
        source: 'omdb',
        found: false,
        summary: `OMDb HTTP error: ${res.status} ${res.statusText}`,
        raw: null
      };
    }

    const data = await res.json();
    if (data.Response === 'True') {
      const summary = `🎬 ${data.Title} (${data.Year}) [${data.Type || 'Movie/TV'}]
• Rating: IMDb ${data.imdbRating || 'N/A'}/10 (${data.imdbVotes || '0'} votes) | Metascore: ${data.Metascore || 'N/A'}
• Genre: ${data.Genre || 'N/A'} | Runtime: ${data.Runtime || 'N/A'} | Rated: ${data.Rated || 'N/A'}
• Director: ${data.Director || 'N/A'} | Cast: ${data.Actors || 'N/A'}
• Plot: ${data.Plot || 'No plot available.'}`;

      return {
        source: 'omdb',
        found: true,
        summary,
        raw: data
      };
    }

    return {
      source: 'omdb',
      found: false,
      summary: data.Error || `No title found on OMDb matching "${title}"${year ? ` (${year})` : ''}.`,
      raw: data
    };
  } catch (err) {
    return {
      source: 'omdb',
      found: false,
      summary: `Failed to query OMDb: ${err.message}`,
      raw: null
    };
  }
}
