/* Update 38.2: exercises, equipment and muscle groups come from the shared library assets/exercise-library/v1/
   (repository root); the release keeps only app-level seed parts (activities, icon names, empty journals).
   Build and checks compose the full seed through this loader so they never diverge. */
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
export const EXERCISE_LIBRARY_VERSION='v1';
export const EXERCISE_LIBRARY_URL='/happyamurio/assets/exercise-library/'+EXERCISE_LIBRARY_VERSION+'/';
const sportRoot=new URL('../',import.meta.url);
export const libraryRoot=new URL('../../assets/exercise-library/'+EXERCISE_LIBRARY_VERSION+'/',sportRoot);
async function json(url){return JSON.parse(await readFile(url,'utf8'))}
export async function loadLibrary(){
  const [manifest,exercises,equipment,muscles]=await Promise.all(['manifest.json','exercises.json','equipment.json','exercise-muscles.json'].map(name=>json(new URL(name,libraryRoot))));
  // The manifest's hashes must match the files we are about to embed.
  for(const file of manifest.files){const bytes=await readFile(new URL(file.path,libraryRoot));const sha=createHash('sha256').update(bytes).digest('hex');if(sha!==file.sha256||bytes.length!==file.size)throw new Error('Exercise library file does not match its manifest: '+file.path);}
  if(!Array.isArray(exercises)||exercises.length<100||exercises.some(e=>!e.id||!e.name))throw new Error('Exercise library is incomplete');
  for(const e of exercises)if(!Array.isArray(muscles[e.id])||!muscles[e.id].length)throw new Error('Exercise without muscle groups in the library: '+e.id);
  // Lab 10.11.2026: families.json (library 1.1) groups grip variants of one movement under one card. Optional file;
  // when the manifest lists it, its hash was verified above. Definitions in exercises.json stay untouched.
  const familyFile=manifest.files.some(f=>f.path==='families.json')?await json(new URL('families.json',libraryRoot)):{},families=familyFile.families||[];
  // Lab 10.11.2026 15:51: «cards» — an exercise on other equipment gets its own card (not a pill), with the phases and
  // breathing of the family named in techniqueFrom and its own grip line (rule: pills = one piece of equipment).
  const runtimeIds=new Set(['pull-up-narrow','pull-up-wide','chin-up-narrow','chin-up-wide']),known=id=>exercises.some(e=>e.id===id)||runtimeIds.has(id);
  for(const f of families){
    if(!f.id||!f.name||!known(f.baseExerciseId)||!Array.isArray(f.variants)||f.variants.length<2||!Array.isArray(f.phases)||!f.phases.length)throw new Error('Exercise family is incomplete: '+f.id);
    if(f.variants[0].exerciseId!==f.baseExerciseId)throw new Error('The first variant of a family is its base exercise: '+f.id);
    for(const v of f.variants)if(!known(v.exerciseId)||!v.pill||!v.grip||!v.accent)throw new Error('Family variant is incomplete: '+f.id+' / '+v.exerciseId);
    if(new Set(f.variants.map(v=>v.exerciseId)).size!==f.variants.length)throw new Error('Family variant listed twice: '+f.id);
  }
  const cards=familyFile.cards||[],inFamily=new Set(families.flatMap(f=>[...f.variants.map(v=>v.exerciseId),...(f.retiredExerciseIds||[])]));
  for(const c of cards){
    if(!known(c.exerciseId)||!c.name||!c.page||!c.grip||!c.accent||!families.some(f=>f.id===c.techniqueFrom&&f.page===c.page))throw new Error('Exercise card is incomplete: '+c.exerciseId);
    if(inFamily.has(c.exerciseId))throw new Error('An exercise is either a pill of a family or a card of its own: '+c.exerciseId);
  }
  if(new Set(cards.map(c=>c.exerciseId)).size!==cards.length)throw new Error('Exercise card listed twice');
  return {manifest,exercises,equipment,muscles,families,cards};
}
/* Lab 10.11.2026: pictures of exercises (cover + phase frames) live in assets/exercise-media/v1/<exerciseId>/ and are
   listed in its catalog.json (regenerate with scripts/exercise-media.mjs). Missing pictures are normal: the app falls
   back to the sport icon and to the frames shared by the family. */
export const EXERCISE_MEDIA_VERSION='v1';
export const mediaRoot=new URL('../../assets/exercise-media/'+EXERCISE_MEDIA_VERSION+'/',sportRoot);
export async function loadMedia(){
  let catalog;try{catalog=await json(new URL('catalog.json',mediaRoot))}catch(e){if(e.code==='ENOENT')return {};throw e}
  const media={};
  for(const item of catalog.items||[]){
    if(!item.exerciseId||media[item.exerciseId])throw new Error('Exercise media catalog: bad or repeated exerciseId '+item.exerciseId);
    const entry={};
    for(const [key,path] of [['cover',item.cover],...Object.entries(item.frames||{})]){
      if(!path)continue;if(!/^[a-z0-9-]+\/[a-z0-9-]+\.(png|webp|jpg)$/.test(path))throw new Error('Exercise media path is not allowed: '+path);
      await readFile(new URL(path,mediaRoot));
      if(key==='cover')entry.cover=path;else (entry.frames??={})[key]=path;
    }
    media[item.exerciseId]=entry;
  }
  return media;
}
/* Lab 10.11.2026 15:51: the library placeholder — Daniel sitting on the floor — for exercises without a picture of their
   own. catalog.json names the file and the exercises whose sport icon already shows the exercise itself. */
export async function loadMediaPlaceholder(){
  let catalog;try{catalog=await json(new URL('catalog.json',mediaRoot))}catch(e){if(e.code==='ENOENT')return null;throw e}
  const p=catalog.placeholder;if(!p)return null;
  if(!/^[a-z0-9-]+\.(png|webp)$/.test(p.cover||''))throw new Error('Exercise media placeholder path is not allowed: '+p.cover);
  await readFile(new URL(p.cover,mediaRoot));
  if(!Array.isArray(p.keepSportIcon)||p.keepSportIcon.some(id=>typeof id!=='string'))throw new Error('Exercise media placeholder: keepSportIcon must list exercise ids');
  return {cover:p.cover,keepSportIcon:p.keepSportIcon};
}
export async function loadSeed(){
  const base=await json(new URL('data/seed.json',sportRoot)),library=await loadLibrary();
  if(base.exercises||base.equipment)throw new Error('data/seed.json must not carry exercises or equipment: they live in the exercise library');
  return {...base,exercises:library.exercises,equipment:library.equipment};
}
export async function loadMuscles(){return (await loadLibrary()).muscles}
