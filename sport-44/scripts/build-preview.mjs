import {cp,mkdir,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
execFileSync(process.execPath,['sport/scripts/build.mjs'],{cwd:root,stdio:'inherit'});
await rm(new URL('../dist/',import.meta.url),{recursive:true,force:true});
for(const dir of ['dist/sport'])await mkdir(new URL('../'+dir+'/',import.meta.url),{recursive:true});
for(const [from,to] of [['sport/index.html','dist/sport/index.html'],['sport/index.html','dist/index.html'],['sport/app-icons','dist/sport/app-icons'],['sport/manifest.webmanifest','dist/sport/manifest.webmanifest'],['sport/exercises','dist/sport/exercises'],['sport/data','dist/sport/data'],['sport/app-icons','dist/app-icons'],['sport/manifest.webmanifest','dist/manifest.webmanifest'],['sport/exercises','dist/exercises'],['sport/data','dist/data']])await cp(new URL('../'+from,import.meta.url),new URL('../'+to,import.meta.url),{recursive:true});
console.log('Sport Update 44 built. Storage and exchange only through the shared module (shared/happy-store.js).');
