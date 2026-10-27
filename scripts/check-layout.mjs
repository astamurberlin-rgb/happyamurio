import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
const read=p=>readFile(new URL(p,root),'utf8');
const apps=JSON.parse(await read('shared/apps.json'));
const expectedKeys={day:'hd_db_v1',meal:'hdm_db_v1',sport:'happy-sport-prototype-v1'};
let scripts=0;
for(const [app,config] of Object.entries(apps)){
 const html=await read(config.entry);
 assert.ok(html.includes(expectedKeys[app]),`${app}: storage key changed`);
 assert.ok(html.includes(`data-app-version="${config.version}"`),`${app}: version mismatch`);
 for(const m of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)){
  if (/type=["']application\/json["']/.test(m[0].split('>')[0])) JSON.parse(m[1]);
  else {new vm.Script(m[1],{filename:config.entry});scripts++;}
 }
 if(app==='sport')continue;
 const manifest=JSON.parse(await read(`${app}/manifest.webmanifest`));
 const base=new URL(config.entry,'https://astamurberlin-rgb.github.io/happyamurio/');
 for(const k of ['id','start_url','scope'])assert.equal(new URL(manifest[k],base).pathname,`/happyamurio/${app}/`);
 // Check the actual storage adapter with pre-existing records, without booting the app.
 const adapter=html.slice(html.indexOf('var mem={};'),html.indexOf('async function rawSet'));
 const existing=JSON.stringify({preserved:'existing diary',days:{'2026-10-26':{value:7}}});
 const context=vm.createContext({window:{},localStorage:{getItem:k=>k===expectedKeys[app]?existing:null}});
 vm.runInContext(adapter,context);
 assert.equal(await context.rawGet(expectedKeys[app]),existing,`${app}: existing diary unreadable`);
}
for(const [old,app] of [['happyday-v50_1.html','day'],['happyday-meal-v22.html','meal']]){
 const html=await read(old);const code=/<script>([\s\S]*?)<\/script>/.exec(html)[1];
 let target;
 vm.runInNewContext(code,{location:{search:'?test=1',hash:'#settings',replace:url=>target=url}});
 assert.equal(target,`./${app}/?test=1#settings`);
}
assert.ok((await read('day/index.html')).includes('href="../meal/"'));
assert.ok((await read('meal/index.html')).includes('href="../day/"'));
console.log(`Passed: ${scripts} scripts parse; permanent app paths, versions, install URLs, existing Day/Meal storage reads and legacy redirects.`);
