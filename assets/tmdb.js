const TMDB={
 async get(path,params={}){const u=new URL("https://api.themoviedb.org/3"+path);for(const[k,v]of Object.entries(params))u.searchParams.set(k,v);const r=await fetch(u);if(!r.ok)throw new Error(`TMDB ${r.status}`);return r.json()},
 movie(id){return this.get(`/movie/${id}`,{language:"ar-SA",append_to_response:"credits,videos,recommendations,similar,watch/providers"})},
 tv(id){return this.get(`/tv/${id}`,{language:"ar-SA",append_to_response:"credits,videos,recommendations,similar,watch/providers"})},
 season(id,n){return this.get(`/tv/${id}/season/${n}`,{language:"ar-SA"})},
 providers(type,id){return this.get(`/${type}/${id}/watch/providers`)}
};
window.TMDB=TMDB;
