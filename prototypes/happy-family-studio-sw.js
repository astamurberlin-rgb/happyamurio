const CACHE='happy-family-studio-v11-20261025';
const PAGE='./happy-family-color-studio-v11.html';
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll([PAGE,'./happy-family-studio.webmanifest'])).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('happy-family-studio-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
 const url=new URL(e.request.url);
 if(e.request.method!=='GET'||e.request.mode!=='navigate'||url.pathname!=='/happyamurio/prototypes/happy-family-color-studio-v11.html')return;
 e.respondWith(fetch(e.request).then(async r=>{if(r.ok){const c=await caches.open(CACHE);c.put(PAGE,r.clone())}return r}).catch(()=>caches.match(PAGE)));
});
