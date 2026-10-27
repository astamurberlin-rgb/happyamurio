import './check-transfer.mjs';
import {readFile,readdir} from 'node:fs/promises';
import {Script,createContext,runInContext} from 'node:vm';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import './check-energy.mjs';
import './check-rest.mjs';
import './check-countdown.mjs';
import './check-set-swipe.mjs';
import './check-history-pause.mjs';
const root=new URL('../',import.meta.url),read=p=>readFile(new URL(p,root),'utf8');
for(const f of await readdir(new URL('src',root)))if(f.endsWith('.js'))new Script(await read('src/'+f),{filename:f});
for(const f of ['dist/index.html','dist/exercises/pull-up.html']){
 const html=await read(f);
 for(const [i,m] of [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].entries())if(!m[1].includes('application/json'))new Script(m[2],{filename:f+':'+i});
}
const c=createContext({console,localStorage:{getItem:()=>null,setItem:()=>{}},TextEncoder,TextDecoder,crypto:webcrypto,btoa,atob,rawGet:async()=>null,rawSet:()=>{},fetch:()=>{throw new Error('Network disabled in tests')}});
runInContext(await read('src/sport-link.js'),c);
runInContext('globalThis.api={sportFacts,sportTrack,sportMerge}',c);
const {sportTrack,sportMerge}=c.api;
const first={id:'w1',title:'Тест',start:'2026-10-23T10:00',end:'2026-10-23T11:00',duration:3600,kind:'gym',demo:false};
let summary=sportTrack([first,{...first,id:'demo',demo:true}],null,1000);
assert.equal(summary.records.length,1);assert.equal(summary.records[0].energyKcal,null);
assert.equal(sportTrack([first],summary,2000).records[0].rev,1000);
let edited=sportTrack([{...first,title:'Изменено'}],summary,2000);
assert.equal(sportMerge(summary,edited).records.length,1);assert.equal(sportMerge(summary,edited).records[0].title,'Изменено');
let deleted=sportTrack([],edited,3000);
assert.equal(sportMerge(edited,deleted).records[0].deleted,true);
assert.equal(sportTrack([first],deleted,4000).records[0].deleted,undefined);
assert.equal(sportMerge(summary,{records:[{...first,id:'another-device',rev:1000}]}).records.length,2);
// Derive exactly as the existing Day/Meal implementation and decrypt a Sport payload with it.
runInContext(await read('src/happy-auth.js'),c);
await runInContext("clDerive('fixture-not-a-real-password','00000000-0000-0000-0000-000000000001')",c);
await runInContext("CL.s={uid:'00000000-0000-0000-0000-000000000001'};globalThis.saved=null;clRest=async function(method,path,row){saved=row};clPut('sport','link',{v:1,records:[{id:'fixture'}]},1234)",c);
const raw=await webcrypto.subtle.importKey('raw',new TextEncoder().encode('fixture-not-a-real-password'),'PBKDF2',false,['deriveKey']);
const key=await webcrypto.subtle.deriveKey({name:'PBKDF2',salt:new TextEncoder().encode('happyday-sync-v1:00000000-0000-0000-0000-000000000001'),iterations:600000,hash:'SHA-256'},raw,{name:'AES-GCM',length:256},false,['decrypt']);
const plaintext=await webcrypto.subtle.decrypt({name:'AES-GCM',iv:Buffer.from(c.saved.iv,'base64'),additionalData:new TextEncoder().encode('00000000-0000-0000-0000-000000000001|sport|link')},key,Buffer.from(c.saved.data,'base64'));
assert.equal(JSON.parse(new TextDecoder().decode(plaintext)).records[0].id,'fixture');
await assert.rejects(()=>webcrypto.subtle.decrypt({name:'AES-GCM',iv:Buffer.from(c.saved.iv,'base64'),additionalData:new TextEncoder().encode('different-user|sport|link')},key,Buffer.from(c.saved.data,'base64')));
console.log('Passed: source/HTML syntax; stable IDs, edits, deletion, undo, demo exclusion, cross-device merge; Happy encryption compatibility and user binding.');
// Optimistic concurrency must report collisions; do not silently replace another write.
const cloudSource=await read('src/sport-cloud.js');
runInContext(cloudSource.slice(cloudSource.indexOf('async function putSportConditional'),cloudSource.indexOf('async function syncSportCloud')),c);
runInContext('clRest=async function(method,path,row,prefer){globalThis.request={method,path,prefer};return []}',c);
assert.equal(await runInContext('putSportConditional({at:1500},1234)',c),false);
assert.equal(c.request.method,'PATCH');assert.ok(c.request.path.includes('at=eq.1234'));
runInContext('clRest=async function(method,path,row,prefer){globalThis.request={method,path,prefer};return [row]}',c);
assert.equal(await runInContext('putSportConditional({at:1500},null)',c),true);
assert.ok(c.request.prefer.includes('ignore-duplicates'));
// Pointer behavior, including cancelled/short drags and a completed downward swipe.
const refinements=await read('src/refinements.js');
runInContext(refinements.slice(refinements.indexOf('function wireGrip'),refinements.indexOf('function assignExercise')),c);
runInContext(`var handlers={},closed=0;var handle={dataset:{},setPointerCapture(){},addEventListener(n,f){handlers[n]=f}},card={style:{}};wireGrip(handle,card,()=>closed++,true);handlers.pointerdown({clientY:10,pointerId:1});handlers.pointermove({clientY:40});handlers.pointercancel();handlers.pointerdown({clientY:10,pointerId:1});handlers.pointermove({clientY:100});handlers.pointerup({});`,c);
assert.equal(c.closed,1);assert.equal(c.handle.dataset.swiped,'1');
console.log('Passed: server compare-and-swap collision handling and pointer swipe/cancel behavior.');
const planningSource=await read('src/planning.js');
const pc=createContext({TextEncoder,Date,phaseNames:{main:'Основная часть'},exercise:()=>({name:'Подтягивание'}),dateLabel:d=>d});
runInContext(planningSource.slice(planningSource.indexOf('function planText'),planningSource.indexOf('function downloadPlan')),pc);
pc.fixture={id:'test',title:'Тренировка, тест',items:[['pull-up','main',3]],schedule:{start:'2026-10-25T18:00',minutes:60,note:'Взять воду\n'+ 'Заметка '.repeat(50),reminder:30}};
const ics=runInContext('planCalendar(fixture,new Date("2026-10-24T10:00:00Z"))',pc);
assert.ok(ics.includes('DTSTART:20261025T150000Z'));assert.ok(ics.includes('DTEND:20261025T160000Z'));assert.ok(ics.includes('TRIGGER:-PT30M'));
assert.ok(ics.includes('SUMMARY:Тренировка\\, тест'));assert.ok(ics.split('\r\n').every(line=>Buffer.byteLength(line)<=75));
pc.fixture.schedule.reminder=-1;assert.ok(!runInContext('planCalendar(fixture)',pc).includes('VALARM'));
console.log('Passed: planned calendar times, alarm, Cyrillic folding and escaped text.');

// Missing measurements must not imply a change, and amplification only affects geometry.
{
 const source=await readFile(new URL('../src/measurements-v2.js',import.meta.url),'utf8');
 const start=source.indexOf('bodyPath=function'),end=source.indexOf('// Paired measurements');
 const probe=new Function('amplify',source.slice(start,end).replace('bodyPath=function','const bodyPath=function')+';return {bodyPath}');
 const one=probe(1),three=probe(3);
 assert.equal(one.bodyPath({waist:93},{waist:93}),three.bodyPath({waist:93},{waist:93}));
 assert.notEqual(one.bodyPath({waist:91.5},{waist:98}),three.bodyPath({waist:91.5},{waist:98}));
 assert.equal(one.bodyPath({}, {waist:98}),three.bodyPath({}, {waist:98}));
 assert.ok(!/NaN|Infinity/.test(three.bodyPath({},{})));
 assert.equal(three.bodyPath({waist:90},{}),three.bodyPath({},{}));
 console.log('Passed: missing measurement pairs, unchanged geometry and amplification.');
}

// A deleted measurement must remain recoverable without changing other records.
{
 const source=await read('src/measurements-v2.js'), app=await read('src/app.js');
 const handlers={};
 const mc=createContext({console,Date,Math,Number,FormData:class{constructor(form){this.entries=form.entries}get(k){return this.entries[k]??null}},document:{addEventListener:(event,fn,capture)=>{if(capture)(handlers[event]??=[]).push(fn)}}});
 runInContext(`var state={measurements:[]},period='first',measureDate='',renderMeasurements=()=>'',persistCount=0;var persisted=null;function persist(){persistCount++;persisted=JSON.parse(JSON.stringify(state))}function toast(){}function render(){}function closeSheet(){}function goto(){}function dateLabel(d){return d}function dayNow(){return '2026-10-24'}var journalTab;var errorNode={textContent:''};function $(s){return errorNode}`,mc);
 runInContext(app.slice(app.indexOf('const MF='),app.indexOf('function bodyPath')),mc);
 runInContext(source,mc);
 const records=[{date:'2020-01-01',values:{bicepsL:30,bicepsR:31,forearmR:30},note:'original note',source:'original'},{date:'2020-01-04',values:{bicepsL:30,bicepsR:30.5}}];
 mc.state.measurements=structuredClone(records);
 runInContext("removeMeasurement('2020-01-01')",mc);
 assert.equal(mc.state.measurements.length,1);assert.equal(mc.persisted.measurementTrash[0].record.note,'original note');
 runInContext('restoreMeasurement(state.measurementTrash[0].id)',mc);
 assert.deepEqual(JSON.parse(JSON.stringify(mc.state.measurements)),records);
 runInContext("removeMeasurement('2020-01-01');removeMeasurement('2020-01-04')",mc);
 assert.equal(runInContext('measurePair().cur',mc),null);
 runInContext('restoreMeasurement(state.measurementTrash[0].id)',mc);
 assert.equal(mc.state.measurements[0].values.forearmR,30);assert.equal(mc.state.measurements[0].values.forearmL,undefined);
 runInContext("removeMeasurement('2020-01-01');state.measurements.push({date:'2020-01-01',values:{bicepsL:50}});restoreMeasurement(state.measurementTrash[1].id)",mc);
 assert.equal(mc.state.measurements[0].values.bicepsL,50);assert.equal(mc.state.measurementTrash.length,2);
 const submit=handlers.submit.at(-1),form={id:'measure-form',dataset:{originalDate:'2020-01-01'},entries:{date:'2020-01-02',bicepsL:'32',bicepsR:'33',forearmL:'28',forearmR:'29'}};
 submit({target:form,preventDefault(){},stopImmediatePropagation(){}});
 assert.equal(mc.state.measurements[0].date,'2020-01-02');assert.equal(mc.state.measurements[0].values.bicepsL,32);assert.equal(mc.state.measurements[0].values.bicepsR,33);assert.equal(mc.state.measurements[0].values.forearmL,28);
 mc.state.measurements.push({date:'2020-01-03',values:{bicepsL:41}});form.dataset.originalDate='2020-01-02';form.entries.date='2020-01-03';
 submit({target:form,preventDefault(){},stopImmediatePropagation(){}});
 assert.equal(mc.state.measurements.length,2);assert.equal(mc.state.measurements[1].values.bicepsL,41);
 console.log('Passed: measurement removal/restore, empty state, conflict protection, paired fields and date edits.');
}

// Catalog templates remain independent from user copies and transfer real set targets.
{
 const rec=JSON.parse(await read('data/recommended-templates.json')),seed=JSON.parse(await read('data/seed.json'));
 const ids=new Set(seed.exercises.map(e=>e.id));
 assert.equal(new Set(rec.map(t=>t.id)).size,rec.length);
 for(const t of rec){assert.equal(t.favorite,false);assert.ok(['warmup','main','cooldown'].every(p=>t.items.some(i=>i[1]===p)));for(const [id,,count] of t.items){assert.ok(ids.has(id),id);assert.ok(count>0&&count<=50)}}
 const lc=createContext({console,Date,Math,document:{addEventListener(){}}});
 lc.muscleMap=JSON.parse(await read('data/exercise-muscles.json'));
 for(const e of seed.exercises)assert.ok(lc.muscleMap[e.id]?.length,'Missing muscle groups: '+e.id);
 lc.recommendations=rec;lc.SEED=seed;
 runInContext(`var baseTemplates=[{id:'personal',title:'Мой шаблон',kind:'gym',items:[]}],state={templates:[],active:null},libraryTab='exercises',query='',baseView='library';var templates=()=>[...baseTemplates,...state.templates],clone=x=>JSON.parse(JSON.stringify(x)),filteredExercises=()=>[{id:'swimming'},{id:'barbell-row'}],renderLibrary=()=>'',renderTemplateItems=()=>'',renderTemplateCard=()=>'',assignExercise=()=>{},editTemplate=()=>{},customExercise=()=>{},exercise=()=>null,render=()=>{},persist=()=>{};function startWorkout(id){if(state.active)return;const t=templates().find(t=>t.id===id);state.active={exercises:t.items.map(([id,phase,n])=>({id,phase,sets:Array.from({length:n},()=>({reps:10,seconds:0,done:false}))}))}}`,lc);
 lc.fixtures=seed.exercises.filter(e=>['swimming','barbell-row'].includes(e.id));
 runInContext("var category='all',allExercises=()=>fixtures;",lc);
 const appLibrary=await read('src/app.js');
 runInContext(appLibrary.slice(appLibrary.indexOf('function matches'),appLibrary.indexOf('function exerciseCard')),lc);
 runInContext((await read('src/library-v2.js')).replace('__RECOMMENDED_TEMPLATES__','recommendations').replace('__EXERCISE_MUSCLES__','muscleMap'),lc);
 runInContext("var copy=copyRecommendedTemplate('rec-base-a');copy.items[0][2]=9;copy.targets['barbell-row'].reps=7",lc);
 assert.equal(lc.state.templates.length,1);assert.equal(lc.state.templates[0].recommended,false);assert.equal(lc.state.templates[0].favorite,true);
 assert.equal(runInContext("templates().find(t=>t.id==='rec-base-a').items[0][2]",lc),1);
 assert.equal(runInContext("templates().find(t=>t.id==='rec-base-a').targets['barbell-row'].reps",lc),5);
 runInContext("startWorkout('rec-base-b')",lc);
 let deadlift=lc.state.active.exercises.find(e=>e.id==='barbell-deadlift'&&e.phase==='main');assert.equal(deadlift.sets.length,1);assert.equal(deadlift.sets[0].reps,5);assert.equal(deadlift.sets[0].done,false);
 const squat=lc.state.active.exercises.find(e=>e.id==='barbell-back-squat'&&e.phase==='main');assert.equal(squat.sets.length,5);assert.ok(squat.sets.every(s=>s.reps===5&&!s.done));
 runInContext("startWorkout('rec-swim')",lc);assert.equal(lc.state.active.exercises.find(e=>e.id==='barbell-deadlift'&&e.phase==='main').sets[0].reps,5);
 runInContext("state.active=null;startWorkout('rec-swim');librarySport='swimming'",lc);
 assert.equal(lc.state.active.exercises.find(e=>e.id==='swimming').sets[0].seconds,1200);
 assert.equal(runInContext('filteredExercises().length',lc),1);
 lc.fixtures=seed.exercises.filter(e=>['machine-leg-press','machine-seated-curl','machine-chest-press','barbell-row'].includes(e.id));
 runInContext("librarySport='gym';libraryMuscle='legs';category='machine';query=''",lc);
 assert.deepEqual(JSON.parse(runInContext('JSON.stringify(filteredExercises().map(e=>e.id))',lc)),['machine-leg-press','machine-seated-curl']);
 runInContext("libraryMuscle='back';query='Жим'",lc);assert.equal(runInContext('filteredExercises().length',lc),0);
 runInContext("libraryMuscle='all'",lc);assert.equal(runInContext('filteredExercises().length',lc),2);
 lc.fixtures.push({id:'custom-back',name:'Моя тяга',category:'Мои упражнения',muscleGroups:['back'],equipment:[],scope:'user'});
 runInContext("libraryMuscle='back';category='all';query='Моя'",lc);assert.equal(runInContext('filteredExercises()[0].id',lc),'custom-back');
 assert.equal(runInContext("exerciseMuscles({id:'chin-up-wide'}).includes('back')",lc),true);
 // Per-phase time/distance goals survive edits and are applied only to a new session.
 runInContext("var swimCopy=copyRecommendedTemplate('rec-swim');var input={dataset:{template:swimCopy.id,phase:'main',exercise:'swimming',templateTarget:'minutes'},validity:{valid:true},value:'25'};storeTemplateTarget(input);input.dataset.templateTarget='distance';input.value='800';storeTemplateTarget(input);state.active=null;startWorkout(swimCopy.id)",lc);
 const swim=lc.state.active.exercises.find(e=>e.id==='swimming');assert.equal(swim.sets[0].seconds,1500);assert.equal(swim.sets[0].distance,800);
 runInContext("input.value='';storeTemplateTarget(input)",lc);assert.equal(lc.state.templates.find(t=>t.id===lc.swimCopy.id).phaseTargets.main.swimming.distance,undefined);
 runInContext("input.value='900';input.validity.valid=false;storeTemplateTarget(input)",lc);assert.equal(lc.state.templates.find(t=>t.id===lc.swimCopy.id).phaseTargets.main.swimming.distance,undefined);
 runInContext("librarySport='swimming'",lc);assert.equal(runInContext('equipmentFilterVisible()',lc),false);runInContext("librarySport='gym'",lc);assert.equal(runInContext('equipmentFilterVisible()',lc),true);
 assert.equal(seed.exercises.find(e=>e.id==='swimming').profile,'distance_time');
 console.log('Passed: template copies and set targets, saved phase time/distance goals, empty/invalid input, swimming profile, conditional equipment and combined filters.');
}
