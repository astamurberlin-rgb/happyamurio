/* Офлайн-копия веб-версий Day и Sport. Область worker ограничена папкой выпуска.
   В копию попадают только страница, файлы её оформления и код приложения. */
'use strict';
const scope=new URL(self.registration.scope);
const index=new URL('index.html',scope);
const prefix='happy-shell:'+scope.pathname+':';
const name=prefix+(new URL(self.location.href).searchParams.get('v')||'1');

function staticUrl(ref,base){
 try{
  const url=new URL(ref,base);
  if(url.origin===scope.origin&&url.pathname.startsWith(scope.pathname)&&
    /\.(?:js|css|webmanifest|svg|png|jpg|jpeg|webp|woff2?)$/i.test(url.pathname)&&
    [...url.searchParams.keys()].every(key=>key==='v'))return url.href;
 }catch{}
 return null;
}
async function install(){
 const cache=await caches.open(name);
 const page=await fetch(index,{cache:'reload'});
 if(!page.ok)throw Error('Страница недоступна');
 const source=await page.clone().text(),urls=new Set();
 // Пропускаем тело каждого скрипта: внутри встречаются фрагменты HTML из интерфейса.
 for(const tag of source.matchAll(/<script\b([^>]*)>[\s\S]*?<\/script>|<link\b([^>]*)>/gi)){
  const ref=(tag[1]||tag[2]||'').match(/\b(?:src|href)="([^"]+)"/i);
  const url=ref&&staticUrl(ref[1],index);if(url)urls.add(url);
 }
 await cache.addAll([...urls].map(url=>new Request(url,{cache:'reload'})));
 const nested=new Set();
 for(const url of urls){
  if(!new URL(url).pathname.endsWith('.css'))continue;
  const css=await (await cache.match(url)).text();
  for(const match of css.matchAll(/url\(\s*["']?([^"')\s]+)["']?\s*\)/g)){
   const asset=staticUrl(match[1],url);if(asset)nested.add(asset);
  }
 }
 await cache.addAll([...nested].map(url=>new Request(url,{cache:'reload'})));
 await cache.put(index,page);
 await self.skipWaiting();
}
self.addEventListener('install',event=>event.waitUntil(install()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const previous of await caches.keys())if(previous.startsWith(prefix)&&previous!==name)await caches.delete(previous);
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==scope.origin||url.pathname.endsWith('/sw.js'))return;
 const navigate=request.mode==='navigate';
 // Включая адреса возврата Google: запрос с параметрами не сохраняется и не подменяется.
 if(navigate?(url.search||(url.pathname!==index.pathname&&url.pathname!==scope.pathname)):!staticUrl(url.href,scope))return;
 event.respondWith((async()=>{
  try{return await fetch(request)}
  catch(error){
   const cached=await (await caches.open(name)).match(navigate?index:request);
   if(cached)return cached;
   throw error;
  }
 })());
});
