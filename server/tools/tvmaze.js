// TVMaze API Tool - Search TV schedules, episode lists, status, and cast
// Endpoint: https://api.tvmaze.com/singlesearch/shows?q={show_name}&embed=cast
// Auth: None required

export async function search_tvmaze({ show_name } = {}) {
  if (!show_name || !show_name.trim()) {
    return {
      source: 'tvmaze',
      found: false,
      summary: 'Missing required parameter: show_name.',
      raw: null
    };
  }

  try {
    const url = `https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(show_name.trim())}&embed=cast`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000)
    });

    if (res.status === 404) {
      return {
        source: 'tvmaze',
        found: false,
        summary: `No TV show found on TVMaze matching "${show_name}".`,
        raw: null
      };
    }

    if (!res.ok) {
      return {
        source: 'tvmaze',
        found: false,
        summary: `TVMaze HTTP error: ${res.status} ${res.statusText}`,
        raw: null
      };
    }

    const data = await res.json();
    const network = data.network?.name || data.webChannel?.name || 'Unknown Network';
    const scheduleDays = (data.schedule?.days || []).join(', ');
    const scheduleTime = data.schedule?.time ? ` at ${data.schedule.time}` : '';
    const cleanSummary = (data.summary || '').replace(/<[^>]+>/g, '').trim();

    const castList = (data._embedded?.cast || [])
      .slice(0, 5)
      .map(c => `${c.person?.name} (${c.character?.name})`)
      .join(', ');

    const summary = `📺 ${data.name} [${data.status || 'Unknown'}]
• Network/Streamer: ${network} | Premiered: ${data.premiered || 'N/A'}${data.ended ? ` - Ended: ${data.ended}` : ''}
• Schedule: ${scheduleDays ? `${scheduleDays}${scheduleTime}` : 'N/A'} | Runtime: ${data.runtime || data.averageRuntime || 'N/A'}m
• Genres: ${(data.genres || []).join(', ') || 'N/A'} | Rating: ${data.rating?.average ? `${data.rating.average}/10` : 'N/A'}
• Main Cast: ${castList || 'N/A'}
• Synopsis: ${cleanSummary || 'No synopsis available.'}`;

    return {
      source: 'tvmaze',
      found: true,
      summary,
      raw: data
    };
  } catch (err) {
    return {
      source: 'tvmaze',
      found: false,
      summary: `Failed to query TVMaze: ${err.message}`,
      raw: null
    };
  }
}
