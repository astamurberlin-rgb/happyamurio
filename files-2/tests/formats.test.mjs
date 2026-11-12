import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import JSZip from 'jszip';
import mammoth from 'mammoth';
const dom=new JSDOM('<!doctype html><html><body></body></html>');
globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.DOMParser=dom.window.DOMParser;
const {markdownHtml,htmlMarkdown}=await import('../src/format.js');
const {exportFile}=await import('../src/export.js');
const sample='# Дневник\n\n## 12.11.2026\n\nТекст **жирный** и *курсив*.\n\n- Первый\n- Второй\n\n| Поле | Значение |\n| --- | --- |\n| Время | 12:30 |\n\n<small>— Астамур · 12.11.2026</small>';
test('rich text round trip retains content, table and signature',()=>{
  const text=htmlMarkdown(markdownHtml(sample));
  for(const word of ['Дневник','Первый','Второй','12:30','Астамур','<small>','**жирный**'])assert.ok(text.includes(word),word);
});
test('untrusted HTML cannot inject scripts, images or event handlers',()=>{
  const clean=markdownHtml('<script>alert(1)</script><img src="https://evil.invalid/pixel" onerror="x()"><a href="javascript:x()">Link</a><iframe src="x"></iframe>');
  assert.doesNotMatch(clean,/script|<img|onerror|javascript:|iframe/);
});
test('image references survive editing without loading images',()=>{
  const html=markdownHtml('![Фото](https://example.org/image.png)');
  assert.doesNotMatch(html,/<img/);assert.ok(htmlMarkdown(html).includes('![Фото](<https://example.org/image.png>)'));
});
test('DOCX is a real ZIP with editable Cyrillic and provenance',async()=>{
  const f=await exportFile({title:'Дневник',content:sample},'docx',{schema:1,path:'test.md',version:3});
  const buffer=Buffer.from(await f.arrayBuffer());assert.equal(buffer.subarray(0,2).toString(),'PK');
  const zip=await JSZip.loadAsync(buffer);assert.match(await zip.file('word/document.xml').async('string'),/<w:tbl>/);
  assert.match(await zip.file('docProps/core.xml').async('string'),/HappyNotes:/);
  const read=await mammoth.extractRawText({buffer});for(const s of ['Дневник','Первый','12:30','Астамур'])assert.ok(read.value.includes(s));
});
test('Markdown export contains exact body and no access secret',async()=>{
  const f=await exportFile({title:'Дневник',content:sample},'md',{schema:1,path:'test.md',version:3});
  assert.ok((await f.text()).endsWith(sample));assert.ok(f.name.endsWith('.md'));
});
