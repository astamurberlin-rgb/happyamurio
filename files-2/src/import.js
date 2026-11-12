import mammoth from 'mammoth/mammoth.browser.js';
import JSZip from 'jszip';
import { htmlMarkdown, cleanHtml } from './format.js';
import { readEnvelope } from './core.js';
export async function importFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (!['md','markdown','txt','docx'].includes(ext)) throw new Error('Выбери DOCX, Markdown или TXT. PDF предназначен для чтения и пометок.');
  if (file.size > 10_000_000) throw new Error('Файл слишком большой. Максимум — 10 МБ.');
  if (ext !== 'docx') {
    const text = new TextDecoder('utf-8',{fatal:true}).decode(await file.arrayBuffer());
    return {...readEnvelope(text),warnings:[]};
  }
  const buffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);
  const entries = Object.values(zip.files);
  let expanded = 0;
  for(const entry of entries) expanded += entry._data?.uncompressedSize || 0;
  if(entries.length>1000 || expanded>30_000_000) throw new Error('Документ слишком большой после распаковки.');
  const core = zip.file('docProps/core.xml'); let metadata = null;
  if (core) {
    const xml = new DOMParser().parseFromString(await core.async('string'),'application/xml');
    const description = xml.getElementsByTagNameNS('*','description')[0]?.textContent||'';
    if(description.startsWith('HappyNotes:')) try {metadata=JSON.parse(description.slice(11));}catch{}
  }
  const converted = await mammoth.convertToHtml({arrayBuffer:buffer},{externalFileAccess:false,convertImage:mammoth.images.imgElement(()=>Promise.resolve({src:'',alt:'[Изображение]'}))});
  const hadImages=/<img\b/i.test(converted.value);
  const content=htmlMarkdown(cleanHtml(converted.value.replace(/<img\b[^>]*>/gi,'<p>[Изображение из файла]</p>')));
  return {content,metadata,warnings:[...(hadImages?['Изображения заменены текстовыми пометками.']:[]),...(converted.messages.length?['Проверь оформление: при переносе из Word некоторые элементы могут измениться.']:[])]};
}
