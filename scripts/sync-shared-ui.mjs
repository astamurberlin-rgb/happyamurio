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
 /* Общие цвета (happy-colors.css) — ещё и прямо в странице, перед ссылкой на файл: если файл не пришёл (слабая сеть,
    старый кэш), текст не становится чёрным, а нижняя панель — прозрачной (Meal 21.11.2026, 15:02). Файл по-прежнему
    подключён и при загрузке перекрывает встроенную копию теми же значениями. */
 const colors=await readFile(new URL(directory+'/happy-colors.css',root),'utf8');
 const block='<style id="happy-colors-inline">/* HAPPY_COLORS_START */\n'+colors+'/* HAPPY_COLORS_END */</style>\n';
 if(html.includes('/* HAPPY_COLORS_START */'))html=html.replace(/<style id="happy-colors-inline">\/\* HAPPY_COLORS_START \*\/[\s\S]*?\/\* HAPPY_COLORS_END \*\/<\/style>\n/,()=>block);
 else{const at=html.search(/<link rel="stylesheet" href="\.\/shared\/happy-colors\.css/);if(at<0)throw Error(app+': нет ссылки на happy-colors.css');html=html.slice(0,at)+block+html.slice(at);}
 await writeFile(path,html);
}
console.log('Shared Happy style embedded in Day and Meal.');
