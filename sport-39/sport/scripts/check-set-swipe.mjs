import {readFile} from 'node:fs/promises';
import {createContext,runInContext} from 'node:vm';
import assert from 'node:assert/strict';
const listeners={};
const row={classList:{values:new Set(),contains(k){return this.values.has(k)},add(k){this.values.add(k)},remove(k){this.values.delete(k)},toggle(k,on){on?this.values.add(k):this.values.delete(k)}},content:{style:{}},querySelector(){return this.content},setPointerCapture(){}};
const c=createContext({state:{active:{exercises:[{sets:[{reps:10},{reps:8,restSeconds:60},{reps:6}]}],countdown:{kind:'rest',ei:0,si:1}}},window:{addEventListener(){}},document:{addEventListener(type,fn){listeners[type]=fn},querySelectorAll(){return []}},persist(){},render(){},clone:structuredClone});
runInContext(await readFile(new URL('../src/set-swipe.js',import.meta.url),'utf8'),c);
const active=c.state.active;
const undo=runInContext("deleteWorkoutRow('set',0,0)",c);
assert.equal(active.exercises[0].sets.length,2);
assert.equal(active.countdown.si,0,'Timer index follows its original set');
undo();assert.equal(active.exercises[0].sets.length,3);assert.equal(active.countdown.si,1);
runInContext("deleteWorkoutRow('set',0,1)",c);assert.equal(active.countdown,null,'Deleting the timed set cancels countdown');
function target(){return {closest(selector){return selector==='.set-swipe'?row:null}}}
function event(x,y){return {target:target(),pointerId:1,button:0,clientX:x,clientY:y,cancelable:true,preventDefault(){}}}
listeners.pointerdown(event(150,50));listeners.pointermove(event(80,53));listeners.pointerup(event(80,53));assert.equal(row.classList.contains('swipe-open'),true);
listeners.pointerdown(event(80,50));listeners.pointermove(event(140,51));listeners.pointerup(event(140,51));assert.equal(row.classList.contains('swipe-open'),false);
listeners.pointerdown(event(150,50));listeners.pointermove(event(140,100));listeners.pointerup(event(80,110));assert.equal(row.classList.contains('swipe-open'),false,'Vertical scroll never reveals deletion');
listeners.pointerdown(event(150,50));listeners.pointermove(event(80,53));listeners.pointercancel(event(80,53));assert.equal(row.classList.contains('swipe-open'),false,'Cancelled gesture resets');
listeners.pointerdown(event(50,50));listeners.pointermove(event(120,53));listeners.pointerup(event(120,53));assert.equal(row.classList.contains('swipe-open'),true);assert.equal(row.classList.contains('swipe-right'),true);assert.equal(row.content.style.transform,'translateX(66px)');
listeners.pointerdown(event(120,50));listeners.pointermove(event(50,53));listeners.pointerup(event(50,53));assert.equal(row.classList.contains('swipe-open'),false,'The opposite movement closes a right-revealed set');
console.log('Passed: bidirectional set swipe reveal/close, vertical scroll and cancellation, set deletion/undo and timer index/cancellation.');
