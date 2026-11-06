/* Synthetic release migration checks. No network, accounts or personal diary writes. */
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const c=vm.createContext({console,MEAL_SOURCE_DEFAULTS_RELEASE:'22.11-usda-test.9'});
for(const p of ['meal/sources.js','meal/journal-model.js'])vm.runInContext(await read(p),c);
const S=c.MealSources,M=c.MealJournalModel,release='22.11-usda-test.9';
const copy=x=>JSON.parse(JSON.stringify(x)),ids=['BLS','USDA','MEXT','HM','OWN'];
const fixture=()=>({days:{'2026-10-30':{items:[{id:'fixture-entry',fid:'fixture-food',sec:'am',g:123}]}},sections:[{k:'am',t:'Synthetic breakfast'}],foods:[{id:'fixture-food',n:'Synthetic food'}],recipes:[{id:'fixture-recipe',items:[]}],units:{'fixture-food':{'my unit':87}},favs:['fixture-food'],goals:{kcal:1900},catalogLang:'ja',unrelated:{keep:true}});
const withoutSources=db=>{const x=copy(db);delete x.foodSources;return x;};
function allEnabled(db){for(const id of ids)assert.equal(db.foodSources[id],true,id);assert.equal(db.foodSources.__defaultsRelease,release);assert.equal(db.foodSources.__defaultsManual,false);}
function unchangedElsewhere(before,after){assert.deepEqual(withoutSources(after),withoutSources(before));}
assert.equal(typeof S.applyTestDefaults,'function');assert.equal(typeof S.prepareTestImport,'function');
// Fresh profile and old preferences: explicit release migration enables each catalog once.
for(const prefs of [undefined,Object.fromEntries(ids.map(id=>[id,false])),{BLS:true,USDA:false},{BLS:false,USDA:true,MEXT:false,HM:false,OWN:false}]){
 const db=fixture();if(prefs!==undefined)db.foodSources=copy(prefs);const before=copy(db);
 assert.equal(S.applyTestDefaults(db,release),true);allEnabled(db);unchangedElsewhere(before,db);
 const applied=copy(db);assert.equal(S.applyTestDefaults(db,release),false);assert.deepEqual(copy(db),applied);
}
// Marker survives preference normalization and user toggles; reload never forces a later choice on.
const user=fixture();S.applyTestDefaults(user,release);
assert.equal(S.preferences(user).__defaultsRelease,release);
for(const id of ['USDA','MEXT','HM','OWN'])assert.equal(S.setEnabled(user,id,false),true);
assert.equal(user.foodSources.__defaultsRelease,release);assert.equal(user.foodSources.__defaultsManual,true);assert.equal(S.setEnabled(user,'BLS',false),false);
const reload=copy(user),beforeReload=copy(reload);assert.equal(S.applyTestDefaults(reload,release),false);assert.deepEqual(copy(reload),beforeReload);
for(const id of ['USDA','MEXT','HM','OWN'])assert.equal(S.enabled(reload,id),false);
// A manual click before first sync applies migration before preserving the requested choice.
const early=fixture();early.foodSources=Object.fromEntries(ids.map(id=>[id,false]));const earlyBefore=copy(early);
assert.equal(S.setEnabled(early,'USDA',false),true);
for(const id of ids)assert.equal(early.foodSources[id],id!=='USDA');
assert.equal(early.foodSources.__defaultsRelease,release);assert.equal(early.foodSources.__defaultsManual,true);unchangedElsewhere(earlyBefore,early);
assert.equal(S.applyTestDefaults(early,release),false);
// A separate profile has its own migration, not an ambient global flag.
const newProfile=fixture();assert.equal(S.applyTestDefaults(newProfile,release),true);allEnabled(newProfile);assert.equal(S.enabled(user,'USDA'),false);
// Explicit later imports preserve their choices, and carry current marker atomically with flags.
const incoming=fixture();incoming.foodSources={BLS:false,USDA:true,MEXT:false,HM:false,OWN:false};incoming.unrelated.imported=true;
const currentBefore=copy(user),incomingBefore=copy(incoming);
const prepared=S.prepareTestImport(incoming,user,release)||incoming;
assert.equal(prepared.foodSources.__defaultsRelease,release);
for(const id of ids)assert.equal(prepared.foodSources[id],incomingBefore.foodSources[id],id);
assert.deepEqual(copy(user),currentBefore);unchangedElsewhere(incomingBefore,prepared);
const importReload=copy(prepared);assert.equal(S.applyTestDefaults(importReload,release),false);assert.deepEqual(copy(importReload),copy(prepared));
// Old import into a profile without the migration receives this release's one-time defaults.
const firstImport=fixture();firstImport.foodSources=Object.fromEntries(ids.map(id=>[id,false]));const firstBefore=copy(firstImport),unmigrated=fixture();
const firstPrepared=S.prepareTestImport(firstImport,unmigrated,release)||firstImport;allEnabled(firstPrepared);unchangedElsewhere(firstBefore,firstPrepared);
assert.equal(unmigrated.foodSources,undefined);
// An already-migrated backup remains a later choice even on a new profile.
const markedBackup=copy(user),markedBefore=copy(markedBackup);
const markedPrepared=S.prepareTestImport(markedBackup,fixture(),release)||markedBackup;
assert.deepEqual(copy(markedPrepared),markedBefore);
// foodSources is one CRDT register: marker and choices cannot be merged independently.
const original=fixture();original.foodSources=Object.fromEntries(ids.map(id=>[id,false]));const seed=M.seed(original,'synthetic-owner');
const migrated=copy(original);S.applyTestDefaults(migrated,release);
const migrationPatch=M.patch(M.flatten(original),M.flatten(migrated),seed,'migration',1000);
assert.equal(migrationPatch.records.length,1);assert.equal(migrationPatch.records[0].id,JSON.stringify(['field','foodSources']));allEnabled({foodSources:migrationPatch.records[0].value});
const migratedDoc=M.merge(seed,migrationPatch,'synthetic-owner');
const chosen=copy(migrated);S.setEnabled(chosen,'USDA',false);S.setEnabled(chosen,'HM',false);
const choicePatch=M.patch(M.flatten(migrated),M.flatten(chosen),migratedDoc,'manual-choice',2000);
assert.equal(choicePatch.records.length,1);assert.equal(choicePatch.records[0].value.__defaultsRelease,release);
for(const merged of [M.merge(M.merge(seed,migrationPatch,'synthetic-owner'),choicePatch,'synthetic-owner'),M.merge(M.merge(seed,choicePatch,'synthetic-owner'),migrationPatch,'synthetic-owner')]){
 const restored=M.materialize(merged,fixture());assert.deepEqual(copy(restored.foodSources),copy(chosen.foodSources));
 const before=copy(restored);assert.equal(S.applyTestDefaults(restored,release),false);assert.deepEqual(copy(restored),before);unchangedElsewhere(original,restored);
}
// A concurrent old snapshot cannot split the new marker from the new choices.
const oldPatch=M.patch(M.flatten(original),M.flatten({...original,foodSources:{...original.foodSources,BLS:true}}),seed,'old-client',9000);
const current=M.merge(migratedDoc,choicePatch,'synthetic-owner');
for(const merged of [M.merge(current,oldPatch,'synthetic-owner'),M.merge(oldPatch,current,'synthetic-owner')]){
 const restored=M.materialize(merged,fixture());assert.deepEqual(copy(restored.foodSources),copy(chosen.foodSources));
 assert.equal(M.flatten(restored)[JSON.stringify(['field','foodSources'])].__defaultsRelease,release);
}
// A delayed automatic migration cannot override a manual choice, even with a higher clock.
const delayedAuto=copy(migrationPatch);delayedAuto.records[0].rev=12000;delayedAuto.records[0].writer='late-auto';
for(const merged of [M.merge(current,delayedAuto,'synthetic-owner'),M.merge(delayedAuto,current,'synthetic-owner')]){
 const restored=M.materialize(merged,fixture());assert.deepEqual(copy(restored.foodSources),copy(chosen.foodSources));
 assert.equal(restored.foodSources.__defaultsManual,true);
}
// Other journal fields retain ordinary LWW ordering, unaffected by source-only priority.
const goalId=JSON.stringify(['field','catalogLang']);
const oldGoal={id:goalId,rev:1,writer:'new-client',value:'ru'},newGoal={id:goalId,rev:2,writer:'old-client',value:'ja'};
assert.equal(M.materialize(M.merge({v:1,owner:'synthetic-owner',records:[oldGoal]},{v:1,owner:'synthetic-owner',records:[newGoal]},'synthetic-owner'),fixture()).catalogLang,'ja');
// Without the test-only runtime flag even source preferences retain normal LWW semantics.
c.MEAL_SOURCE_DEFAULTS_RELEASE=undefined;
const inactive=M.materialize(M.merge(current,oldPatch,'synthetic-owner'),fixture());
assert.deepEqual(copy(inactive.foodSources),copy(oldPatch.records[0].value));
const inactiveDb=fixture();inactiveDb.foodSources={BLS:true,USDA:false};assert.equal(S.setEnabled(inactiveDb,'HM',false),true);assert.equal(inactiveDb.foodSources.__defaultsRelease,undefined);
console.log('Passed: one-time test release defaults, fresh/disabled/partial profiles, manual disable and reload, independent profiles, import marker preservation, no unrelated mutations, atomic CRDT marker+flags and stale/concurrent snapshot ordering.');
