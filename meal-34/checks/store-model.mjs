/* Модель общего модуля хранения для проверок Meal: документ — набор записей, у записи остаётся правка с большим
   временем, удаление — тоже правка (как в shared/happy-store.js). Сам модуль проверяют scripts/check-happy-store.mjs
   и сценарии в браузере; здесь — только то, что нужно, чтобы запустить настоящий код Meal без браузера и сети.
   world() — «облако» и общие часы; world.device() — устройство: хранилище с doc, neighbor, shared и обменом sync(). */
const plain=x=>JSON.parse(JSON.stringify(x));
export function world(){
 const clouds=new Map(),w={clouds,clock:1000};   // у каждого аккаунта свои строки облака
 w.device=function(uid='u-1'){
  if(!clouds.has(uid))clouds.set(uid,new Map());
  const cloud=clouds.get(uid),local=new Map(),subs=new Map(),dev={writes:0,closed:false,uid};
  const tell=(name,origin,ids)=>{for(const fn of subs.get(name)||[])fn({ids,origin})};
  const handle=name=>({
   newer:false,
   all:()=>[...local].filter(([key,r])=>key.startsWith(name+'\n')&&!r.deleted).map(([key,r])=>({id:key.slice(name.length+1),value:plain(r.value),at:r.rev})).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0),
   get:id=>{const r=local.get(name+'\n'+id);return r&&!r.deleted?plain(r.value):undefined},
   async putMany(list){
    const ids=[];
    for(const x of list){
     const key=name+'\n'+x.id,cur=local.get(key);
     if(x.deleted){if(!cur||cur.deleted)continue;local.set(key,{rev:++w.clock,deleted:true})}
     else{if(cur&&!cur.deleted&&JSON.stringify(cur.value)===JSON.stringify(x.value))continue;local.set(key,{rev:++w.clock,value:plain(x.value)})}
     ids.push(x.id);dev.writes++;
    }
    if(ids.length)tell(name,'local',ids);
   },
   put(id,value){return this.putMany([{id,value}])},
   remove(id){return this.putMany([{id,deleted:true}])},
   subscribe(fn){if(!subs.has(name))subs.set(name,new Set());subs.get(name).add(fn);return ()=>subs.get(name).delete(fn)}
  });
  const own=name=>handle('meal/'+name);
  Object.assign(dev,{local,doc:own,neighbor:(app,name)=>handle(app+'/'+name),shared:(app,name)=>handle(app+'/'+name),
   status:()=>({state:'cloud',detail:'',newer:[]}),onStatus(){},onClose(){},flush:async()=>true,
   /* записи другого приложения на этом же устройстве (сосед пишет свой документ) */
   other:(app,name)=>handle(app+'/'+name),
   /* обмен с облаком в обе стороны */
   sync(){
    for(const [key,r] of local){const there=cloud.get(key);if(!there||r.rev>there.rev)cloud.set(key,r)}
    const changed=new Map();
    for(const [key,r] of cloud){const here=local.get(key);if(!here||r.rev>here.rev){local.set(key,r);const i=key.indexOf('\n'),name=key.slice(0,i);if(!changed.has(name))changed.set(name,[]);changed.get(name).push(key.slice(i+1))}}
    for(const [name,ids] of changed)tell(name,'cloud',ids);
   }});
  return dev;
 };
 return w;
}
