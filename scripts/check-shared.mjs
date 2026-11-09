/* Общие файлы Happy: копии в текущих выпусках должны побайтно совпадать с эталоном из shared/shared-files.json.
   Расхождения у записей с divergent:true — предупреждение (долг), остальные — ошибка. Запускать перед коммитом
   вместе с check-layout; sync-shared.mjs приводит копии к эталону. */
import {readFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const apps=JSON.parse(await readFile(new URL('shared/apps.json',root),'utf8'));
const manifest=JSON.parse(await readFile(new URL('shared/shared-files.json',root),'utf8'));
const releaseDir=app=>apps[app].entry.split('/')[0];
let ok=0,missing=[],failed=[],warned=[];
for(const entry of manifest.files){
  let reference;
  try{reference=await readFile(new URL(entry.reference,root));}catch{failed.push(entry.name+': нет эталона '+entry.reference);continue;}
  for(const app of entry.apps){
    const copy=releaseDir(app)+'/shared/'+entry.name;
    let bytes;
    try{bytes=await readFile(new URL(copy,root));}catch{missing.push(copy);continue;}
    if(Buffer.compare(bytes,reference)===0){ok++;continue;}
    (entry.divergent?warned:failed).push(copy+' ≠ '+entry.reference+(entry.todo?' — '+entry.todo:''));
  }
}
for(const m of missing)console.log('Нет копии: '+m);
for(const w of warned)console.log('Расхождение (долг): '+w);
for(const f of failed)console.log('ОШИБКА: '+f);
console.log(`Общие файлы: ${ok} копий совпадают с эталоном, ${warned.length} известных расхождений, ${missing.length} отсутствуют, ${failed.length} ошибок.`);
if(failed.length||missing.length)process.exit(1);
