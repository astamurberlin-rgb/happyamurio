import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const dist=path.resolve(import.meta.dirname,'..');
const code=fs.readFileSync(path.join(dist,'app-icons.js'),'utf8');
const manifest=JSON.parse(fs.readFileSync(path.join(dist,'data/app-icon-library.json')));
assert.deepEqual(manifest.apps.map(app=>app.id),['day','meal','sport','studio','color']);
for(const app of manifest.apps)for(const file of app.materials){
  assert(fs.existsSync(path.join(dist,file.src)),`Missing material ${file.src}`);
  assert.equal(fs.statSync(path.join(dist,file.src)).size,file.size);
}
const storage=new Map(),bytes=new Map();
const db={createObjectStore(){},transaction(){
  const tx={objectStore:()=>({
    get(key){const request={};queueMicrotask(()=>{request.result=bytes.get(key);request.onsuccess?.();});return request;},
    put(value,key){bytes.set(key,value);},clear(){bytes.clear();}
  })};
  queueMicrotask(()=>tx.oncomplete?.());return tx;
}};
class Reader{
  async readAsDataURL(blob){try{this.result='data:'+blob.type+';base64,'+Buffer.from(await blob.arrayBuffer()).toString('base64');this.onload();}catch{this.onerror();}}
}
function runtime(cryptoAPI=crypto){
  const nodes=new Map();
  function node(id){if(!nodes.has(id))nodes.set(id,{innerHTML:'',textContent:'',listeners:{},classList:{toggle(){}},querySelectorAll:()=>[],addEventListener(type,fn){this.listeners[type]=fn;}});return nodes.get(id);}
  const context=vm.createContext({console,URL,Blob,FileReader:Reader,crypto:cryptoAPI,queueMicrotask,
    document:{getElementById:node},location:{reload(){}},
    window:{addEventListener(){}},
    indexedDB:{open(){const request={};queueMicrotask(()=>{request.result=db;request.onsuccess?.();});return request;}},
    localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)},
    fetch:async url=>{
      // Asset bytes are validated separately; compact fixtures keep repeated
      // portable-backup round trips representative without multi-GB copies.
      const file=path.join(dist,url);const data=file.endsWith('app-icon-library.json')?fs.readFileSync(file):Buffer.from('test material');
      const type=file.endsWith('.png')?'image/png':/\.jpe?g$/.test(file)?'image/jpeg':file.endsWith('.svg')?'image/svg+xml':file.endsWith('.md')?'text/markdown; charset=utf-8':file.endsWith('.zip')?'application/zip':'application/json';
      return {ok:true,json:async()=>JSON.parse(data),blob:async()=>new Blob([data],{type})};
    }
  });
  vm.runInContext(code,context);
  return {api:context.window.HappyAppIcons,node,grid:node('app-icons-grid')};
}
const copy=value=>JSON.parse(JSON.stringify(value));
const first=runtime();await first.api.ready;
const initial=copy(await first.api.exportSnapshot());
assert.equal(initial.apps.studio.masterId,'studio-flat-2026-11-01');
assert(first.grid.innerHTML.includes('data-app-record="studio"'));
assert(initial.apps.studio.materials.some(file=>file.id==='studio-gradient-layer'&&file.data.startsWith('data:image/png;base64,')));
assert(initial.apps.studio.materials.some(file=>file.id==='studio-word-svg'&&file.data.startsWith('data:image/svg+xml;base64,')));
assert(initial.apps.studio.materials.some(file=>file.id==='studio-pack'&&file.data.startsWith('data:application/zip;base64,')));
assert.equal(initial.apps.day.masterId,'day-v4-original-2026-10-31');
for(const id of ['day-approved-2026-10-29','day-v2-rear-2026-10-30','day-v3-cap-2026-10-30','day-v4-original-2026-10-31']){
  assert(initial.apps.day.materials.some(file=>file.id===id&&file.data.startsWith('data:image/png;base64,')));
  assert(first.grid.innerHTML.includes('data-variant-id="'+id+'"'));
}
assert.equal(initial.apps.sport.masterId,'sport-approved');
assert.equal(initial.apps.sport.materials.length,5);
assert(initial.apps.sport.materials.find(file=>file.id==='sport-guide').data.startsWith('data:text/markdown;base64,'));
assert.equal(initial.apps.meal.masterId,'meal-spoon-cap-2026-10-31');
assert.equal(initial.apps.meal.materials.length,25);
for(const id of ['meal-softserve-warm-20261102','meal-softserve-cool-20261102']) assert(first.grid.innerHTML.includes('data-variant-id="'+id+'"'));
for(const id of ['meal-softserve-warm-bg-20261102','meal-softserve-cool-bg-20261102','meal-softserve-warm-fg-20261102','meal-softserve-cool-fg-20261102','meal-softserve-pack-20261102']) assert(initial.apps.meal.materials.some(file=>file.id===id));
for(const id of ['meal-approved-2026-10-29','meal-dan-waist-2026-10-30','meal-spoon-cap-2026-10-31']) assert(first.grid.innerHTML.includes('data-variant-id=\"'+id+'\"'));
assert(initial.apps.meal.materials.some(file=>file.id==='meal-dan-waist-2026-10-30'));
assert(first.grid.innerHTML.includes('data-app-record="day"'));

// Real input handler saves notes immediately; the same module reloads them.
const note={dataset:{appNote:'meal'},value:'Проверка переноса заметок',closest(){return this;}};
first.grid.listeners.input({target:note});
const second=runtime();await second.api.ready;
assert.equal((await second.api.exportSnapshot()).apps.meal.notes,note.value);

// Real upload handler stores material bytes, and master selection survives reload.
const upload=Object.assign(new Blob([fs.readFileSync(path.join(dist,'assets/app-icons/sport/02-denis-barbell.png'))],{type:'image/png'}),{name:'uploaded-layer.png'});
const input={files:[upload],value:'',disabled:false,closest:()=>({dataset:{appRecord:'meal'}}),matches:selector=>selector==='[data-app-upload]'};
await second.grid.listeners.change({target:input});
const uploaded=(await second.api.exportSnapshot()).apps.meal.materials.find(file=>file.name==='uploaded-layer.png');
assert(uploaded.data.startsWith('data:image/png;base64,'));
const button={dataset:{appMaster:uploaded.id},closest:()=>({dataset:{appRecord:'meal'}})};
second.grid.listeners.click({target:{closest:()=>button}});
const third=runtime();await third.api.ready;
const afterReload=copy(await third.api.exportSnapshot());
assert.equal(afterReload.apps.meal.masterId,uploaded.id);
assert.equal(afterReload.apps.meal.materials.find(file=>file.id===uploaded.id).data,uploaded.data);

// Old backups do not erase new app materials. A full snapshot restores notes,
// an explicitly empty master, and material roles; unrelated uploads are merged.
await third.api.importSnapshot(undefined);
assert.deepEqual(copy(await third.api.exportSnapshot()),afterReload);
const oldAppSnapshot=copy(initial);delete oldAppSnapshot.apps.studio;
await third.api.importSnapshot(oldAppSnapshot);
assert.equal((await third.api.exportSnapshot()).apps.studio.masterId,'studio-flat-2026-11-01');
await third.api.importSnapshot(initial);
let restored=copy(await third.api.exportSnapshot());
assert.equal(restored.apps.meal.notes,initial.apps.meal.notes);assert.equal(restored.apps.meal.masterId,initial.apps.meal.masterId);
const emptyMaster=copy(initial);emptyMaster.apps.meal.masterId='';
await third.api.importSnapshot(emptyMaster);
assert.equal((await third.api.exportSnapshot()).apps.meal.masterId,'');
assert(restored.apps.meal.materials.some(file=>file.id===uploaded.id));
const select={dataset:{materialRole:'sport-foreground'},value:'reference',closest:()=>({dataset:{appRecord:'sport'}}),matches:selector=>selector==='[data-material-role]'};
await third.grid.listeners.change({target:select});
assert.equal((await third.api.exportSnapshot()).apps.sport.materials.find(file=>file.id==='sport-foreground').role,'reference');
await third.api.importSnapshot(initial);
assert.equal((await third.api.exportSnapshot()).apps.sport.materials.find(file=>file.id==='sport-foreground').role,'foreground');
restored=copy(await third.api.exportSnapshot());

// Reject unsafe/invalid payloads before changing app records or stored bytes.
const unsafe=copy(initial);unsafe.apps.sport.materials[0].data='data:text/html;base64,PHNjcmlwdD4=';
await assert.rejects(third.api.importSnapshot(unsafe),/Повреждён/);
assert.deepEqual(copy(await third.api.exportSnapshot()),restored);
// An older record upgrades its Day default to the approved version 3 master
// while custom notes, added files and other apps keep their identities.
const prior=JSON.parse(storage.get('happy_icon_studio_app_icons_v1'));
prior.day.seedRevision=1;prior.day.masterId='day-preview';prior.day.notes='Моя заметка к Day';
prior.meal.seedRevision=1;prior.meal.masterId='';prior.meal.notes='Моя заметка к Meal';
prior.sport.notes='Моя заметка к Sport';
storage.set('happy_icon_studio_app_icons_v1',JSON.stringify(prior));
const upgraded=runtime();await upgraded.api.ready;
const upgradedSnapshot=copy(await upgraded.api.exportSnapshot());
assert.equal(upgradedSnapshot.apps.day.masterId,'day-v4-original-2026-10-31');
assert.equal(upgradedSnapshot.apps.day.notes,'Моя заметка к Day');
assert.equal(upgradedSnapshot.apps.meal.masterId,'meal-spoon-cap-2026-10-31');
assert.equal(upgradedSnapshot.apps.meal.notes,'Моя заметка к Meal');
assert.equal(upgradedSnapshot.apps.sport.notes,'Моя заметка к Sport');
assert.equal(upgradedSnapshot.apps.sport.masterId,prior.sport.masterId);
assert(upgradedSnapshot.apps.meal.materials.some(file=>file.id===uploaded.id));
assert(upgradedSnapshot.apps.day.materials.some(file=>file.name.endsWith('.svg')&&file.data.startsWith('data:image/svg+xml;base64,')));
prior.day.seedRevision=2;prior.day.masterId='day-approved-2026-10-29';
storage.set('happy_icon_studio_app_icons_v1',JSON.stringify(prior));
const previousApproved=runtime();await previousApproved.api.ready;
assert.equal((await previousApproved.api.exportSnapshot()).apps.day.masterId,'day-v4-original-2026-10-31');
prior.day.masterId='custom-master';prior.day.seedRevision=1;
prior.meal.masterId=uploaded.id;prior.meal.seedRevision=1;
storage.set('happy_icon_studio_app_icons_v1',JSON.stringify(prior));
const customMaster=runtime();await customMaster.api.ready;
assert.equal((await customMaster.api.exportSnapshot()).apps.day.masterId,'custom-master');
assert.equal((await customMaster.api.exportSnapshot()).apps.meal.masterId,uploaded.id);
const html=fs.readFileSync(path.join(dist,'index.html'),'utf8');
assert(html.indexOf('class="progress-card"')<html.indexOf('id="app-icons"'));
assert(html.indexOf('id="app-icons"')<html.indexOf('id="studio-transfer-title"'));
assert(html.indexOf('id="studio-transfer-title"')<html.indexOf('class="bottom-note"'));
console.log('PASS: four dossiers, Apple Composer materials, old-backup compatibility, notes/upload/master reload, portable bytes, role/master restoration, unsafe-import rejection and footer placement.');

// Per-app gradient drafts travel with materials, without changing selected masters.
const draft={version:1,baseVisible:true,iconVisible:true,sourceId:uploaded.id,iconMode:'recolor',scale:75,x:-12,y:8,opacity:63,background:{type:'radial',x:20,y:30,stops:[{color:'#123456',position:0,brightness:110},{color:'#abcdef',position:100}]},icon:{type:'solid',stops:[{color:'#eef4ff',position:0},{color:'#eef4ff',position:100}]}};
customMaster.api.saveColorDraft('meal',draft);
const draftReload=runtime();await draftReload.api.ready;
assert.deepEqual(copy(await draftReload.api.colorDraft('meal')),draft);
assert.equal(await draftReload.api.colorDraft('sport'),null);
const portable=copy(await draftReload.api.exportSnapshot());
assert.deepEqual(portable.apps.meal.colorDraft,draft);
await draftReload.api.importSnapshot(initial);
assert.deepEqual(copy(await draftReload.api.colorDraft('meal')),draft,'Old backups retain existing gradient drafts');
await draftReload.api.importSnapshot(portable);
assert.equal((await draftReload.api.exportSnapshot()).apps.meal.masterId,uploaded.id);
const sources=await draftReload.api.editorSources('meal');
assert(sources.some(file=>file.id===uploaded.id&&file.src.startsWith('data:image/png;base64,')));
const oldMaster=(await draftReload.api.exportSnapshot()).apps.meal.masterId;
const addedId=await draftReload.api.addColorPNG('meal',upload);
assert((await draftReload.api.editorSources('meal')).some(file=>file.id===addedId));
assert.equal((await draftReload.api.exportSnapshot()).apps.meal.masterId,oldMaster);
console.log('PASS: gradient drafts survive reload/backup, old backups preserve settings, PNG additions keep the chosen master.');

const noUUID=runtime({getRandomValues:a=>crypto.webcrypto.getRandomValues(a)});await noUUID.api.ready;
const fallbackId=await noUUID.api.addColorPNG('sport',upload);
assert(/^upload-[a-f0-9]{32}$/.test(fallbackId));
console.log('PASS: PNG save also works in HTTP previews without randomUUID.');

// Each newly approved variant opens its own matching layers, and custom masters remain intact.
for(const [variant,bg,fg] of [
  ['meal-softserve-warm-20261102','meal-softserve-warm-bg-20261102','meal-softserve-warm-fg-20261102'],
  ['meal-softserve-cool-20261102','meal-softserve-cool-bg-20261102','meal-softserve-cool-fg-20261102']
]) {
  const inst=runtime(); await inst.api.ready;
  const button={dataset:{appMaster:variant},closest:()=>({dataset:{appRecord:'meal'}})};
  inst.grid.listeners.click({target:{closest:()=>button}});
  const editor=await inst.api.editorInitial('meal');
  assert.equal(editor.backgroundSourceId,bg); assert.equal(editor.sourceId,fg);
}
console.log('PASS: soft-serve variants open with their corresponding layers.');
