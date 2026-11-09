import {readFile} from 'node:fs/promises';
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
 const mealLink=apps.day.links?.meal||'meal/',sportLink=apps.day.links?.sport||'sport/';
 assert.ok(dayPage.includes(`href="../${mealLink}"`),'day: Meal link matches apps.json');
 if(!/^https?:/.test(sportLink))assert.ok(dayPage.includes(`href="../${sportLink}"`),'day: Sport link matches apps.json');
 assert.ok(!dayPage.includes('chatgpt.site'),'day: no Sites test addresses');
}
assert.ok((await read('meal/index.html')).includes('href="../day/"'));
{// Update 24: Meal's linked-app buttons point at the current Day and Sport release directories.
 const mealPage=await read(apps.meal.entry),dayDir=apps.day.entry.split('/')[0],sportDir=apps.sport.entry.split('/')[0];
 assert.ok(mealPage.includes(`href="../${dayDir}/"`),'meal: Day link matches apps.json');
 assert.ok(mealPage.includes(`href="../${sportDir}/"`),'meal: Sport link matches apps.json');}
assert.ok((await read(apps.meal.previous.entry)).includes(`data-app-version="${apps.meal.previous.version}"`));
assert.notEqual(apps.meal.entry,apps.meal.previous.entry);
const previousDay=await read(apps.day.previous.entry);
assert.ok(previousDay.includes(`data-app-version="${apps.day.previous.version}"`));
assert.notEqual(apps.day.entry,apps.day.previous.entry);
console.log(`Passed: ${scripts} scripts parse; permanent app paths, versions, install URLs, existing Day/Meal storage reads and legacy redirects.`);
