import {readFile} from 'node:fs/promises';
import {createContext,runInContext} from 'node:vm';
import assert from 'node:assert/strict';

// Real setters, delegated handlers and rendered input state; not browser/layout emulation.
const read=name=>readFile(new URL('../src/'+name+'.js',import.meta.url),'utf8'),plain=value=>JSON.parse(JSON.stringify(value));
let wall=1000,freeRoot=null;
class Clock extends Date{static now(){return wall;}}
const handlers={},fab={innerHTML:''},body={classList:{add(){},remove(){},toggle(){}}};
function root(html){return {html,scrollTop:0,set outerHTML(next){freeRoot=root(next);}};}
const document={body,addEventListener(type,fn,capture){(handlers[type]??=[]).push({fn,capture:capture===true});},getElementById:id=>id==='free-timer-root'?fab:null,querySelector:selector=>selector==='[data-free-timer]'?freeRoot:null,querySelectorAll:()=>[]};
const c=createContext({console,Date:Clock,Math,Number,JSON,document,setInterval(){},nav(){},openSheet(){},closeSheet(){},render(){},renderProfile:()=>'',persist(){},toast(){},icon:String,esc:String,$:()=>null});
const run=code=>runInContext(code,c);
run(`var now='2026-11-02T12:00:00.000',localNow=()=>now.slice(0,19),clone=x=>JSON.parse(JSON.stringify(x)),SEED={exercises:[{id:'hold',name:'Планка',metrics:['seconds'],profile:'hold'}]},state={workouts:[],customExercises:[],active:{id:'active',start:now,pauses:[],exercises:[{id:'hold',name:'Планка',metrics:['seconds'],sets:[{seconds:30,done:false}]}]}},exercise=id=>SEED.exercises.find(e=>e.id===id);function blankSet(){return {seconds:0,done:false}}`);
run(await read('metric-field'));
run((await read('timer-action-wheel')).split('function timerWheelContext(')[0]);
const config=await read('exercise-config');run(config.slice(0,config.indexOf('// Shared editor')));
run((await read('workout-pause')).split('document.addEventListener')[0]);run(await read('set-time'));run(await read('exercise-player'));run('playerNow=()=>now');
run(await read('free-timer'));
function fire(type,target){const event={target,preventDefault(){},stopImmediatePropagation(){this.stopped=true;}};for(const {fn} of [...handlers[type].filter(h=>h.capture),...handlers[type].filter(h=>!h.capture)]){fn(event);if(event.stopped)break;}}
function click(action){const button={dataset:{action,ei:'0'},closest:s=>s==='[data-action]'?button:null};fire('click',button);}
function modeInput(kind,checked){const input={dataset:kind==='player'?{playerMode:'0'}:{freeSwitch:'mode'},checked,disabled:false};fire('change',input);return input;}
const modeTag=(html,kind)=>{const tag=html.match(new RegExp('<input[^>]*data-'+(kind==='player'?'player-mode="0"':'free-switch="mode"')+'[^>]*>'))?.[0];assert.ok(tag,'Rendered mode switch exists');return tag;};
const disabled=(html,kind)=>/\sdisabled(?:\s|>)/.test(modeTag(html,kind));

// Workout stopwatch: direct API and a stale/synthetic UI change both preserve every running field.
run('ensurePlayerDraft(0);toggleExercisePlayer(0,now)');run("now='2026-11-02T12:00:05.250';addPlayerRound(0,now);now='2026-11-02T12:00:12.350'");
const runningStopwatch=plain(run('state.active')),stopwatchObject=run('state.active.exercisePlayer');
assert.equal(disabled(run('exercisePlayerBody(0)'),'player'),true);
assert.equal(run('setExercisePlayerMode(0,true,now)'),false);assert.deepEqual(plain(run('state.active')),runningStopwatch);assert.equal(run('state.active.exercisePlayer'),stopwatchObject);
const blocked=modeInput('player',true);assert.equal(blocked.checked,false);assert.equal(blocked.disabled,true);assert.deepEqual(plain(run('state.active')),runningStopwatch);
run("now='2026-11-02T12:00:14.750'");assert.equal(run('exercisePlayerElapsed(state.active.exercisePlayer,now)'),14.75,'Blocked switch never resets the clock anchor');
click('player-toggle');assert.equal(run('state.active.exercisePlayer.running'),false);assert.equal(run('state.active.exercisePlayer.elapsed'),14.75);assert.equal(disabled(run('exercisePlayerBody(0)'),'player'),false);
const frozenStopwatch=plain(run('state.active.exercisePlayer'));modeInput('player',true);assert.equal(run('playerPreview(0).mode'),'countdown');
run('commitPlayerPreset({dataset:{playerPreset:"0,0,workSeconds"},value:"0:30"})');click('player-toggle');run("now='2026-11-02T12:00:19.000'");
const runningTimer=plain(run('state.active'));assert.equal(run('setExercisePlayerMode(0,false,now)'),false);const blockedTimer=modeInput('player',false);assert.equal(blockedTimer.checked,true);assert.equal(blockedTimer.disabled,true);assert.deepEqual(plain(run('state.active')),runningTimer);assert.equal(run('exercisePlayerElapsed(state.active.exercisePlayer,now)'),4.25);assert.equal(disabled(run('exercisePlayerBody(0)'),'player'),true);
click('player-toggle');modeInput('player',false);assert.equal(run('state.active.exercisePlayer.mode'),'stopwatch');assert.equal(run('state.active.exercisePlayer.elapsed'),14.75);assert.equal(run('state.active.exercisePlayer.running'),false);assert.deepEqual(plain(run('state.active.exercisePlayer.laps')),frozenStopwatch.laps);
modeInput('player',true);assert.equal(run('state.active.exercisePlayer.elapsed'),4.25);assert.equal(run('exercisePlayerStatus(state.active.exercisePlayer,now).remaining'),25.75);assert.equal(disabled(run('exercisePlayerBody(0)'),'player'),false);
run('toggleExercisePlayer(0,now);toggleWorkoutPause(state.active,now)');run("now='2026-11-02T12:00:29.000'");assert.equal(run('exercisePlayerElapsed(state.active.exercisePlayer,now)'),4.25);const globallyPaused=plain(run('state.active'));modeInput('player',false);assert.deepEqual(plain(run('state.active')),globallyPaused,'Master pause does not implicitly permit changing a still-running engine');assert.equal(disabled(run('exercisePlayerBody(0)'),'player'),true);
run('toggleWorkoutPause(state.active,now)');click('player-toggle');modeInput('player',false);assert.equal(run('state.active.exercisePlayer.elapsed'),14.75);assert.equal(run('state.active.exercisePlayer.running'),false);
console.log('Passed: exercise stopwatch/timer mode lock in setter + handler + UI; STOP unlocks without losing elapsed, laps or the alternate session.');

// Standalone clock is independent, with the same lock and lossless stopped-mode round trip.
const activeBeforeFree=plain(run('state.active'));freeRoot=root(run('freeTimerBody()'));
click('free-toggle');wall=6250;click('free-add');wall=13350;
const freeRunning=plain(run('state.freeTimer')),freeObject=run('freeSession()');assert.equal(disabled(run('freeTimerBody()'),'free'),true);
assert.equal(run('setFreeMode(true)'),false);assert.deepEqual(plain(run('state.freeTimer')),freeRunning);assert.equal(run('freeSession()'),freeObject);
modeInput('free',true);assert.deepEqual(plain(run('state.freeTimer')),freeRunning);assert.equal(disabled(freeRoot.html,'free'),true);assert.doesNotMatch(modeTag(freeRoot.html,'free'),/\schecked(?:\s|>)/);
wall=15750;assert.equal(run('freeElapsed()'),14.75);click('free-toggle');assert.equal(run('freeSession().running'),false);assert.equal(disabled(freeRoot.html,'free'),false);
const freeStopwatch=plain(run('freeSession()'));modeInput('free',true);assert.equal(run('freeTimer().mode'),'timer');click('free-toggle');wall=20000;
const freeTimerRunning=plain(run('state.freeTimer'));assert.equal(run('setFreeMode(false)'),false);modeInput('free',false);assert.deepEqual(plain(run('state.freeTimer')),freeTimerRunning);assert.equal(run('freeElapsed()'),4.25);assert.equal(disabled(freeRoot.html,'free'),true);assert.match(modeTag(freeRoot.html,'free'),/\schecked(?:\s|>)/);
click('free-toggle');modeInput('free',false);assert.equal(run('freeTimer().mode'),'stopwatch');assert.equal(run('freeElapsed()'),14.75);assert.deepEqual(plain(run('freeSession().laps')),freeStopwatch.laps);assert.deepEqual(plain(run('freeSession().rows')),freeStopwatch.rows);
modeInput('free',true);assert.equal(run('freeElapsed()'),4.25);assert.equal(run('freeStatus().remaining'),55.75);assert.equal(run('freeSession().running'),false);assert.equal(disabled(freeRoot.html,'free'),false);assert.deepEqual(plain(run('state.active')),activeBeforeFree,'Standalone mode changes never touch the workout clock');
run('state.freeTimer=clone(state.freeTimer)');modeInput('free',false);assert.equal(run('freeElapsed()'),14.75,'Both stopped sessions survive JSON persistence');
modeInput('free',true);click('free-toggle');wall=100000;run('tickFreeTimer()');assert.equal(run('freeSession().running'),false);assert.equal(disabled(freeRoot.html,'free'),false,'Automatic countdown expiry unlocks mode switching too');modeInput('free',false);assert.equal(run('freeElapsed()'),14.75);
console.log('Passed: standalone stopwatch/timer mode lock in setter + real change/UI; STOP unlocks, sessions survive switching/reload, and active workout stays untouched.');
