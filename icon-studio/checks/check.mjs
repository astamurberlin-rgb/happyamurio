import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),dist=root;
const read=p=>JSON.parse(fs.readFileSync(path.join(dist,p),'utf8'));
const catalog=read('sport-icons/catalog.json'),manifest=read('data/icon-manifest.json'),seed=read('data/seed.json'),plan=read('data/studio-plan.json');
assert.equal(seed.workouts.length,0);assert.equal(seed.measurements.length,0);
assert.equal(catalog.length,45);assert(catalog.every(c=>c.group==='base'));
for(const item of catalog)if(item.src)assert(fs.existsSync(path.join(dist,item.src)),`Missing ${item.src}`);
assert.equal(catalog.filter(c=>c.src).length,40);
assert.equal((fs.existsSync(path.join(dist,'sport-icons/people'))?fs.readdirSync(path.join(dist,'sport-icons/people')):[]).filter(n=>n.endsWith('.png')).length,0);
const html=fs.readFileSync(path.join(dist,'index.html'),'utf8');
assert(!/Happy (Meal|Day)|data-app="(meal|day)"/.test(html));
assert(/<section id="replace-dialog"/.test(html));assert(!/<dialog id="(?:replace|detail)-dialog"/.test(html));
assert(html.indexOf('id="library-results"')<html.indexOf('class="progress-card"'));
assert.equal((html.match(/data-tab=/g)||[]).length,4);
for(const match of html.matchAll(/(?:src|href)="\.\/([^"?]+)(?:\?[^"\s]*)?"/g))assert(fs.existsSync(path.join(dist,match[1])),`Missing ${match[1]}`);
assert(fs.existsSync(path.join(dist,'assets/daniel-waiting.png')));
assert(fs.readFileSync(path.join(dist,'sport-palette.css'),'utf8').includes('--sport-background:'));
const elements=new Map();
function node(id){if(!elements.has(id))elements.set(id,{value:'',textContent:'',innerHTML:'',files:[],getBoundingClientRect(){return {top:20,bottom:900};},close(){},classList:{add(){},remove(){},toggle(name,value){this[name]=value;}},setAttribute(){},addEventListener(type,fn){this.listeners??={};this.listeners[type]=fn;}});return elements.get(id);}
let persisted='';
const context=vm.createContext({URL,console,location:{href:'https://example.test/',origin:'https://example.test',hash:''},document:{getElementById:node,querySelectorAll:()=>[]},localStorage:{getItem:()=>persisted,setItem:(k,v)=>persisted=v},setTimeout:()=>1,clearTimeout(){}});
let code=fs.readFileSync(path.join(dist,'studio.js'),'utf8');
code=code.replace('start();\n})();',`globalThis.testApi={
 init(catalog,m,source,plan){manifest=m;exercises=source.exercises;generationPlan=plan;items=catalog.map(c=>({...c,variant:c.group,src:c.src?'https://example.test/'+c.src:'',status:c.src?'done':'todo',category:categoryFor(c.number)}));state=readState();initLibraryState();render=()=>{};closeEditor=()=>{};openReplaceDialog=()=>{};refreshCategoryOptions=()=>{};refreshCharacterOptions=()=>{};notify=()=>{};mediaPut=async(id,v)=>{media[id]=v;return true;};},
 state:()=>state,positions:allPositions,status:positionStatus,scopeChoices,media,locked:isLocked,lock:toggleLock,favorite:toggleFavorite,review:toggleReview,assigned:assignedCharacter,picture:positionPicture,
 async assign(kind,key,id,nextKind=kind,nextKey=key){scopeKind=kind;scopeKey=key;editingScope=scopeIdentifier(kind,key);draftScopeKind=nextKind;draftScopeKey=nextKey;draftAsset={kind:'catalog',id};await onReplace({preventDefault(){}});},
 async import(payload){await importAll({target:{files:[{size:100,text:async()=>JSON.stringify(payload)}],value:''}});},
 reset:restoreOriginal,bindLibraryDisclosure,expandLibrary,addEditorVariant,renderEditorVariants
};})();`);
vm.runInContext(code,context);
const api=context.testApi;api.init(catalog,manifest,seed,plan);
node('position-status').value='done';node('position-note').value='Approved';node('entry-name').value='Приседание';node('entry-category').value='Без оборудования';node('entry-equipment').value='';node('editor-character').value='char:daniel';
const source=catalog[0].id,second=catalog[1].id;
await api.assign('exercise','squat',source);
assert.equal(api.status('exercise','squat'),'done');assert.equal(api.state().positionNotes['exercise:squat'],'Approved');
await api.assign('exercise','squat',source,'exercise','forward-lunge');
assert.equal(api.state().placements['exercise:squat'].id,source);assert.equal(api.state().placements['exercise:forward-lunge'].id,source);
// A closed lock blocks images, flags, metadata and reset.
api.lock('exercise:squat');assert(api.locked('exercise:squat'));
node('entry-name').value='MUST NOT REPLACE';await api.assign('exercise','squat',second);
assert.equal(api.state().placements['exercise:squat'].id,source);assert.equal(api.state().libraryExerciseOverrides.squat.name,'Приседание');
assert.equal(api.favorite('exercise:squat'),false);assert.equal(api.review('exercise:squat'),false);
await api.reset();assert.equal(api.state().placements['exercise:squat'].id,source);
// Import merges unlocked entries while retaining locked content and locks.
await api.import({format:'happy-icon-studio',schemaVersion:1,state:{
 placements:{'exercise:squat':{kind:'catalog',id:second},'template:gym':{kind:'catalog',id:source}},
 libraryExerciseOverrides:{squat:{id:'squat',name:'SHOULD STAY PROTECTED'}},
 positionLocks:{'exercise:squat':false,'template:gym':true},
 positionStatus:{'exercise:squat':'review','template:gym':'done'},positionBookmarks:{'template:gym':true},positionNotes:{'template:gym':'Reviewed'},
 characters:[{id:'char:user:qa',name:'QA character'}],libraryExercises:[{id:'user-exercise-qa',name:'QA exercise',category:'Без оборудования',equipment:[]}],libraryFavorites:['exercise:squat']
},media:{}});
assert(api.locked('exercise:squat'));assert.equal(api.state().placements['exercise:squat'].id,source);
assert.equal(api.state().libraryExerciseOverrides.squat.name,'Приседание');assert.equal(api.status('exercise','squat'),'done');
assert.equal(api.state().placements['template:gym'].id,source);assert(api.locked('template:gym'));assert.equal(api.state().positionBookmarks['template:gym'],true);
assert(api.scopeChoices('exercise').some(e=>e.id==='user-exercise-qa'));
// Unlock is explicit; the next edit is allowed and persists.
api.lock('exercise:squat');node('entry-name').value='Приседание';await api.assign('exercise','squat',second);
assert.equal(api.state().placements['exercise:squat'].id,second);
api.lock('asset:'+source);assert(api.locked('category:'+source));assert(api.locked('asset:'+source));
api.lock('category:'+source);assert(!api.locked('asset:'+source));
assert.equal(api.assigned('exercise:barbell-bench-press'),'char:daniel');assert.equal(api.assigned('exercise:machine-leg-press'),'char:rima');
assert(api.picture('exercise','reverse-lunge').includes('daniel-waiting.png'));assert(!api.picture('exercise','reverse-lunge').includes('pencil'));
const positions=api.positions(),counts=Object.fromEntries(['done','review','empty'].map(k=>[k,positions.filter(p=>api.status(p.kind,p.key)===k).length]));
assert.equal(Object.values(counts).reduce((a,b)=>a+b,0),positions.length);
const serialized=JSON.parse(persisted);assert.equal(serialized.placements['exercise:squat'].id,second);assert.equal(serialized.positionLocks['template:gym'],true);
// Collapsing results persists, and an explicit search/filter action can reopen them.
api.bindLibraryDisclosure();assert.equal(node('library-disclosure').open,true);
node('library-disclosure').open=true;node('library-disclosure').listeners.toggle();
api.bindLibraryDisclosure();assert.equal(node('library-disclosure').open,true);
node('library-disclosure').open=false;node('library-disclosure').listeners.toggle();
api.bindLibraryDisclosure();assert.equal(node('library-disclosure').open,true);
api.expandLibrary();assert.equal(node('library-disclosure').open,true);
assert.equal(node('library-disclosure-action').textContent,'Свернуть');
assert(!html.includes('Редактор иконок</span>'));
assert(!html.includes('<p class="studio-help">'));
await api.addEditorVariant();
const variants=api.state().iconVariants;assert(Object.values(variants).some(list=>list.length===1));
const backup=JSON.parse(JSON.stringify(api.state()));await api.import({format:'happy-icon-studio',schemaVersion:1,state:backup,media:{}});assert(Object.values(api.state().iconVariants).some(list=>list.length===1));
assert(html.includes('＋ Вариант'));assert(html.includes('По умолчанию'));assert(!html.includes('Сбросить иконку'));
assert(!html.includes('library-disclosure-chevron'));
console.log('PASS: current assets, navigation, locks/import protection, status counts, compact header and persisted disclosure.');
