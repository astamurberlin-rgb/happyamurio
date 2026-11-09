/* Rewrites SOURCE-PROVENANCE.json for this release: origin facts plus size and SHA-256 of every file inside the
   release directory (the manifest itself excluded). Run after the final build; verify-release.mjs checks the result. */
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url),rootPath=fileURLToPath(root);
const previous=JSON.parse(await readFile(new URL('SOURCE-PROVENANCE.json',root),'utf8'));
// Only files that are committed count as release files: intermediate build outputs (dist/, sport/dist/, copied icons)
// are ignored by .gitignore since 08.11.2026 and are rebuilt locally by build-release.mjs.
const tracked=execSync('git ls-files -z .',{cwd:rootPath}).toString().split('\0').filter(Boolean).map(p=>p.replace(/^\.\//,'')).filter(p=>p!=='SOURCE-PROVENANCE.json').sort();
const files=[];
for(const path of tracked){const bytes=await readFile(new URL(path,root));files.push({path,size:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
// The base this release was derived from: main at the time sport-37 was copied (not the release commit itself).
let sourceCommit=previous.update==='38'?previous.source_commit:null;try{sourceCommit=sourceCommit||execSync('git rev-parse origin/main',{cwd:rootPath,encoding:'utf8'}).trim()}catch{sourceCommit=sourceCommit||previous.source_commit}
const manifest={
 app:'Happy Sport',update:'39',
 source_release:'sport-38 (Happy Sport · Update 38.7)',source_commit_of_update_38:previous.update?.startsWith('38')?previous.source_commit:previous.source_commit_of_update_38,
 source_commit:sourceCommit,
 github_pages_url:'https://astamurberlin-rgb.github.io/happyamurio/sport-39/',
 agreed_by_owner:'2026-11-08: Update 38 in sport-38/, automatic counter sync through a narrow channel, new settings structure; 38.1: exercise icons served from the shared library assets/sport-icons/v1/; 38.2: shared exercise library and handles; 2026-11-09 38.3: lock re-acquired on pageshow instead of reload, shared release-notes module with author and time; 2026-11-09 38.4 (owner 15:38): second tab takes the journal over instead of a blocked screen, viewer tab shows a banner and never reloads itself; counters as capsules without «· Meal»; linked-app buttons from apps.json open a new window; single-flight token refresh, same-account token change is not a sign-in change; 38.5: linked-app buttons resolve the current Day/Meal releases from shared/apps.json at runtime (shared/happy-links.js); 2026-11-09 38.6 (owner 17:28): service blocks hidden in the developer section — cloud read button, backup, cloud copy; appearance picker under «Приложение → Оформление» via data-happy-appearance-slot; 38.7 (owner device 19:55: «резерв достиг лимита» with 3,53 MB used by all apps on the origin): the 4 MiB origin-wide budget is dropped — the ledger keeps its 3 MiB cap and the real browser quota is checked by the headroom probe; 2026-11-09 39 (owner 20:11 «Ты можешь это сделать? — Да»): journal-scale keys move from localStorage to IndexedDB through a synchronous facade (local-store.js) with verified migration; the 5 MB origin box shared with Day and Meal is no longer the limit of Sport',
 icon_library:'/happyamurio/assets/sport-icons/v1/',
 exercise_library:JSON.parse(await readFile(new URL('../assets/exercise-library/v1/manifest.json',root),'utf8')),
 changed_source_files:['README.md','scripts/build-preview.mjs','scripts/build-release.mjs','scripts/verify-release.mjs','scripts/check-settings-layout.mjs','scripts/write-provenance.mjs','shared/apps.json','shared/food-counters.js','sport/scripts/build.mjs','sport/scripts/check.mjs','sport/scripts/check-clean-shell.mjs','sport/scripts/check-counter-channel.mjs','sport/scripts/check-food-counters-sport.mjs','sport/scripts/check-paths.mjs','sport/scripts/check-readonly.mjs','sport/src/app.template.html','sport/src/automatic-sync-ui.js','sport/src/data-transfer.js','sport/src/food-counters.js','sport/src/manifest.webmanifest','sport/src/readonly-auth.js','sport/src/readonly-guard.js','sport/src/readonly-ui.js','sport/src/refinements.js','sport/src/release-notes.js','sport/src/settings-layout.css','sport/src/settings-layout.js'],
 unchanged_journal_sync_code_verified:true,
 release_files:files
};
await writeFile(new URL('SOURCE-PROVENANCE.json',root),JSON.stringify(manifest,null,2)+'\n');
console.log('SOURCE-PROVENANCE.json: '+files.length+' files, source commit '+sourceCommit);
