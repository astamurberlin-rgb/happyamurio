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
  return {manifest,exercises,equipment,muscles};
}
export async function loadSeed(){
  const base=await json(new URL('data/seed.json',sportRoot)),library=await loadLibrary();
  if(base.exercises||base.equipment)throw new Error('data/seed.json must not carry exercises or equipment: they live in the exercise library');
  return {...base,exercises:library.exercises,equipment:library.equipment};
}
export async function loadMuscles(){return (await loadLibrary()).muscles}
