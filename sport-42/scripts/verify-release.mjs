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
assert.ok(html.includes('data-app-version="42"'));assert.ok(html.includes('Happy Sport · Update 42'));
assert.ok(html.includes('HappyStore.open')&&html.includes('HappyAccount.create'),'42: storage and sign-in through the shared module');
assert.ok(!html.includes('readonly-guard')&&!html.includes('auth-readonly-happy-sport-prototype-v1'),'42: no former guard and no prototype journal');
assert.ok(html.includes('HappyReleaseNotes'),'shared release notes module embedded');assert.ok(html.includes('"author": "Claude"')||html.includes('"author":"Claude"'),'entries carry author');
const install=JSON.parse(await readFile(new URL('manifest.webmanifest',root),'utf8'));
const url=new URL(manifest.github_pages_url);
for(const key of ['id','start_url','scope'])assert.equal(new URL(install[key],url).pathname,url.pathname);
console.log('Verified Update 42: '+manifest.release_files.length+' files, visible version, installation scope and exact checksums.');
