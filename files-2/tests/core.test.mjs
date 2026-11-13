import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeText, appendEntry, documentLink, readEnvelope, safeFilename } from '../src/core.js';
test('independent remote additions survive a local edit',()=>{
  const base='# Note\n\nFirst\n\nLast';
  const out=mergeText(base,base.replace('First','Edited'),base+'\n\nAdded by another editor');
  assert.equal(out.conflict,false);assert.match(out.text,/Edited/);assert.match(out.text,/Added by another editor/);
});
test('overlapping edits require manual resolution',()=>assert.equal(mergeText('a\nb\nc','a\nlocal\nc','a\nremote\nc').conflict,true));
test('unchanged local text preserves latest document',()=>assert.deepEqual(mergeText('old','old','new'),{text:'new',conflict:false}));
test('append preserves every previous byte after header and uses Moscow date',()=>{
  const old='# Diary\n\n## Before\nContent';const out=appendEntry(old,'New entry',new Date('2026-11-11T22:01:00Z'));
  assert.match(out,/12\.11\.2026/);assert.ok(out.endsWith('## Before\nContent'));assert.equal(out.match(/New entry/g).length,1);
});
test('shared links never include a key or old query',()=>{
  const u=documentLink('health/private note.md','https://example.org/files-2/?key=secret#key=also-secret');
  assert.ok(!u.includes('secret'));assert.equal(new URL(u).searchParams.get('document'),'health/private note.md');
});
test('markdown envelope is metadata, not body',()=>assert.deepEqual(readEnvelope('<!-- happy-notes {"version":3} -->\n\n# Hello'),{metadata:{version:3},content:'# Hello'}));
test('file names do not contain path separators',()=>assert.equal(safeFilename('../Hello:world','pdf'),'.. Hello world.pdf'));


import { preserveArchive } from '../src/archive.js';
test('rich-text save retains archive marker exactly once', () => {
  const archived='<!-- notes:archive -->\n# Old';
  assert.equal(preserveArchive(archived,'# Edited'),'<!-- notes:archive -->\n\n# Edited');
  assert.equal(preserveArchive(archived,archived),archived);
  assert.equal(preserveArchive('# Active','# Edited'),'# Edited');
});
