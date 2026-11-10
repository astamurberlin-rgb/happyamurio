import {readFile} from 'node:fs/promises';
import {createContext,runInContext} from 'node:vm';
import assert from 'node:assert/strict';

// Real models and delegated handlers; DOM fixtures model event order, not browser layout.
const read=name=>readFile(new URL('../src/'+name+'.js',import.meta.url),'utf8'),plain=v=>JSON.parse(JSON.stringify(v));
const handlers={},windowHandlers={},restRoot={innerHTML:'',dataset:{},querySelector:()=>null},extra={hidden:false};
const classes=(...initial)=>({values:new Set(initial),add(k){this.values.add(k);},remove(k){this.values.delete(k);},contains(k){return this.values.has(k);},toggle(k,on){if(on??!this.values.has(k))this.values.add(k);else this.values.delete(k);}});
let sheet=null,lastSheet=null,lastUndo=null;
const modalRoot={childNodes:[],replaceChildren(...nodes){this.childNodes=nodes;sheet=nodes[0]?.sheet||null;}};
const document={activeElement:null,body:{style:{},classList:classes(),append(){}},addEventListener(type,fn,options){(handlers[type]??=[]).push({fn,capture:options===true||options?.capture===true});},getElementById(id){return id==='modal-root'?modalRoot:id==='rest-pill-root'?restRoot:id==='sheet-title'?{textContent:lastSheet?.title}:null;},querySelector(selector){return selector==='#overlay .sheet'?sheet:null;},querySelectorAll(){return [];}};
class FormDataFixture{constructor(form){this.fields=form.fields;}get(k){return this.fields[k]??null;}getAll(k){const v=this.fields[k];return Array.isArray(v)?v:v==null?[]:[v];}}
const c=createContext({console,Date,Math,Number,JSON,Map,document,window:{addEventListener(type,fn,options){(windowHandlers[type]??=[]).push({fn,capture:options===true});}},FormData:FormDataFixture,setInterval(){},nav(){},render(){},renderProfile:()=>'',renderDetail:()=>'',persist(){},toast(message,undo){lastUndo=undo||lastUndo;},icon:String,esc:String,fmt:String,durationText:String,workoutIconValue:()=>null,goto(){},wireGrip(){},closeSheet(){modalRoot.replaceChildren();run("sheetKind=''");},openSheet(title,html,kind=''){lastSheet={title,html};sheet={scrollTop:0,childNodes:[{title},{html}],replaceChildren(...nodes){this.childNodes=nodes;},querySelector:()=>null,insertAdjacentHTML(where,html){this.childNodes.push({html});}};modalRoot.replaceChildren({sheet});run('sheetKind='+JSON.stringify(kind));},$:selector=>selector==='#exercise-config-form .exercise-extra'?extra:null});
const run=code=>runInContext(code,c);
run(`var now='2026-11-02T12:00:00.000',localNow=()=>now.slice(0,19),clone=x=>JSON.parse(JSON.stringify(x)),sheetKind='',priorFocus=null,view='active',detailId=null;
var SEED={exercises:[{id:'hold',name:'Планка',description:'Держать корпус ровно',profile:'hold',metrics:['seconds']}]},state={customExercises:[],workouts:[],templates:[],active:null},exercise=id=>SEED.exercises.find(e=>e.id===id),allExercises=()=>SEED.exercises,templates=()=>state.templates,muscleGroups=[],exerciseMuscles=()=>[],scheduleZone=()=> 'UTC';
function blankSet(){return {seconds:0,done:false}}function volume(){return 0}function startWorkout(){}function pickExercise(){}function customExercise(){}function renderHistory(){}function openExerciseHistory(id){openSheet('История',id)}`);
const config=await read('exercise-config'),app=await read('app');
for(const name of ['metric-field','workout-pause','set-rest','set-countdown','set-time','set-plan','set-swipe'])run(await read(name));
run((await read('timer-action-wheel')).split('function timerWheelContext(')[0]);
run(config);run('updateExerciseEditor=()=>{}');run(await read('exercise-player'));run('playerNow=()=>now');
run(app.slice(app.indexOf('function activeExercise('),app.indexOf('function renderDetail(')));
run(app.slice(app.indexOf("document.addEventListener('submit',ev=>"),app.indexOf("document.addEventListener('keydown',ev=>")));
run(await read('rest-pill'));run(await read('workout-interactions'));
function reset(){run(`now='2026-11-02T12:00:00.000';state.active={id:'fixture',start:now,pauses:[],exercises:[{id:'hold',name:'Планка',metrics:['seconds'],phase:'main',collapsed:false,sets:[{seconds:20,restSeconds:60,done:false},{seconds:40,restSeconds:30,done:false}]}]};restWidgetSelection=null;restWidgetHidden=null;exerciseSwipeClickUntil=0;setSwipeClickUntil=0;`);restRoot.innerHTML='';restRoot.dataset.signature='';lastUndo=null;}
function at(seconds){c.clockSeconds=seconds;run('now=new Date(Date.parse("2026-11-02T12:00:00.000Z")+clockSeconds*1000).toISOString().slice(0,-1)');}
function target(dataset={},lookup={}){return {dataset,matches:()=>false,closest(selector){if(Object.hasOwn(lookup,selector))return typeof lookup[selector]==='function'?lookup[selector]():lookup[selector];if(selector==='[data-action]'&&dataset.action)return this;if(selector==='[data-rest-pill]'&&dataset.restPill)return this;const a=selector.match(/^\[data-action=["']?([^\]"']+)["']?\]$/)?.[1];return a&&a===dataset.action?this:null;}};}
function fire(type,target,props={}){const event={type,target,preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;},...props};const list=[...(windowHandlers[type]||[]).filter(x=>x.capture),...(handlers[type]||[]).filter(x=>x.capture),...(handlers[type]||[]).filter(x=>!x.capture),...(windowHandlers[type]||[]).filter(x=>!x.capture)];for(const {fn} of list){fn(event);if(event.stopped)break;}return event;}
const click=(action,extra={})=>fire('click',target({action,ei:'0',si:'0',...extra}));
const pillClick=action=>fire('click',target({restPill:action}));

// Collapsing removes only the inline clock; the persisted engine and its time continue.
reset();run('ensurePlayerDraft(0);toggleExercisePlayer(0,now)');at(10.25);click('collapse-exercise');
assert.equal(run('state.active.exercises[0].collapsed'),true);assert.equal(run('state.active.exercisePlayer.running'),true);at(15.75);assert.equal(run('exercisePlayerElapsed(state.active.exercisePlayer,now)'),15.75);
let html=run('activeExercise(state.active.exercises[0],0)');assert.doesNotMatch(html,/data-timed-widget|collapse-chevron/);assert.match(html,/aria-expanded="false"/);assert.equal((html.match(/data-action="configure-exercise"/g)||[]).length,1);assert.doesNotMatch(html,/data-action="exercise-detail"/);
click('collapse-exercise');html=run('activeExercise(state.active.exercises[0],0)');assert.match(html,/data-timed-widget="0"/);assert.equal((html.match(/data-action="add-set"/g)||[]).length,1);assert.match(html,/data-rest-line="0,0"/);assert.doesNotMatch(html,/rest-strip|rest-progress-track/);
click('configure-exercise');assert.match(lastSheet.html,/data-scope="active"/);assert.match(lastSheet.html,/local-exercise-history/);assert.match(lastSheet.html,/local-exercise-instructions/);assert.doesNotMatch(lastSheet.html,/data-action="(?:pick|configure)-exercise"/);assert.match(lastSheet.html,/Сохранить для этой тренировки/); // Legacy fallback without context module; mounted tabs are checked separately.
const originalSheet=sheet,originalOverlay=modalRoot.childNodes[0],originalNodes=sheet.childNodes,localForm={draft:'unsaved title + fields'};sheet.childNodes.push(localForm);sheet.scrollTop=148;let focused=false;document.activeElement={focus(){focused=true;}};
click('local-exercise-instructions',{id:'hold'});assert.match(lastSheet.html,/Держать корпус ровно/);click('return-local-exercise');assert.equal(sheet,originalSheet);assert.equal(modalRoot.childNodes[0],originalOverlay);assert.deepEqual(sheet.childNodes,originalNodes);assert.equal(sheet.childNodes.at(-1),localForm,'Returning restores the exact unsaved form nodes');assert.equal(sheet.scrollTop,148);assert.equal(run('sheetKind'),'exercise-config');assert.equal(focused,true);
click('local-exercise-history',{id:'hold'});assert.equal(lastSheet.title,'История');click('return-local-exercise');assert.equal(sheet.childNodes.at(-1),localForm);
run('openExerciseEditor("hold",null)');assert.match(lastSheet.html,/data-scope="library"/);assert.doesNotMatch(lastSheet.html,/local-exercise-history|local-exercise-instructions/);
console.log('Passed: collapse hides only inline clock, direct local settings, one entry, and exact unsaved draft return from history/instructions.');

// Deletion is restricted to collapsed cards, retains unrelated clocks, and undo is session-guarded.
reset();run('state.active.exercises.push(clone(state.active.exercises[0]));state.active.exercises[1].name="Другая";state.active.exercises[0].collapsed=true;state.active.exercises[1].collapsed=true;ensurePlayerDraft(1);toggleExercisePlayer(1,now);startSetCountdown("rest",1,0,now)');
const player=run('state.active.exercisePlayer'),countdown=run('state.active.countdown'),owner=run('state.active.exercises[1]');at(12);
const undo=run('deleteWorkoutExercise(0)');assert.equal(run('state.active.exercises[0]'),owner);assert.equal(player.ei,0);assert.equal(countdown.ei,0);at(17);assert.equal(run('exercisePlayerElapsed(state.active.exercisePlayer,now)'),17);assert.equal(run('countdownRemaining(state.active.countdown,now)'),43);undo();assert.equal(player.ei,1);assert.equal(countdown.ei,1);assert.equal(run('state.active.exercises[1]'),owner);
const undoOwn=run('deleteWorkoutExercise(1)');assert.equal(run('state.active.exercisePlayer'),null);assert.equal(run('state.active.countdown'),null);undoOwn();assert.equal(run('state.active.exercisePlayer.ei'),1);assert.equal(run('state.active.countdown.ei'),1);
run('state.active.exercises[0].collapsed=false');assert.equal(run('deleteWorkoutExercise(0)'),null);
const staleUndo=run('deleteWorkoutExercise(1)');reset();const untouched=plain(run('state.active'));staleUndo();assert.deepEqual(plain(run('state.active')),untouched);

// Real pointer handlers: right reveals, vertical/left/cancel do not delete, synthetic click does not expand.
reset();run('state.active.exercises[0].collapsed=true');
const deleteButton={setAttribute(){},focus(){}},body={style:{}},card={dataset:{exerciseCard:'0'},classList:classes('is-collapsed'),querySelector:s=>s==='.exercise-swipe-content'?body:deleteButton,setPointerCapture(){}};
const heading=target({action:'collapse-exercise',ei:'0'},{'[data-exercise-card].is-collapsed':()=>card.classList.contains('is-collapsed')?card:null});heading.matches=s=>s==='.exercise-collapse';
const pointer=(type,x,y=20)=>fire(type,heading,{pointerId:1,button:0,clientX:x,clientY:y,cancelable:true});
pointer('pointerdown',50);pointer('pointermove',125,22);pointer('pointerup',125,22);assert.equal(card.classList.contains('exercise-swipe-open'),true);assert.equal(run('state.active.exercises.length'),1);fire('click',heading);assert.equal(run('state.active.exercises[0].collapsed'),true,'Post-swipe click cannot expand the card');
click('delete-workout-exercise');assert.equal(run('state.active.exercises.length'),0);assert.equal(typeof lastUndo,'function');lastUndo();assert.equal(run('state.active.exercises.length'),1);
c.card=card;run('setExerciseSwipeOpen(card,false)');pointer('pointerdown',150);pointer('pointermove',70,22);pointer('pointerup',70,22);assert.equal(card.classList.contains('exercise-swipe-open'),false);
pointer('pointerdown',50);pointer('pointermove',55,90);pointer('pointerup',130,100);assert.equal(card.classList.contains('exercise-swipe-open'),false);
pointer('pointerdown',50);pointer('pointermove',125,22);pointer('pointercancel',125,22);assert.equal(card.classList.contains('exercise-swipe-open'),false);
fire('keydown',heading,{key:'Delete'});assert.equal(card.classList.contains('exercise-swipe-open'),true);fire('keydown',heading,{key:'Escape'});assert.equal(card.classList.contains('exercise-swipe-open'),false);
console.log('Passed: recoverable collapsed-exercise deletion, running timer reindex/undo, right-swipe intent lock, vertical/cancel protection and keyboard reveal.');

// Preview and dismiss are presentation only: neither starts/stops nor manufactures an actual duration.
reset();const planned=plain(run('state.active'));click('open-rest-widget');assert.equal(run('activeRestContext().kind'),'preview');assert.equal(run('state.active.countdown'),undefined);assert.match(restRoot.innerHTML,/data-rest-pill/);pillClick('finish');assert.equal(restRoot.innerHTML,'');assert.deepEqual(plain(run('state.active')),planned);
click('open-rest-widget');pillClick('toggle');assert.equal(run('state.active.countdown.running'),true);at(10);
const engine=run('state.active.countdown'),pillTarget=target({}, {'.floating-rest-pill':{}});
fire('pointerdown',pillTarget,{pointerId:2,button:0,clientX:20,clientY:20});fire('pointerup',pillTarget,{pointerId:2,clientX:25,clientY:100});assert.equal(restRoot.innerHTML,'');assert.equal(run('state.active.countdown'),engine);assert.equal(engine.running,true);assert.equal(run('countdownRemaining(state.active.countdown,now)'),50);
click('open-rest-widget');assert.match(restRoot.innerHTML,/floating-rest-pill/);assert.equal(run('state.active.countdown'),engine);fire('keydown',pillTarget,{key:'Escape'});assert.equal(restRoot.innerHTML,'');
click('open-rest-widget',{si:'1'});assert.equal(run('activeRestContext().kind'),'preview');run('setFloatingRestTime("0:45",now)');assert.equal(run('state.active.exercises[0].sets[1].restSeconds'),45);assert.equal(run('state.active.countdown'),engine);assert.equal(engine.running,true);assert.equal(run('countdownRemaining(state.active.countdown,now)'),50,'Preview/editing another rest does not replace the running engine');pillClick('finish');assert.equal(engine.running,true);assert.equal(run('state.active.exercises[0].sets[1].restActualSeconds'),undefined);
run('startSetCountdown("rest",0,1,now);updateFloatingRest()');assert.match(restRoot.innerHTML,/floating-rest-pill/,'A new rest clears the presentation dismissal');

// Actual rest accumulates completed segments, excludes both kinds of pause, and survives serialization.
reset();run('startSetCountdown("rest",0,0,now)');at(20);run('captureRestActual(state.active.countdown,now)');assert.equal(run('state.active.exercises[0].sets[0].restActualSeconds'),20);
run('setFloatingRestTime("0:30",now)');at(30);run('toggleSetCountdown("rest",0,0,now)');at(90);run('captureRestActual(state.active.countdown,now)');assert.equal(run('state.active.exercises[0].sets[0].restActualSeconds'),30);
run('toggleSetCountdown("rest",0,0,now)');at(100);run('toggleWorkoutPause(state.active,now)');at(160);run('captureRestActual(state.active.countdown,now)');assert.equal(run('state.active.exercises[0].sets[0].restActualSeconds'),40);
run('toggleWorkoutPause(state.active,now)');at(165);run('finishFloatingRest(now)');assert.equal(run('state.active.exercises[0].sets[0].restActualSeconds'),45);assert.equal(run('state.active.exercises[0].sets[0].restSeconds'),30);assert.match(run('renderReadRest(state.active.exercises[0].sets[0])'),/0:45/);run('state.active=clone(state.active)');assert.equal(run('displayedRestSeconds(state.active.exercises[0].sets[0])'),45);
reset();run('state.active.exercises[0].sets[0].restSeconds=10;startSetCountdown("rest",0,0,now)');at(20);run('updateSetCountdown()');assert.equal(run('state.active.exercises[0].sets[0].restActualSeconds'),10);run('extendFloatingRest(now)');at(25);run('setFloatingRestTime("0:20",now)');at(30);run('finishFloatingRest(now)');assert.equal(run('state.active.exercises[0].sets[0].restActualSeconds'),20,'Expiry + extension + remaining-time edit retains every spent segment');
assert.match(run('renderReadRest({restSeconds:60})'),/1:00/);assert.equal(run('Object.hasOwn({restSeconds:60},"restActualSeconds")'),false);assert.match(run('renderReadRest({restSeconds:60,restActualSeconds:0})'),/0:00/,'Zero actual is not replaced with the plan');
console.log('Passed: preview/dismiss never start/stop a clock; actual rest survives edits, expiry extension, pause, finish and reload; legacy rows remain planned.');

// Interval-player rests use the same accumulated actual semantics, including early skip.
function interval(){reset();run('state.active.exercisePlayer={ei:0,mode:"intervals",workSeconds:20,restSeconds:10,rounds:2,program:[{workSeconds:20,restSeconds:10},{workSeconds:40,restSeconds:0}],setIndices:[0,1],startedAt:now,elapsed:0,running:true,finished:false,completedRounds:0,laps:[]}');}
interval();at(23);run('syncExercisePlayer(now)');assert.equal(run('state.active.exercises[0].sets[0].restActualSeconds'),3);run('setFloatingRestTime("0:12",now)');at(28);run('syncExercisePlayer(now)');assert.equal(run('state.active.exercises[0].sets[0].restActualSeconds'),8);run('finishFloatingRest(now)');assert.equal(run('state.active.exercises[0].sets[0].restActualSeconds'),8);assert.equal(run('exercisePlayerStatus(state.active.exercisePlayer,now).round'),2);at(35);run('syncExercisePlayer(now)');assert.equal(run('state.active.exercises[0].sets[0].restActualSeconds'),8,'Later player ticks do not overwrite an early-finished rest');
interval();at(23);run('syncExercisePlayer(now);extendFloatingRest(now)');at(28);run('finishFloatingRest(now)');assert.equal(run('state.active.exercises[0].sets[0].restActualSeconds'),8);
interval();at(120);run('syncExercisePlayer(now)');assert.equal(run('state.active.exercises[0].sets[0].restActualSeconds'),10);assert.equal(run('state.active.exercisePlayer.finished'),true);

// Capture-phase Finish snapshots the live rest before app's bubble-phase handler clones the workout.
reset();run('state.active.exercises[0].sets[0].done=true;startSetCountdown("rest",0,0,now)');at(12.5);
fire('submit',{id:'workout-form',dataset:{mode:'finish'},fields:{title:'Сохранено',start:'2026-11-02T12:00:00',end:'2026-11-02T12:00:13',notes:''}});
assert.equal(run('state.active'),null);assert.equal(run('state.workouts.at(-1).exercises[0].sets[0].restActualSeconds'),12.5);
const past=plain(run('state.workouts.at(-1)'));click('repeat-workout',{id:past.id});assert.equal(run('state.active.exercises[0].sets[0].restActualSeconds'),undefined);assert.equal(run('state.active.exercises[0].sets[0].restSeconds'),60);assert.equal(run('state.active.exercises[0].sets[0].done'),false);assert.deepEqual(plain(run('state.workouts.at(-1)')),past);
assert.equal(run('setPlanCopy({restSeconds:60,restActualSeconds:12,restDone:true}).restActualSeconds'),undefined,'Actual rest does not become a fresh template/default target');
interval();at(25);fire('submit',{id:'workout-form',dataset:{mode:'finish'},fields:{title:'Интервалы',start:'2026-11-02T12:00:00',end:'2026-11-02T12:00:25',notes:''}});assert.equal(run('state.workouts.at(-1).exercises[0].sets[0].restActualSeconds'),5,'Finish captures the interval-player rest before filtering completed approaches');
reset();run('state.active.exercises[0].sets[0].done=true');at(25);fire('submit',{id:'workout-form',dataset:{mode:'finish'},fields:{title:'Без запуска отдыха',start:'2026-11-02T12:00:00',end:'2026-11-02T12:00:25',notes:''}});assert.equal(run('state.workouts.at(-1).exercises[0].sets[0].restActualSeconds'),undefined,'A planned but never started rest has no fabricated actual in history');
console.log('Passed: interval rest actuals, precise in-progress Finish snapshot, and repeat/template reset without rewriting past history.');

// The rest LINE removes only its rest; this is intentionally different from dismissing the widget.
reset();const libraryBefore=plain(run('SEED')),restSet=run('state.active.exercises[0].sets[0]');
run('state.active.exercises[0].sets[0].done=true;ensurePlayerDraft(0);toggleExercisePlayer(0,now);startSetCountdown("rest",0,0,now)');
at(20);run('setFloatingRestTime("0:30",now)');at(25);const independent=run('state.active.exercisePlayer'),restUndo=run('deleteWorkoutRow("rest",0,0)');
assert.equal(run('state.active.countdown'),null);assert.equal(run('state.active.exercisePlayer'),independent);assert.equal(independent.running,true);assert.equal(run('state.active.exercises.length'),1);assert.equal(run('state.active.exercises[0].sets.length'),2);assert.equal(run('state.active.exercises[0].sets[0]'),restSet);assert.equal(restSet.seconds,20);assert.equal(restSet.done,true);
for(const k of ['restSeconds','restActualSeconds','restDone'])assert.equal(Object.hasOwn(restSet,k),false);
assert.equal(run('deleteWorkoutRest(0,0,now)'),null,'Repeated removal cannot create a second undo');restSet.reps=11;
at(125);restUndo();assert.equal(restSet.reps,11,'Undo restores only rest properties, not other edits');assert.equal(restSet.restSeconds,30);assert.equal(restSet.restActualSeconds,25);assert.equal(run('countdownRemaining(state.active.countdown,now)'),25);assert.equal(run('exercisePlayerElapsed(state.active.exercisePlayer,now)'),125);
at(130);run('captureRestActual(state.active.countdown,now)');assert.equal(restSet.restActualSeconds,30,'Undo excludes the entire deleted gap, retaining earlier adjusted segments');const once=plain(run('state.active'));restUndo();assert.deepEqual(plain(run('state.active')),once,'Undo is idempotent');assert.deepEqual(plain(run('SEED')),libraryBefore);

// A different running rest, its preview, and a newer clock cannot be rolled back by this undo.
reset();run('startSetCountdown("rest",0,1,now);openRestWidget(0,0)');at(8);const otherClock=run('state.active.countdown'),otherBefore=plain(otherClock),otherUndo=run('deleteWorkoutRest(0,0,now)');assert.equal(run('state.active.countdown'),otherClock);assert.deepEqual(plain(otherClock),otherBefore);assert.equal(run('activeRestContext().si'),1);at(18);otherUndo();assert.equal(run('state.active.countdown'),otherClock);assert.equal(run('countdownRemaining(state.active.countdown,now)'),12);assert.equal(run('state.active.exercises[0].sets[0].restActualSeconds'),undefined);
reset();run('startSetCountdown("rest",0,0,now)');at(5);const oldUndo=run('deleteWorkoutRest(0,0,now)');at(10);run('startSetCountdown("rest",0,1,now)');const newerClock=run('state.active.countdown');at(20);oldUndo();assert.equal(run('state.active.countdown'),newerClock);assert.equal(run('countdownRemaining(state.active.countdown,now)'),20);

// Identity guards follow reordered live sets, but never resurrect a deleted set or a different workout.
reset();run('startSetCountdown("rest",0,0,now)');at(5);const movedUndo=run('deleteWorkoutRest(0,0,now)');run('state.active.exercises[0].sets.unshift({seconds:7,done:false});state.active.exercises.unshift({id:"other",sets:[]})');at(50);movedUndo();assert.equal(run('state.active.countdown.ei'),1);assert.equal(run('state.active.countdown.si'),1);assert.equal(run('countdownRemaining(state.active.countdown,now)'),55);
reset();const orphanUndo=run('deleteWorkoutRest(0,0,now)');run('state.active.exercises[0].sets.splice(0,1)');const orphanState=plain(run('state.active'));orphanUndo();assert.deepEqual(plain(run('state.active')),orphanState);
reset();const newWorkoutUndo=run('deleteWorkoutRest(0,0,now)');reset();const newWorkout=plain(run('state.active'));newWorkoutUndo();assert.deepEqual(plain(run('state.active')),newWorkout);
reset();const conflictUndo=run('deleteWorkoutRest(0,0,now)');run('state.active.exercises[0].sets[0].restSeconds=77');conflictUndo();assert.equal(run('state.active.exercises[0].sets[0].restSeconds'),77);
console.log('Passed: rest-only deletion/Undo, adjusted elapsed frozen during deletion, unrelated/newer clocks preserved, and set/workout identity guards.');

// A separator button permits swipe, but the resulting synthetic click cannot open/start the widget.
reset();const lineContent={style:{}},lineRow={dataset:{swipeKind:'rest',ei:'0',si:'0'},classList:classes(),querySelector:s=>s==='.swipe-content'?lineContent:{focus(){}},setPointerCapture(){}};
const separator=target({action:'open-rest-widget',ei:'0',si:'0'},{'.set-swipe':lineRow,'.rest-separator':true,'input,button,textarea,select':true});
const linePointer=(type,x,y=20)=>fire(type,separator,{pointerId:3,button:0,clientX:x,clientY:y,cancelable:true});
assert.match(run('renderSetRest(state.active.exercises[0].sets[0],0,0,"Планка")'),/data-swipe-kind="rest"/);
fire('click',separator);assert.equal(run('activeRestContext().kind'),'preview');assert.equal(run('state.active.countdown'),undefined);run('dismissRestWidget()');
linePointer('pointerdown',30);linePointer('pointermove',110,22);linePointer('pointerup',110,22);assert.equal(lineRow.classList.contains('swipe-open'),true);const suppressed=fire('click',separator);assert.equal(suppressed.stopped,true);assert.equal(restRoot.innerHTML,'');assert.equal(run('state.active.exercises[0].sets[0].restSeconds'),60,'Swiping reveals deletion; it does not silently delete');
click('delete-set-row',{rowKind:'rest'});assert.equal(run('state.active.exercises[0].sets[0].restSeconds'),undefined);assert.equal(run('state.active.exercises[0].sets.length'),2);assert.equal(run('state.active.exercises.length'),1);lastUndo();assert.equal(run('state.active.exercises[0].sets[0].restSeconds'),60);
c.lineRow=lineRow;run('setSwipeOpen(lineRow,false);setSwipeClickUntil=0');const beforeVertical=plain(run('state.active'));linePointer('pointerdown',30);linePointer('pointermove',33,100);linePointer('pointerup',100,120);assert.equal(lineRow.classList.contains('swipe-open'),false);assert.deepEqual(plain(run('state.active')),beforeVertical);
linePointer('pointerdown',30);linePointer('pointermove',110,22);linePointer('pointercancel',110,22);assert.equal(lineRow.classList.contains('swipe-open'),false);assert.deepEqual(plain(run('state.active')),beforeVertical);
console.log('Passed: rest-line tap opens preview; swipe reveals rest-only delete without widget/collapse bubbling; vertical and cancelled gestures preserve data.');

// Deleting a current interval rest pauses at the next work boundary; Undo resumes the same partial rest.
interval();at(23);run('syncExercisePlayer(now)');const intervalUndo=run('deleteWorkoutRest(0,0,now)');assert.equal(run('state.active.exercisePlayer.running'),false);assert.equal(run('exercisePlayerStatus(state.active.exercisePlayer,now).round'),2);assert.equal(run('exercisePlayerStatus(state.active.exercisePlayer,now).remaining'),40);at(123);intervalUndo();assert.equal(run('state.active.exercisePlayer.running'),true);assert.equal(run('exercisePlayerStatus(state.active.exercisePlayer,now).remaining'),7);at(125);run('syncExercisePlayer(now)');assert.equal(run('state.active.exercises[0].sets[0].restActualSeconds'),5,'Deleted time does not count as interval rest');

// If work was manually continued, Undo restores the rest record without replaying it or inventing duration.
interval();at(23);run('syncExercisePlayer(now)');const advancedUndo=run('deleteWorkoutRest(0,0,now)');at(50);run('toggleExercisePlayer(0,now)');at(55);advancedUndo();assert.equal(run('exercisePlayerStatus(state.active.exercisePlayer,now).round'),2);assert.equal(run('exercisePlayerStatus(state.active.exercisePlayer,now).remaining'),35);run('syncExercisePlayer(now)');assert.equal(run('state.active.exercises[0].sets[0].restActualSeconds'),3);assert.equal(run('state.active.exercises[0].sets[0].restDone'),true);

// A future removed rest that is passed while backgrounded has known zero actual, even before the next tick.
interval();at(5);run('syncExercisePlayer(now)');const skippedUndo=run('deleteWorkoutRest(0,0,now)');at(25);skippedUndo();assert.equal(run('exercisePlayerStatus(state.active.exercisePlayer,now).round'),2);assert.equal(run('exercisePlayerStatus(state.active.exercisePlayer,now).remaining'),35);assert.equal(run('state.active.exercises[0].sets[0].restActualSeconds'),0);run('syncExercisePlayer(now)');assert.equal(run('state.active.exercises[0].sets[0].restActualSeconds'),0,'The first post-background sync must not replace skipped-rest zero with the full plan');assert.equal(run('state.active.exercises[0].sets[0].done'),true,'The same sync still records the legitimately completed work');
interval();at(23);const unsyncedUndo=run('deleteWorkoutRest(0,0,now)');at(50);run('toggleExercisePlayer(0,now)');at(55);unsyncedUndo();run('syncExercisePlayer(now)');assert.equal(run('state.active.exercises[0].sets[0].restActualSeconds'),3,'Unsynced work completion also preserves a partial rest after continuing');assert.equal(run('state.active.exercises[0].sets[0].done'),true);assert.equal(run('exercisePlayerStatus(state.active.exercisePlayer,now).remaining'),35);
console.log('Passed: interval rest deletion pauses safely; Undo excludes deleted gaps and preserves continued work/partial or skipped actual rest.');
