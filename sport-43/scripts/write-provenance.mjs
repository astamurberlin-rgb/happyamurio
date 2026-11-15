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
// Update 43.2 (15.11.2026): measurement screen «Поделиться» and the new silhouette, time of each counter tap,
// journal without the extra heading and with workout pictures, focus ring only from the keyboard, no scrollbars.
// Update 43.1 (15.11.2026): sign-in of its own again (happy-account:sport), sign-out closes only this app's session.
// Update 43 (14.11.2026): made from sport-42 at main 26f10dc; shared measurement screen, shared link switches,
// planned workouts published for Day and Meal. Also in 43: list places that do not shift when a neighbour is added or
// removed (HappyStore.model.place), the appearance is saved on the device again, workout and exercise links open them.
const sourceCommit='26f10dc3aac5a842ae359c3ab479a6d1726358d0';
const manifest={
 app:'Happy Sport',update:'43.2',
 source_release:'sport-42 (Happy Sport · Update 42)',
 source_commit:sourceCommit,
 github_pages_url:'https://astamurberlin-rgb.github.io/happyamurio/sport-43/',
 agreed_by_owner:'2026-11-15 01:12, in chat: every app signs in and out on its own again (decision of 09.11.2026 restored), the account and its records stay shared. Earlier: 2026-11-14 15:37, in chat: stage 3 of the shared sign-in, storage and exchange task (Day moves to the shared module). Astamur approved the plan: body measurements become one shared document and one shared screen for Day, Meal and Sport (shared/happy-measurements.js); link switches become one shared document; Sport publishes planned workouts for Day; documents carry a format number. Sport 43 is published together with Day 59 and Meal 32, only by his word.',
 icon_library:'/happyamurio/assets/sport-icons/v1/',
 exercise_library:JSON.parse(await readFile(new URL('../assets/exercise-library/v1/manifest.json',root),'utf8')),
 exercise_media:'/happyamurio/assets/exercise-media/v1/',
 release_files:files
};
await writeFile(new URL('SOURCE-PROVENANCE.json',root),JSON.stringify(manifest,null,2)+'\n');
console.log('SOURCE-PROVENANCE.json: '+files.length+' files, source commit '+sourceCommit);
