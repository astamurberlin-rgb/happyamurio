
/* A diary belongs to one account. Legacy local journals remain recoverable. */
(function(root){
  'use strict';
  function create(app, options){
    var o=options||{},store,authKey='hd_cloud_v1';
    try{store=o.storage||root.localStorage}catch(e){}
    function get(k){try{return store?store.getItem(k):null}catch(e){return null}}
    function parse(v){try{return JSON.parse(v)}catch(e){return null}}
    function uid(v){return typeof v==='string'&&v?v:'local'}
    var saved=parse(get(authKey)),owner=uid(saved&&saved.s&&saved.s.uid);
    var marker='happy-profile-legacy-owner:'+app,legacy=get(marker);
    if(legacy===null){
      // A current login does not prove ownership of an unmarked legacy diary.
      legacy='local';
      if(app==='sport'){
        var old=parse(get('happy-sport-prototype-v1'));
        if(old&&old.sportOwner)legacy=uid(old.sportOwner);
      }
      // If ownership cannot be recorded, leave legacy data untouched.
      try{store.setItem(marker,legacy)}catch(e){legacy=null}
    }
    var changing=false;
    function identity(v){var a=parse(v);return JSON.stringify(a&&a.s?{uid:a.s.uid,at:a.s.at,rt:a.s.rt,exp:a.s.exp,k:a.k}:{uid:null});}
    var observed=identity(get(authKey));
    function assertCurrent(){if(root.CL&&root.CL.ready&&!(root.MealAuthFence&&root.MealAuthFence.localOnlyOwner)&&identity(get(authKey))!==identity(JSON.stringify({s:root.CL.s,k:root.CL.kraw})))throw Error('Вход изменился в другом окне');if(changing||uid((parse(get(authKey))||{}).s&&parse(get(authKey)).s.uid)!==owner)throw Error('Аккаунт изменился. Открой приложение снова.');}
    function key(k){return k===authKey||owner==='local'?k:'happy-user:'+encodeURIComponent(owner)+':'+k}
    function eligible(k){return k!==authKey&&owner!=='local'&&legacy===owner}
    function getSync(k){assertCurrent();
      var physical=key(k),v=get(physical);
      if(v===null&&eligible(k)){
        v=get(k);
        if(v!==null){try{store.setItem(physical,v)}catch(e){}}
      }
      return v;
    }
    async function read(k,readBase,writeBase){
      var guard=fence(),physical=key(k),v=await readBase(physical);guard();
      if(v==null&&eligible(k)){v=await readBase(k);guard();if(v!=null){await writeBase(physical,v);guard();}}
      return v;
    }
    async function write(k,v,writeBase){assertCurrent();if(k===authKey)throw Error("Используй проверенное сохранение входа");var guard=fence(),result=await writeBase(key(k),v);guard();return result}
    function fence(){assertCurrent();var signature=identity(get(authKey)),keyRef=root.CL&&root.CL.ck,generation=root.MealAuthFence&&root.MealAuthFence.generation;return function(){assertCurrent();if(generation!==(root.MealAuthFence&&root.MealAuthFence.generation)||signature!==identity(get(authKey))||keyRef!==(root.CL&&root.CL.ck))throw Error('Вход изменился во время операции');};}
    function matches(value){return !changing&&uid(value)===owner}
    function changed(value){
      if(uid(value)===owner)return false;
      changing=true;
      if(o.reload)o.reload();else if(root.location)root.location.reload();
      return true;
    }
    if(root.addEventListener)root.addEventListener('storage',function(e){
      if(e.key!==null&&e.key!==authKey)return;
      var next=identity(e.newValue);if(e.key!==null&&next===observed)return;observed=next;
      if(e.key!==null&&root.CL&&next===identity(JSON.stringify({s:root.CL.s,k:root.CL.kraw})))return;
      changing=true;if(root.MealAuthFence)++root.MealAuthFence.generation;
      if(root.dispatchEvent&&root.Event)root.dispatchEvent(new root.Event('happy-profile-paused'));
    });
    return {owner:owner,fence:fence,key:key,getSync:getSync,read:read,write:write,matches:matches,changed:changed};
  }
  root.HappyProfiles={create:create};
})(globalThis);

var HappyProfile=HappyProfiles.create("meal");