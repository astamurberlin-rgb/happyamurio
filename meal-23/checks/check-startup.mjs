import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const html=await readFile(process.argv[2]||new URL('../index.html',import.meta.url),'utf8');
const profile=html.match(/<script id="happy-profile-storage">([\s\S]*?)<\/script>/)[1];
const rawGet=html.match(/async function rawGet\(k\)\{[^\n]+/)[0];
const start=html.indexOf('(async function init(){');
assert.ok(start>0);
const states=['CL','MealAuthFence'].map(name=>{
  const m=html.match(new RegExp('var '+name+'=\\{[^\\n]+'));
  assert.ok(m);return {offset:m.index,code:m[0]};
}).sort((a,b)=>a.offset-b.offset);

async function firstRead(saved,change){
  const values=new Map(saved?[['hd_cloud_v1',JSON.stringify(saved)]]:[]);
  const keys=[];let release;
  const readGate=new Promise(resolve=>release=resolve);
  const ctx=vm.createContext({
    localStorage:{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)},
    addEventListener(){},
    rawBaseGet:async k=>{keys.push(k);await readGate;return 'journal';},
    rawBaseSet:()=>{throw Error('Unexpected write during restore');}
  });
  vm.runInContext(profile,ctx);vm.runInContext(rawGet,ctx);
  for(const s of states.filter(s=>s.offset<start))vm.runInContext(s.code,ctx);
  const reading=vm.runInContext("rawGet('hdm_db_v1')",ctx);
  // Match HTML execution: declarations after init run while IndexedDB is pending.
  for(const s of states.filter(s=>s.offset>start))vm.runInContext(s.code,ctx);
  if(change==='generation')ctx.MealAuthFence.generation++;
  if(change==='account')values.set('hd_cloud_v1',JSON.stringify({s:{uid:'other'}}));
  release();
  if(change)await assert.rejects(reading,/Вход изменился|Аккаунт изменился/);
  else assert.equal(await reading,'journal');
  assert.equal(keys[0],saved?'happy-user:existing:hdm_db_v1':'hdm_db_v1');
}
const saved={s:{uid:'existing',at:'test-access',rt:'test-refresh',exp:123},k:'test-key'};
await firstRead(null);await firstRead(saved);
await firstRead(saved,'generation');await firstRead(saved,'account');
console.log('Passed startup order: fresh guest and existing account restore; real auth changes during delayed reads remain blocked.');
