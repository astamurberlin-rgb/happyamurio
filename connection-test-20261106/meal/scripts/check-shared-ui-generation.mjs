/* Offline synthetic trees; exercises only the generator, never application data. */
import {readFile,writeFile,mkdir,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const generator=await readFile(new URL('./sync-shared-ui.mjs',import.meta.url),'utf8');
const original='<style>/* HAPPY_SHARED_STYLE_START */old/* HAPPY_SHARED_STYLE_END */</style><script id="happy-shared-ui">old</script><script id="happy-profile-storage">old-profile</script>';
const shared='globalThis.shared="</shared>";',meal='globalThis.meal="</meal>";',profile='globalThis.profile="</profile>";',css='.shared{color:purple}';
async function fixture({day=true,dist=true}={}){
 const root=await mkdtemp(join(tmpdir(),'happy-ui-generation-'));
 const files={'scripts/sync-shared-ui.mjs':generator,'shared/happy-ui.css':css,'shared/happy-ui.js':shared,'meal/account-ui.js':meal,'meal/profile-storage.js':profile,'meal/index.html':original,'sport/index.html':'SPORT UNCHANGED','sport/src/app.js':'SPORT SOURCE UNCHANGED'};
 if(day)files['day/index.html']=original;
 if(dist){files['dist/meal/index.html']='OLD SERVED MEAL';files['dist/day/index.html']='DAY PACKAGING UNCHANGED';files['dist/sport/index.html']='SPORT SERVED UNCHANGED'}
 for(const [name,value] of Object.entries(files)){await mkdir(join(root,name,'..'),{recursive:true});await writeFile(join(root,name),value)}
 return {root,files};
}
const read=(root,path)=>readFile(join(root,path),'utf8');
const run=(root,args=[])=>spawnSync(process.execPath,['scripts/sync-shared-ui.mjs',...args],{cwd:root,encoding:'utf8'});
function validateMeal(text){assert.ok(text.includes(css));assert.ok(text.includes(meal.replaceAll('</','<\\/')));assert.ok(text.includes(profile.replaceAll('</','<\\/')));assert.ok(!text.includes(shared.replaceAll('</','<\\/')))}
async function untouched(f,names){for(const name of names)assert.equal(await read(f.root,name),f.files[name],name+' must be unchanged')}
for(const mode of ['default','meal','source-only','meal-source-only']){
 const only=mode.startsWith('meal'),dist=!mode.includes('source-only'),f=await fixture({day:!only,dist});
 try{
  const args=only?['--app','meal']:[],r=run(f.root,args);assert.equal(r.status,0,r.stderr);
  const result=await read(f.root,'meal/index.html');validateMeal(result);
  if(dist)assert.equal(await read(f.root,'dist/meal/index.html'),result);
  else await assert.rejects(read(f.root,'dist/meal/index.html'),{code:'ENOENT'});
  if(!only){const day=await read(f.root,'day/index.html');assert.ok(day.includes(shared.replaceAll('</','<\\/')));assert.ok(day.includes(css));assert.ok(day.includes('old-profile'));assert.ok(!day.includes(meal.replaceAll('</','<\\/')))}
  await untouched(f,['sport/index.html','sport/src/app.js',...(dist?['dist/day/index.html','dist/sport/index.html']:[])]);
  const before=await read(f.root,'meal/index.html');assert.equal(run(f.root,args).status,0);assert.equal(await read(f.root,'meal/index.html'),before,'idempotent Meal regeneration');
 }finally{await rm(f.root,{recursive:true,force:true})}
}
// Explicit scoped generation must not touch Day even if Day is present.
{
 const f=await fixture();try{assert.equal(run(f.root,['--app','meal']).status,0);await untouched(f,['day/index.html','dist/day/index.html','sport/index.html','sport/src/app.js','dist/sport/index.html'])}finally{await rm(f.root,{recursive:true,force:true})}
}
for(const args of [['--app'],['--app','day'],['--app','sport'],['--app','meal','extra'],['--unknown'],['meal']]){
 const f=await fixture();try{const r=run(f.root,args);assert.notEqual(r.status,0);assert.match(r.stderr,/Usage:/);await untouched(f,Object.keys(f.files))}finally{await rm(f.root,{recursive:true,force:true})}
}
console.log('PASS generation: all-app default, explicit Meal scope, source-only trees, guarded invalid args, escaped overrides, unchanged Sport/Day packaging and idempotence.');
