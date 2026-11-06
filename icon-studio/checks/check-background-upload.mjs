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


const composer=fs.readFileSync(path.join(dist,'icon-composer.js'),'utf8');
const handlers=composer.slice(composer.indexOf('  async function validateBackground'),composer.indexOf("  $('ic-upload').onchange"));
const nodes=new Map(), node=id=>{if(!nodes.has(id))nodes.set(id,{});return nodes.get(id);};
let revoked=0;
const initial={...copy(await first.api.editorInitial('sport')),originalBackgroundSourceId:'sport-background',backgroundFit:'stretch',iconMode:'recolor',scale:83,x:7,y:-11,opacity:69,iconVisible:true};
const context=vm.createContext({Uint8Array,File,app:'sport',draft:copy(initial),opening:1,panel:{hidden:false},dirty:false,
 $:node,API:first.api,refreshSources:async()=>{},loadSource:async()=>{},
 persist(){first.api.saveColorDraft(context.app,context.draft);},status(text,error){context.message=text;context.error=error;},
 URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){revoked++;}},
 Image:class{naturalWidth=800;naturalHeight=600;set src(v){queueMicrotask(()=>context.failDecode?this.onerror():this.onload());}}
});
vm.runInContext(handlers,context);
const valid=new File([fs.readFileSync(path.join(dist,'assets/app-icons/sport/01-background.png'))],'my-background.png',{type:'image/png'});
const upload=async file=>{const target={files:file?[file]:[],disabled:false,value:'test'};await node('ic-background-upload').onchange({target});return target;};
const before=JSON.stringify([...storage]);await upload(null);assert.equal(JSON.stringify([...storage]),before);
await upload(new File(['bad'],'bad.png',{type:'image/png'}));assert.equal(JSON.stringify([...storage]),before);assert.deepEqual(copy(context.draft),initial);
context.failDecode=true;await upload(valid);assert.equal(JSON.stringify([...storage]),before);assert.deepEqual(copy(context.draft),initial);
context.failDecode=false;const input=await upload(valid);assert.equal(input.disabled,false);assert.equal(input.value,'');
const uploaded=copy(context.draft), backgroundId=uploaded.backgroundSourceId;
assert.notEqual(backgroundId,initial.backgroundSourceId);assert.equal(uploaded.backgroundFit,'cover');assert.equal(uploaded.baseVisible,true);
for(const key of ['masterId','sourceId','iconMode','scale','x','y','opacity','iconVisible','originalBackgroundSourceId'])assert.deepEqual(uploaded[key],initial[key],key+' must not change');
const material=(await first.api.editorSources('sport')).find(f=>f.id===backgroundId);assert.equal(material.role,'background');assert(material.src.startsWith('data:image/png;base64,'));
const reloaded=runtime();await reloaded.api.ready;assert.deepEqual(copy(await reloaded.api.editorInitial('sport')),uploaded);
assert.equal((await reloaded.api.editorInitial('studio')).sourceId,'studio-foreground');
const snapshot=copy(await first.api.exportSnapshot());assert.equal(snapshot.apps.sport.masterId,'sport-approved');
assert.equal(snapshot.apps.sport.materials.find(f=>f.id===backgroundId).data,material.src);
await first.api.importSnapshot(snapshot);assert.deepEqual(copy(await first.api.editorInitial('sport')),uploaded);
await node('ic-background-restore').onclick();assert.equal(context.draft.backgroundSourceId,'sport-background');assert.equal(context.draft.backgroundFit,'stretch');assert.equal(context.draft.sourceId,initial.sourceId);
// A close while validation is pending must not commit the upload to another editor session.
const beforeCancel=JSON.stringify([...storage]);const pending=upload(valid);context.opening++;await pending;assert.equal(JSON.stringify([...storage]),beforeCancel);
assert(revoked>=3);
console.log('PASS: PNG validation/cancellation, decode failure and interrupted sessions retain state; upload changes only background; original restore, master/foreground preservation, per-icon reopen and portable library JSON.');
// Exercise actual settings-JSON handlers, including portable uploaded PNG bytes.
context.BLENDS=['source-over','multiply','screen','overlay','soft-light'];context.draft=copy(uploaded);context.Blob=Blob;context.atob=atob;
context.backgroundEditor=context.iconEditor={set(){}};
context.download=blob=>{context.exported=blob;};
vm.runInContext(fs.readFileSync(path.join(dist,'happy-gradients.js'),'utf8'),context);context.G=context.HappyGradients;
vm.runInContext(composer.slice(composer.indexOf('  function clean(value)'),composer.indexOf('  function persist()')),context);
vm.runInContext(composer.slice(composer.indexOf("  $('ic-export-draft').onclick"),composer.indexOf("  window.addEventListener('pagehide'")),context);
await node('ic-export-draft').onclick();const settings=JSON.parse(await context.exported.text());assert.equal(settings.backgroundFile.data,material.src);
await node('ic-import-draft').onchange({target:{files:[new File([JSON.stringify(settings)],'settings.json',{type:'application/json'})],value:'x'}});
assert.notEqual(context.draft.backgroundSourceId,backgroundId,context.message);assert.equal(context.draft.sourceId,uploaded.sourceId);assert.equal(context.draft.masterId,uploaded.masterId);
assert.equal((await first.api.backgroundFile('sport',context.draft.backgroundSourceId)).data,material.src);
const safe=JSON.stringify([...storage]);settings.backgroundFile.data='data:image/png;base64,YmFk';
await node('ic-import-draft').onchange({target:{files:[new File([JSON.stringify(settings)],'bad.json')],value:'x'}});
assert.equal(JSON.stringify([...storage]),safe);
console.log('PASS: settings JSON embeds and restores uploaded background; corrupt embedded PNG cannot replace saved state.');

const flatBefore=JSON.stringify([...storage]);context.draft={...context.draft,sourceId:''};await upload(valid);assert.equal(JSON.stringify([...storage]),flatBefore);assert(context.message.includes('переднего слоя'));console.log('PASS: flattened icons without a foreground cannot be erased by a background upload.');
