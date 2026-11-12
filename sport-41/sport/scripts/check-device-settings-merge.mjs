/* Update 40.1 · A device setting changed differently on two devices must not stop the journal from synchronising.
   The case of 09–10.11.2026: «Плавающая кнопка таймера» on in the cloud and off on the phone held the whole journal
   in «Есть конфликт изменений» for a day and a half. Record conflicts (the same workout edited twice) stay conflicts. */
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const read=name=>readFile(new URL('../src/'+name,import.meta.url),'utf8');
const ctx=vm.createContext({});
vm.runInContext(await read('controlled-journal.js')+';'+await read('controlled-cas.js')+';globalThis.merge=SportControlledCAS.mergeData;',ctx);
const copy=x=>JSON.parse(JSON.stringify(x)),merge=(b,l,r)=>copy(ctx.merge(b,l,r));
const workout=(id,title)=>({id,title,start:'2026-11-09T16:28:37',exercises:[]});
const base={version:1,workouts:[workout('a','Спина')],lastRestSeconds:180};
// The real case: no setting in the base, cloud switched it on and ran a stopwatch, the phone switched it off and added a workout.
const remote={...copy(base),floatingTimerEnabled:true,freeTimer:{mode:'stopwatch',sessions:{stopwatch:{elapsed:2.9,laps:[1.5]}}}};
const local={...copy(base),floatingTimerEnabled:false,workouts:[...copy(base.workouts),workout('b','Футбол')]};
let r=merge(base,local,remote);
assert.equal(r.ok,true,'a switch set differently is not a conflict');assert.deepEqual(r.conflicts,[]);
assert.equal(r.data.floatingTimerEnabled,false,'the merging device keeps its own switch');
assert.deepEqual(r.data.workouts.map(w=>w.id),['a','b'],'records from both sides are kept');
assert.equal(r.data.freeTimer.mode,'stopwatch','timer state changed on one side only is taken from that side');
// Timer state changed on both sides: this device keeps its own, whole.
r=merge(base,{...copy(local),freeTimer:{mode:'timer',sessions:{}}},remote);
assert.equal(r.ok,true);assert.equal(r.data.freeTimer.mode,'timer');
// Default rest changed on both sides.
r=merge(base,{...copy(base),lastRestSeconds:90},{...copy(base),lastRestSeconds:120});
assert.equal(r.ok,true);assert.equal(r.data.lastRestSeconds,90);
// Changed on one side only: that side wins, as before.
assert.equal(merge(base,copy(base),{...copy(base),lastRestSeconds:120}).data.lastRestSeconds,120);
// No common base (first meeting of a device and the cloud): settings do not block, the device keeps its own.
r=merge(null,{version:1,workouts:[],floatingTimerEnabled:false},{version:1,workouts:[],floatingTimerEnabled:true});
assert.equal(r.ok,true,'settings do not block a merge without a base');assert.equal(r.data.floatingTimerEnabled,false);
// A record changed differently on both sides is still reported.
const edit=(title)=>({...copy(base),workouts:[workout('a',title)]});
r=merge(base,edit('Спина утром'),edit('Спина вечером'));
assert.equal(r.ok,false,'the same field of the same record changed twice is still a conflict');assert.deepEqual(r.conflicts,['workouts/a/title']);
console.log('Passed: device settings and timer state never block the journal merge (40.1); record conflicts are still reported.');
