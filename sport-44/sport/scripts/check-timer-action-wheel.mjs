import {readFile} from 'node:fs/promises';
import {createContext,runInContext} from 'node:vm';
import assert from 'node:assert/strict';

// Actual wheel/timer models and delegated handlers. These DOM contracts do not emulate native touch/layout.
const read=name=>readFile(new URL('../src/'+name+'.js',import.meta.url),'utf8'),plain=x=>JSON.parse(JSON.stringify(x));
let wall=1000,lastSheet=null,lastUndo=null;
class Clock extends Date{static now(){return wall;}}
const nodes=new Map(),docHandlers={},windowHandlers={};
const classes=()=>({items:new Set(),add(x){this.items.add(x);},remove(x){this.items.delete(x);},contains(x){return this.items.has(x);},toggle(x,on){(on??!this.items.has(x))?this.items.add(x):this.items.delete(x);}});
class Node {
  constructor(kind='div'){this.kind=kind;this.dataset={};this.style={};this.classList=classes();this.attrs={};this.children={};this.isConnected=true;this.scrollTop=0;this.textContent='';}
  setAttribute(k,v){this.attrs[k]=String(v);}
  getAttribute(k){return this.attrs[k]??null;}
  focus(){document.activeElement=this;}
  setPointerCapture(){}
  remove(){this.isConnected=false;if(this.id)nodes.delete(this.id);}
  append(node){if(node.id)nodes.set(node.id,node);}
  insertAdjacentHTML(where,html){this.html=(this.html||'')+html;}
  closest(selector){if(selector==='[data-action]'&&this.dataset.action)return this;if(selector==='.timer-wheel-disc'&&this.kind==='disc')return this;return null;}
  set innerHTML(html){this.html=html;this.children={};
    if(html.includes('timer-wheel-disc')){const disc=new Node('disc');disc.attrs={'aria-valuenow':'0','aria-valuetext':'История'};this.children['.timer-wheel-disc']=disc;this.children['.timer-wheel-execute']=new Node('execute');this.children['.timer-wheel-execute'].dataset.action='timer-actions-execute';this.children['.timer-wheel-selected']=new Node('status');}
    if(html.includes('timer-actions-cancel')){this.children.cancel=new Node('button');this.children.cancel.dataset.action='timer-actions-cancel';}
    if(html.includes('timer-actions-reset-confirm')){this.children.confirm=new Node('button');this.children.confirm.dataset.action='timer-actions-reset-confirm';}
  }
  get innerHTML(){return this.html||'';}
  querySelector(selector){if(selector==='.sheet')return this.sheet||null;if(selector.includes('timer-actions-cancel'))return this.children.cancel||null;if(selector.includes('timer-actions-reset-confirm'))return this.children.confirm||null;return this.children[selector]||null;}
  querySelectorAll(selector){return selector==='button:not(:disabled),[tabindex="0"]'?[this.children.cancel,this.children['.timer-wheel-disc'],this.children['.timer-wheel-execute'],this.children.confirm].filter(Boolean):[];}
}
const document={activeElement:null,body:new Node('body'),addEventListener(type,fn,options){(docHandlers[type]??=[]).push({fn,capture:options===true||options?.capture===true});},createElement:kind=>new Node(kind),getElementById:id=>nodes.get(id)||null,querySelector(selector){const root=nodes.get('timer-action-wheel-root');if(selector==='.timer-wheel-disc')return root?.querySelector(selector)||null;if(selector.startsWith('#timer-action-wheel-root '))return root?.querySelector(selector.slice('#timer-action-wheel-root '.length))||null;if(selector==='.exercise-player-sheet')return nodes.get('overlay')?.sheet?.classList.contains('exercise-player-sheet')?nodes.get('overlay').sheet:null;return null;},querySelectorAll(){return [];}};
nodes.set('free-timer-root',new Node('fab'));
const origin=new Node('origin');document.activeElement=origin;
const c=createContext({console,Date:Clock,Math,Number,JSON,Map,document,window:{addEventListener(type,fn,options){(windowHandlers[type]??=[]).push({fn,capture:options===true});}},setInterval(){},nav(){},render(){},renderProfile:()=>'',persist(){},toast(message,undo){if(undo)lastUndo=undo;},icon:String,esc:String,fmt:String,durationText:String,workoutCard:w=>'<article data-test-workout="'+w.id+'">'+w.title+'</article>',goto(){},closeSheet(){nodes.delete('overlay');nodes.delete('exercise-config-form');},openSheet(title,html,kind=''){lastSheet={title,html,kind};const overlay=new Node('overlay');overlay.sheet=new Node('sheet');nodes.set('overlay',overlay);if(html.includes('id="exercise-config-form"'))nodes.set('exercise-config-form',new Node('form'));},$:selector=>selector==='#exercise-config-form .exercise-extra'?new Node('extra'):null});
const run=code=>runInContext(code,c);
run(`var now='2026-11-02T12:00:00.000',localNow=()=>now.slice(0,19),clone=x=>JSON.parse(JSON.stringify(x)),sheetKind='',muscleGroups=[],exerciseMuscles=()=>[],SEED={exercises:[{id:'hold',name:'Планка',profile:'hold',metrics:['seconds']}]},state={active:null,workouts:[],customExercises:[]},exercise=id=>SEED.exercises.find(e=>e.id===id),allExercises=()=>SEED.exercises;function blankSet(){return {seconds:0,done:false}}`);
run(await read('metric-field'));run((await read('workout-pause')).split('document.addEventListener')[0]);run(await read('set-rest'));run(await read('set-countdown'));run(await read('set-time'));run(await read('set-plan'));
const config=await read('exercise-config');run(config.slice(0,config.indexOf('// Shared editor')));run(config.slice(config.indexOf('function openExerciseEditor('),config.indexOf('function updateExerciseEditor(')));run('function updateExerciseEditor(){}');
run(await read('exercise-player'));run('playerNow=()=>now');run(await read('free-timer'));run(await read('timer-action-wheel'));
function at(seconds){wall=1000+seconds*1000;c.seconds=seconds;run('now=new Date(Date.parse("2026-11-02T12:00:00.000Z")+seconds*1000).toISOString().slice(0,-1)');}
function fixture(){run('closeTimerActionWheel();timerWheelClickUntil=0;playerView={ei:0,history:false,editing:false}');wall=1000;lastUndo=null;lastSheet=null;document.activeElement=origin;
  run(`now='2026-11-02T12:00:00.000';state={customExercises:[],workouts:[{id:'free-past',title:'Free past',source:'Отдельный таймер',start:'2026-11-01T10:00:00',demo:false,exercises:[]},{id:'demo-past',title:'Demo past',source:'Отдельный таймер',start:'2026-11-01T11:00:00',demo:true,exercises:[]},{id:'workout-past',title:'Workout past',source:'Моя запись',start:'2026-11-01T12:00:00',demo:false,exercises:[]}],active:{id:'workout',start:now,pauses:[],exercises:[{id:'hold',name:'Планка',metrics:['seconds'],sets:[{seconds:60,done:false}],timerConfig:{mode:'stopwatch',workSeconds:60,restSeconds:30,rounds:3},timerResults:[{id:'saved-result',mode:'stopwatch',savedAt:'2026-11-01T10:00:00',elapsed:5,rows:[{seconds:5}]}]}]}};ensurePlayerDraft(0);toggleExercisePlayer(0,now);freeTimer();freeTimer().sessions.timer.elapsed=3.5;freeTimer().sessions.timer.rows=[{target:60,distance:100}];toggleFreeTimer();`);
  at(5.25);run('addPlayerRound(0,now);addFreeRound();state.active.exercises[0].timerRowDetails={stopwatch:[{name:"Первый",distance:25}]};state.active.exercises[0].timerModeSessions={timer:{ei:0,mode:"countdown",elapsed:3.5,running:false,program:[{workSeconds:60,restSeconds:0}],setIndices:[]}}');at(12.35);
}
function fire(type,target,props={}){const event={type,target,preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;},...props};const list=[...(windowHandlers[type]||[]).filter(x=>x.capture),...(docHandlers[type]||[]).filter(x=>x.capture),...(docHandlers[type]||[]).filter(x=>!x.capture),...(windowHandlers[type]||[]).filter(x=>!x.capture)];for(const {fn} of list){fn(event);if(event.stopped)break;}return event;}
function click(action,extra={}){const b=new Node('button');b.dataset={action,ei:'0',...extra};return fire('click',b);}
const wheel=()=>nodes.get('timer-action-wheel-root');
const disc=()=>wheel()?.querySelector('.timer-wheel-disc');
const key=key=>fire('keydown',document.activeElement,{key});
const select=index=>run('selectTimerWheel('+index+')');
const snapshot=()=>plain(run('state'));

// Selection is inert: neither direct selection, keyboard nor drag can save/reset/pause a timer.
fixture();const beforeSelect=snapshot();click('timer-actions-open',{timerKind:'exercise'});assert.equal(run('timerWheelState.index'),0);assert.equal(document.activeElement,disc());
for(const index of [1,2,3,0])select(index);for(const k of ['ArrowRight','ArrowLeft','End','Home','Enter'])key(k);assert.deepEqual(snapshot(),beforeSelect);assert.equal(run('playerView.history'),false);
select(2);const originalDisc=disc();fire('pointerdown',originalDisc,{pointerId:1,button:0,isPrimary:true,clientX:100});fire('pointermove',originalDisc,{pointerId:1,clientX:250});fire('pointercancel',originalDisc,{pointerId:1,clientX:250});assert.equal(run('timerWheelState.index'),2);assert.deepEqual(snapshot(),beforeSelect);
key('Escape');assert.equal(wheel(),undefined);assert.equal(document.activeElement,origin);assert.deepEqual(snapshot(),beforeSelect);
click('timer-actions-open',{timerKind:'exercise'});const d=disc();fire('pointerdown',d,{pointerId:2,button:0,isPrimary:true,clientX:200});fire('pointermove',d,{pointerId:2,clientX:60});fire('pointerup',d,{pointerId:2,clientX:60});assert.equal(run('timerWheelState.index'),1);assert.deepEqual(snapshot(),beforeSelect);click('timer-actions-execute');assert.deepEqual(snapshot(),beforeSelect,'The synthetic post-drag click is suppressed');assert.ok(wheel());
at(12.701);click('timer-actions-execute');assert.equal(wheel(),undefined);assert.equal(run('state.active.exercises[0].timerResults.length'),2,'Only a later explicit execute saves');assert.equal(run('state.active.exercisePlayer.running'),false);
fixture();click('timer-actions-open',{timerKind:'free'});const freeBefore=snapshot();select(3);const fd=disc();fire('pointerdown',fd,{pointerId:4,button:0,clientX:100});fire('pointermove',fd,{pointerId:4,clientX:10});fire('lostpointercapture',fd,{pointerId:4});assert.equal(run('timerWheelState.index'),3);assert.deepEqual(snapshot(),freeBefore);key('Tab');assert.ok(document.activeElement);key('Escape');assert.deepEqual(snapshot(),freeBefore);
console.log('Passed: wheel selection/keyboard/drag are inert; cancel restores selection, post-drag execute is suppressed, and only explicit execute saves.');

// History and settings are view changes, not STOP; existing running mode guards stay in force.
fixture();const beforeViews=snapshot();click('timer-actions-open',{timerKind:'exercise'});click('timer-actions-execute');assert.equal(run('playerView.history'),true);assert.deepEqual(snapshot(),beforeViews);
click('timer-actions-open',{timerKind:'exercise'});select(3);click('timer-actions-execute');assert.equal(lastSheet.kind,'exercise-config');assert.match(nodes.get('exercise-config-form').html,/timer-actions-return/);assert.deepEqual(snapshot(),beforeViews,'Opening real exercise settings does not pause either clock');
click('timer-actions-open',{timerKind:'free'});click('timer-actions-execute');assert.equal(lastSheet.kind,'free-history');assert.match(lastSheet.html,/free-past/);assert.doesNotMatch(lastSheet.html,/demo-past|workout-past/);assert.deepEqual(snapshot(),beforeViews);
click('timer-actions-open',{timerKind:'free'});select(3);click('timer-actions-execute');assert.equal(lastSheet.kind,'free-settings');assert.deepEqual(snapshot(),beforeViews);
click('timer-actions-open',{timerKind:'exercise'});assert.equal(run('setExercisePlayerMode(0,true,now)'),false);assert.equal(run('setFreeMode(true)'),false);assert.deepEqual(snapshot(),beforeViews,'Opening a wheel never bypasses running-mode protection');
console.log('Passed: exercise/free history and real settings open without pausing; standalone history filters real entries; running mode locks remain active.');

// Requesting/cancelling reset, including legacy reset handlers, does not alter live state.
for(const kind of ['exercise','free']){
  fixture();const before=snapshot();click(kind==='exercise'?'player-reset':'free-reset');assert.equal(run('timerWheelState.confirm'),true);assert.deepEqual(snapshot(),before);click('timer-actions-cancel');assert.deepEqual(snapshot(),before);
  click('timer-actions-open',{timerKind:kind});select(2);click('timer-actions-execute');assert.equal(run('timerWheelState.confirm'),true);assert.match(wheel().html,/Сбросить (?:текущий отсчёт|таймеры упражнения)/);if(kind==='exercise')assert.match(wheel().html,/таймера и секундомера/);assert.deepEqual(snapshot(),before);key('Escape');assert.deepEqual(snapshot(),before);
}

// Confirm + Undo restores the selected clock paused at the captured elapsed; no reset-gap time or history loss.
fixture();const past=snapshot().workouts,exerciseBefore=plain(run('state.active.exercises[0]')),freeUnchanged=plain(run('state.freeTimer'));click('timer-actions-open',{timerKind:'exercise'});select(2);click('timer-actions-execute');click('timer-actions-reset-confirm');assert.equal(run('state.active.exercisePlayer'),null);assert.equal(run('state.active.exercises[0].timerDraft.program[0].workSeconds'),0);assert.equal(typeof lastUndo,'function');assert.deepEqual(plain(run('state.active.exercises[0].timerResults')),exerciseBefore.timerResults);assert.deepEqual(plain(run('state.workouts')),past);assert.deepEqual(plain(run('state.freeTimer')),freeUnchanged);
const exerciseUndo=lastUndo;at(90);assert.equal(exerciseUndo(),true);assert.equal(run('state.active.exercisePlayer.elapsed'),12.35);assert.equal(run('state.active.exercisePlayer.running'),false);assert.deepEqual(plain(run('state.active.exercises[0].timerModeSessions')),exerciseBefore.timerModeSessions);assert.deepEqual(plain(run('state.active.exercises[0].timerRowDetails')),exerciseBefore.timerRowDetails);assert.equal(run('state.active.exercisePlayer.laps[0].seconds'),5.25);assert.equal(exerciseUndo(),false);run('toggleExercisePlayer(0,now)');at(92.5);assert.equal(run('exercisePlayerElapsed(state.active.exercisePlayer,now)'),14.85);
fixture();const workoutUnchanged=plain(run('state.active')),alternate=run('freeTimer().sessions.timer'),currentRows=plain(run('freeSession().rows'));click('timer-actions-open',{timerKind:'free'});select(2);click('timer-actions-execute');click('timer-actions-reset-confirm');assert.equal(run('freeSession().elapsed'),0);assert.equal(run('freeSession().running'),false);assert.equal(run('freeTimer().sessions.timer'),alternate);const freeUndo=lastUndo;at(90);assert.equal(freeUndo(),true);assert.equal(run('freeElapsed()'),12.35);assert.equal(run('freeSession().running'),false);assert.deepEqual(plain(run('freeSession().rows')),currentRows);assert.deepEqual(plain(run('freeSession().laps')),[5.25]);assert.equal(run('freeTimer().sessions.timer'),alternate);assert.deepEqual(plain(run('state.active')),workoutUnchanged);assert.deepEqual(plain(run('state.workouts')),past);assert.equal(freeUndo(),false);
console.log('Passed: explicit reset confirmation/cancel; Undo restores paused elapsed/laps/details, excludes reset gaps, and preserves history, other clocks and alternate mode.');

// Stale contexts and fresh user work cannot be overwritten by a delayed confirm or Undo.
fixture();click('timer-actions-open',{timerKind:'exercise'});select(2);click('timer-actions-execute');run('state.active=clone(state.active)');const replacement=snapshot();assert.equal(run('confirmTimerReset()'),false);assert.deepEqual(snapshot(),replacement);
fixture();click('timer-actions-open',{timerKind:'free'});select(2);click('timer-actions-execute');run('state.freeTimer=clone(state.freeTimer)');const replacedFree=snapshot();assert.equal(run('confirmTimerReset()'),false);assert.deepEqual(snapshot(),replacedFree);
fixture();click('timer-actions-open',{timerKind:'exercise'});select(2);click('timer-actions-execute');click('timer-actions-reset-confirm');const guardedExerciseUndo=lastUndo;run('state.active.exercises[0].timerDraft.program[0].workSeconds=30');const edited=snapshot();assert.equal(guardedExerciseUndo(),false);assert.deepEqual(snapshot(),edited);
fixture();click('timer-actions-open',{timerKind:'exercise'});select(2);click('timer-actions-execute');click('timer-actions-reset-confirm');const newClockUndo=lastUndo;run('toggleExercisePlayer(0,now)');const newClock=snapshot();assert.equal(newClockUndo(),false);assert.deepEqual(snapshot(),newClock);
fixture();click('timer-actions-open',{timerKind:'free'});select(2);click('timer-actions-execute');click('timer-actions-reset-confirm');const editedFreeUndo=lastUndo;run('freeSession().rows[0].distance=125');const changedFree=snapshot();assert.equal(editedFreeUndo(),false);assert.deepEqual(snapshot(),changedFree);
fixture();click('timer-actions-open',{timerKind:'free'});select(2);click('timer-actions-execute');run('pauseFreeTimer();setFreeMode(true)');const newMode=snapshot();assert.equal(run('confirmTimerReset()'),false);assert.deepEqual(snapshot(),newMode);
fixture();click('timer-actions-open',{timerKind:'exercise'});select(2);click('timer-actions-execute');run('state.active.exercises.push(clone(state.active.exercises[0]));state.active.exercisePlayer.ei=1');const otherClock=snapshot();assert.equal(run('confirmTimerReset()'),false);assert.deepEqual(snapshot(),otherClock,'A reset for one exercise cannot clear another running clock');
console.log('Passed: stale workout/session/mode confirmations and edited/new clock Undo guards prevent overwriting newer work.');
