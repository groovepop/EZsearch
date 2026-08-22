// Genius API Tool - Search song/album metadata, artist info, and annotation counts
// Endpoint: https://api.genius.com/search?q={query}
// Auth: Authorization: Bearer {GENIUS_CLIENT_ACCESS_TOKEN} header
// NOTE: METADATA ONLY — NEVER FETCH OR SURFACE FULL SONG LYRICS (COPYRIGHT GUARDRAIL)

export async function search_genius({ query } = {}) {
  const token = process.env.GENIUS_CLIENT_ACCESS_TOKEN || 'w2bUYmOLAxoiLZGv65Q7n0_u2H4gWIwWCPmqmDh3HwKqtxc98kYvg9t5h0rMU24C';

  if (!query || !query.trim()) {
    return {
      source: 'genius',
      found: false,
      summary: 'Missing required parameter: query.',
      raw: null
    };
  }

  try {
    const url = `https://api.genius.com/search?q=${encodeURIComponent(query.trim())}`;

    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      signal: AbortSignal.timeout(8000)
    });

    if (!res.ok) {
      return {
        source: 'genius',
        found: false,
        summary: `Genius HTTP error: ${res.status} ${res.statusText}`,
        raw: null
      };
    }

    const data = await res.json();
    const hits = data.response?.hits || [];

    if (hits.length === 0) {
      return {
        source: 'genius',
        found: false,
        summary: `No music results found on Genius for "${query}".`,
        raw: data
      };
    }

    const topHit = hits[0]?.result;
    if (!topHit) {
      return {
        source: 'genius',
        found: false,
        summary: `No valid match found on Genius for "${query}".`,
        raw: data
      };
    }

    const title = topHit.title || 'Unknown Title';
    const artist = topHit.artist_names || topHit.primary_artist?.name || 'Unknown Artist';
    const releaseDate = topHit.release_date_for_display || 'N/A';
    const annotations = topHit.annotation_count || 0;
    const pageviews = topHit.stats?.pageviews ? topHit.stats.pageviews.toLocaleString() : 'N/A';

    let summary = `🎵 "${title}" by ${artist}
• Release Date: ${releaseDate}
• Genius Annotations: ${annotations} community explanations
• Page Views: ${pageviews}
• Genius URL: ${topHit.url || 'N/A'}`;

    if (hits.length > 1) {
      const otherHits = hits.slice(1, 4).map(h => `"${h.result?.title}" (${h.result?.artist_names})`).join(', ');
      summary += `\n• Other hits: ${otherHits}`;
    }

    return {
      source: 'genius',
      found: true,
      summary,
      raw: {
        id: topHit.id,
        title: topHit.title,
        full_title: topHit.full_title,
        artist: artist,
        release_date_for_display: releaseDate,
        annotation_count: annotations,
        url: topHit.url,
        stats: topHit.stats,
        header_image_url: topHit.header_image_url,
        song_art_image_thumbnail_url: topHit.song_art_image_thumbnail_url
      }
    };
  } catch (err) {
    return {
      source: 'genius',
      found: false,
      summary: `Failed to query Genius: ${err.message}`,
      raw: null
    };
  }
}
