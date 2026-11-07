// Synthetic resolver tests only. No personal source files, network or storage.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {createHash,webcrypto} from 'node:crypto';
const code=await fs.readFile(new URL('../src/strong-native-mappings.js',import.meta.url),'utf8');
const ctx=vm.createContext({});vm.runInContext(code,ctx);
const resolve=ctx.StrongNativeMappings.resolve;
const library=JSON.parse(await fs.readFile(new URL('../data/seed.json',import.meta.url),'utf8')).exercises;
const copy=x=>JSON.parse(JSON.stringify(x));
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
const digest=async x=>createHash('sha256').update(JSON.stringify(canonical(x))).digest('hex');
const occurrenceKey=async(w,i)=>JSON.stringify([w.id,i,await digest(w.exercises[i])]);
const pairs=[
 ['Overhead Press (Barbell)','barbell-overhead-press'],['Разгибание спины на наклонной скамье','back-extension'],
 ['Lat Pulldown (Cable)','cable-lat-pulldown'],['Bench Press (Barbell)','barbell-bench-press'],['Bent Over Row (Barbell)','barbell-row'],
 ['Hip Thrust (Barbell)','barbell-hip-thrust'],['Подтягивание прямым хватом','pull-up'],['Chest Dip','dip'],['Отжимание от пола','push-up'],
 ['Плавание','swimming'],['Подтягивание широким хватом','wide-pull-up'],['Seated Row (Cable)','cable-seated-row'],
 ['Bicep Curl (Barbell)','barbell-curl'],['Leg Extension (Machine)','machine-leg-extension'],['Standing Calf Raise (Bodyweight)','calf-raise'],
 ['Подъём ног лёжа','flat-leg-raise'],['Аэробика','aerobics'],['Lying Leg Curl (Machine)','machine-lying-curl'],
 ['Incline Bench Press (Barbell)','barbell-incline-press'],['Reverse Fly (Machine)','machine-reverse-fly'],
 ['Lateral Raise (Dumbbell)','dumbbell-lateral-raise'],['Incline Bench Press (Dumbbell)','dumbbell-incline-press'],['Face Pull (Cable)','cable-face-pull']
];
const conditional=[
 ['Squat (Barbell)','barbell-back-squat'],['Iso-Lateral Row (Machine)','machine-row'],
 ['Bent Over Row (Dumbbell)','dumbbell-single-arm-row'],['Reverse Fly (Dumbbell)','dumbbell-rear-fly'],
 ['Seated Calf Raise (Plate Loaded)','machine-seated-calf'],['Triceps Pushdown (Cable - Straight Bar)','cable-triceps-pushdown']
];
function input(names=['Bench Press (Barbell)']){
 return {fileSHA256:'e'.repeat(64),workouts:[{id:'synthetic-session-alpha',title:'Synthetic session',start:'2042-02-03T12:01',end:'2042-02-03T12:31',duration:1800,exercises:names.map((name,index)=>({id:'synthetic-exercise-'+index,name,phase:'main',notes:'Synthetic note',sets:[{type:'main',weight:7,reps:11,distance:0,seconds:0,done:true,sourceOrder:1,restSeconds:0,restDone:false},{type:'main',weight:7,reps:11,distance:0,seconds:0,done:true,sourceOrder:2}]}))}]};
}
async function run(source=input(),lib=library,review=null){return resolve({input:source,effectiveLibrary:lib,sourceHash:await digest(source),digest,occurrenceKey,review});}
async function reviewFor(source,index=0,target=library.find(e=>e.id==='barbell-bench-press')){
 const w=source.workouts[0],e=w.exercises[index],key=await occurrenceKey(w,index);
 return {version:1,sourceHash:await digest(source),sourceFileSHA256:source.fileSHA256,decisions:{[key]:{status:'confirmed',workoutId:w.id,groupIndex:index,sourceStart:w.start,sourceName:e.name,sourceWorkoutHash:await digest(w),sourceExerciseHash:await digest(e),targetId:target.id,targetHash:await digest(target),loadBasis:'unknown',evidence:'Synthetic explicit review'}}};
}
let passed=0;
async function check(name,fn){await fn();passed++;console.log('PASS '+name);}
await check('23 exact public identities map with occurrence and target hashes, without load inference',async()=>{
 const source=input(pairs.map(p=>p[0])),before=JSON.stringify({source,library}),out=await run(source);
 assert.equal(Object.keys(out.decisions).length,23);assert.equal(out.unresolved.length,0);assert.equal(out.newDefinitionProposals.length,0);
 for(const [index,pair] of pairs.entries()){
  const d=out.decisions[await occurrenceKey(source.workouts[0],index)];assert.equal(d.targetId,pair[1]);assert.equal(d.sourceWorkoutHash,await digest(source.workouts[0]));
  assert.equal(d.targetHash,await digest(library.find(t=>t.id===pair[1])));assert.equal(d.loadBasis,'unknown');
 }
 assert.equal(JSON.stringify({source,library}),before);
});
await check('six conditional names never use generic or wrong seed cards',async()=>{
 const out=await run(input(conditional.map(p=>p[0])));assert.equal(Object.keys(out.decisions).length,0);assert.equal(out.unresolved.length,6);assert.equal(out.newDefinitionProposals.length,6);assert.ok(out.newDefinitionProposals.every(p=>p.createsDefinition===false));
});
await check('target identity changes block automatic binding',async()=>{
 for(const field of ['name','en','category','equipment','profile','loadBasis','metrics']){
  const lib=copy(library),target=lib.find(e=>e.id==='barbell-bench-press');target[field]=field==='equipment'?['dumbbell']:field==='metrics'?['reps']:'changed';
  assert.equal((await run(input(),lib)).unresolved[0].code,'library_identity_changed');
 }
 const lib=copy(library),target=lib.find(e=>e.id==='barbell-bench-press');target.aliases.push('synthetic alias');target.defaultValues={reps:13};
 assert.equal(Object.keys((await run(input(),lib)).decisions).length,1);
});
await check('source ID, fuzzy name or date cannot act as a mapping',async()=>{
 const source=input(['Unknown exercise']);source.workouts[0].exercises[0].id='barbell-bench-press';
 assert.equal((await run(source)).unresolved[0].code,'source_name_unreviewed');
 assert.equal((await run(input([' bench press (barbell) ']))).unresolved[0].code,'source_name_unreviewed');
});
await check('native extra occurrence metrics survive reps-only card defaults',async()=>{
 const source=input(['Разгибание спины на наклонной скамье']);source.workouts[0].exercises[0].metrics=['reps','weight'];
 const before=JSON.stringify(source),out=await run(source);assert.equal(Object.values(out.decisions)[0].targetId,'back-extension');assert.equal(JSON.stringify(source),before);
});
await check('zero placeholders, unknown metrics and foreign units fail closed',async()=>{
 for(const mutate of [e=>{e.sets=[{reps:0,weight:0,seconds:0,distance:0}]},e=>e.metrics=['calories'],e=>e.sets[0].weight='7',e=>e.weightUnit='lb',e=>e.sets[0].distanceUnit='km',e=>e.sets[0].reps=-1,e=>e.units={weight:'lb'},e=>e.metricUnits='unknown']){
  const source=input();mutate(source.workouts[0].exercises[0]);assert.equal((await run(source)).unresolved[0].code,'source_metrics_unresolved');
 }
 const source=input();source.workouts[0].exercises[0].sets=[{reps:0,weight:0}];source.workouts[0].exercises[0].metrics=['reps','weight'];assert.equal(Object.keys((await run(source)).decisions).length,1);
});
await check('whole source, file and unknown occurrence guards reject stale reviews',async()=>{
 const source=input(),review=await reviewFor(source);
 await assert.rejects(()=>resolve({input:source,effectiveLibrary:library,sourceHash:'f'.repeat(64),digest,occurrenceKey}),/source hash changed/);
 for(const field of ['sourceHash','sourceFileSHA256']){const changed=copy(review);changed[field]='f'.repeat(64);await assert.rejects(()=>run(source,library,changed),/does not match/)}
 const changed=copy(review);changed.decisions['not-an-occurrence']=Object.values(changed.decisions)[0];await assert.rejects(()=>run(source,library,changed),/outside this source/);
});
await check('each runtime occurrence guard is required and stale review never falls back',async()=>{
 const source=input();for(const field of ['workoutId','groupIndex','sourceStart','sourceName','sourceWorkoutHash','sourceExerciseHash']){
  const review=await reviewFor(source),e=Object.values(review.decisions)[0];e[field]=field==='groupIndex'?1:'changed';const out=await run(source,library,review);assert.equal(out.unresolved[0].code,'review_changed');assert.equal(Object.keys(out.decisions).length,0);
 }
});
await check('valid runtime decision yields exactly the frozen planner schema',async()=>{
 const source=input(),review=await reviewFor(source),entry=Object.values(review.decisions)[0];entry.loadBasis='total_external';entry.semanticLabel='Synthetic reviewed semantics';
 const d=Object.values((await run(source,library,review)).decisions)[0];assert.deepEqual(Object.keys(d).sort(),['status','sourceWorkoutHash','targetId','targetHash','loadBasis','evidence','semanticLabel'].sort());assert.equal(d.loadBasis,'total_external');assert.equal(d.semanticLabel,entry.semanticLabel);
});
await check('definition proposal applies to one exact occurrence, never creates a card',async()=>{
 const source=input(['Bent Over Row (Dumbbell)','Bent Over Row (Dumbbell)']),review=await reviewFor(source),entry=Object.values(review.decisions)[0];
 entry.status='requires_definition';delete entry.targetId;delete entry.targetHash;entry.identity={family:'dumbbell_row',armAction:'bilateral_simultaneous',support:'unknown',loadBasis:'per_hand'};entry.loadBasis='per_hand';
 const out=await run(source,library,review);assert.equal(Object.keys(out.decisions).length,0);assert.equal(out.unresolved[0].code,'definition_required');assert.equal(out.unresolved[1].code,'variant_review_required');assert.equal(out.newDefinitionProposals[0].reviewedIdentity.support,'unknown');assert.equal(out.newDefinitionProposals[1].reviewedIdentity,undefined);
});
await check('correction requires exact approved identity on an existing nongeneric card',async()=>{
 const source=input(['Triceps Pushdown (Cable - Straight Bar)','Triceps Pushdown (Cable - Straight Bar)']);
 const target={id:'synthetic-rope-card',name:'Synthetic rope exercise',en:'Synthetic rope exercise',equipment:['cable_station','rope'],profile:'load_reps',loadBasis:'machine_display',strongIdentity:{family:'cable_triceps_pushdown',attachment:'rope',loadBasis:'machine_display'}};
 const lib=[...copy(library),target],review=await reviewFor(source,0,target),entry=Object.values(review.decisions)[0];entry.identity=copy(target.strongIdentity);entry.loadBasis='machine_display';entry.semanticLabel='Synthetic occurrence correction to rope';
 const out=await run(source,lib,review);assert.equal(Object.keys(out.decisions).length,1);assert.equal(out.unresolved.length,1);assert.equal(source.workouts[0].exercises[0].name,'Triceps Pushdown (Cable - Straight Bar)');
 for(const mutate of [t=>delete t.strongIdentity,t=>t.strongIdentity.attachment='bar']){const changed=copy(lib);mutate(changed.at(-1));const r=copy(review);Object.values(r.decisions)[0].targetHash=await digest(changed.at(-1));assert.equal((await run(source,changed,r)).unresolved[0].code,'target_identity_unresolved')}
 const generic=copy(library.find(e=>e.id==='cable-triceps-pushdown'));generic.strongIdentity=copy(target.strongIdentity);const changed=library.map(e=>e.id===generic.id?generic:e);const r=await reviewFor(source,0,generic);Object.assign(Object.values(r.decisions)[0],{identity:copy(generic.strongIdentity),loadBasis:'machine_display'});assert.equal((await run(source,changed,r)).unresolved[0].code,'target_identity_unresolved');
});
await check('squat cannot resolve while bar position is unknown',async()=>{
 const source=input(['Squat (Barbell)']),target=copy(library.find(e=>e.id==='barbell-back-squat'));target.strongIdentity={family:'barbell_squat',barPosition:'unknown'};
 const lib=library.map(e=>e.id===target.id?target:e),review=await reviewFor(source,0,target);Object.values(review.decisions)[0].identity=copy(target.strongIdentity);
 assert.equal((await run(source,lib,review)).unresolved[0].code,'target_identity_unresolved');
});
await check('explicit back-position review uses exact existing card without altering the library',async()=>{
 const source=input(['Squat (Barbell)','Squat (Barbell)']),target=library.find(e=>e.id==='barbell-back-squat'),review=await reviewFor(source,0,target);
 Object.values(review.decisions)[0].identity={family:'barbell_squat',barPosition:'back'};
 const before=JSON.stringify({source,library,review}),out=await run(source,library,review);
 assert.equal(Object.keys(out.decisions).length,1);assert.equal(out.unresolved.length,1);assert.equal(out.unresolved[0].code,'variant_review_required');
 assert.equal(Object.values(out.decisions)[0].targetId,target.id);assert.equal(Object.values(out.decisions)[0].loadBasis,'unknown');
 assert.equal(target.strongIdentity,undefined);assert.equal(JSON.stringify({source,library,review}),before);
 assert.equal((await run(source)).unresolved.length,2);
});
await check('back review refuses wrong, front and Smith identities even with matching claimed metadata',async()=>{
 const source=input(['Squat (Barbell)']),original=library.find(e=>e.id==='barbell-back-squat');
 for(const id of ['barbell-front-squat','smith-squat','unreviewed-squat']){
  const target={...copy(original),id,strongIdentity:{family:'barbell_squat',barPosition:'back'}},lib=[...copy(library).filter(e=>e.id!==id),target];
  const review=await reviewFor(source,0,target);Object.values(review.decisions)[0].identity={family:'barbell_squat',barPosition:'back'};
  const out=await run(source,lib,review);assert.equal(Object.keys(out.decisions).length,0);assert.equal(out.unresolved[0].code,'target_identity_unresolved');
 }
 for(const identity of [null,{family:'barbell_squat',barPosition:'unknown'},{family:'barbell_squat',barPosition:'front'},{family:'smith_squat',barPosition:'back'},{family:'barbell_squat',barPosition:'back',loadBasis:'unknown'}]){
  const review=await reviewFor(source,0,original);Object.values(review.decisions)[0].identity=identity;
  assert.equal((await run(source,library,review)).unresolved[0].code,'target_identity_unresolved');
 }
});
await check('back review refuses stale hashes and changed semantic card fields even after rehashing',async()=>{
 const source=input(['Squat (Barbell)']),original=library.find(e=>e.id==='barbell-back-squat');
 for(const field of ['name','en','category','equipment','profile','loadBasis','metrics','scope','strongIdentity']){
  const lib=copy(library),target=lib.find(e=>e.id===original.id);
  target[field]=field==='equipment'?['smith_machine']:field==='metrics'?['reps']:field==='strongIdentity'?{family:'barbell_squat',barPosition:'front'}:'changed';
  const review=await reviewFor(source,0,original),entry=Object.values(review.decisions)[0];entry.identity={family:'barbell_squat',barPosition:'back'};
  assert.equal((await run(source,lib,review)).unresolved[0].code,'target_changed');
  entry.targetHash=await digest(target);
  assert.equal((await run(source,lib,review)).unresolved[0].code,'target_identity_unresolved');
 }
 const review=await reviewFor(source,0,original);Object.assign(Object.values(review.decisions)[0],{identity:{family:'barbell_squat',barPosition:'back'},targetHash:'f'.repeat(64)});
 assert.equal((await run(source,library,review)).unresolved[0].code,'target_changed');
});
await check('back review remains exact-source scoped and fails changed source workout hashes',async()=>{
 const source=input(['Squat (Barbell)']),target=library.find(e=>e.id==='barbell-back-squat'),review=await reviewFor(source,0,target);
 Object.values(review.decisions)[0].identity={family:'barbell_squat',barPosition:'back'};
 for(const field of ['sourceWorkoutHash','sourceExerciseHash','sourceName','sourceStart','groupIndex']){
  const changed=copy(review);Object.values(changed.decisions)[0][field]=field==='groupIndex'?1:'changed';
  assert.equal((await run(source,library,changed)).unresolved[0].code,'review_changed');
 }
 source.workouts[0].title+=' changed';review.sourceHash=await digest(source);
 assert.equal((await run(source,library,review)).unresolved[0].code,'review_changed');
});
await check('rope uses a generic card only with explicit occurrence-scoped approximation approval',async()=>{
 const source=input(['Triceps Pushdown (Cable - Straight Bar)','Triceps Pushdown (Cable - Straight Bar)']),target=library.find(e=>e.id==='cable-triceps-pushdown'),review=await reviewFor(source,0,target);
 const entry=Object.values(review.decisions)[0];entry.identity={family:'cable_triceps_pushdown',attachment:'rope'};
 assert.equal((await run(source,library,review)).unresolved[0].code,'target_identity_unresolved');
 entry.binding='approved_generic_approximation';
 const before=JSON.stringify({source,library,review}),out=await run(source,library,review),decision=Object.values(out.decisions)[0];
 assert.equal(Object.keys(out.decisions).length,1);assert.equal(out.unresolved.length,1);assert.equal(out.unresolved[0].code,'variant_review_required');
 assert.equal(decision.targetId,target.id);assert.equal(decision.loadBasis,'unknown');assert.match(decision.semanticLabel,/Фактически использован канат/);assert.match(decision.semanticLabel,/Временная привязка/);
 assert.equal(JSON.stringify({source,library,review}),before);assert.equal(target.strongIdentity,undefined);
});
await check('rope approximation refuses wrong identity, family, target, card changes and stale hashes',async()=>{
 const source=input(['Triceps Pushdown (Cable - Straight Bar)']),original=library.find(e=>e.id==='cable-triceps-pushdown');
 async function approved(target=original){const r=await reviewFor(source,0,target);Object.assign(Object.values(r.decisions)[0],{binding:'approved_generic_approximation',identity:{family:'cable_triceps_pushdown',attachment:'rope'}});return r;}
 for(const identity of [null,{family:'cable_triceps_pushdown',attachment:'straight_bar'},{family:'dumbbell_row',attachment:'rope'}]){
  const r=await approved();Object.values(r.decisions)[0].identity=identity;assert.equal((await run(source,library,r)).unresolved[0].code,'target_identity_unresolved');
 }
 for(const field of ['id','name','en','category','equipment','profile','loadBasis','metrics','scope','strongIdentity']){
  const target=copy(original);target[field]=field==='equipment'?['rope']:field==='metrics'?['reps']:field==='strongIdentity'?{family:'cable_triceps_pushdown',attachment:'rope'}:'changed';
  const lib=[...copy(library).filter(e=>e.id!==original.id),target],r=await approved(target);
  assert.equal((await run(source,lib,r)).unresolved[0].code,'target_identity_unresolved');
 }
 const stale=await approved();Object.values(stale.decisions)[0].targetHash='f'.repeat(64);assert.equal((await run(source,library,stale)).unresolved[0].code,'target_changed');
 const unknown=await approved();Object.values(unknown.decisions)[0].binding='generic';assert.equal((await run(source,library,unknown)).unresolved[0].code,'review_changed');
 const bench=input(),r=await reviewFor(bench);Object.assign(Object.values(r.decisions)[0],{binding:'approved_generic_approximation',identity:{family:'cable_triceps_pushdown',attachment:'rope'}});
 assert.equal((await run(bench,library,r)).unresolved[0].code,'target_identity_unresolved');
});
await check('rope approximation cannot suppress actual attachment or exceed bounded visible annotation',async()=>{
 const source=input(['Triceps Pushdown (Cable - Straight Bar)']),target=library.find(e=>e.id==='cable-triceps-pushdown'),review=await reviewFor(source,0,target),entry=Object.values(review.decisions)[0];
 Object.assign(entry,{binding:'approved_generic_approximation',identity:{family:'cable_triceps_pushdown',attachment:'rope'},semanticLabel:'Synthetic reviewed context'});
 let out=await run(source,library,review);assert.match(Object.values(out.decisions)[0].semanticLabel,/Фактически использован канат/);assert.match(Object.values(out.decisions)[0].semanticLabel,/Synthetic reviewed context/);
 entry.semanticLabel='x'.repeat(500);out=await run(source,library,review);assert.equal(out.unresolved[0].code,'review_changed');
 entry.semanticLabel='';entry.sourceWorkoutHash='f'.repeat(64);assert.equal((await run(source,library,review)).unresolved[0].code,'review_changed');
});
await check('stale target hashes, absent targets and duplicate IDs fail closed',async()=>{
 const source=input(),review=await reviewFor(source);Object.values(review.decisions)[0].targetHash='f'.repeat(64);assert.equal((await run(source,library,review)).unresolved[0].code,'target_changed');
 const duplicate=input();duplicate.workouts.push(copy(duplicate.workouts[0]));await assert.rejects(()=>run(duplicate),/repeated source workout/);await assert.rejects(()=>run(input(),[...library,library[0]]),/effective exercise library/);
 const mapped=input();mapped.workouts[0].strongImport={v:1};await assert.rejects(()=>run(mapped),/source workout/);
});
await check('inputs are snapshotted before hashing awaits',async()=>{
 const source=input(),lib=copy(library),sourceHash=await digest(source);let first=true;
 const pending=resolve({input:source,effectiveLibrary:lib,sourceHash,occurrenceKey,digest:async x=>{if(first){first=false;source.workouts[0].exercises[0].name='changed after call';lib.find(e=>e.id==='barbell-bench-press').name='changed after call'}return digest(x)}});
 assert.equal(Object.values((await pending).decisions)[0].targetId,'barbell-bench-press');
});
await check('unsafe keys and invalid cryptographic helpers reject',async()=>{
 const source=input();source.workouts[0].exercises[0].notes=JSON.parse('{"__proto__":true}');await assert.rejects(()=>run(source),/Unsafe/);
 const good=input(),hash=await digest(good);await assert.rejects(()=>resolve({input:good,effectiveLibrary:library,sourceHash:hash,digest:async()=> 'short',occurrenceKey}),/SHA-256/);
});
await check('browser WebCrypto core and actual Sport validator consume resolver decisions without loss',async()=>{
 const browser=vm.createContext({crypto:webcrypto,TextEncoder,Uint8Array,clone:structuredClone});
 vm.runInContext(await fs.readFile(new URL('../src/strong-native-core.js',import.meta.url),'utf8'),browser);
 vm.runInContext(code,browser);
 const validator=await fs.readFile(new URL('../src/data-transfer.js',import.meta.url),'utf8');
 vm.runInContext(validator.slice(validator.indexOf('const sportDataFields='),validator.indexOf('function sportBackupInfo')),browser);
 const validateData=data=>{browser.validationInput={app:'Happy Sport',version:1,data};return vm.runInContext('sportValidateBackup(validationInput)',browser)};
 const source=input(['Разгибание спины на наклонной скамье','Bench Press (Barbell)']);
 const current={version:1,workouts:[],measurements:[],customExercises:[],templates:[],energy:{burn:0,intake:0,steps:0,training:0,minutes:0}};
 const core=browser.StrongNativeCore,mapped=await browser.StrongNativeMappings.resolve({input:source,effectiveLibrary:library,sourceHash:await core.digest(source),digest:core.digest,occurrenceKey:core.occurrenceKey});
 const preview=await core.planNativeImport(current,source,mapped.decisions,library,{validateData,newDefinitions:[]});
 assert.ok(preview.candidate);assert.equal(preview.unresolved.length,0);assert.equal(preview.conflicts.length,0);
 const imported=preview.candidate.workouts[0].exercises;
 assert.deepEqual(copy(imported[0].metrics),['reps','weight']);assert.deepEqual(copy(imported.map(e=>e.sets)),source.workouts[0].exercises.map(e=>e.sets));
 assert.deepEqual(copy(current.workouts),[]);assert.equal(preview.counts.newDefinitions,0);
});
await check('reviewed back squat preserves every source set through actual core, validator and idempotent reimport',async()=>{
 const browser=vm.createContext({crypto:webcrypto,TextEncoder,Uint8Array,clone:structuredClone});
 vm.runInContext(await fs.readFile(new URL('../src/strong-native-core.js',import.meta.url),'utf8'),browser);vm.runInContext(code,browser);
 const validator=await fs.readFile(new URL('../src/data-transfer.js',import.meta.url),'utf8');
 vm.runInContext(validator.slice(validator.indexOf('const sportDataFields='),validator.indexOf('function sportBackupInfo')),browser);
 const validateData=data=>{browser.validationInput={app:'Happy Sport',version:1,data};return vm.runInContext('sportValidateBackup(validationInput)',browser)};
 const source=input(['Squat (Barbell)','Squat (Barbell)']),original=JSON.stringify(source),target=library.find(e=>e.id==='barbell-back-squat'),review=await reviewFor(source,0,target);
 const second=await reviewFor(source,1,target);Object.assign(review.decisions,second.decisions);
 for(const entry of Object.values(review.decisions))entry.identity={family:'barbell_squat',barPosition:'back'};
 const current={version:1,workouts:[],measurements:[],customExercises:[],templates:[],energy:{burn:0,intake:0,steps:0,training:0,minutes:0}},core=browser.StrongNativeCore;
 const mapped=await browser.StrongNativeMappings.resolve({input:source,effectiveLibrary:library,sourceHash:await core.digest(source),digest:core.digest,occurrenceKey:core.occurrenceKey,review});
 const preview=await core.planNativeImport(current,source,mapped.decisions,library,{validateData,newDefinitions:[]});
 assert.ok(preview.candidate);assert.equal(preview.counts.newDefinitions,0);assert.equal(preview.counts.groups,2);
 for(const [index,e] of preview.candidate.workouts[0].exercises.entries()){
  assert.equal(e.id,target.id);assert.equal(e.strongImport.groupIndex,index);assert.equal(e.strongImport.sourceId,source.workouts[0].exercises[index].id);assert.equal(e.strongImport.loadBasis,'unknown');
  assert.deepEqual(copy(e.sets),source.workouts[0].exercises[index].sets);assert.deepEqual(copy(e.metrics),['reps','weight']);
 }
 const again=await core.planNativeImport(preview.candidate,source,mapped.decisions,library,{validateData,newDefinitions:[]});
 assert.equal(again.counts.add,0);assert.equal(again.counts.skip,1);assert.equal(JSON.stringify(source),original);assert.deepEqual(copy(current.workouts),[]);
});
await check('rope approximation remains visible in native occurrence and roundtrips exact source values',async()=>{
 const browser=vm.createContext({crypto:webcrypto,TextEncoder,Uint8Array,clone:structuredClone});
 vm.runInContext(await fs.readFile(new URL('../src/strong-native-core.js',import.meta.url),'utf8'),browser);vm.runInContext(code,browser);
 const validator=await fs.readFile(new URL('../src/data-transfer.js',import.meta.url),'utf8');vm.runInContext(validator.slice(validator.indexOf('const sportDataFields='),validator.indexOf('function sportBackupInfo')),browser);
 const validateData=data=>{browser.validationInput={app:'Happy Sport',version:1,data};return vm.runInContext('sportValidateBackup(validationInput)',browser)};
 const source=input(['Triceps Pushdown (Cable - Straight Bar)']),target=library.find(e=>e.id==='cable-triceps-pushdown'),review=await reviewFor(source,0,target);
 Object.assign(Object.values(review.decisions)[0],{binding:'approved_generic_approximation',identity:{family:'cable_triceps_pushdown',attachment:'rope'}});
 const current={version:1,workouts:[],measurements:[],customExercises:[],templates:[],energy:{burn:0,intake:0,steps:0,training:0,minutes:0}},core=browser.StrongNativeCore;
 const mapped=await browser.StrongNativeMappings.resolve({input:source,effectiveLibrary:library,sourceHash:await core.digest(source),digest:core.digest,occurrenceKey:core.occurrenceKey,review});
 const preview=await core.planNativeImport(current,source,mapped.decisions,library,{validateData,newDefinitions:[]}),e=preview.candidate.workouts[0].exercises[0];
 assert.equal(e.id,target.id);assert.equal(e.name,target.name);assert.equal(e.strongImport.sourceName,source.workouts[0].exercises[0].name);assert.equal(e.strongImport.loadBasis,'unknown');assert.match(e.notes,/Фактически использован канат/);assert.match(e.strongImport.semanticNote,/Временная привязка/);
 assert.deepEqual(copy(e.sets),source.workouts[0].exercises[0].sets);assert.equal(preview.counts.newDefinitions,0);assert.deepEqual(copy(validateData(preview.candidate).workouts),copy(preview.candidate.workouts));
 const again=await core.planNativeImport(preview.candidate,source,mapped.decisions,library,{validateData,newDefinitions:[]});assert.equal(again.counts.skip,1);assert.equal(again.counts.add,0);
});
assert.ok(!/localStorage|fetch\(|XMLHttpRequest|\.setItem\(/.test(code));
console.log(`Strong native mappings: ${passed} synthetic checks passed.`);
