import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const dist=path.resolve(import.meta.dirname,'..');
const code=fs.readFileSync(path.join(dist,'app-icons.js'),'utf8');
const manifest=JSON.parse(fs.readFileSync(path.join(dist,'data/app-icon-library.json')));
assert.deepEqual(manifest.apps.map(app=>app.id),['day','meal','sport','studio','color','notes']);
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
      const file=path.join(dist,url);const data=fs.readFileSync(file);
      const type=file.endsWith('.png')?'image/png':/\.jpe?g$/.test(file)?'image/jpeg':file.endsWith('.svg')?'image/svg+xml':file.endsWith('.md')?'text/markdown; charset=utf-8':file.endsWith('.zip')?'application/zip':'application/json';
      return {ok:true,json:async()=>JSON.parse(data),blob:async()=>new Blob([data],{type})};
    }
  });
  vm.runInContext(code,context);
  return {api:context.window.HappyAppIcons,node,grid:node('app-icons-grid')};
}
const copy=value=>JSON.parse(JSON.stringify(value));
const first=runtime();await first.api.ready;

const before=JSON.stringify([...storage]);
assert.equal((await first.api.editorInitial('sport')).backgroundSourceId,'sport-background');
assert.equal((await first.api.editorInitial('meal')).sourceId,'meal-spoon-silhouette-20261031');
assert.equal((await first.api.editorInitial('day')).backgroundSourceId,'day-v4-original-2026-10-31');
assert.equal((await first.api.editorInitial('day')).sourceId,'');
assert.equal((await first.api.editorInitial('studio')).sourceId,'studio-foreground');
assert.equal(JSON.stringify([...storage]),before,'Opening must not write storage');
const draft={masterId:'sport-approved',background:{type:'linear',angle:73,stops:[{color:'#123456',position:3},{color:'#abcdef',position:41},{color:'#654321',position:97}]},icon:{type:'radial',angle:27},sourceId:'sport-foreground',scale:87,x:3,y:-9,opacity:94};
first.api.saveColorDraft('sport',draft);
const loaded=copy(await first.api.editorInitial('sport'));
assert.deepEqual(loaded,draft); loaded.background.stops[0].color='#ffffff';
assert.deepEqual(copy(await first.api.editorInitial('sport')),draft,'Editor model is detached');
const selectMaster=id=>first.grid.listeners.click({target:{closest:()=>({dataset:{appMaster:id},closest:()=>({dataset:{appRecord:'sport'}})})}});
selectMaster('sport-background');
assert.equal((await first.api.editorInitial('sport')).backgroundSourceId,'sport-background');
selectMaster('sport-approved'); assert.deepEqual(copy(await first.api.editorInitial('sport')),draft,'Switch back restores exact model');
const reopened=runtime();await reopened.api.ready;assert.deepEqual(copy(await reopened.api.editorInitial('sport')),draft);
// New variants carry both rendered PNG and editable source through the existing material export format.
const png=Object.assign(new Blob(['test-png'],{type:'image/png'}),{name:'test.png'});
const variant=await first.api.addColorPNG('sport',png,draft);
selectMaster(variant);
assert.deepEqual(copy(await first.api.editorInitial('sport')),{...draft,masterId:variant});
assert.equal((await first.api.editorSources('sport')).find(x=>x.id===variant).src,'data:image/png;base64,dGVzdC1wbmc=');
selectMaster('');assert.equal(await first.api.editorInitial('sport'),null,'Empty master keeps the new-icon flow');
console.log('PASS: selected source/layer mapping, zero-write initialization, exact gradient stops/angle and transform reload, switching masters, empty new icon, model+PNG variant preservation.');
// Execute the actual persistence gate: open/close/pagehide must not write unchanged models.
const composer=fs.readFileSync(path.join(dist,'icon-composer.js'),'utf8');
const persistBody=composer.slice(composer.indexOf('  function persist() {'),composer.indexOf('  function changed() {'));
const gate=vm.createContext({clearTimeout(){},saveTimer:null,dirty:false,app:'sport',draft,API:{saveColorDraft(){gate.writes++;}},status(){},writes:0});
vm.runInContext(persistBody+'persist();',gate);assert.equal(gate.writes,0);
vm.runInContext('dirty=true;persist();persist();',gate);assert.equal(gate.writes,1);assert.equal(gate.dirty,false);
console.log('PASS: unchanged open/close/pagehide persistence is a no-op; actual changes save once.');
const sourceDraft={...draft,masterId:'imported-variant'};
await first.api.importSnapshot({format:'happy-app-icons',schemaVersion:1,apps:{sport:{masterId:'imported-variant',materials:[{id:'imported-variant',name:'variant.png',type:'image/png',role:'reference',data:'data:image/png;base64,dGVzdA==',colorDraft:sourceDraft}],colorDrafts:{'sport-approved':draft}}}});
assert.deepEqual(copy(await first.api.editorInitial('sport')),sourceDraft);
selectMaster('sport-approved');assert.deepEqual(copy(await first.api.editorInitial('sport')),draft);
console.log('PASS: variant editable metadata and per-master drafts survive JSON import.');
