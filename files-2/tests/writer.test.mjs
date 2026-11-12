import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandler, ORIGIN } from '../../supabase/functions/notes-write/handler.mjs';
function fixture(){
  let updates=0;
  const handler=createHandler({authenticate:async k=>k==='test-key',update:async(path,version,content)=>{updates++;if(version!==3)throw{code:'40001'};return{path,version:4,content};},create:async(path,title,content)=>({path,title,content,version:1})});
  const request=(body,headers={})=>handler(new Request('https://test.invalid/notes-write',{method:'POST',headers:{'content-type':'application/json','x-notes-key':'test-key','origin':ORIGIN,...headers},body:JSON.stringify(body)}));
  return{request,handler,count:()=>updates};
}
const body={mode:'update',path:'health/nutrition/food-diary.md',expectedVersion:3,content:'# Test'};
test('authenticated valid save returns confirmed document',async()=>{const f=fixture(),r=await f.request(body);assert.equal(r.status,200);assert.equal((await r.json()).document.version,4);});
test('missing or wrong authentication never reaches database',async()=>{const f=fixture();assert.equal((await f.request(body,{'x-notes-key':''})).status,401);assert.equal(f.count(),0);});
test('foreign origin cannot write even with a key',async()=>{const f=fixture();assert.equal((await f.request(body,{origin:'https://attacker.invalid'})).status,403);assert.equal(f.count(),0);});
test('stale version returns 409',async()=>assert.equal((await fixture().request({...body,expectedVersion:1})).status,409));
test('missing version, traversal, empty text, arbitrary mode rejected',async()=>{
  for(const change of [{expectedVersion:undefined},{path:'../README.md'},{content:''},{mode:'delete'},{path:"x';drop.md"}])assert.equal((await fixture().request({...body,...change})).status,400);
});
test('oversize content rejected before writing',async()=>{const f=fixture();assert.equal((await f.request({...body,content:'я'.repeat(1_000_001)})).status,413);assert.equal(f.count(),0);});
test('create restricted to new personal UUID paths',async()=>{
  const f=fixture();assert.equal((await f.request({mode:'create',path:'README.md',content:'x',title:'x'})).status,400);
  assert.equal((await f.request({mode:'create',path:'personal/12345678-1234-1234-1234-123456789abc.md',content:'x',title:'x'})).status,200);
});
test('preflight permits exactly the protected write headers',async()=>{const r=await fixture().handler(new Request('https://test.invalid',{method:'OPTIONS',headers:{origin:ORIGIN}}));assert.equal(r.status,204);assert.equal(r.headers.get('access-control-allow-origin'),ORIGIN);});
