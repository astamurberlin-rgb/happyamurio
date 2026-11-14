import {execFileSync} from 'node:child_process';
import {cp,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url);
execFileSync(process.execPath,['scripts/build-preview.mjs'],{cwd:fileURLToPath(root),stdio:'inherit'});
for(const name of await readdir(new URL('dist/',root)))await cp(new URL('dist/'+name,root),new URL(name,root),{recursive:true});
console.log('Happy Sport · Update 42 built inside its separate release directory.');
