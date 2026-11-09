import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('SOURCE-PROVENANCE.json',root),'utf8'));
for(const file of manifest.release_files){
 const bytes=await readFile(new URL(file.path,root));
 assert.equal(bytes.length,file.size,file.path+' size');
 assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256,file.path+' checksum');
}
const html=await readFile(new URL('index.html',root),'utf8');
assert.ok(html.includes('data-app-version="39"'));assert.ok(html.includes('totalBudget=Infinity'),'38.7: no origin-wide 4 MiB budget');assert.ok(html.includes('SportLocalStore')&&html.includes('happy-sport-private-v1')&&html.includes('SportLocalStore.open()'),'39: IndexedDB facade opened before the app');assert.ok(html.includes('data-happy-appearance-slot')&&html.includes("place('developer',label('Резервная копия')"),'38.6: appearance slot, backups in the developer section');assert.ok(html.includes('HappyLinks')&&html.includes('data-happy-app="meal"'),'38.5: linked-app buttons resolve from apps.json at runtime');assert.ok(html.includes('sport-food-pill'),'38.4: capsule counters');assert.ok(!html.includes('sport-lock-banner')&&!html.includes('steal:true')&&html.includes('sportAdoptExternal')&&html.includes('happy-sport-sync:'),'39.1: live tabs — no lock banner, adoption of other tabs\' journal, single sync run per account');assert.ok(html.includes('clAdoptStored'),'38.4: single-flight token refresh');assert.ok(!html.includes('__HAPPY_DAY_DIR__')&&!html.includes('/happyamurio/day-52/')&&!html.includes('/happyamurio/meal-23/'),'38.4: linked-app buttons filled from apps.json');assert.ok(html.includes('"exerciseLibrary":{"url":"/happyamurio/assets/exercise-library/v1/"'));assert.ok(html.includes('"handles":['));assert.ok(html.includes('/happyamurio/assets/sport-icons/v1/'));assert.ok(!html.includes('"sport-icons/'));
assert.ok(html.includes('Happy Sport · Update 39'));assert.ok(html.includes('HappyReleaseNotes'),'shared release notes module embedded');assert.ok(html.includes('"author": "Claude"')||html.includes('"author":"Claude"'),'38.3 entry carries author');
const install=JSON.parse(await readFile(new URL('manifest.webmanifest',root),'utf8'));
const url=new URL(manifest.github_pages_url);
for(const key of ['id','start_url','scope'])assert.equal(new URL(install[key],url).pathname,url.pathname);
console.log('Verified Update 39: '+manifest.release_files.length+' files, visible version, installation scope and exact checksums.');
