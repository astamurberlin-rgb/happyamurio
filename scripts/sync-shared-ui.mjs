import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const apps=JSON.parse(await readFile(new URL('shared/apps.json',root),'utf8'));
{ // Day 59: вход и карточку аккаунта Day подключает файлами (shared/happy-account.js, happy-account-ui.js);
  // в страницу встраивается только общий стиль настроек.
 const directory=apps.day.sharedDirectory||'shared',path=new URL(apps.day.entry,root);
 const css=await readFile(new URL(directory+'/happy-ui.css',root),'utf8');let html=await readFile(path,'utf8');
 const style='/* HAPPY_SHARED_STYLE_START */\n'+css+'/* HAPPY_SHARED_STYLE_END */';
 html=html.includes('/* HAPPY_SHARED_STYLE_START */')?html.replace(/\/\* HAPPY_SHARED_STYLE_START \*\/[\s\S]*?\/\* HAPPY_SHARED_STYLE_END \*\//,()=>style):html.replace('</style>',()=>style+'\n</style>');
 await writeFile(path,html);
}
for(const app of ['meal']){
 const directory=apps[app].sharedDirectory||'shared';
 const css=await readFile(new URL(directory+'/happy-ui.css',root),'utf8');
 const js=await readFile(new URL(apps[app].accountScript||directory+'/happy-ui.js',root),'utf8');
 const profiles=await readFile(new URL(directory+'/profile-storage.js',root),'utf8');
 const history=await readFile(new URL(directory+'/imported-history.js',root),'utf8');
 const path=new URL(apps[app].entry,root);let html=await readFile(path,'utf8');
 const style='/* HAPPY_SHARED_STYLE_START */\n'+css+'/* HAPPY_SHARED_STYLE_END */';
 const script='<script id="happy-shared-ui">\n'+js.replaceAll('</','<\\/')+'</script>';
 html=html.includes('/* HAPPY_SHARED_STYLE_START */')?html.replace(/\/\* HAPPY_SHARED_STYLE_START \*\/[\s\S]*?\/\* HAPPY_SHARED_STYLE_END \*\//,()=>style):html.replace('</style>',()=>style+'\n</style>');
 html=html.includes('<script id="happy-shared-ui">')?html.replace(/<script id="happy-shared-ui">[\s\S]*?<\/script>/,()=>script):html.replace('<script>',()=>script+'\n<script>');
 // apps.json <app>.profileOptions — extra options literal for HappyProfiles.create (Day 56: {storage:dayStorage}, the IndexedDB facade).
 const profileOptions=apps[app].profileOptions?','+apps[app].profileOptions:'';
 const profileScript='<script id="happy-profile-storage">\n'+profiles.replaceAll('</','<\\/')+'\nvar HappyProfile=HappyProfiles.create("'+app+'"'+profileOptions+');</script>';
 html=html.includes('<script id="happy-profile-storage">')?html.replace(/<script id="happy-profile-storage">[\s\S]*?<\/script>/,()=>profileScript):html.replace('<script id="happy-shared-ui">',()=>profileScript+'\n<script id="happy-shared-ui">');
 if(app==='meal')html=html.replace(/<script id="happy-imported-history">[\s\S]*?<\/script>/,()=>'<script id="happy-imported-history">\n'+history.replaceAll('</','<\\/')+'</script>');
 await writeFile(path,html);
}
console.log('Shared Happy style embedded in Day; shared controls embedded in Meal.');
