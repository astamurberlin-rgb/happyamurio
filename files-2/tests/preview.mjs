// Local QA only. Serves synthetic documents and rewrites API URLs in JS responses.
// It never contacts Supabase or reads a user's access key.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd();
const docs=[
  {path:'health/psychotherapy/qa.md',title:'Тестовый дневник',version:'3',updated_at:new Date().toISOString(),updated_by:'QA',content:'# Тестовый дневник\n\n## 12.11.2026\n\nТестовая запись для проверки редактора.\n\n- Прогулка\n- Спокойный вечер\n\n| Раздел | Запись |\n| --- | --- |\n| Заметки | Кириллица в PDF и DOCX |\n\n<small>— Тест · 12.11.2026</small>'},
  {path:'health/nutrition/qa.md',title:'Второй документ',version:'1',updated_at:new Date().toISOString(),updated_by:'QA',content:'# Второй документ\n\nМеню должно работать именно с этой карточкой.'}
];
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.md':'text/plain'};
const portArg=process.argv.indexOf('--port');const port=Number(process.env.PORT||process.env.SITES_PORT||(portArg>=0?process.argv[portArg+1]:3000));
http.createServer(async(req,res)=>{
  const u=new URL(req.url,'http://localhost');let body='';for await(const c of req)body+=c;
  if(u.pathname==='/__qa/remote-edit') {docs[0].content+='\n\nЗапись другого редактора.';docs[0].version=String(Number(docs[0].version)+1);res.end('ok');return;}
  if(u.pathname==='/__qa/notes-write') {
    const p=JSON.parse(body);let d=docs.find(x=>x.path===p.path);
    if(p.mode==='create'){if(!d){d={path:p.path,title:p.title,content:p.content,version:'1'};docs.push(d);}}
    else if(d.content!==p.content&&Number(d.version)!==p.expectedVersion){res.writeHead(409,{'Content-Type':'application/json'});res.end('{"error":"conflict"}');return;}
    else if(d.content!==p.content){d.content=p.content;d.version=String(Number(d.version)+1);}
    d.updated_at=new Date().toISOString();d.updated_by='Астамур';res.setHeader('Content-Type','application/json');res.end(JSON.stringify({document:d}));return;
  }
  if(u.pathname.startsWith('/__qa/files')){
    if(u.searchParams.get('key')!=='demo'){res.writeHead(404);res.end();return;}
    const p=decodeURIComponent(u.pathname.slice('/__qa/files/'.length));res.setHeader('Content-Type','application/json');res.end(JSON.stringify(u.pathname==='/__qa/files'?{documents:docs}:docs.find(d=>d.path===p)));return;
  }
  try{
    const pathname=u.pathname==='/'?'/index.html':u.pathname;const file=path.resolve(root,'.'+pathname);
    if(!file.startsWith(root+path.sep))throw new Error();
    let content=await readFile(file);const ext=path.extname(file);res.setHeader('Content-Type',types[ext]||'application/octet-stream');
    if(ext==='.js')content=content.toString().replaceAll('https://geqziziycpclhnucnsyx.supabase.co/functions/v1/files','/__qa/files').replaceAll('https://geqziziycpclhnucnsyx.supabase.co/functions/v1/notes-write','/__qa/notes-write');
    res.end(content);
  }catch{res.writeHead(404);res.end('Not found');}
}).listen(port,'0.0.0.0',()=>console.log('QA preview on '+port));
