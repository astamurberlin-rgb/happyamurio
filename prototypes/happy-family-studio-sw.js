const CACHE='happy-studio-v12.5-reference-themes';
const ASSETS=['../shared/happy-reference-themes.js?v=3','./reference-themes.css?v=2','./color-workspace.js?v=12.5','./color-workspace.css?v=12.5','./studio.html','./happy-family-color-studio-v12.html','./happy-sport-color-preview-v2.html','./happy-family-studio.webmanifest','../shared/happy-gradients.js?v=1','../shared/happy-gradient-editor.js?v=1','../shared/happy-gradient-editor.css?v=1'];
const allowed=new Set(ASSETS.map(path=>new URL(path,self.location.href).pathname));
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>(key.startsWith('happy-family-studio-')||key.startsWith('happy-studio-'))&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin||!allowed.has(url.pathname))return;
 event.respondWith(fetch(event.request).then(response=>{if(response.ok)event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,response.clone())));return response;}).catch(()=>caches.match(event.request,{ignoreSearch:true})));
});
