/* Лаборатория Sport (ветка sport-lab-43): собрать страницу лаборатории в sport-43/lab/.
 * Выпуск Sport (sport-43/index.html) не трогает. Запуск из корня репозитория: node sport-43/scripts/build-lab.mjs
 * Картинки и справочник кладутся рядом (lab/assets/), страница ссылается на них относительными адресами.
 * — Claude · 15.11.2026 */
import {execFileSync} from 'node:child_process';
import {cp,rm,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const release=new URL('../',import.meta.url),repo=new URL('../../',import.meta.url),lab=new URL('lab/',release);
execFileSync(process.execPath,['scripts/build.mjs'],{cwd:fileURLToPath(new URL('sport/',release)),stdio:'inherit',env:{...process.env,HAPPY_SPORT_LAB:'1'}});
await rm(lab,{recursive:true,force:true});await mkdir(lab,{recursive:true});
await cp(new URL('sport/index.html',release),new URL('index.html',lab));
await cp(new URL('sport/exercises/',release),new URL('exercises/',lab),{recursive:true});
await cp(new URL('sport/app-icons/',release),new URL('app-icons/',lab),{recursive:true});
for(const dir of ['sport-icons/v1/','exercise-media/v1/'])await cp(new URL('assets/'+dir,repo),new URL('assets/'+dir,lab),{recursive:true});
console.log('Лаборатория Sport собрана: sport-43/lab/index.html');
