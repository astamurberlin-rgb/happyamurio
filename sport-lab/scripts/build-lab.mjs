/* Lab 10.11.2026 · Builds the lab copy: the same app with its shared libraries beside it (relative paths), so it opens
   from any address, not only from GitHub Pages. Output: ../sport-lab-dist/. The regular release output is rebuilt
   afterwards, so the release directory is left exactly as a normal build leaves it. */
import {execFileSync} from 'node:child_process';
import {cp,mkdir,rm,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url),out=new URL('../sport-lab-dist/',root),run=(script,env={})=>execFileSync(process.execPath,[script],{cwd:fileURLToPath(root),stdio:'inherit',env:{...process.env,...env}});
run('sport/scripts/build.mjs',{HAPPY_SPORT_LAB:'1'});
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
for(const name of ['index.html','exercises','app-icons','manifest.webmanifest'])await cp(new URL('sport/dist/'+name,root),new URL(name,out),{recursive:true});
// Shared libraries the page loads pictures from: only files the catalogs name.
const icons=JSON.parse(await readFile(new URL('../assets/sport-icons/v1/catalog.json',root),'utf8'));
for(const item of icons){await mkdir(new URL('assets/sport-icons/v1/'+item.src.split('/')[0]+'/',out),{recursive:true});await cp(new URL('../assets/sport-icons/v1/'+item.src,root),new URL('assets/sport-icons/v1/'+item.src,out))}
const media=JSON.parse(await readFile(new URL('../assets/exercise-media/v1/catalog.json',root),'utf8'));
for(const item of media.items)for(const path of [item.cover,...Object.values(item.frames||{})].filter(Boolean)){await mkdir(new URL('assets/exercise-media/v1/'+path.split('/')[0]+'/',out),{recursive:true});await cp(new URL('../assets/exercise-media/v1/'+path,root),new URL('assets/exercise-media/v1/'+path,out))}
run('scripts/build-release.mjs');
console.log('Lab copy built: '+fileURLToPath(out));
