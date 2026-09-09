import fs from "node:fs/promises";
const key=process.env.TMDB_API_KEY;
if(!key) throw new Error("TMDB_API_KEY secret is required");
const base="https://api.themoviedb.org/3";
const headers={Authorization:`Bearer ${key}`,accept:"application/json"};
async function api(path,params={}){const u=new URL(base+path);for(const[k,v]of Object.entries(params))u.searchParams.set(k,v);const r=await fetch(u,{headers});if(!r.ok)throw new Error(`${r.status} ${u}`);return r.json()}
async function pages(path,params={}){let out=[];for(let p=1;p<=25;p++){const j=await api(path,{...params,page:p});out.push(...(j.results||[]));if(p>=Number(j.total_pages||1))break}return out}
const [movies,tv]=await Promise.all([pages("/discover/movie",{sort_by:"popularity.desc",include_adult:"false",language:"ar-SA"}),pages("/discover/tv",{sort_by:"popularity.desc",include_adult:"false",language:"ar-SA"})]);
const uniq=a=>[...new Map(a.map(x=>[x.id,x])).values()];
const clean=x=>({id:x.id,title:x.title,name:x.name,overview:x.overview,poster_path:x.poster_path,backdrop_path:x.backdrop_path,release_date:x.release_date,first_air_date:x.first_air_date,vote_average:x.vote_average,vote_count:x.vote_count,genre_ids:x.genre_ids,original_language:x.original_language,popularity:x.popularity,adult:x.adult});
const payload={generated_at:new Date().toISOString(),movies:uniq(movies).map(clean),tv:uniq(tv).map(clean)};
await fs.mkdir("data",{recursive:true});await fs.writeFile("data/catalog.json",JSON.stringify(payload,null,2));
console.log(`Synced ${payload.movies.length} movies and ${payload.tv.length} TV shows`);
