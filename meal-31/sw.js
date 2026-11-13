/* Happy Meal 31.1 · работа без интернета: копия файлов этого выпуска на устройстве.
   Сначала сеть — в сети всегда свежие файлы, копия только обновляется; нет сети — копия.
   Картинки выпуска (обложки, магазин, иконки) — сначала из копии: внутри выпуска они не меняются, а с новой версией
   копия собирается заново (VERSION). Без этого «Сборники» на мобильной сети каждый раз заново качали все картинки.
   Только файлы внутри meal-31/ этого сайта: облако, каталоги библиотек (их скачивает food-libraries.js),
   shared/apps.json и соседние приложения сюда не попадают и идут мимо. Свои копии — под именем
   happy-meal-31-shell-<версия>; прежние копии этого выпуска удаляются при обновлении, чужие не трогаются. */
'use strict';
const VERSION='31.1',PREFIX='happy-meal-31-shell-',CACHE=PREFIX+VERSION;
const SCOPE=new URL('./',self.location).href,INDEX=new URL('./index.html',SCOPE).href;
const EXTRA=['./','./images/desserts.jpg','./images/supplements.jpg','./meal-img/r7.jpg','./meal-img/cover-tl-2.jpg','./meal-img/cover-bf-1.jpg','./meal-img/cover-sn-1.jpg','./meal-img/cover-dn-1.jpg','./app-icons/happy-meal-20261102-softserve-cool-192.png','./app-icons/happy-meal-20261102-softserve-cool-512.png'];
function local(u){return !/^(?:[a-z]+:|\/\/|\.\.\/|#|')/i.test(u)&&!u.includes("'")}
async function precache(){
 const c=await caches.open(CACHE),r=await fetch(INDEX,{cache:'no-store'});
 if(!r.ok)throw Error('index.html: '+r.status);
 const html=await r.clone().text(),urls=new Set(EXTRA);
 for(const m of html.matchAll(/(?:src|href)="([^"#]+)"/g))if(local(m[1]))urls.add(m[1]);
 for(const m of html.matchAll(/"(\.\/(?:meal-img|images|app-icons)\/[^"']+)"/g))urls.add(m[1]);
 await c.put(INDEX,r);
 await Promise.all([...urls].map(u=>fetch(new URL(u,SCOPE).href,{cache:'no-store'}).then(x=>{if(x.ok)return c.put(new URL(u,SCOPE).href,x)}).catch(()=>{})));
}
self.addEventListener('install',e=>{e.waitUntil(precache().then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{
 for(const k of await caches.keys())if(k.startsWith(PREFIX)&&k!==CACHE)await caches.delete(k);
 await self.clients.claim();
})())});
self.addEventListener('fetch',e=>{
 const req=e.request;if(req.method!=='GET')return;
 const url=new URL(req.url);if(url.origin!==self.location.origin||!url.href.startsWith(SCOPE)||url.pathname.endsWith('/sw.js'))return;
 const picture=/\.(?:jpe?g|png|webp|gif|svg)$/i.test(url.pathname);
 e.respondWith((async()=>{
  if(picture){const hit=await caches.open(CACHE).then(c=>c.match(req)).catch(()=>null);if(hit)return hit}
  try{
   const r=await fetch(req);
   if(r&&r.ok&&r.type==='basic'){const copy=r.clone();caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{})}
   return r;
  }catch(err){
   const c=await caches.open(CACHE);
   const hit=await c.match(req)||(req.mode==='navigate'?await c.match(INDEX)||await c.match(req,{ignoreSearch:true}):null);
   if(hit)return hit;
   throw err;
  }
 })());
});
