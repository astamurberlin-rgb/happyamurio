import {readFile} from 'node:fs/promises';
import {createContext,runInContext} from 'node:vm';
import assert from 'node:assert/strict';

// Exercise the actual delegated click/change handlers and their view updates.
// This is a DOM contract test, not a browser or a layout renderer.
const handlers={},nodes=new Map();let root=null,revealed=0;
const classes=()=>{const set=new Set();return {add:x=>set.add(x),contains:x=>set.has(x),toggle(x,on){on??=!set.has(x);on?set.add(x):set.delete(x);return on;}};};
const element=()=>({dataset:{},classList:classes(),setAttribute(k,v){this[k]=v;}});
function actionButton(html,action){const tag=html.match(new RegExp('<button[^>]*data-action="'+action+'"[^>]*>'))?.[0];if(!tag)return null;return {...element(),disabled:/\sdisabled(?:\s|>)/.test(tag),dataset:{action,ei:'0'}};}
function playerRoot(html){
  const buttons=new Map(['player-toggle','player-new-round','player-reset','player-save'].map(a=>[a,actionButton(html,a)]));
  const count=[...html.matchAll(/class="player-round-row"/g)].length;
  const list={scrollTop:0,scrollHeight:count*60,lastElementChild:{scrollIntoView(){revealed++;}}};
  const value={...element(),html,scrollTop:0,dataset:{playerEi:'0'},rows:count,querySelector(selector){if(selector==='.player-round-list')return list;const a=selector.match(/data-action[=\s]+["']?([^\]"']+)/)?.[1];return buttons.get(a)||null;}};
  Object.defineProperty(value,'outerHTML',{set(html){root=playerRoot(html);}});return value;
}
const document={body:{classList:classes()},addEventListener(type,fn){(handlers[type]??=[]).push(fn);},getElementById:id=>nodes.get(id)||null,querySelector(selector){if(selector==='[data-player-ei]')return root;if(selector==='.exercise-player-sheet')return nodes.get('sheet')?.classList.contains('exercise-player-sheet')?nodes.get('sheet'):null;return null;}};
function baseNav(){const b=element();b.dataset.action='voice';b.innerHTML='microphone';nodes.set('sport-fab',b);}
nodes.set('dock',element());baseNav();
const c=createContext({console,Date,Math,Number,JSON,document,setInterval(){},nav:baseNav,openSheet(title,html){root=playerRoot(html);const sheet=element(),overlay=element();overlay.querySelector=()=>sheet;nodes.set('sheet',sheet);nodes.set('overlay',overlay);},closeSheet(){root=null;nodes.delete('sheet');nodes.delete('overlay');},render(){c.nav();},persist(){},toast(){},icon:n=>n,esc:String,$:s=>document.querySelector(s)});
const read=name=>readFile(new URL('../src/'+name+'.js',import.meta.url),'utf8');
runInContext(`var SEED={exercises:[{id:'hold',name:'Планка',profile:'hold',metrics:['seconds']}]},state={customExercises:[],workouts:[],active:{start:'2026-10-29T12:00:00',pauses:[],exercises:[{id:'hold',name:'Планка',metrics:['seconds'],sets:[{seconds:60,done:false}],timerConfig:{mode:'stopwatch'}}]}};
var now='2026-10-29T12:00:00.000',localNow=()=>now.slice(0,19),clone=x=>JSON.parse(JSON.stringify(x)),exercise=id=>state.exerciseOverrides?.[id]||SEED.exercises.find(e=>e.id===id);function blankSet(){return {seconds:0,done:false}};state.active.exercises[0].timerConfig={mode:'intervals',workSeconds:600,restSeconds:30,rounds:3};`,c);
runInContext(await read('metric-field'),c);
runInContext((await read('timer-action-wheel')).split('function timerWheelContext(')[0],c);
const config=await read('exercise-config');runInContext(config.slice(0,config.indexOf('// Shared editor')),c);
runInContext((await read('workout-pause')).split('document.addEventListener')[0],c);
runInContext(await read('set-time'),c);runInContext(await read('exercise-player'),c);
const run=code=>runInContext(code,c);run('playerNow=()=>now');
function click(button){assert.ok(button);const event={target:{closest:()=>button},preventDefault(){},stopImmediatePropagation(){this.stopped=true;}};for(const fn of handlers.click||[]){fn(event);if(event.stopped)break;}}
const clickAction=action=>click(root.querySelector('[data-action='+action+']'));

run('openExercisePlayer(0)');
assert.equal(document.body.classList.contains('exercise-player-open'),true);
assert.equal(nodes.get('sport-fab').dataset.action,'collapse-exercise-player');
assert.equal(nodes.get('sport-fab').innerHTML,'x');
assert.doesNotMatch(root.html,/player-mic/,'There is no second microphone');
assert.equal(root.rows,1);clickAction('player-new-round');assert.equal(root.rows,1,'Unstarted stopwatch plus stays disabled');
clickAction('player-toggle');run("now='2026-10-29T12:00:05.250'");clickAction('player-new-round');
assert.equal(root.rows,2,'Tapping plus updates the visible lap list');assert.equal(revealed,1);
click(nodes.get('sport-fab'));
assert.equal(root,null);assert.equal(run('state.active.exercisePlayer.running'),true,'Footer X does not pause');
assert.equal(nodes.get('sport-fab').dataset.action,'voice');assert.equal(document.body.classList.contains('exercise-player-open'),false);
run("now='2026-10-29T12:00:20.750';openExercisePlayer(0)");
assert.equal(run('exercisePlayerElapsed(state.active.exercisePlayer,now)'),20.75,'Elapsed time includes the collapsed interval');
assert.equal(root.rows,2);assert.match(root.html,/00:15.50/);
run('resetExercisePlayer(0);renderExercisePlayerView(0)'); // Confirmation + Undo are covered by check-timer-action-wheel.
const change={target:{dataset:{playerMode:'0'},checked:true}};for(const fn of handlers.change)fn(change);
assert.match(root.html,/Таймер 1/);clickAction('player-new-round');clickAction('player-new-round');
assert.equal(root.rows,3,'Tapping timer plus before START adds visible presets');
assert.equal(run('toggleExercisePlayer(0,now)'),false,'Empty countdown presets cannot start');
for(let i=0;i<3;i++)run(`commitPlayerPreset({dataset:{playerPreset:'0,${i},workSeconds'},value:'01:00'})`);
clickAction('player-toggle');run("now='2026-10-29T12:00:30.750'");clickAction('player-new-round');
assert.equal(root.rows,4);assert.equal(run('exercisePlayerElapsed(state.active.exercisePlayer,now)'),10);
click(nodes.get('sport-fab'));run("now='2026-10-29T12:00:50.750';openExercisePlayer(0)");
assert.equal(run('state.active.exercisePlayer.running'),true);assert.equal(run('exercisePlayerStatus(state.active.exercisePlayer,now).remaining'),30);
assert.equal(root.rows,4,'Reopening retains the added timers');
c.nav();assert.equal(nodes.get('sport-fab').dataset.action,'collapse-exercise-player','Background navigation redraw retains the footer X');
assert.equal(run('state.active.exercises[0].sets.length'),1,'The standalone timer never pre-fills approaches');
const beforeBlocked=JSON.parse(run('JSON.stringify(state.active)')),blocked={dataset:{playerMode:'0'},checked:false};
for(const fn of handlers.change)fn({target:blocked});
assert.deepEqual(JSON.parse(run('JSON.stringify(state.active)')),beforeBlocked,'A mode change cannot stop or replace the running clock');
assert.equal(blocked.checked,true);assert.equal(blocked.disabled,true);
clickAction('player-toggle');assert.equal(run('state.active.exercisePlayer.running'),false,'Normal STOP unlocks switching');
for(const fn of handlers.change)fn({target:{dataset:{playerMode:'0'},checked:false}});
assert.match(root.html,/Секундомер/);assert.match(root.html,/00:00.00/);
for(const fn of handlers.change)fn({target:{dataset:{playerMode:'0'},checked:true}});
assert.equal(run('state.active.exercisePlayer.elapsed'),30,'Switching modes retains the prior session');
assert.equal(run('state.active.exercisePlayer.running'),false);
click(nodes.get('sport-fab'));
const styles=new Map(),fab={...element(),dataset:{action:'open-exercise-player',ei:'0'},offsetParent:{getBoundingClientRect:()=>({left:0,width:393})},getBoundingClientRect:()=>({left:20,width:62}),style:{setProperty:(k,v)=>styles.set(k,v)},setPointerCapture(){}};
const pointer=(type,x)=>{for(const fn of handlers[type]||[])fn({target:{closest:()=>fab},pointerId:1,button:0,clientX:x,preventDefault(){}});};
pointer('pointerdown',30);pointer('pointermove',300);pointer('pointerup',300);
assert.ok(run('state.timerFabX')>.9);click(fab);assert.equal(root,null,'Dragging does not open the popup');
fab.dataset.suppressOpenUntil='0';click(fab);assert.ok(root,'A later tap still opens the timer');
assert.equal(run('timerFabDragRatio(20,-100,393)'),0);assert.equal(run('timerFabDragRatio(20,900,393)'),1);
console.log('Passed: delegated plus clicks update rows, new rows are revealed, one footer microphone becomes X, collapse/reopen preserves live stopwatch/countdown and navigation redraw retains X.');
