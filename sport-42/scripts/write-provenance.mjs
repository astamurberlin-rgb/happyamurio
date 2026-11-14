/* Rewrites SOURCE-PROVENANCE.json for this release: origin facts plus size and SHA-256 of every file inside the
   release directory (the manifest itself excluded). Run after the final build; verify-release.mjs checks the result. */
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url),rootPath=fileURLToPath(root);
// Only files that are committed count as release files: intermediate build outputs (dist/, sport/dist/, copied icons)
// are ignored by .gitignore since 08.11.2026 and are rebuilt locally by build-release.mjs.
// Notes (.md) are left out: the app does not load them, and editing a note must not require new checksums.
const tracked=execSync('git ls-files -z .',{cwd:rootPath}).toString().split('\0').filter(Boolean).map(p=>p.replace(/^\.\//,'')).filter(p=>p!=='SOURCE-PROVENANCE.json'&&!/\.md$/i.test(p)).sort();
const files=[];
for(const path of tracked){const bytes=await readFile(new URL(path,root));files.push({path,size:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
// Update 42 (14.11.2026): made from sport-41 at main 42114ef; storage and exchange moved to the shared module.
const sourceCommit='42114ef6bdd2262b445a9fc86b66e1f061188e5d';
const manifest={
 app:'Happy Sport',update:'42',
 source_release:'sport-41 (Happy Sport · Update 41)',
 source_commit:sourceCommit,
 github_pages_url:'https://astamurberlin-rgb.github.io/happyamurio/sport-42/',
 agreed_by_owner:'2026-11-14: stage 2 of the shared sign-in, storage and exchange task — Sport moves to shared/happy-account.js and shared/happy-store.js; former sync history, conflict reserve, manual save/restore, write guard, deny-all layer, prototype journal, measurement migration and guest removed; dictation and external links work again.',
 icon_library:'/happyamurio/assets/sport-icons/v1/',
 exercise_library:JSON.parse(await readFile(new URL('../assets/exercise-library/v1/manifest.json',root),'utf8')),
 exercise_media:'/happyamurio/assets/exercise-media/v1/',
 release_files:files
};
await writeFile(new URL('SOURCE-PROVENANCE.json',root),JSON.stringify(manifest,null,2)+'\n');
console.log('SOURCE-PROVENANCE.json: '+files.length+' files, source commit '+sourceCommit);
