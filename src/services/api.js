// API Client Service for EZTV & YTS

export async function fetchEZTVTorrents({ page = 1, limit = 30, imdb_id = '' }) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString()
  });
  if (imdb_id) params.append('imdb_id', imdb_id);

  const res = await fetch(`/api/eztv/torrents?${params.toString()}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch TV torrents from EZTV');
  }
  return res.json();
}

export async function fetchYTSMovies({ page = 1, limit = 30, query_term = '', quality = '', genre = '', sort_by = 'date_added', order_by = 'desc' }) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    sort_by,
    order_by
  });
  if (query_term) params.append('query_term', query_term);
  if (quality) params.append('quality', quality);
  if (genre) params.append('genre', genre);

  const res = await fetch(`/api/yts/movies?${params.toString()}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch movies from YTS');
  }
  return res.json();
}

export async function searchTVShows(query) {
  if (!query || query.trim().length < 2) return [];
  const res = await fetch(`/api/search/shows?q=${encodeURIComponent(query)}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.shows || [];
}
