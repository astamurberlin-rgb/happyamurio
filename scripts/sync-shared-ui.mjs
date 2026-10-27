import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const css=await readFile(new URL('shared/happy-ui.css',root),'utf8');
const js=await readFile(new URL('shared/happy-ui.js',root),'utf8');
for(const app of ['day','meal']){
 const path=new URL(app+'/index.html',root);let html=await readFile(path,'utf8');
 const style='/* HAPPY_SHARED_STYLE_START */\n'+css+'/* HAPPY_SHARED_STYLE_END */';
 const script='<script id="happy-shared-ui">\n'+js.replaceAll('</','<\\/')+'</script>';
 html=html.includes('/* HAPPY_SHARED_STYLE_START */')?html.replace(/\/\* HAPPY_SHARED_STYLE_START \*\/[\s\S]*?\/\* HAPPY_SHARED_STYLE_END \*\//,()=>style):html.replace('</style>',()=>style+'\n</style>');
 html=html.includes('<script id="happy-shared-ui">')?html.replace(/<script id="happy-shared-ui">[\s\S]*?<\/script>/,()=>script):html.replace('<script>',()=>script+'\n<script>');
 await writeFile(path,html);
}
console.log('Shared Happy controls embedded in Day and Meal.');
