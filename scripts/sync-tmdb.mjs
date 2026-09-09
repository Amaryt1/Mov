import fs from "node:fs/promises";

const key = process.env.TMDB_API_KEY?.trim();
if (!key) throw new Error("TMDB_API_KEY secret is required");

const base = "https://api.themoviedb.org/3";

// TMDB API Key (v3) must be sent as api_key. The API Read Access Token uses Bearer auth.
// The GitHub secret configured for this project is TMDB_API_KEY, so use the v3 API key here.
async function api(path, params = {}) {
  const u = new URL(base + path);
  u.searchParams.set("api_key", key);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);

  const r = await fetch(u, { headers: { accept: "application/json" } });
  if (!r.ok) {
    let detail = "";
    try {
      const body = await r.json();
      detail = body?.status_message ? `: ${body.status_message}` : "";
    } catch {}
    throw new Error(`TMDB ${r.status}${detail} (${path})`);
  }
  return r.json();
}

async function pages(path, params = {}) {
  const out = [];
  for (let p = 1; p <= 25; p++) {
    const j = await api(path, { ...params, page: p });
    out.push(...(j.results || []));
    if (p >= Number(j.total_pages || 1)) break;
  }
  return out;
}

const [movies, tv] = await Promise.all([
  pages("/discover/movie", {
    sort_by: "popularity.desc",
    include_adult: "false",
    language: "ar-SA",
  }),
  pages("/discover/tv", {
    sort_by: "popularity.desc",
    include_adult: "false",
    language: "ar-SA",
  }),
]);

const uniq = (a) => [...new Map(a.map((x) => [x.id, x])).values()];
const clean = (x) => ({
  id: x.id,
  title: x.title,
  name: x.name,
  overview: x.overview,
  poster_path: x.poster_path,
  backdrop_path: x.backdrop_path,
  release_date: x.release_date,
  first_air_date: x.first_air_date,
  vote_average: x.vote_average,
  vote_count: x.vote_count,
  genre_ids: x.genre_ids,
  original_language: x.original_language,
  popularity: x.popularity,
  adult: x.adult,
});

const catalog = {
  generated_at: new Date().toISOString(),
  movies: uniq(movies).map(clean),
  tv: uniq(tv).map(clean),
};

await fs.mkdir("data/details", { recursive: true });

async function enrich(type, items) {
  let i = 0;
  const limit = 8;
  const selected = items.slice(0, 100);

  while (i < selected.length) {
    const batch = selected.slice(i, i + limit);
    await Promise.all(
      batch.map(async (x) => {
        const d = await api(`/${type}/${x.id}`, {
          language: "ar-SA",
          append_to_response: "credits,videos,recommendations,similar,watch/providers",
        });
        await fs.writeFile(
          `data/details/${type}-${x.id}.json`,
          JSON.stringify(d, null, 2),
        );
      }),
    );
    i += limit;
    console.log(`Enriched ${type}: ${i}/${selected.length}`);
  }
}

await enrich("movie", catalog.movies);
await enrich("tv", catalog.tv);
await fs.writeFile("data/catalog.json", JSON.stringify(catalog, null, 2));
console.log(
  `Synced ${catalog.movies.length} movies and ${catalog.tv.length} TV shows; enriched top 100 of each.`,
);
