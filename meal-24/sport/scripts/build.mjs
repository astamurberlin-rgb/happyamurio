import { readFile, mkdir, writeFile, cp } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const [template, seedText, app, license] = await Promise.all([
  readFile(new URL('src/app.template.html', root), 'utf8'),
  readFile(new URL('data/seed.json', root), 'utf8'),
  readFile(new URL('src/app.js', root), 'utf8'),
  readFile(new URL('PHOSPHOR-LICENSE.txt', root), 'utf8'),
]);
const seed=JSON.parse(seedText);
for (const field of ['workouts','measurements','rawMeasurements']) {
  if (seed[field]?.length) throw new Error('Публичная сборка не должна содержать личные записи: '+field);
}
if (!template.includes('__SEED__') || !template.includes('__APP__')) {
  throw new Error('В шаблоне отсутствуют места для данных или приложения.');
}
const read=path=>readFile(new URL(path,root),'utf8');
const [css,refinements,navIcons,dock,auth,link,cloud]=await Promise.all([
  read('src/refinements.css'),read('src/refinements.js'),read('src/nav-icons.json'),read('src/dock-shape.js'),
  read('src/happy-auth.js'),read('src/sport-link.js'),read('src/sport-cloud.js')
]);
JSON.parse(navIcons);
const planning=await read('src/planning.js');
const sportCatalog=await read('src/sport-icons/catalog.json');
const sportIcons=(await read('src/sport-icons.js')).replace('__SPORT_ICON_CATALOG__',()=>sportCatalog);
const setTime=await read('src/set-time.js');
const rests=await read('src/set-rest.js'),countdown=await read('src/set-countdown.js'),setSwipe=await read('src/set-swipe.js');
const pause=await read('src/workout-pause.js'),exerciseHistory=await read('src/exercise-history.js'),workoutIdentity=await read('src/workout-identity.js');
const measurements=await read('src/measurements-v2.js'),measurementModel=await readFile(new URL('../shared/measurements-model.js',root),'utf8'),measurementShared=await read('src/measurements-shared.js');
const recommendations=await read('data/recommended-templates.json');JSON.parse(recommendations);
const muscles=await read('data/exercise-muscles.json');JSON.parse(muscles);
const library=(await read('src/library-v2.js')).replace('__RECOMMENDED_TEMPLATES__',()=>recommendations.replaceAll('</','<\\/')).replace('__EXERCISE_MUSCLES__',()=>muscles);
const energyJs=await read('src/energy-widget.js'),energyCss=await read('src/energy-widget.css');
const dataTransfer=await read('src/data-transfer.js');
async function readShared(name){
  try{return await readFile(new URL('../shared/'+name,root),'utf8')}
  catch(e){if(e.code!=='ENOENT')throw e;return readFile(new URL('shared/'+name,root),'utf8')}
}
const [sharedCss,sharedJs]=await Promise.all([readShared('happy-ui.css'),readShared('happy-ui.js')]);
const html = template
  .replace('</style>',()=>css+energyCss+sharedCss+'\n</style>')
  .replace('__SEED__', () => seedText.replaceAll('</', '<\\/'))
  .replace('__APP__', () => [sharedJs,sportIcons,app,dock,refinements.replace('__NAV_ICONS__',()=>navIcons),auth,link,cloud,planning,measurements,library,rests,pause,countdown,setTime,setSwipe,exerciseHistory,workoutIdentity,energyJs,dataTransfer,measurementModel,measurementShared].join('\n'))
  .replace('</body>', () => `<!-- Phosphor Icons license\n${license.replaceAll('\r\n', '\n')}\n--></body>`);
await mkdir(new URL('dist/', root), { recursive: true });
await writeFile(new URL('dist/index.html', root), html);
await writeFile(new URL('index.html', root), html);
await cp(new URL('src/sport-icons',root),new URL('sport-icons',root),{recursive:true});
await cp(new URL('src/exercises',root),new URL('exercises',root),{recursive:true});
await cp(new URL('src/sport-icons',root),new URL('dist/sport-icons',root),{recursive:true});
await cp(new URL('src/exercises',root),new URL('dist/exercises',root),{recursive:true});
console.log('Sport built.');

// App installation assets travel with both published Sport outputs.
for (const directory of ['', 'dist/']) {
  await cp(new URL('src/app-icons',root),new URL(directory+'app-icons',root),{recursive:true});
  await cp(new URL('src/manifest.webmanifest',root),new URL(directory+'manifest.webmanifest',root));
}
