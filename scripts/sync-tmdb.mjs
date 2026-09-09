import fs from "node:fs/promises";
const key=process.env.TMDB_API_KEY;
if(!key) throw new Error("TMDB_API_KEY secret is required");
const base="https://api.themoviedb.org/3";
async function pages(path){let out=[];for(let p=1;p<=25;p++){const u=new URL(base+path);u.searchParams.set("api_key",key);u.searchParams.set("language","ar-SA");u.searchParams.set("page",p);const r=await fetch(u);if(!r.ok)throw new Error(`${r.status} ${u}`);const j=await r.json();out.push(...(j.results||[]));if(p>=j.total_pages)break}return out}
const [movies,tv]=await Promise.all([
 pages("/discover/movie?sort_by=popularity.desc&include_adult=false"),
 pages("/discover/tv?sort_by=popularity.desc&include_adult=false")
]);
const uniq=a=>[...new Map(a.map(x=>[x.id,x])).values()];
const payload={generated_at:new Date().toISOString(),movies:uniq(movies),tv:uniq(tv)};
await fs.mkdir("data",{recursive:true});await fs.writeFile("data/catalog.json",JSON.stringify(payload,null,2));
console.log(`Synced ${payload.movies.length} movies and ${payload.tv.length} TV shows`);
