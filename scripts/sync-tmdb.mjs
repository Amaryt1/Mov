import fs from "node:fs/promises";

const key = process.env.TMDB_API_KEY?.trim();
if (!key) throw new Error("TMDB_API_KEY secret is required");

const tmdbBase = "https://api.themoviedb.org/3";
const jikanBase = "https://api.jikan.moe/v4";

async function tmdb(path, params = {}) {
  const u = new URL(tmdbBase + path);
  u.searchParams.set("api_key", key);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const r = await fetch(u, { headers: { accept: "application/json" } });
  if (!r.ok) throw new Error(`TMDB ${r.status} ${path}`);
  return r.json();
}

async function jikan(path, params = {}) {
  const u = new URL(jikanBase + path);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const r = await fetch(u, { headers: { accept: "application/json" } });
  if (!r.ok) throw new Error(`Jikan ${r.status} ${path}`);
  return r.json();
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function tmdbPages(path, params = {}, maxPages = 500) {
  const out = [];
  for (let page = 1; page <= maxPages; page++) {
    const data = await tmdb(path, { ...params, page });
    out.push(...(data.results || []));
    if (page >= Number(data.total_pages || 1)) break;
    if (page % 25 === 0) console.log(`TMDB ${path}: ${page} pages`);
  }
  return out;
}

async function jikanPages(maxPages = 200) {
  const out = [];
  for (let page = 1; page <= maxPages; page++) {
    const data = await jikan("/anime", {
      order_by: "mal_id",
      sort: "asc",
      limit: 25,
      page,
      sfw: "true",
    });
    out.push(...(data.data || []));
    if (!data.pagination?.has_next_page) break;
    if (page % 10 === 0) console.log(`Jikan anime: ${page} pages`);
    await sleep(360);
  }
  return out;
}

const [moviesPopular, moviesOld, tvPopular, tvOld, animeRaw] = await Promise.all([
  tmdbPages("/discover/movie", { sort_by: "popularity.desc", include_adult: "false", language: "ar-SA" }),
  tmdbPages("/discover/movie", { sort_by: "primary_release_date.asc", include_adult: "false", language: "ar-SA" }),
  tmdbPages("/discover/tv", { sort_by: "popularity.desc", include_adult: "false", language: "ar-SA" }),
  tmdbPages("/discover/tv", { sort_by: "first_air_date.asc", include_adult: "false", language: "ar-SA" }),
  jikanPages(),
]);

const uniq = (items, keyFn = (x) => x.id) => [...new Map(items.map((x) => [keyFn(x), x])).values()];

const cleanTmdb = (x) => ({
  id: x.id,
  title: x.title,
  name: x.name,
  overview: x.overview || "",
  poster_path: x.poster_path,
  backdrop_path: x.backdrop_path,
  release_date: x.release_date,
  first_air_date: x.first_air_date,
  vote_average: x.vote_average || 0,
  vote_count: x.vote_count || 0,
  genre_ids: x.genre_ids || [],
  original_language: x.original_language,
  popularity: x.popularity || 0,
  adult: Boolean(x.adult),
});

const cleanAnime = (x) => ({
  id: x.mal_id,
  title: x.title,
  title_english: x.title_english,
  title_japanese: x.title_japanese,
  overview: x.synopsis || "",
  poster_path: x.images?.jpg?.large_image_url || x.images?.jpg?.image_url || null,
  backdrop_path: null,
  release_date: x.aired?.from || "",
  first_air_date: x.aired?.from || "",
  vote_average: x.score || 0,
  vote_count: x.scored_by || 0,
  genres: (x.genres || []).map((g) => g.name),
  type: x.type || "TV",
  episodes: x.episodes || 0,
  status: x.status || "",
  original_language: "ja",
  popularity: x.popularity || 0,
  mal_url: x.url,
});

const catalog = {
  generated_at: new Date().toISOString(),
  source_counts: {},
  movies: uniq([...moviesPopular, ...moviesOld]).map(cleanTmdb),
  tv: uniq([...tvPopular, ...tvOld]).map(cleanTmdb),
  anime: uniq(animeRaw, (x) => x.mal_id).map(cleanAnime),
};

catalog.source_counts = {
  movies: catalog.movies.length,
  tv: catalog.tv.length,
  anime: catalog.anime.length,
  total: catalog.movies.length + catalog.tv.length + catalog.anime.length,
};

await fs.mkdir("data/details", { recursive: true });
await fs.mkdir("data/anime-details", { recursive: true });

async function enrichTmdb(type, items, limit = 150) {
  const selected = items.slice(0, limit);
  for (let i = 0; i < selected.length; i += 8) {
    const batch = selected.slice(i, i + 8);
    await Promise.all(batch.map(async (x) => {
      const d = await tmdb(`/${type}/${x.id}`, {
        language: "ar-SA",
        append_to_response: "credits,videos,recommendations,similar,watch/providers",
      });
      await fs.writeFile(`data/details/${type}-${x.id}.json`, JSON.stringify(d, null, 2));
    }));
    console.log(`Enriched ${type}: ${Math.min(i + 8, selected.length)}/${selected.length}`);
  }
}

async function enrichAnime(items, limit = 100) {
  const selected = items.slice(0, limit);
  for (let i = 0; i < selected.length; i++) {
    const x = selected[i];
    try {
      const d = await jikan(`/anime/${x.id}/full`);
      await fs.writeFile(`data/anime-details/${x.id}.json`, JSON.stringify(d.data || d, null, 2));
    } catch (e) {
      console.log(`Anime detail skipped ${x.id}: ${e.message}`);
    }
    if ((i + 1) % 10 === 0) console.log(`Enriched anime: ${i + 1}/${selected.length}`);
    await sleep(360);
  }
}

await enrichTmdb("movie", catalog.movies);
await enrichTmdb("tv", catalog.tv);
await enrichAnime(catalog.anime);
await fs.writeFile("data/catalog.json", JSON.stringify(catalog));
console.log(`Catalog ready: ${catalog.source_counts.total} unique records (${catalog.movies.length} movies, ${catalog.tv.length} TV, ${catalog.anime.length} anime).`);
