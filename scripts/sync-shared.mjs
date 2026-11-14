/* Копирует эталонные общие файлы (shared/shared-files.json) в shared/ текущих выпусков из shared/apps.json.
   Записи с divergent:true не трогает — их объединяют руками в выпуске. После копирования для Day и Meal
   нужно `node scripts/sync-shared-ui.mjs` (встраивание в index.html), для Sport — сборка выпуска. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const apps=JSON.parse(await readFile(new URL('shared/apps.json',root),'utf8'));
const manifest=JSON.parse(await readFile(new URL('shared/shared-files.json',root),'utf8'));
const releaseDir=app=>apps[app].entry.split('/')[0];
let copied=0,same=0,skipped=0;
for(const entry of manifest.files){
  if(entry.divergent){skipped+=entry.apps.length;continue;}
  const referencePath=entry.reference.replace(/\{(day|meal|sport)\}/g,(_,app)=>releaseDir(app)); // {day} — каталог текущего выпуска, как в check-shared
  const reference=await readFile(new URL(referencePath,root));
  for(const app of entry.apps){
    if(releaseDir(app)+'/shared/'+entry.name===referencePath)continue; // эталон лежит в самом выпуске
    const target=new URL(releaseDir(app)+'/shared/'+entry.name,root);
    let current=null;try{current=await readFile(target);}catch{}
    if(current&&Buffer.compare(current,reference)===0){same++;continue;}
    await mkdir(new URL('./',target),{recursive:true});await writeFile(target,reference);copied++;
    console.log('Обновлено: '+releaseDir(app)+'/shared/'+entry.name+' ← '+referencePath);
  }
}
console.log(`Общие файлы: ${copied} скопировано, ${same} уже совпадали, ${skipped} пропущено (расхождения). Дальше: node scripts/sync-shared-ui.mjs; сборка Sport; node scripts/check-shared.mjs.`);
