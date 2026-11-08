import {readFile} from 'node:fs/promises';
import {createContext,runInContext} from 'node:vm';
import assert from 'node:assert/strict';

// Real source functions and delegated handlers; no browser/layout emulation.
const read=name=>readFile(new URL('../src/'+name+'.js',import.meta.url),'utf8');
const plain=value=>JSON.parse(JSON.stringify(value));
const app=await read('app'),config=await read('exercise-config'),planning=await read('planning');
class FormDataFixture {
  constructor(form){this.fields=form.fields;}
  get(key){return this.fields[key]??null;}
  getAll(key){const value=this.fields[key];return Array.isArray(value)?value:value==null?[]:[value];}
  has(key){return Object.hasOwn(this.fields,key);}
}
const handlers={},error={textContent:''},domRoot={innerHTML:''};
const document={addEventListener(type,fn){(handlers[type]??=[]).push(fn);},querySelector(){return null;},querySelectorAll(){return [];},getElementById(id){return id==='free-timer-root'?domRoot:null;},body:{append(){},classList:{add(){},remove(){},toggle(){}}}};
const c=createContext({console,Date,Intl,Math,Number,JSON,Map,document,FormData:FormDataFixture,setInterval(){},nav(){},persist(){},render(){},renderProfile:()=>'',renderDetail:()=>'',showWorkoutForm(){},closeSheet(){},goto(){},toast(){},openPanel(){},icon:String,esc:String,fmt:String,durationText:s=>s+' sec',workoutIconValue:()=>null,$:()=>error,openSheet(title,html){c.sheet={title,html};}});
const run=source=>runInContext(source,c);
run(`var clone=x=>JSON.parse(JSON.stringify(x)),localNow=()=> '2026-11-02T14:00:00',view='active',detailId=null,sheetKind='';
var SEED={exercises:[{id:'row',name:'Тяга',profile:'load_reps',metrics:['reps','weight'],defaultSets:[{reps:8,weight:30,done:false}],aliases:['row'],equipment:['cable']}]};
var state={demoPulse:true,customExercises:[],templates:[{id:'saved-template',items:[['row','main',1,{sets:[{reps:8,weight:30}]}]]}],workouts:[{id:'past',title:'История',start:'2026-11-01T10:00:00',end:'2026-11-01T10:30:00',duration:1800,exercises:[{id:'row',name:'Тяга раньше',metrics:['reps','weight'],sets:[{reps:8,weight:25,done:true}]}]}],active:{id:'active-1',start:'2026-11-02T12:00:00',pauses:[],notes:'Сохранить заметку',exercises:[{id:'row',name:'Тяга сегодня',phase:'main',metrics:['reps','weight'],notes:'Моя заметка',timerConfig:{mode:'stopwatch',workSeconds:60,restSeconds:30,rounds:3},sets:[{reps:10,weight:35,restSeconds:60,done:true},{reps:8,weight:40,done:false}]},{id:'row',name:'Вторая тяга',phase:'main',metrics:['reps','weight'],sets:[{reps:5,weight:50,done:false}]}]}};
var exercise=id=>state.exerciseOverrides?.[id]||state.customExercises.find(e=>e.id===id)||SEED.exercises.find(e=>e.id===id),allExercises=()=>SEED.exercises;
function blankSet(){return {seconds:0,reps:0,weight:0,distance:0,done:false}}
function swipeSetRow(kind,ei,si,html){return html}function volume(){return 0}`);
run(await read('metric-field'));
run((await read('timer-action-wheel')).split('function timerWheelContext(')[0]);
run(config.slice(0,config.indexOf('// Shared editor')));
run((await read('set-rest')).split('document.addEventListener')[0]);
run(await read('set-countdown'));
run(await read('set-time'));
const changeSetTime=handlers.change.at(-1);
run(await read('set-plan'));
run((await read('workout-pause')).split('document.addEventListener')[0]);
run(await read('exercise-player'));
run(config.slice(config.indexOf('function saveExerciseEditor('),config.indexOf('function restoreExerciseName(')));

function settingsForm({scope='active',ei='0',id='row',name='Тяга только сегодня',metrics=['reps','weight'],sets,timerMode='stopwatch',workoutId='active-1'}={}){
  const initial=sets||plain(run(ei===''?'exercise("row").defaultSets':'state.active.exercises['+ei+'].sets'));
  c.draftInput=initial;c.draftMetrics=metrics;
  const draft=run('createSetPlan("row","main",draftInput,draftMetrics)');
  const root={dataset:{setPlan:draft.key},querySelectorAll(){return [];}};
  return {id:'exercise-config-form',dataset:{scope,ei,id,workoutId,initialPlan:JSON.stringify(draft.sets),addActive:'false'},fields:{name,metrics,timerMode,workSeconds:'1:00',restSeconds:'0:30',rounds:'3',aliases:'row',equipment:'cable',muscleGroups:[]},querySelector:s=>s==='[data-set-plan]'?root:error,draft};
}

// Active settings must not leak through a shared exercise ID or library save routine.
const before={seed:plain(run('SEED')),history:plain(run('state.workouts')),templates:plain(run('state.templates')),other:plain(run('state.active.exercises[1]'))};
c.form=settingsForm();
run('saveExerciseEditor(form,"replace")');
assert.equal(run('state.active.exercises[0].name'),'Тяга только сегодня');
assert.equal(run('state.active.exercises[0].notes'),'Моя заметка');
assert.equal(run('state.active.exercises[0].sets[0].done'),true);
assert.equal(run('state.active.exercises[0].sets[1].weight'),40);
assert.deepEqual(plain(run('SEED')),before.seed);
assert.deepEqual(plain(run('state.workouts')),before.history);
assert.deepEqual(plain(run('state.templates')),before.templates);
assert.deepEqual(plain(run('state.active.exercises[1]')),before.other);
assert.equal(run('state.exerciseOverrides'),undefined);
assert.equal(run('state.exerciseChanges'),undefined);
assert.equal(run('state.customExercises.length'),0);

// Local metric changes retain hidden recorded values and stay local even if copy is requested.
c.form=settingsForm({name:'Локальная',metrics:['seconds','distance'],sets:[{reps:10,weight:35,seconds:30,distance:20,done:true},{reps:8,weight:40,seconds:45,distance:25,done:false}]});
run('saveExerciseEditor(form,"copy")');
assert.deepEqual(plain(run('state.active.exercises[0].metrics')),['seconds','distance']);
assert.equal(run('state.active.exercises[0].sets[1].weight'),40);
assert.deepEqual(plain(run('state.active.exercises[1]')),before.other);
assert.equal(run('state.customExercises.length'),0);
assert.equal(run('exercise("row").name'),'Тяга');

const staleBefore=plain(run('state'));
c.form=settingsForm({workoutId:'finished-or-replaced'});
assert.throws(()=>run('saveExerciseEditor(form,"replace")'),/Тренировка изменилась/);
assert.deepEqual(plain(run('state')),staleBefore,'A stale editor cannot modify a new workout');
c.form=settingsForm();c.form.dataset.id='another-exercise';
assert.throws(()=>run('saveExerciseEditor(form,"replace")'),/Тренировка изменилась/);
assert.deepEqual(plain(run('state')),staleBefore);

// Explicit library edits continue to update the definition, while historical snapshots stay historical.
c.form=settingsForm({scope:'library',ei:'',name:'Тяга в библиотеке',sets:[{reps:7,weight:33,done:false}]});
run('saveExerciseEditor(form,"replace")');
assert.equal(run('exercise("row").name'),'Тяга в библиотеке');
assert.equal(run('exercise("row").defaultSets[0].weight'),33);
assert.equal(run('state.exerciseChanges.length'),1);
assert.deepEqual(plain(run('state.workouts')),before.history);
assert.deepEqual(plain(run('state.templates')),before.templates);
assert.notEqual(run('state.active.exercises[0].metrics'),run('exercise("row").metrics'),'Instances do not alias the definition array');
// A local name/metric edit must not erase a paused independent timer or its saved results.
run('state.active.exercisePlayer={ei:0,independent:true,mode:"stopwatch",elapsed:12.35,running:false,laps:[{seconds:12.35}]};state.active.exercises[0].timerResults=[{id:"keep-result",elapsed:12.35,rows:[{seconds:12.35}]}]');
const timerBefore=plain(run('state.active.exercisePlayer')),resultsBefore=plain(run('state.active.exercises[0].timerResults'));
c.form=settingsForm({metrics:['seconds','reps','weight'],name:'Ещё одно локальное имя'});run('saveExerciseEditor(form,"replace")');
assert.deepEqual(plain(run('state.active.exercisePlayer')),timerBefore);assert.deepEqual(plain(run('state.active.exercises[0].timerResults')),resultsBefore);
run('state.active.exercisePlayer=null');
console.log('Passed: active editor isolation from library/history/templates/same-ID occurrences, stale editor rejection, completed values, and explicit library save.');

// Opening settings is now non-pausing: unchanged Save must retain live values recorded after the draft opened.
{
  const priorActive=run('state.active');
  run(`state.active={id:'live-settings',start:'2026-11-02T12:00:00',pauses:[],exercises:[{id:'row',name:'Live',phase:'main',metrics:['seconds','distance'],timerConfig:{mode:'stopwatch',workSeconds:60,restSeconds:30,rounds:3},sets:[{seconds:60,distance:25,restSeconds:30,done:false},{seconds:60,distance:25,done:false}]}],exercisePlayer:{ei:0,independent:true,mode:'stopwatch',elapsed:12.35,startedAt:'2026-11-02T14:00:00',running:true,finished:false,laps:[],setIndices:[]},countdown:{kind:'rest',ei:0,si:0,duration:30,elapsed:5,startedAt:'2026-11-02T14:00:00',running:true,finished:false}}`);
  c.form=settingsForm({workoutId:'live-settings',name:'Live renamed',metrics:['seconds','distance']});
  const liveSets=run('state.active.exercises[0].sets'),livePlayer=run('state.active.exercisePlayer'),liveRest=run('state.active.countdown');
  run('state.active.exercises[0].sets[0].done=true;state.active.exercises[0].sets[0].seconds=12.35;state.active.exercises[0].sets[0].restActualSeconds=5');
  run('saveExerciseEditor(form,"replace")');
  assert.equal(run('state.active.exercises[0].sets'),liveSets,'Unchanged Save retains the live set array, not a stale draft clone');
  assert.equal(liveSets[0].done,true);assert.equal(liveSets[0].seconds,12.35);assert.equal(liveSets[0].restActualSeconds,5);assert.equal(run('state.active.exercisePlayer'),livePlayer);assert.equal(run('state.active.countdown'),liveRest);assert.equal(livePlayer.running,true);assert.equal(liveRest.running,true);
  for(const change of ['plan','timer','remove-time']){
    c.form=settingsForm({workoutId:'live-settings',name:'Must not commit',metrics:change==='remove-time'?['distance']:['seconds','distance']});
    if(change==='plan')c.form.draft.sets[1].seconds=90;
    if(change==='timer')c.form.fields.timerMode='countdown';
    const before=plain(run('state'));assert.throws(()=>run('saveExerciseEditor(form,"replace")'),/STOP|останов|пауз/i,change+' requires an explicit stop');assert.deepEqual(plain(run('state')),before,'Rejected configuration is atomic');
  }
  run('state.active.exercisePlayer.running=false;state.active.countdown.running=false');
  c.form=settingsForm({workoutId:'live-settings',name:'Stopped edit',metrics:['seconds','distance'],timerMode:'countdown'});c.form.fields.workSeconds='1:30';c.form.draft.sets[1].seconds=90;
  assert.doesNotThrow(()=>run('saveExerciseEditor(form,"replace")'));assert.equal(run('state.active.exercises[0].timerConfig.workSeconds'),90);assert.equal(run('state.active.exercises[0].sets[0].seconds'),12.35);assert.equal(run('state.active.exercises[0].sets[0].done'),true);
  c.previousActive=priorActive;run('state.active=previousActive');
  console.log('Passed: unchanged live settings preserve in-flight set results and clock identities; running plan/timer changes reject atomically until STOP.');
}

// One field wrapper and one visible duration format; stored units remain seconds.
for(const [value,expected] of [[0,'0:00'],[90,'1:30'],[12.35,'0:12.35'],[3600.01,'60:00.01'],[86400,'1440:00']])assert.equal(run('sportDurationValue('+value+')'),expected);
for(const [value,expected] of [['0:00',0],['1:30',90],['0:12.35',12.35],['90',90],['1440:00',86400]]){c.value=value;assert.equal(run('parseSetTime(value)'),expected);}
for(const value of ['-1','0:60','1:99','1:2','abc','NaN','1:30:20']){c.value=value;assert.equal(run('parseSetTime(value)'),null);}
for(const [value,expected] of [['0:12.35',12.35],['1:30.25',90.25],['01:00:00.01',3600.01]]){c.value=value;assert.equal(run('parsePlayerResultTime(value)'),expected);}
for(const value of ['0:60.10','-1','NaN']){c.value=value;assert.equal(run('parsePlayerResultTime(value)'),null);}
assert.match(run('sportMetricInput(\'type="number" value="20"\',"кг")'),/class="sport-metric-input"><input.*sport-metric-unit.*кг/);
assert.match(run('readExerciseSet({id:"row",metrics:["seconds"]},{seconds:12.35},0)'),/0:12\.35 м:с/,'History read view preserves recorded hundredths too');

// Actual duration changes keep hundredths; malformed input restores the saved value instead of writing it.
{
  const previous=plain(run('state.active.exercises[0].sets[1]'));
  run('state.active.exercises[0].sets[1].seconds=12.35;state.active.exercises[0].sets[1].timerTargetSeconds=90');
  const attributes={},input={dataset:{setTime:'0,1'},value:'1:30.25',setAttribute(k,v){attributes[k]=v;},closest:()=>null};
  changeSetTime({target:input});
  assert.equal(run('state.active.exercises[0].sets[1].seconds'),90.25);assert.equal(input.value,'1:30.25');
  assert.equal(run('state.active.exercises[0].sets[1].timerTargetSeconds'),undefined);
  const saved=plain(run('state.active.exercises[0].sets[1]'));
  for(const invalid of ['99:99','1440:00.01','-1']){input.value=invalid;changeSetTime({target:input});assert.equal(input.value,'1:30.25');assert.equal(attributes['aria-invalid'],'true');assert.deepEqual(plain(run('state.active.exercises[0].sets[1]')),saved);}
  c.previousSet=previous;run('state.active.exercises[0].sets[1]=previousSet');
  const draft=run('createSetPlan("row","main",[{seconds:12.35,restSeconds:60,done:false}],["seconds"])');
  const time={dataset:{planValue:'seconds',planIndex:'0'},value:'0:12.35'},rest={dataset:{planRest:'0'},value:'1:30'};
  c.edgePlanRoot={dataset:{setPlan:draft.key},querySelectorAll:selector=>selector==='[data-plan-value]'?[time]:[rest]};
  run('readSetPlanInputs(edgePlanRoot)');assert.equal(draft.sets[0].seconds,12.35);assert.equal(draft.sets[0].restSeconds,90);
  rest.value='0:01.25';assert.throws(()=>run('readSetPlanInputs(edgePlanRoot)'),/Перерыв/);assert.equal(draft.sets[0].restSeconds,90);
}

// Correction form uses m:ss.hh and commits atomically, without touching workout timestamps/pulse.
run(await read('plan-fact'));
run(`state.workouts=[{id:'precise',title:'Плавание',start:'2026-11-01T10:00:00',end:'2026-11-01T10:05:00',duration:300,avgHeartRate:117,heartRateSamples:[{elapsedSeconds:0,bpm:110},{elapsedSeconds:30,bpm:124}],exercises:[{id:'row',name:'Плавание',metrics:['seconds','distance'],sets:[{seconds:12.35,distance:25,done:true},{seconds:30.2,distance:50,done:true}]}]}];openCompletedSets('precise')`);
assert.match(c.sheet.html,/data-completed-time[^>]*value="0:12.35"/);
assert.match(c.sheet.html,/sport-metric-unit[^>]*>м:с/);
const captured=plain(run('state.workouts[0]'));
const correction={id:'completed-sets-form',dataset:{id:'precise'},fields:{'metric-0-0-seconds':'0:12.35','metric-0-0-distance':'25','metric-0-1-seconds':'0:30.20','metric-0-1-distance':'50'},querySelector:()=>error};
const submitCorrection=handlers.submit.at(-1);
const submit=form=>submitCorrection({target:form,preventDefault(){},stopImmediatePropagation(){}});
submit(correction);
assert.deepEqual(plain(run('state.workouts[0].exercises')),captured.exercises);
for(const key of ['start','end','duration','avgHeartRate','heartRateSamples'])assert.deepEqual(plain(run('state.workouts[0]'))[key],captured[key]);
correction.fields['metric-0-0-seconds']='1:30.25';submit(correction);
assert.equal(run('state.workouts[0].exercises[0].sets[0].seconds'),90.25);
const valid=plain(run('state.workouts[0]'));
correction.fields['metric-0-0-distance']='123';correction.fields['metric-0-1-seconds']='0:70.25';error.textContent='';submit(correction);
assert.match(error.textContent,/Проверь/);
assert.deepEqual(plain(run('state.workouts[0]')),valid,'One invalid time rejects the entire correction, not only that field');
console.log('Passed: shared metric wrapper, m:ss validation, centisecond history roundtrip/correction, and atomic invalid-form rejection.');

// Empty tap-to-replace remains cancellation, including the new completed-history field.
{
  const qh={},q=createContext({WeakMap,Event:class{constructor(type,options){this.type=type;Object.assign(this,options);}},document:{addEventListener(type,fn){(qh[type]??=[]).push(fn);}}});
  runInContext(await read('quick-value-input'),q);
  const fire=(type,input,extra={})=>{const event={type,target:input,preventDefault(){},stopImmediatePropagation(){this.stopped=true;},...extra};for(const fn of qh[type]||[]){fn(event);if(event.stopped)break;}return event;};
  let changes=0;
  const input={value:'0:12.35',readOnly:false,disabled:false,dataset:{},matches:selector=>selector.includes('input[data-completed-time]'),dispatchEvent(event){if(event.type==='change')changes++;fire(event.type,this);},blur(){fire('focusout',this);}};
  fire('focusin',input);assert.equal(input.value,'');fire('focusout',input);assert.equal(input.value,'0:12.35');assert.equal(changes,0);
  fire('focusin',input);input.value='1:30.25';fire('input',input);fire('focusout',input);assert.equal(input.value,'1:30.25');assert.equal(changes,1);
  fire('focusin',input);input.value='9:00';fire('keydown',input,{key:'Escape'});assert.equal(input.value,'1:30.25');assert.equal(changes,1);
  input.readOnly=true;fire('focusin',input);assert.equal(input.value,'1:30.25');
}

// Template preview uses the same field and commits m:ss only on change, with the real blank-cancel guard.
{
  const th={},t=createContext({console,Date,Math,Number,JSON,WeakMap,Event:class{constructor(type,options){this.type=type;Object.assign(this,options);}},esc:String,document:{addEventListener(type,fn,capture=false){(th[type]??=[]).push({fn,capture});}}});
  const tr=code=>runInContext(code,t),library=await read('library-v2');
  tr('var state={templates:[{id:"mine",items:[],targets:{row:{seconds:60,distance:100}}}],active:null},baseTemplates=[],clone=x=>JSON.parse(JSON.stringify(x)),templates=()=>state.templates,persisted=0,persist=()=>persisted++;');
  tr(await read('metric-field'));tr(await read('set-time'));
  tr(library.slice(library.indexOf('function targetField('),library.indexOf('const existingTemplateCard=')));
  tr(library.slice(library.lastIndexOf("document.addEventListener('change',e=>{if(e.target.dataset.templateTarget==='seconds')")));
  tr(await read('quick-value-input'));
  const fire=(type,input)=>{const event={type,target:input,preventDefault(){},stopImmediatePropagation(){this.stopped=true;}};for(const {fn} of [...th[type]||[]].sort((a,b)=>Number(b.capture)-Number(a.capture))){fn(event);if(event.stopped)break;}};
  const attributes={},input={value:'1:00',dataset:{template:'mine',phase:'main',exercise:'row',templateTarget:'seconds'},validity:{valid:true},readOnly:false,disabled:false,matches:selector=>selector.includes('input[data-template-target=seconds]'),setAttribute(k,v){attributes[k]=v;},removeAttribute(k){delete attributes[k];},closest:()=>null,dispatchEvent(event){fire(event.type,this);}};
  const markup=tr('targetField(state.templates[0],{id:"row",name:"Гребля"},"main","seconds","Время",90,86400)');
  assert.match(markup,/sport-metric-input/);assert.match(markup,/data-template-target="seconds"/);assert.match(markup,/value="1:30"/);assert.match(markup,/sport-metric-unit[^>]*>м:с/);
  input.value='1:30';fire('input',input);assert.equal(tr('state.templates[0].targets.row.seconds'),60);assert.equal(tr('persisted'),0);
  fire('change',input);assert.equal(tr('state.templates[0].phaseTargets.main.row.seconds'),90);assert.equal(tr('state.templates[0].phaseTargets.main.row.distance'),100);
  const saved=plain(tr('state.templates'));input.value='99:99';fire('change',input);assert.deepEqual(plain(tr('state.templates')),saved);assert.equal(attributes['aria-invalid'],'true');
  input.value='1:30';fire('focusin',input);assert.equal(input.value,'');fire('input',input);fire('change',input);fire('focusout',input);
  assert.equal(input.value,'1:30');assert.deepEqual(plain(tr('state.templates')),saved,'An empty focused target cancels without deleting a saved target');assert.equal(tr('persisted'),1);
  fire('focusin',input);input.value='0:12.35';fire('input',input);fire('focusout',input);assert.equal(tr('state.templates[0].phaseTargets.main.row.seconds'),12.35);
  console.log('Passed: template-preview shared m:ss field, change-only commit, invalid no-change, blank cancellation and hundredths.');
}

// Work in progress stays manual: new bottom Finish reuses the existing action; no automatic completion.
run(app.slice(app.indexOf('function pulseCard('),app.indexOf('function renderDetail(')));
run('var matchingCountdown=()=>null;state.demoPulse=false;state.active.exercises.forEach(e=>e.sets.forEach(s=>s.done=true));');
const activeBefore=plain(run('state.active')),markup=run('renderActive()');
assert.match(markup,/workout-finish-card[\s\S]*data-action="finish"[\s\S]*Завершить тренировку/);
assert.equal((markup.match(/data-action="finish"/g)||[]).length,2,'Header and bottom use the same manual finish action');
assert.ok(markup.indexOf('workout-finish-card')>markup.indexOf('id="active-note"'));
assert.doesNotMatch(markup,/data-exercise-metric|exercise-mode-stack|rest-strip|rest-progress-track|data-rest-row/);
assert.deepEqual(plain(run('state.active')),activeBefore,'Rendering all-complete sets does not finish the workout');
assert.doesNotMatch(run('exercisePlayerBody(0)'),/data-player-distance-mode|data-player-metric/);
assert.doesNotMatch(run('exercisePlayerBody(0)'),/data-action="configure-exercise"/);
assert.match(run('exercisePlayerBody(0)'),/data-action="timer-actions-open"/);
run(await read('free-timer'));
assert.doesNotMatch(run('freeTimerBody()'),/data-free-switch="(?:distance|weight|reps)"/);
assert.match(run('freeTimerBody()'),/data-action="timer-actions-open" data-timer-kind="free"/);
assert.match(run('freeTimerBody()'),/data-free-switch="mode"/);
console.log('Passed: manual bottom Finish, no automatic completion, no inline metric switches/live rest bars, no duplicate exercise settings and standalone timer settings.');

// Actual Finish handler snapshots real pulse; demo/empty pulse must not create fake history values.
run(app.slice(app.indexOf("document.addEventListener('submit',ev=>"),app.indexOf("document.addEventListener('keydown',ev=>")));
const finishHandler=handlers.submit.at(-1);
run(app.slice(app.indexOf('function workoutPulseSamples('),app.indexOf('async function shareWorkout(')));
function finishActive(withPulse){
  run(`state.active={id:'finish-'+state.workouts.length,start:'2026-11-02T12:00:00',kind:'gym',pauses:[],exercises:[{id:'row',metrics:['reps','weight'],sets:[{reps:8,weight:30,done:true},{reps:8,weight:40,done:false}]}]};state.demoPulse=true;`);
  if(withPulse)run('state.active.avgHeartRate=123;state.active.heartRateSamples=[{elapsedSeconds:30,bpm:126},{elapsedSeconds:0,bpm:120}];');
  const original=run('state.active');
  finishHandler({target:{id:'workout-form',dataset:{mode:'finish'},fields:{title:'Сохранено',start:'2026-11-02T12:00:00',end:'2026-11-02T12:05:00',notes:''}},preventDefault(){}});
  return {original,saved:run('state.workouts.at(-1)')};
}
const emptyFinish=finishActive(false);assert.equal(emptyFinish.saved.avgHeartRate,undefined);assert.equal(emptyFinish.saved.heartRateSamples,undefined);assert.equal(run('workoutAveragePulse(state.workouts.at(-1))'),null);
run('showWorkoutPulse(state.workouts.at(-1))');assert.doesNotMatch(c.sheet.html,/<polyline/);assert.match(c.sheet.html,/нет серии измерений/);
const realFinish=finishActive(true);assert.equal(realFinish.saved.avgHeartRate,123);assert.deepEqual(plain(realFinish.saved.heartRateSamples),plain(realFinish.original.heartRateSamples));assert.notEqual(realFinish.saved.heartRateSamples,realFinish.original.heartRateSamples);assert.equal(realFinish.saved.exercises[0].sets.length,1);
realFinish.original.heartRateSamples[0].bpm=199;assert.equal(realFinish.saved.heartRateSamples[0].bpm,126);
run('showWorkoutPulse(state.workouts.at(-1))');assert.match(c.sheet.html,/<polyline/);assert.doesNotMatch(c.sheet.html,/NaN|Infinity/);
console.log('Passed: real Finish snapshots actual pulse independently; empty/demo pulse creates neither fake average nor fake graph.');

// Collapsed <details> is presentation only: existing recurrence inputs remain enabled and save intact.
{
  const ph={},p=createContext({console,Date,Intl,Math,Number,JSON,TextEncoder,FormData:FormDataFixture,document:{addEventListener(t,fn){(ph[t]??=[]).push(fn);}},render(){},renderSection:()=>'',renderTemplateCard:()=>'',editTemplate(){},persist(){},closeSheet(){},goto(){},openPanel(){},toast(){},icon:String,esc:String,workoutIconValue:()=>null});
  const pr=code=>runInContext(code,p);
  pr(`var clone=x=>JSON.parse(JSON.stringify(x)),dayNow=()=> '2026-11-02',libraryTab='',baseTemplates=[],state={workouts:[],templates:[{id:'t',title:'План',kind:'gym',items:[['row','main',1]]}]};var templates=()=>state.templates;function serializeTemplateItems(f){return clone(state.templates[0].items)};function legacyDiary(){return ''};function renderTop(){return ''}`);
  pr(await read('metric-field'));pr(await read('schedule-model'));pr(planning);
  pr(`state.schedules=[{id:'s',templateId:'t',mode:'weekly',startDate:'2026-11-03',endDate:'2026-12-01',time:'17:45',timeZone:'Europe/Moscow',minutes:75,days:[2,4],note:'Не терять заметку',reminder:15,revision:2,archived:false}];`);
  const scheduleBefore=plain(pr('state.schedules[0]')),html=pr('scheduleFields(state.schedules[0])');
  assert.match(html,/<details class="schedule-disclosure"><summary>Расписание настроено/);
  assert.doesNotMatch(html,/<details[^>]*\sopen(?:[\s=>])/);
  for(const [name,value] of [['scheduleDate','2026-11-03'],['scheduleEnd','2026-12-01'],['scheduleTime','17:45'],['scheduleZone','Europe/Moscow'],['planMinutes','75']])assert.match(html,new RegExp('name="'+name+'"[^>]*value="'+value+'"'));
  assert.match(html,/value="2" checked/);assert.match(html,/value="4" checked/);assert.match(html,/Не терять заметку/);assert.doesNotMatch(html,/<(?:input|select|textarea)[^>]*\sdisabled/);
  const form={id:'template-form',dataset:{id:'t',scheduleId:'s'},fields:{title:'Переименованный план',kind:'gym',favorite:'on',scheduleMode:'weekly',scheduleDate:'2026-11-03',scheduleEnd:'2026-12-01',scheduleTime:'17:45',scheduleZone:'Europe/Moscow',scheduleDays:['2','4'],planMinutes:'75',planNote:'Не терять заметку',planReminder:'15'},querySelector:()=>error};
  for(const fn of ph.submit||[])fn({target:form,preventDefault(){},stopImmediatePropagation(){}});
  const after=plain(pr('state.schedules[0]'));
  for(const key of ['id','templateId','mode','startDate','endDate','time','timeZone','minutes','days','note','reminder'])assert.deepEqual(after[key],scheduleBefore[key],key+' survives saving without expanding schedule');
  assert.equal(pr('state.templates[0].title'),'Переименованный план');
  console.log('Passed: collapsed schedule retains enabled recurrence/date/time/zone/note/reminder controls and real-save field values.');
}
