import {readFile} from 'node:fs/promises';
import {createContext,runInContext} from 'node:vm';
import assert from 'node:assert/strict';
const source=await readFile(new URL('../src/recovery-vault.js',import.meta.url),'utf8');
function storage(limit=Infinity){const map=new Map();return {map,get length(){return map.size},key:i=>[...map.keys()][i]??null,getItem:k=>map.get(k)??null,removeItem:k=>map.delete(k),setItem(k,v){const next=new Map(map);next.set(k,String(v));const used=[...next].reduce((n,[a,b])=>n+2*(a.length+b.length),0);if(used>limit)throw Error('QuotaExceededError');map.set(k,String(v));}}}
function vault(s,extra={}){const c=createContext({storage:s,options:extra});runInContext(source,c);return runInContext("SportRecovery.create({storage,key:'vault',current:()=>({journal:'ordinary'}),...options})",c)}
const backup=i=>({app:'Happy Sport',version:1,exportedAt:'synthetic-'+i,data:{version:1,workouts:[{id:'w',title:'Revision '+i,notes:'x'.repeat(6000)}]}});
// Hundreds of successfully acknowledged restores remain bounded and keep the latest safety copy.
{
 const s=storage(5*1024*1024),v=vault(s);let peak=0;for(let i=0;i<600;i++){v.before(backup(i));assert.equal(v.get('before-cloud').data.workouts[0].title,'Revision '+i);v.acknowledge();assert.ok(v.inspect().history.length<=2);assert.ok(Object.keys(v.inspect().blobs).length<=3);assert.equal(s.length,1);assert.ok(s.getItem('vault').length<25000);peak=Math.max(peak,2*s.getItem('vault').length)}console.log('Recovery stress metrics: 600 restore cycles; peak retained vault '+peak+' UTF-16 bytes; 1 vault key; at most 3 normal snapshot blobs.')
 const raw=s.getItem('vault');v.before({...backup(599),exportedAt:'different export stamp'});assert.equal(s.getItem('vault'),raw,'Identical payload deduplicates regardless of export timestamp');
}
// First unresolved pair remains immutable across unlimited later conflict attempts and restores.
{
 const s=storage(),v=vault(s);v.before(backup('baseline'));v.acknowledge();v.conflict(backup('local-first'),backup('remote-first'));const raw=s.getItem('vault');
 for(let i=0;i<400;i++){assert.throws(()=>v.conflict(backup('new-local-'+i),backup('new-remote-'+i)),/Первый конфликт/);assert.throws(()=>v.before(backup(i)),/конфликт/);assert.equal(s.getItem('vault'),raw)}
 assert.equal(v.get('conflict-local').data.workouts[0].title,'Revision local-first');assert.equal(v.get('conflict-cloud').data.workouts[0].title,'Revision remote-first');
 v.resolve();for(let i=0;i<50;i++){v.before(backup(i));v.acknowledge()}assert.ok(Object.keys(v.inspect().blobs).length<=3);assert.equal(s.length,1);
}
// Failed/uncertain restore remains pinned until its exact local/baseline commit is acknowledged.
{
 const s=storage(),v=vault(s);v.before(backup('sole-before'));const raw=s.getItem('vault');assert.throws(()=>v.before(backup('another')),/не подтверждено/);assert.equal(s.getItem('vault'),raw);assert.equal(v.get('before-cloud').data.workouts[0].title,'Revision sole-before');
}
// Real quota probe, not only a configured cap, aborts before consuming ordinary-save capacity.
{
 const s=storage(180000);s.setItem('ordinary','z'.repeat(30000));const original=s.getItem('ordinary'),v=vault(s,{totalBudget:10*1024*1024,maxBytes:10*1024*1024});assert.throws(()=>v.before(backup('too-large')),/Quota/);assert.equal(s.getItem('vault'),null);assert.equal(s.getItem('vault:headroom-probe'),null);assert.equal(s.getItem('ordinary'),original);s.setItem('ordinary','z'.repeat(31000));
}
// Quota after a capacity probe still leaves the previous atomic vault unchanged.
{
 const s=storage(),v=vault(s);v.before(backup('keep'));v.acknowledge();const original=s.getItem('vault'),set=s.setItem;s.setItem=(k,x)=>{if(k==='vault')throw Error('late quota');return set(k,x)};assert.throws(()=>v.before(backup('next')),/late quota/);assert.equal(s.getItem('vault'),original);assert.equal(s.getItem('vault:headroom-probe'),null);
}
// Abandoned capacity probes contain no journal data and are reclaimed on the next safe open.
{
 const s=storage();s.setItem('vault:headroom-probe','0'.repeat(100));vault(s);assert.equal(s.getItem('vault:headroom-probe'),null);
}
console.log('Passed: 600 bounded acknowledged restores, 400 pinned conflict attempts, failed-restore preservation, real quota/headroom probe, late-quota atomicity, stale-probe cleanup, and content deduplication.');
