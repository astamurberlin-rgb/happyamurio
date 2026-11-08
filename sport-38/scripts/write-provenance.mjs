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
 app:'Happy Sport',update:'38',
 source_release:'sport-37 (Happy Sport · Update 37)',source_commit_of_update_37:previous.update==='37'?previous.source_commit:previous.source_commit_of_update_37,
 source_commit:sourceCommit,
 github_pages_url:'https://astamurberlin-rgb.github.io/happyamurio/sport-38/',
 agreed_by_owner:'2026-11-08: Update 38 in sport-38/, automatic counter sync through a narrow channel, new settings structure',
 changed_source_files:['README.md','scripts/build-preview.mjs','scripts/build-release.mjs','scripts/verify-release.mjs','scripts/check-settings-layout.mjs','scripts/write-provenance.mjs','shared/apps.json','shared/food-counters.js','sport/scripts/build.mjs','sport/scripts/check.mjs','sport/scripts/check-clean-shell.mjs','sport/scripts/check-counter-channel.mjs','sport/scripts/check-food-counters-sport.mjs','sport/scripts/check-paths.mjs','sport/scripts/check-readonly.mjs','sport/src/app.template.html','sport/src/automatic-sync-ui.js','sport/src/data-transfer.js','sport/src/food-counters.js','sport/src/manifest.webmanifest','sport/src/readonly-auth.js','sport/src/readonly-guard.js','sport/src/readonly-ui.js','sport/src/refinements.js','sport/src/release-notes.js','sport/src/settings-layout.css','sport/src/settings-layout.js'],
 unchanged_journal_sync_code_verified:true,
 release_files:files
};
await writeFile(new URL('SOURCE-PROVENANCE.json',root),JSON.stringify(manifest,null,2)+'\n');
console.log('SOURCE-PROVENANCE.json: '+files.length+' files, source commit '+sourceCommit);
