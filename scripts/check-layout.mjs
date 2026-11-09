import {readFile,stat as statFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
const read=p=>readFile(new URL(p,root),'utf8');
const apps=JSON.parse(await read('shared/apps.json'));
const expectedKeys={day:'hd_db_v1',meal:'hdm_db_v1',sport:'happy-sport-prototype-v1'};
let scripts=0;
for(const name of ['selfcare-core.js','selfcare-ui.js','energy-widget.js'])new vm.Script(await read(apps.day.entry.replace('index.html',name)),{filename:apps.day.entry.replace('index.html',name)});
for(const [app,config] of Object.entries(apps)){
 const html=await read(config.entry);
 const storageSource=config.storageScript ? await read(config.storageScript) : html;
 assert.ok(storageSource.includes(expectedKeys[app]||config.storageKey),`${app}: storage key changed`);
 assert.ok(html.includes(`data-app-version="${config.version}"`),`${app}: version mismatch`);
 for(const m of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)){
  if (/type=["']application\/json["']/.test(m[0].split('>')[0])) JSON.parse(m[1]);
  else {new vm.Script(m[1],{filename:config.entry});scripts++;}
 }
 if(app==='sport'||config.kind==='studio')continue;
 const manifest=JSON.parse(await read(config.entry.replace('index.html','manifest.webmanifest')));
 const base=new URL(config.entry,'https://astamurberlin-rgb.github.io/happyamurio/');
 for(const k of ['id','start_url','scope'])assert.equal(new URL(manifest[k],base).pathname,new URL('./',base).pathname);
 // Check the actual storage adapter with pre-existing records, without booting the app.
 const adapterStart=html.indexOf('var mem={};');
 const adapterEnd=html.indexOf('\n',html.indexOf('function rawSet(k,v)',adapterStart));
 assert.ok(adapterStart>=0&&adapterEnd>adapterStart,`${app}: storage adapter missing`);
 const adapter=html.slice(adapterStart,adapterEnd);
 const existing=JSON.stringify({preserved:'existing diary',days:{'2026-10-26':{value:7}}});
 const context=vm.createContext({window:{},localStorage:{getItem:k=>k===expectedKeys[app]?existing:null}});
 // Day 56+: the journal adapter reads through the IndexedDB facade; without indexedDB it is plain localStorage.
 const facade=config.entry.replace('index.html','day-local-store.js');
 if(app==='day'&&await read(facade).then(()=>true,()=>false))vm.runInContext(await read(facade),context);
 vm.runInContext(await read((config.sharedDirectory||'shared')+'/profile-storage.js'),context);
 vm.runInContext(`var HappyProfile=HappyProfiles.create(${JSON.stringify(app)})`,context);
 vm.runInContext(adapter,context);
 assert.equal(await context.rawGet(expectedKeys[app]),existing,`${app}: existing diary unreadable`);
}
for(const [old,app] of [['happyday-v50_1.html','day'],['happyday-meal-v22.html','meal'],['prototypes/happy-icon-studio.html','icon-studio']]){
 const html=await read(old);const code=/<script>([\s\S]*?)<\/script>/.exec(html)[1];
 let target;
 vm.runInNewContext(code,{location:{search:'?test=1',hash:'#settings',replace:url=>target=url}});
 assert.equal(target,`${app==='icon-studio'?'..':'.'}/${app}/?test=1#settings`);
}
const dayPage=await read(apps.day.entry);
if(apps.day.links?.meal===false){
 assert.ok(dayPage.includes('Переход в Meal в этой версии недоступен.'));
 assert.ok(!dayPage.includes('href="../meal/"'));
}else{
 // Update 53: the linked-app buttons point at the release directories named in apps.json (meal-23/, sport-38/).
 // Update 55: static hrefs are fallbacks naming existing release directories; shared/happy-links.js resolves the live address.
 for(const app of ['meal','sport']){const m=dayPage.match(new RegExp(`href="\\.\\./([a-z0-9-]+)/" data-happy-app="${app}" target="_blank"`));assert.ok(m,'day: '+app+' link carries data-happy-app');assert.ok((await statFile(new URL(m[1]+'/index.html',root))).isFile(),'day: '+app+' fallback link names an existing release');}
 assert.ok(dayPage.includes('happy-links.js'),'day: happy-links module referenced');
 assert.ok(!dayPage.includes('chatgpt.site'),'day: no Sites test addresses');
}
assert.ok((await read('meal/index.html')).includes('href="../day/"'));
{// Update 24: Meal's linked-app buttons point at the current Day and Sport release directories.
 // Update 55 / 26.1: with shared/happy-links.js the static href is a fallback that must name an existing release directory;
 // the live address comes from apps.json at run time, so a Day release no longer needs a Meal point release (and vice versa).
 const mealPage=await read(apps.meal.entry);
 for(const app of ['day','sport']){const m=mealPage.match(new RegExp(`href="\\.\\./([a-z0-9-]+)/" data-happy-app="${app}" target="_blank"`));assert.ok(m,'meal: '+app+' link carries data-happy-app');assert.ok((await statFile(new URL(m[1]+'/index.html',root))).isFile(),'meal: '+app+' fallback link names an existing release');}
 assert.ok(mealPage.includes('happy-links.js'),'meal: happy-links module referenced');}
{// Update 38.4: Sport's linked-app buttons point at the current Day and Meal release directories and open a new window.
 // Update 38.5: static hrefs are the build-time fallback (must name existing release directories); the live address comes from apps.json via shared/happy-links.js.
 const sportPage=await read(apps.sport.entry);
 for(const app of ['day','meal']){const m=sportPage.match(new RegExp(`href="/happyamurio/([a-z0-9-]+)/" data-happy-app="${app}" target="_blank"`));assert.ok(m,'sport: '+app+' link carries data-happy-app');assert.ok((await statFile(new URL(m[1]+'/index.html',root))).isFile(),'sport: '+app+' fallback link names an existing release');}
 assert.ok(sportPage.includes('HappyLinks'),'sport: happy-links module embedded');}
assert.ok((await read(apps.meal.previous.entry)).includes(`data-app-version="${apps.meal.previous.version}"`));
assert.notEqual(apps.meal.entry,apps.meal.previous.entry);
const previousDay=await read(apps.day.previous.entry);
assert.ok(previousDay.includes(`data-app-version="${apps.day.previous.version}"`));
assert.notEqual(apps.day.entry,apps.day.previous.entry);
console.log(`Passed: ${scripts} scripts parse; permanent app paths, versions, install URLs, existing Day/Meal storage reads and legacy redirects.`);
