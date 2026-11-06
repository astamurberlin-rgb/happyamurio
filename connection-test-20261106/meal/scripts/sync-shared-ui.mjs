import {readFile,writeFile,stat} from 'node:fs/promises';
const args=process.argv.slice(2);
if(args.length&&!(args.length===2&&args[0]==='--app'&&args[1]==='meal')){
 console.error('Usage: node scripts/sync-shared-ui.mjs [--app meal]');
 process.exit(1);
}
const apps=args.length?['meal']:['day','meal'];
const root=new URL('../',import.meta.url);
// Preserve source-only checkouts. Mirror Meal only when its served file exists.
async function mirrorMeal(html){
 const path=new URL('dist/meal/index.html',root);
 try{await stat(path)}catch(error){if(error.code==='ENOENT')return;throw error}
 await writeFile(path,html);
}
const css=await readFile(new URL('shared/happy-ui.css',root),'utf8');
const js=await readFile(new URL('shared/happy-ui.js',root),'utf8');
for(const app of apps){
 const path=new URL(app+'/index.html',root);let html=await readFile(path,'utf8');
 const appJs=app==='meal'?await readFile(new URL('meal/account-ui.js',root),'utf8'):js;
 const style='/* HAPPY_SHARED_STYLE_START */\n'+css+'/* HAPPY_SHARED_STYLE_END */';
 const script='<script id="happy-shared-ui">\n'+appJs.replaceAll('</','<\\/')+'</script>';
 html=html.includes('/* HAPPY_SHARED_STYLE_START */')?html.replace(/\/\* HAPPY_SHARED_STYLE_START \*\/[\s\S]*?\/\* HAPPY_SHARED_STYLE_END \*\//,()=>style):html.replace('</style>',()=>style+'\n</style>');
 html=html.includes('<script id="happy-shared-ui">')?html.replace(/<script id="happy-shared-ui">[\s\S]*?<\/script>/,()=>script):html.replace('<script>',()=>script+'\n<script>');
 if(app==='meal'){
  const profile=await readFile(new URL('meal/profile-storage.js',root),'utf8');
  html=html.replace(/<script id="happy-profile-storage">[\s\S]*?<\/script>/,()=>'<script id="happy-profile-storage">'+profile.replaceAll('</','<\\/')+'</script>');
  await mirrorMeal(html);
 }
 await writeFile(path,html);
}
console.log(args.length?'Meal account/profile controls regenerated; Day and Sport untouched.':'Shared controls regenerated in Day and Meal; Meal overrides retained. Build Sport separately.');
