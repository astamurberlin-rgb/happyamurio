/* Unreleased, synchronous lifecycle bridge. Loaded BEFORE Day auth can await.
   Contains counters/listeners only; never credentials, records, storage or transport. */
(function(root){
'use strict';
if(root.DaySportLifecycle)return;
let generation=0,pending=0,failed=false;
const listeners=new Set();
function notify(){
 if(generation===Number.MAX_SAFE_INTEGER)failed=true;else ++generation;
 for(const callback of listeners){try{callback();}catch(_){/* Other auth guards remain in force. */}}
}
function beginAuth(){
 ++pending;notify();let complete=false;
 return function(){if(complete)return;complete=true;--pending;notify();};
}
function snapshot(){return Object.freeze({generation,pending,failed});}
function subscribe(callback){if(typeof callback!=='function')throw TypeError('Listener required');listeners.add(callback);return ()=>listeners.delete(callback);}
root.DaySportLifecycle=Object.freeze({phase:'day-sport-lifecycle-v1',beginAuth,snapshot,subscribe});
})(globalThis);
