import './check-quick-value-input.mjs';
import './check-history-library.mjs';
import './check-clean-shell.mjs';
import './check-workout-ui-consistency.mjs';
import './check-workout-interactions.mjs';
import './check-exercise-context.mjs';
import './check-template-picker.mjs';
import './check-schedule-catalog.mjs';
import './check-rest-pill.mjs';
import './check-set-plan.mjs';
import './check-exercise-experience.mjs';
import './check-timer-prototype.mjs';
import './check-player-controls.mjs';
import './check-timer-mode-lock.mjs';
import './check-timer-action-wheel.mjs';
import './check-timed-exercise.mjs';
import './check-timer-pause.mjs';
import './check-transfer.mjs';
import './check-icons.mjs';
import './check-studio-bridge.mjs';
import './check-sport-docs.mjs';
import {readFile,readdir} from 'node:fs/promises';
import {Script,createContext,runInContext} from 'node:vm';
import assert from 'node:assert/strict';
import './check-energy.mjs';
import './check-rest.mjs';
import './check-countdown.mjs';
import './check-set-swipe.mjs';
import './check-history-pause.mjs';
import './check-free-timer.mjs';
import './check-strong-native-mappings.mjs';
const root=new URL('../',import.meta.url),read=p=>readFile(new URL(p,root),'utf8');
for(const f of await readdir(new URL('src',root)))if(f.endsWith('.js'))new Script(await read('src/'+f),{filename:f});
// Собранные страницы — из папки выпуска (сборка: node sport-NN/sport/scripts/build.mjs).
for(const f of ['../index.html','../exercises/pull-up.html']){
 const html=await read(f);
 for(const [i,m] of [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].entries())if(!m[1].includes('application/json'))new Script(m[2],{filename:f+':'+i});
}
console.log('Passed: source/HTML syntax.');
const c=createContext({console});
// Pointer behavior, including cancelled/short drags and a completed downward swipe.
const refinements=await read('src/refinements.js');
runInContext(refinements.slice(refinements.indexOf('function wireGrip'),refinements.indexOf('function assignExercise')),c);
runInContext(`var handlers={},closed=0;var handle={dataset:{},setPointerCapture(){},addEventListener(n,f){handlers[n]=f}},card={style:{}};wireGrip(handle,card,()=>closed++,true);handlers.pointerdown({clientY:10,pointerId:1});handlers.pointermove({clientY:40});handlers.pointercancel();handlers.pointerdown({clientY:10,pointerId:1});handlers.pointermove({clientY:100});handlers.pointerup({});`,c);
assert.equal(c.closed,1);assert.equal(c.handle.dataset.swiped,'1');
console.log('Passed: pointer swipe/cancel behavior.');
// Calendar and planning coverage lives in the recurrence regression suite.
// Sport 43: замеры тела — общий экран; его формат и схему тела смотрит scripts/check-measurements.mjs в корне репозитория.
// Catalog templates remain independent from user copies and transfer real set targets.
{
 const rec=JSON.parse(await read('data/recommended-templates.json')),seed=await (await import('./seed.mjs')).loadSeed();
 const ids=new Set(seed.exercises.map(e=>e.id));
 assert.equal(new Set(rec.map(t=>t.id)).size,rec.length);
 for(const t of rec){assert.equal(t.favorite,false);assert.ok(['warmup','main','cooldown'].every(p=>t.items.some(i=>i[1]===p)));for(const [id,,count] of t.items){assert.ok(ids.has(id),id);assert.ok(count>0&&count<=50)}}
 const lc=createContext({console,Date,Math,document:{addEventListener(){}}});
 lc.muscleMap=await (await import('./seed.mjs')).loadMuscles();
 for(const e of seed.exercises)assert.ok(lc.muscleMap[e.id]?.length,'Missing muscle groups: '+e.id);
 lc.recommendations=rec;lc.SEED=seed;
 runInContext(`var baseTemplates=[{id:'personal',title:'Мой шаблон',kind:'gym',items:[]}],state={templates:[],active:null},libraryTab='exercises',query='',baseView='library';var templates=()=>[...baseTemplates,...state.templates],clone=x=>JSON.parse(JSON.stringify(x)),filteredExercises=()=>[{id:'swimming'},{id:'barbell-row'}],renderLibrary=()=>'',renderTemplateItems=()=>'',renderTemplateCard=()=>'',assignExercise=()=>{},editTemplate=()=>{},customExercise=()=>{},exercise=()=>null,render=()=>{},persist=()=>{};function startWorkout(id){if(state.active)return;const t=templates().find(t=>t.id===id);state.active={exercises:t.items.map(([id,phase,n])=>({id,phase,sets:Array.from({length:n},()=>({reps:10,seconds:0,done:false}))}))}}`,lc);
 lc.fixtures=seed.exercises.filter(e=>['swimming','barbell-row'].includes(e.id));
 runInContext("var category='all',allExercises=()=>fixtures;",lc);
 const appLibrary=await read('src/app.js');
 runInContext(appLibrary.slice(appLibrary.indexOf('function matches'),appLibrary.indexOf('function exerciseCard')),lc);
 runInContext(await read('src/metric-field.js'),lc);
 runInContext(await read('src/set-time.js'),lc);
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
