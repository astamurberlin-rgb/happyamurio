const CACHE='happy-studio-v2-20261026-carousel';
const PAGE='./studio.html';
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll([PAGE,'./happy-family-studio.webmanifest'])).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>(k.startsWith('happy-family-studio-')||k.startsWith('happy-studio-'))&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
 const url=new URL(e.request.url);
 if(e.request.method!=='GET'||e.request.mode!=='navigate'||url.pathname!=='/happyamurio/prototypes/studio.html')return;
 e.respondWith(fetch(e.request).then(async r=>{if(r.ok){const c=await caches.open(CACHE);c.put(PAGE,r.clone())}return r}).catch(()=>caches.match(PAGE)));
});
