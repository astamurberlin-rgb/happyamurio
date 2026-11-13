import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';

const source=(await readFile(new URL('../src/app.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'');
async function open(documentPath='',docs=[
  {path:'apps/current.md',title:'Текущий',content:'# Текущий',version:1},
  {path:'apps/old.md',title:'Старый аудит',content:'<!-- notes:archive -->\n# Старый аудит',version:2}
]) {
  const dom=new JSDOM('<div class="top"></div><div class="wrap"><nav id="chips"></nav><main id="main"></main></div><div id="status"></div><div id="ptr"></div><div id="ptr-text"></div><div id="ptr-sub"></div><button id="forget"></button>',{url:'https://example.test/?document='+encodeURIComponent(documentPath),runScripts:'outside-only'});
  const w=dom.window;
  w.scrollTo=()=>{};
  w.localStorage.setItem('happy-files:key','fixture');
  w.marked={parse:s=>s};w.DOMPurify={sanitize:s=>s};
  w.createDocumentTools=()=>({isOpen:()=>false,onForget(){},openMenu(){}});
  w.fetch=async()=>({ok:true,status:200,json:async()=>({documents:docs})});
  w.eval(source);
  await new Promise(r=>setTimeout(r,0));return dom;
}
test('archive is last; archived documents open from stack and retain original URL',async()=>{
  const dom=await open('apps/current.md'),w=dom.window,d=w.document;
  assert.deepEqual([...d.querySelectorAll('.chip-name')].map(x=>x.textContent),['Текущий','Архив']);
  d.querySelector('.chip:last-child button').click();
  assert.equal(d.querySelector('.archive-item').textContent,'Старый аудит');
  d.querySelector('.archive-item').click();
  assert.equal(new URL(w.location.href).searchParams.get('document'),'apps/old.md');
  assert.match(d.querySelector('main').textContent,/Старый аудит/);
  assert.equal(d.querySelector('.chip:last-child').getAttribute('aria-current'),'true');
  d.querySelector('main .btn').click();
  assert.ok(d.querySelector('.archive-list'));
  d.querySelector('.chip:first-child button').click();
  assert.equal(new URL(w.location.href).searchParams.get('document'),'apps/current.md');
  dom.window.close();
});
test('old direct links and archive reload work',async()=>{
  for(const path of ['apps/old.md','@archive']){
    const dom=await open(path),d=dom.window.document;
    assert.match(d.querySelector('main').textContent,/Старый аудит/);
    assert.equal(d.querySelector('.chip:last-child').getAttribute('aria-current'),'true');
    dom.window.close();
  }
});
test('empty archive remains available at the end',async()=>{
  const dom=await open('@archive',[{path:'a.md',title:'A',content:'A'}]);
  assert.match(dom.window.document.querySelector('main').textContent,/Архив пока пуст/);
  dom.window.close();
});
