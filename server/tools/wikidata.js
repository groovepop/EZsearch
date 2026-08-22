// Wikidata Query Service Tool - SPARQL endpoint for structured cross-entity trivia queries
// Endpoint: https://query.wikidata.org/sparql?query={sparql_query}&format=json
// Auth: None required (User-Agent header required to avoid throttling)

const PREFIXES = `
PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX bd: <http://www.bigdata.com/rdf#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
`.trim();

export async function query_wikidata({ sparql_query } = {}) {
  if (!sparql_query || !sparql_query.trim()) {
    return {
      source: 'wikidata',
      found: false,
      summary: 'Missing required parameter: sparql_query.',
      raw: null
    };
  }

  try {
    let cleanQuery = sparql_query.trim();
    if (!cleanQuery.includes('PREFIX wd:')) {
      cleanQuery = `${PREFIXES}\n${cleanQuery}`;
    }

    const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(cleanQuery)}&format=json`;

    const res = await fetch(url, {
      headers: {
        'Accept': 'application/sparql-results+json, application/json',
        'User-Agent': 'EZsearchPopCultureBot/1.0 (https://groovepop.com; contact@groovepop.com)'
      },
      signal: AbortSignal.timeout(15000)
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      return {
        source: 'wikidata',
        found: false,
        summary: `Wikidata SPARQL error (HTTP ${res.status}): ${errBody.slice(0, 200)}`,
        raw: null
      };
    }

    const data = await res.json();
    const bindings = data.results?.bindings || [];

    if (bindings.length === 0) {
      return {
        source: 'wikidata',
        found: false,
        summary: 'Wikidata query returned zero results matching the SPARQL criteria.',
        raw: data
      };
    }

    // Convert bindings to clean, human-readable rows
    const vars = data.head?.vars || [];
    const formattedRows = bindings.slice(0, 10).map((row, idx) => {
      const parts = vars.map(v => {
        const val = row[v]?.value || '';
        // Extract clean entity ID if URI
        const cleanVal = val.startsWith('http://www.wikidata.org/entity/') 
          ? val.replace('http://www.wikidata.org/entity/', '') 
          : val;
        return `${v}: ${cleanVal}`;
      });
      return `${idx + 1}. ${parts.join(' | ')}`;
    });

    const summary = `🌐 Wikidata SPARQL Results (${bindings.length} match${bindings.length === 1 ? '' : 'es'} found):
${formattedRows.join('\n')}${bindings.length > 10 ? `\n...and ${bindings.length - 10} more results.` : ''}`;

    return {
      source: 'wikidata',
      found: true,
      summary,
      raw: data
    };
  } catch (err) {
    return {
      source: 'wikidata',
      found: false,
      summary: `Failed to execute Wikidata SPARQL query: ${err.message}`,
      raw: null
    };
  }
}

/**
 * Canned SPARQL query templates for common cross-entity queries
 */
export const SPARQL_TEMPLATES = {
  // Actors who were in both Movie 1 and Movie 2
  CO_STARS: (entityQ1, entityQ2) => `
    SELECT DISTINCT ?actor ?actorLabel WHERE {
      wd:${entityQ1} wdt:P161 ?actor .
      wd:${entityQ2} wdt:P161 ?actor .
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    } LIMIT 10
  `,
  // Academy Award Best Picture winners
  BEST_PICTURE_WINNERS: (limit = 10) => `
    SELECT ?film ?filmLabel WHERE {
      ?film wdt:P166 wd:Q102427 .
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    } LIMIT ${limit}
  `,
  // Films directed by a specific director (e.g. Christopher Nolan: Q25191)
  FILMS_BY_DIRECTOR: (directorQ = 'Q25191', limit = 10) => `
    SELECT ?film ?filmLabel WHERE {
      ?film wdt:P57 wd:${directorQ} .
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    } LIMIT ${limit}
  `
};
