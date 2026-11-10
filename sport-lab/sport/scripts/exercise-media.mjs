/* Lab 10.11.2026 · Rebuilds assets/exercise-media/v1/catalog.json from the pictures that are actually in the folder,
   and prints what each family still lacks. Usage: node sport/scripts/exercise-media.mjs [--check]
   Layout: assets/exercise-media/v1/<exerciseId>/cover.png|webp and start|mid|top.jpg|png|webp */
import {readdir,readFile,writeFile} from 'node:fs/promises';
import {loadLibrary,mediaRoot} from './seed.mjs';
const library=await loadLibrary(),known=new Set([...library.exercises.map(e=>e.id),'pull-up-narrow','pull-up-wide','chin-up-narrow','chin-up-wide']);
const frames=['start','mid','top'],items=[];
for(const entry of (await readdir(mediaRoot,{withFileTypes:true})).filter(e=>e.isDirectory()).sort((a,b)=>a.name.localeCompare(b.name))){
  if(!known.has(entry.name))throw new Error('Папка не совпадает ни с одним id упражнения: '+entry.name);
  const files=await readdir(new URL(entry.name+'/',mediaRoot)),item={exerciseId:entry.name};
  for(const file of files.sort()){
    const m=/^(cover|start|mid|top)\.(png|webp|jpg)$/.exec(file);if(!m)throw new Error('Неожиданное имя файла: '+entry.name+'/'+file+' (нужно cover.png|webp или start|mid|top.jpg|png|webp)');
    if(m[1]==='cover'){if(m[2]==='jpg')throw new Error('Заглавная картинка — PNG или WebP с прозрачным фоном: '+entry.name+'/'+file);if(item.cover)throw new Error('Две заглавные картинки: '+entry.name);item.cover=entry.name+'/'+file}
    else{item.frames??={};if(item.frames[m[1]])throw new Error('Два кадра одной фазы: '+entry.name+'/'+m[1]);item.frames[m[1]]=entry.name+'/'+file}
  }
  if(item.cover||item.frames)items.push(item);
}
const previous=JSON.parse(await readFile(new URL('catalog.json',mediaRoot),'utf8'));
const same=JSON.stringify(previous.items)===JSON.stringify(items);
const catalog={schema:'happy.exercise-media.v1',generated:same?previous.generated:new Date().toISOString().slice(0,10),items};
if(process.argv.includes('--check')){if(!same)throw new Error('catalog.json не совпадает с папками: запусти node sport/scripts/exercise-media.mjs')}
else await writeFile(new URL('catalog.json',mediaRoot),JSON.stringify(catalog,null,1)+'\n');
for(const family of library.families){
  console.log(family.name+':');
  for(const v of family.variants){const item=items.find(i=>i.exerciseId===v.exerciseId)||{};const missing=[!item.cover&&'cover',...frames.filter(k=>!item.frames?.[k])].filter(Boolean);console.log('  '+v.exerciseId.padEnd(18)+v.pill.padEnd(26)+(missing.length?'нет: '+missing.join(', '):'все картинки на месте'))}
}
