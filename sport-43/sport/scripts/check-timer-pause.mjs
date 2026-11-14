import {readFile} from 'node:fs/promises';
import {createContext,runInContext} from 'node:vm';
import assert from 'node:assert/strict';

const handlers={};
const document={body:{classList:{toggle(){}}},addEventListener(type,fn,capture){(handlers[type]??=[]).push({fn,capture:!!capture});},getElementById(){return null;},querySelector(){return null;}};
const c=createContext({console,Date,Math,Number,JSON,document,window:{scrollY:0,scrollTo(){}},setInterval(){},nav(){},openSheet(){},closeSheet(){},render(){},persist(){},toast(){},icon:String,esc:String,$:()=>null});
const read=name=>readFile(new URL('../src/'+name+'.js',import.meta.url),'utf8');
runInContext(`var SEED={exercises:[{id:'hold',name:'Планка',profile:'hold',metrics:['seconds']}]},state={customExercises:[],workouts:[],active:{start:'2026-10-29T12:00:00',pauses:[],exercises:[{id:'hold',name:'Планка',metrics:['seconds'],defaultRestSeconds:45,sets:[{seconds:120,done:false},{seconds:120,done:false}]}]}};
var now='2026-10-29T12:00:00.000',localNow=()=>now.slice(0,19),clone=x=>JSON.parse(JSON.stringify(x)),exercise=id=>SEED.exercises.find(e=>e.id===id);function blankSet(){return {seconds:0,done:false}}`,c);
const config=await read('exercise-config');runInContext(config.slice(0,config.indexOf('// Shared editor')),c);
for(const name of ['workout-pause','set-rest','set-countdown','set-time','exercise-player'])runInContext(await read(name),c);
const app=await read('app');runInContext(app.slice(app.indexOf("document.addEventListener('click',ev=>"),app.indexOf("document.addEventListener('input',ev=>")),c);
const run=code=>runInContext(code,c);run('playerNow=()=>now;ensurePlayerDraft(0)');
function click(action,extra={}){
  const button={dataset:{action,ei:'0',si:'0',...extra}},event={target:{closest(selector){if(selector==='[data-action]')return button;return selector.includes('data-action="'+action+'"')?button:null;}},preventDefault(){},stopImmediatePropagation(){this.stopped=true;}};
  for(const {fn} of [...handlers.click.filter(x=>x.capture),...handlers.click.filter(x=>!x.capture)]){fn(event);if(event.stopped)break;}
}

click('player-toggle');run("now='2026-10-29T12:00:05.000'");click('set-done');
assert.equal(run('state.active.exercises[0].sets[0].done'),true);
assert.equal(run('state.active.countdown.kind'),'rest');assert.equal(run('state.active.countdown.duration'),45);
assert.equal(run('state.active.exercisePlayer.running'),true,'Marking a set starts rest without stopping the standalone clock');
run("now='2026-10-29T12:00:10.000'");click('toggle-workout-pause');
run("now='2026-10-29T12:02:10.000'");
assert.equal(run('exercisePlayerElapsed(state.active.exercisePlayer,now)'),10);
assert.equal(run('countdownRemaining(state.active.countdown,now)'),40,'The master pause freezes rest too');
click('toggle-set-timer',{timerKind:'rest'});
assert.equal(run('workoutIsPaused(state.active)'),false);assert.equal(run('state.active.countdown.running'),true,'Play resumes a globally paused running rest instead of toggling it off');
run("now='2026-10-29T12:02:20.000'");
assert.equal(run('exercisePlayerElapsed(state.active.exercisePlayer,now)'),20);assert.equal(run('countdownRemaining(state.active.countdown,now)'),30);
click('toggle-workout-pause');run("now='2026-10-29T12:03:20.000'");click('player-toggle');
assert.equal(run('workoutIsPaused(state.active)'),false);assert.equal(run('state.active.exercisePlayer.running'),true);
run("now='2026-10-29T12:03:30.000'");
assert.equal(run('exercisePlayerElapsed(state.active.exercisePlayer,now)'),30);assert.equal(run('countdownRemaining(state.active.countdown,now)'),20);
click('toggle-workout-pause');run('pauseExercisePlayer(now)');run("now='2026-10-29T12:04:30.000'");click('player-toggle');
assert.equal(run('state.active.exercisePlayer.running'),true,'Play also resumes an individually paused clock and its workout');
run("now='2026-10-29T12:04:40.000'");assert.equal(run('exercisePlayerElapsed(state.active.exercisePlayer,now)'),40);
click('set-done');assert.equal(run('state.active.countdown'),null,'Unchecking cancels the associated rest');assert.equal(run('state.active.exercisePlayer.running'),true);
click('toggle-workout-pause');click('set-done');
assert.equal(run('workoutIsPaused(state.active)'),true,'An automatic rest does not cancel an explicit master pause');
assert.equal(run('state.active.countdown.running'),true);click('toggle-set-timer',{timerKind:'rest'});
assert.equal(run('workoutIsPaused(state.active)'),false);
run('state.active.exercisePlayer={ei:0,running:false,finished:false,mode:"countdown",elapsed:0};state.active.exercises[0].sets[0].done=false');
assert.doesNotThrow(()=>click('set-done'),'Legacy player records without set indices cannot break the checkmark');
assert.equal(run('state.active.countdown.kind'),'rest');
console.log('Passed: actual checkmark starts rest, undo cancels it, standalone clock is independent, master pause freezes both, any Play resumes the workout and selected clock, and legacy player state is handled.');
