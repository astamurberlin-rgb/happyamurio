import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createContext,runInContext} from 'node:vm';
import assert from 'node:assert/strict';

// Synthetic, offline catalog regression. No historical user input, application
// boot, account, browser storage, import, or network operation is performed.
// Baseline: clean v5 d2d966b8f93c8eda6eb5e78bdf230a1134e326bb.
const root=new URL('../',import.meta.url),read=p=>readFile(new URL(p,root),'utf8');
const plain=x=>JSON.parse(JSON.stringify(x));
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const seed=JSON.parse(await read('data/seed.json'));
const muscles=JSON.parse(await read('data/exercise-muscles.json'));
const expectedIds=['machine-plate-loaded-seated-calf','machine-independent-lever-row','dumbbell-bilateral-simultaneous-row','dumbbell-incline-chest-supported-reverse-fly'];
const old=seed.exercises.slice(0,133),added=seed.exercises.slice(133);
assert.equal(hash(old),'c443eadb91c811de1bfb11ccb3d4054f2d1815659d1f2cb3ab4cadbf75ddd415','All original 133 definitions, order and values remain unchanged');
assert.equal(hash({...seed,exercises:[]}),'48ee79e10637e19d4bc8b1d0a08a787e31ed5a65188ae08ef58c47e497f9df17','All non-exercise seed content remains unchanged');
assert.deepEqual(added.map(e=>e.id),expectedIds,'Only the four currently approved additions exist');
assert.equal(hash(added.slice(0,3)),'d484d073dec169e0a4bb726601db54dc2558c42c967cf6f9ee2ddc2571eed7ee','The first three reviewed additions remain exactly unchanged');
assert.equal(hash(Object.fromEntries(Object.entries(muscles).filter(([id])=>!expectedIds.includes(id)))),'9ab5d6a29681da18df70eb218e63734f7e3921edc08a24b83c803bee387e29b2','All old muscle-map entries remain unchanged');
assert.deepEqual(Object.keys(muscles).filter(id=>!old.some(e=>e.id===id)),expectedIds);
assert.equal(new Set(seed.exercises.map(e=>e.id)).size,seed.exercises.length);
const normalized=s=>String(s).trim().toLowerCase().replaceAll('ё','е');
for(const key of ['name','en'])assert.equal(new Set(seed.exercises.map(e=>normalized(e[key]))).size,seed.exercises.length,`Unique ${key}`);
for(const e of added){
  assert.match(e.id,/^(machine|dumbbell)-[a-z-]+$/);
  assert.match(e.name,/[А-Яа-яЁё]/);assert.match(e.en,/[A-Za-z]/);
  assert.equal(e.scope,'app');assert.equal(e.profile,'load_reps');
  assert.deepEqual(e.groupIds,['gym']);assert.ok(muscles[e.id]?.length);
  assert.ok(e.description.length>30);assert.ok(e.aliases.length>0);
  assert.ok(e.equipment.every(key=>Object.hasOwn(seed.equipment,key)),`Recognized equipment for ${e.id}`);
  assert.equal(e.loadBasis,e.strongIdentity.loadBasis);
  assert.ok(e.references.length>0);
  for(const ref of e.references){assert.ok(ref.title);assert.ok(ref.scope);assert.equal(new URL(ref.url).protocol,'https:');}
  assert.doesNotMatch(e.description,/лечени|реабилитац|предотвращ.*травм|излеч|гарантиру/i,'No medical/rehabilitation claims');
}
const [calf,lever,bilateral,incline]=added;
assert.deepEqual(calf.strongIdentity,{family:'seated_plate_loaded_calf_raise',loading:'plate_loaded',loadBasis:'plates_only'});
assert.deepEqual(lever.strongIdentity,{family:'independent_lever_row',leverAction:'independent',support:'unknown',loadBasis:'total_external'});
assert.deepEqual(bilateral.strongIdentity,{family:'dumbbell_row',armAction:'bilateral_simultaneous',support:'unknown',loadBasis:'per_hand'});
assert.deepEqual(incline.strongIdentity,{family:'dumbbell_reverse_fly',support:'chest_supported',benchPosition:'incline',loadBasis:'unknown'});
assert.deepEqual(muscles[calf.id],['legs']);
assert.deepEqual(muscles[lever.id],['back','arms']);
assert.deepEqual(muscles[bilateral.id],['back','arms']);
assert.deepEqual(muscles[incline.id],['shoulders','back']);
assert.deepEqual(incline.equipment,['dumbbell','bench']);
assert.equal(incline.loadBasis,'unknown');
assert.match(incline.description,/Способ учёта веса.*не устанавливается/);
assert.match(incline.description,/без удвоения или другого пересчёта/);
assert.match(incline.name,/заднюю дельту.*опорой грудью.*наклонную скамью/);
assert.equal(incline.en,'Chest-supported incline dumbbell reverse fly');
assert.deepEqual(incline.references.map(ref=>ref.scope),['movement_and_support','movement_and_support']);
assert.deepEqual(incline.references.map(ref=>new URL(ref.url).hostname),['www.acefitness.org','www.catalystathletics.com']);
assert.match(calf.description,/только масса добавленных блинов/);
assert.match(calf.description,/штифтом/);
assert.match(lever.description,/порядок движения рук.*не уточняются/);
assert.match(lever.description,/общей величиной для обеих сторон/);
assert.match(bilateral.description,/одной гантели/);
for(const e of [lever,bilateral]){
  assert.match(e.description,/Наличие и вид опоры.*не уточняются/);
  assert.ok(!e.equipment.includes('bench'));
}
assert.equal(calf.references[0].scope,'equipment_example');
assert.equal(lever.references[0].scope,'independent_lever_equipment_example_not_assumed_model');
assert.equal(bilateral.references[0].scope,'movement_example_not_assumed_support');

const app=await read('src/app.js'),refinements=await read('src/refinements.js');
const library=await read('src/library-v2.js'),groups=await read('src/catalog-groups.js');
const config=await read('src/exercise-config.js'),context=await read('src/exercise-context.js');
const syntheticState={customExercises:[{id:'custom-synthetic-existing',name:'Synthetic existing entry',en:'',aliases:[],equipment:[],profile:'reps',scope:'user'}],exerciseOverrides:{'machine-row':{...plain(old.find(e=>e.id==='machine-row')),name:'Synthetic prior override'}},exerciseGroups:[],archivedExercises:[],workouts:[{id:'synthetic-old-workout',exercises:[{id:'dumbbell-single-arm-row',name:'Synthetic recorded name',sets:[{weight:12.25,reps:8,done:true}]}]}],exerciseNotes:{},templates:[],active:null};
const beforeState=JSON.stringify(syntheticState);
let storageCalls=0,networkCalls=0,persistCalls=0;
const c=createContext({SEED:plain(seed),state:syntheticState,console,structuredClone,
  clone:plain,icon:n=>`<i>${n}</i>`,exerciseSportIcon:()=> 'synthetic-icon',
  esc:s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])),
  localStorage:{getItem(){storageCalls++;throw Error('Storage is forbidden');},setItem(){storageCalls++;throw Error('Storage is forbidden');}},
  fetch(){networkCalls++;throw Error('Network is forbidden');},persist(){persistCalls++;throw Error('Persistence is forbidden');}});
const run=s=>runInContext(s,c),line=(s,prefix)=>{const found=s.split('\n').find(l=>l.startsWith(prefix));assert.ok(found,`Missing source line ${prefix}`);return found;};
run("var baseTemplates=[],query='',category='all',libraryTab='exercises';");
run(line(app,'const allExercises='));
run(app.slice(app.indexOf('function matches('),app.indexOf('function libraryResults(')));
run(refinements.split('\n').slice(2,4).join('\n'));
// Pull-up generation is idempotent and does not duplicate the four new IDs.
run(line(refinements,"for(const base of ['pull-up','chin-up'])"));
run(library.slice(0,library.indexOf('renderLibrary=function'))
  .replace('__RECOMMENDED_TEMPLATES__','[]').replace('__EXERCISE_MUSCLES__',JSON.stringify(muscles)));
run(groups.slice(0,groups.indexOf('const editorBeforeGroups')));
run(groups.slice(groups.indexOf('const filterBeforeGroups'),groups.indexOf('const detailBeforeGroups')));
run(config.slice(0,config.indexOf('function recordExerciseRename')));
run(context.slice(context.indexOf('function exerciseContextInstructions'),context.indexOf('function mountExerciseContext')));
run(line(app,'function volume('));
assert.equal(run('SEED.exercises.length'),141);
assert.equal(run('new Set(SEED.exercises.map(e=>e.id)).size'),141);
assert.equal(run("allExercises().filter(e=>e.id==='dumbbell-single-arm-row').length"),1);
assert.equal(run("allExercises().filter(e=>e.id==='dumbbell-chest-supported-row').length"),1);
assert.equal(run("allExercises().filter(e=>e.id==='dumbbell-incline-chest-supported-reverse-fly').length"),1);
assert.equal(run("allExercises().filter(e=>e.id==='dumbbell-rear-fly').length"),1);
assert.equal(run("allExercises().filter(e=>e.id==='incline-push-up').length"),1);
// Existing runtime pull variants intentionally share their base English names.
// None of the new names/aliases may exactly collide with any other runtime entry.
const runtime=plain(run('SEED.exercises'));
for(const e of added)for(const term of [e.name,e.en,...e.aliases]){
  const collisions=runtime.filter(other=>other.id!==e.id&&[other.name,other.en,...other.aliases].some(t=>normalized(t)===normalized(term)));
  assert.deepEqual(collisions,[],`Exact runtime name/alias collision: ${term}`);
}
for(const e of added){
  for(const term of [e.name,e.en,...e.aliases]){
    c.term=term;run("category='all';librarySport='all';libraryMuscle='all';");
    assert.deepEqual(plain(run('filteredExercises(term).map(e=>e.id)')),[e.id],`Search ${term}`);
  }
  c.entry=e;const type=e.id.startsWith('dumbbell')?'dumbbell':'machine';
  run(`query='';librarySport='gym';category=${JSON.stringify(type)};libraryMuscle=${JSON.stringify(muscles[e.id][0])};`);
  assert.ok(plain(run('filteredExercises().map(e=>e.id)')).includes(e.id));
  assert.equal(run('equipmentMatches(entry,'+JSON.stringify(type)+')'),true);
  assert.deepEqual(plain(run('exerciseSports(entry)')),['gym']);
  assert.deepEqual(plain(run('exerciseMetrics(entry)')),['reps','weight']);
  const card=run('exerciseCard(entry)');assert.ok(card.includes(e.name));assert.ok(card.includes(`data-id="${e.id}"`));assert.ok(!card.includes(' · Моё'));
  const instructions=run('exerciseContextInstructions(entry.id)');assert.ok(instructions.includes(e.description));
  assert.ok(!instructions.includes('ещё не добавлена'));
  // Catalog references are not currently displayed as links by the shared UI.
  assert.ok(!instructions.includes('<a '));
  for(let repeat=0;repeat<3;repeat++){
    assert.equal(run('exerciseCard(entry)'),card,'Repeated rendering is stable');
    assert.equal(run('exerciseContextInstructions(entry.id)'),instructions,'Repeated instructions are stable');
    assert.equal(run('allExercises().filter(e=>e.id===entry.id).length'),1,'Repeated reads never insert definitions');
  }
  const fixture={id:e.id,name:e.name,phase:'main',sets:[{weight:12.25,reps:8,done:true},{weight:99,reps:9,done:false}]};
  c.fixture=plain(fixture);run('prepareWorkoutExercise(fixture)');
  assert.deepEqual(plain(c.fixture.sets),fixture.sets,`${e.id}: no weight conversion`);
  assert.equal(run('volume({exercises:[fixture]})'),98,`${e.id}: uses recorded weight, no doubling or mechanism mass`);
  c.fixture=plain(c.fixture);run('prepareWorkoutExercise(fixture)');
  assert.deepEqual(plain(c.fixture.sets),fixture.sets,`${e.id}: repeat preparation after JSON roundtrip preserves weight`);
  assert.deepEqual(plain(run('exercise(entry.id).strongIdentity')),e.strongIdentity,`${e.id}: preparation never infers identity metadata`);
}
assert.equal(JSON.stringify(syntheticState),beforeState,'Catalog reads/rendering leave all user state unchanged');
assert.equal(storageCalls,0);assert.equal(networkCalls,0);assert.equal(persistCalls,0);
console.log('Passed: exact original 133 definitions/muscle map and first three reviewed additions; only four app-scoped additions; 141 unique runtime IDs; no new name/alias collisions; RU/EN search, equipment/muscle/group filters, stable repeated cards/instructions; unknown row support and explicit incline chest support; unknown incline weight basis remains unknown; unchanged recorded weights/volume across JSON roundtrip; zero storage/network/persistence calls.');
