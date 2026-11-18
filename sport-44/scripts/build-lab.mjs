/* Лаборатория Sport (ветка sport-lab-44): собрать страницу лаборатории в sport-44/lab/ — для закрытой страницы Claude.
 * Выпуск Sport (sport-44/index.html) не трогает. Запуск из корня репозитория: node sport-44/scripts/build-lab.mjs
 * Картинки занятий и кадры упражнений кладутся рядом (lab/assets/), страница ссылается на них относительными адресами;
 * справки README.md из папок картинок в лабораторию не кладутся.
 * — Claude · 15.11.2026, на Sport 44 — 16.11.2026 */
import {execFileSync} from 'node:child_process';
import {cp,rm,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const release=new URL('../',import.meta.url),repo=new URL('../../',import.meta.url),lab=new URL('lab/',release);
await rm(lab,{recursive:true,force:true});await mkdir(lab,{recursive:true});
execFileSync(process.execPath,['scripts/build.mjs'],{cwd:fileURLToPath(new URL('sport/',release)),stdio:'inherit',env:{...process.env,HAPPY_SPORT_LAB:'1'}});
for(const dir of ['sport-icons/v1/','exercise-media/v1/']){
 await cp(new URL('assets/'+dir,repo),new URL('assets/'+dir,lab),{recursive:true});
 await rm(new URL('assets/'+dir+'README.md',lab),{force:true});
}
console.log('Лаборатория Sport собрана: sport-44/lab/index.html');
