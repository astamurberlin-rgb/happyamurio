/* Общие файлы Happy: копии в текущих выпусках должны побайтно совпадать с эталоном из shared/shared-files.json.
   Расхождения у записей с divergent:true — предупреждение (долг), остальные — ошибка. Запускать перед коммитом
   вместе с check-layout; sync-shared.mjs приводит копии к эталону.
   Файл формата витрины или общего документа (contract:true) в долгах быть не может: разные копии читали бы один
   документ по-разному, поэтому его расхождение — всегда ошибка. */
import {readFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const apps=JSON.parse(await readFile(new URL('shared/apps.json',root),'utf8'));
const manifest=JSON.parse(await readFile(new URL('shared/shared-files.json',root),'utf8'));
const releaseDir=app=>apps[app].entry.split('/')[0];
let ok=0,missing=[],failed=[],warned=[];
for(const entry of manifest.files){
  if(entry.contract&&entry.divergent){failed.push(entry.name+': файл формата (contract) не может быть помечен divergent');continue;}
  let reference;
  const referencePath=entry.reference.replace(/\{(day|meal|sport)\}/g,(_,app)=>releaseDir(app)); // {day} — каталог текущего выпуска из apps.json
  try{reference=await readFile(new URL(referencePath,root));}catch{failed.push(entry.name+': нет эталона '+referencePath);continue;}
  for(const app of entry.apps){
    const copy=releaseDir(app)+'/shared/'+entry.name;
    let bytes;
    try{bytes=await readFile(new URL(copy,root));}catch{missing.push(copy);continue;}
    if(Buffer.compare(bytes,reference)===0){ok++;continue;}
    (entry.divergent?warned:failed).push(copy+' ≠ '+referencePath+(entry.todo?' — '+entry.todo:''));
  }
}
for(const m of missing)console.log('Нет копии: '+m);
for(const w of warned)console.log('Расхождение (долг): '+w);
for(const f of failed)console.log('ОШИБКА: '+f);
console.log(`Общие файлы: ${ok} копий совпадают с эталоном, ${warned.length} известных расхождений, ${missing.length} отсутствуют, ${failed.length} ошибок.`);
if(failed.length||missing.length)process.exit(1);
