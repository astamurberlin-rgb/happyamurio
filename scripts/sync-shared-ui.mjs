import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const apps=JSON.parse(await readFile(new URL('shared/apps.json',root),'utf8'));
// Day 59 и Meal 32: вход и карточку аккаунта приложения подключают файлами (shared/happy-account.js, happy-account-ui.js);
// в страницу встраивается только общий стиль настроек.
for(const app of ['day','meal']){
 const directory=apps[app].sharedDirectory||'shared',path=new URL(apps[app].entry,root);
 const css=await readFile(new URL(directory+'/happy-ui.css',root),'utf8');let html=await readFile(path,'utf8');
 const style='/* HAPPY_SHARED_STYLE_START */\n'+css+'/* HAPPY_SHARED_STYLE_END */';
 html=html.includes('/* HAPPY_SHARED_STYLE_START */')?html.replace(/\/\* HAPPY_SHARED_STYLE_START \*\/[\s\S]*?\/\* HAPPY_SHARED_STYLE_END \*\//,()=>style):html.replace('</style>',()=>style+'\n</style>');
 await writeFile(path,html);
}
console.log('Shared Happy style embedded in Day and Meal.');
