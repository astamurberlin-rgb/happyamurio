/* Update 38 · settings structure check in a real browser (headless Chrome via Playwright).
   Serves the repository root locally under /happyamurio/ and opens this release. Skips with a message when
   Playwright or Chrome is not installed; the Node checks in sport/scripts do not depend on it. */
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {statSync} from 'node:fs';
import {extname,join,normalize} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {execSync} from 'node:child_process';
const release=new URL('../',import.meta.url),repo=fileURLToPath(new URL('../../',import.meta.url)),name=fileURLToPath(release).replace(/\/$/,'').split('/').pop();
let chromium;
try{
 let resolved=null;for(const base of [import.meta.url,'file://'+process.cwd()+'/']){try{resolved=createRequire(base).resolve('playwright');break}catch{}}
 if(!resolved){const globalRoot=execSync('npm root -g',{encoding:'utf8'}).trim();resolved=createRequire(import.meta.url).resolve(join(globalRoot,'playwright'));}
 const pw=await import(resolved);chromium=pw.chromium||pw.default?.chromium;if(!chromium)throw Error('chromium export missing');
}catch(e){console.log('Skipped settings layout browser check: Playwright is not available ('+e.message+').');process.exit(0);}
const executablePath=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].find(p=>{try{return statSync(p).isFile()}catch{return false}});
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://x');if(!url.pathname.startsWith('/happyamurio/')){res.writeHead(404);return res.end()}let file=normalize(join(repo,decodeURIComponent(url.pathname.slice('/happyamurio/'.length))));if(!file.startsWith(repo)){res.writeHead(403);return res.end()}let s=await stat(file).catch(()=>null);if(s?.isDirectory()){file=join(file,'index.html');s=await stat(file).catch(()=>null)}if(!s){res.writeHead(404);return res.end()}res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(await readFile(file))}catch(e){res.writeHead(500);res.end(String(e))}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const port=server.address().port;
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(executablePath?{executablePath}:{})});
 const page=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${port}/happyamurio/${name}/`,{waitUntil:'load'});await page.waitForTimeout(1200);
 await page.evaluate(()=>goto('profile'));await page.waitForTimeout(500);
 const read=()=>page.evaluate(()=>{
  const settings=document.querySelector('.happy-settings');
  const sections=[...settings.querySelectorAll(':scope>section')].map(s=>({id:s.dataset.happySection,hidden:s.hidden,labels:[...s.querySelectorAll(':scope>.settings-section')].map(e=>e.textContent.trim())}));
  const last=settings.lastElementChild,footer=document.querySelector('footer.happy-version');
  return {sections,unmapped:document.querySelectorAll('[data-settings-unmapped]').length,footerLast:last.contains(footer)&&last.lastElementChild===footer,outsideSettings:[...document.querySelectorAll('#page>*')].filter(n=>n!==settings).length,
   devButtons:[...document.querySelectorAll('[data-happy-section="developer"] button')].map(b=>b.textContent.trim()),links:[...document.querySelectorAll('[data-happy-section="links"] a')].map(a=>a.getAttribute('href'))};
 });
 let s=await read();
 assert.deepEqual(s.sections.map(x=>x.id),['account','appearance','app','data','links','developer','version'],'section order');
 assert.deepEqual(s.sections.find(x=>x.id==='app').labels,['Библиотека','Таймер','Датчики','Иконки']);
 assert.deepEqual(s.sections.find(x=>x.id==='data').labels,['Мои данные','Резервная копия','Облачная копия']);
 assert.equal(s.sections.find(x=>x.id==='developer').hidden,true,'developer section hidden by default');
 assert.equal(s.unmapped,0,'every settings block is mapped');assert.equal(s.footerLast,true,'version line is the last element');assert.equal(s.outsideSettings,0,'nothing rendered after the settings container');
 // Update 38.4: linked-app buttons follow shared/apps.json (current Day and Meal release directories).
 const happyApps=JSON.parse(await readFile(new URL('../../shared/apps.json',import.meta.url),'utf8')),releaseDir=app=>'/happyamurio/'+happyApps[app].entry.split('/')[0]+'/';
 assert.deepEqual(s.links,[releaseDir('day'),releaseDir('meal')]);
 for(const b of ['Прочитать облачный журнал','Проверить результат без записи','Повторить прежнюю попытку','Выгрузить резерв синхронизации','Выбрать историю','Скрыть раздел'])assert.ok(s.devButtons.includes(b),'developer section holds: '+b);
 // Long press on the version line opens the section; the hide button closes it; a short tap does nothing.
 const footer=await page.$('footer.happy-version');await footer.scrollIntoViewIfNeeded();await page.waitForTimeout(300);
 let b=await footer.boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.waitForTimeout(300);await page.mouse.up();await page.waitForTimeout(200);
 s=await read();assert.equal(s.sections.find(x=>x.id==='developer').hidden,true,'short tap keeps it hidden');
 b=await (await page.$('footer.happy-version')).boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.waitForTimeout(1400);await page.mouse.up();await page.waitForTimeout(400);
 s=await read();assert.equal(s.sections.find(x=>x.id==='developer').hidden,false,'long press opens the developer section');
 await page.click('[data-settings-developer="hide"]');await page.waitForTimeout(300);
 s=await read();assert.equal(s.sections.find(x=>x.id==='developer').hidden,true,'hide button closes it');
 // Diary: the counters section renders with the Update 38 status and no page errors.
 await page.evaluate(()=>goto('diary'));await page.waitForTimeout(400);
 const diary=await page.evaluate(()=>({counters:!!document.getElementById('sport-food-counters'),status:document.querySelector('#sport-food-counters [role="status"]')?.textContent.trim()}));
 assert.equal(diary.counters,true,'counters section in the diary');
 // Update 38.1: every catalog icon is served from the shared library and actually loads.
 const catalog=JSON.parse(await readFile(new URL('../../assets/sport-icons/v1/catalog.json',import.meta.url),'utf8'));
 const icons=await page.evaluate(async urls=>{const out=[];for(const u of urls){const ok=await new Promise(r=>{const i=new Image();i.onload=()=>r(i.naturalWidth===512&&i.naturalHeight===512);i.onerror=()=>r(false);i.src=u});if(!ok)out.push(u)}return {checked:urls.length,failed:out}},catalog.map(i=>`/happyamurio/assets/sport-icons/v1/${i.src}`));
 assert.deepEqual(icons.failed,[],'library icons load');
 // Update 38.2: the exercise library is embedded; a cable exercise offers a handle, the choice shows in the heading and in history.
 const handle=await page.evaluate(()=>{
  const lib=SEED.exerciseLibrary,push=exercise('cable-triceps-pushdown');
  if(state.active)return {error:'active workout already present'};
  startWorkout();pickExercise('cable-triceps-pushdown');const ei=state.active.exercises.findIndex(e=>e.id==='cable-triceps-pushdown');
  openExerciseEditor('cable-triceps-pushdown',ei);
  const select=document.querySelector('#exercise-config-form select[name="handle"]');if(!select)return {error:'no handle select'};
  const options=[...select.options].map(o=>o.value);select.value='Канат';
  document.getElementById('exercise-config-form').requestSubmit();
  const heading=[...document.querySelectorAll('.exercise-collapse')].map(b=>b.textContent.trim());
  const stored=state.active.exercises[ei].handle;
  // finish the set so the workout lands in history, then read the history header for the handle label
  state.active.exercises[ei].sets.forEach(s=>{s.done=true;s.reps=10;s.weight=20});
  const w={...clone(state.active),end:localNow()};state.workouts.push(w);state.active=null;persist();
  openExerciseHistory('cable-triceps-pushdown');const history=document.querySelector('#modal-root')?.textContent||document.body.textContent;
  closeSheet();goto('diary');
  return {lib,push:!!push,handles:push?.handles,options,heading,stored,historyHasHandle:history.includes('Канат')};
 });
 assert.equal(handle.error,undefined,'handle flow: '+handle.error);
 assert.equal(handle.lib.url,'/happyamurio/assets/exercise-library/v1/');assert.ok(handle.push,'library exercise resolved');
 assert.deepEqual(handle.options,['','Канат','Прямая рукоять','V-рукоять','Обратный хват']);
 assert.equal(handle.stored,'Канат');assert.ok(handle.heading.some(t=>t.includes('Разгибание рук вниз на блоке · Канат')),'heading shows the handle: '+handle.heading.join(' | '));
 assert.equal(handle.historyHasHandle,true,'history column shows the handle');
 assert.deepEqual(errors,[],'no page errors');
 console.log(JSON.stringify({passed:true,release:name,sections:s.sections.map(x=>x.id),counterStatus:diary.status,libraryIcons:icons.checked,exerciseLibrary:handle.lib.version,handle:handle.stored,pageErrors:0}));
}finally{await browser?.close();server.close();}
