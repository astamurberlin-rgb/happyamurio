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
      legacy=owner;
      if(app==='sport'){
        var old=parse(get('happy-sport-prototype-v1'));
        if(old&&old.sportOwner)legacy=uid(old.sportOwner);
      }
      // If ownership cannot be recorded, leave legacy data untouched.
      try{store.setItem(marker,legacy)}catch(e){legacy=null}
    }
    var changing=false;
    function key(k){return k===authKey||owner==='local'?k:'happy-user:'+encodeURIComponent(owner)+':'+k}
    function eligible(k){return k!==authKey&&owner!=='local'&&legacy===owner}
    function getSync(k){
      var physical=key(k),v=get(physical);
      if(v===null&&eligible(k)){
        v=get(k);
        if(v!==null){try{store.setItem(physical,v)}catch(e){}}
      }
      return v;
    }
    async function read(k,readBase,writeBase){
      var physical=key(k),v=await readBase(physical);
      if(v==null&&eligible(k)){
        v=await readBase(k);
        if(v!=null){try{await writeBase(physical,v)}catch(e){}}
      }
      return v;
    }
    async function write(k,v,writeBase){return writeBase(key(k),v)}
    function matches(value){return !changing&&uid(value)===owner}
    function changed(value){
      if(uid(value)===owner)return false;
      changing=true;
      if(o.reload)o.reload();else if(root.location)root.location.reload();
      return true;
    }
    if(root.addEventListener)root.addEventListener('storage',function(e){
      if(e.key!==authKey)return;
      var s=parse(e.newValue);changed(s&&s.s&&s.s.uid);
    });
    return {owner:owner,key:key,getSync:getSync,read:read,write:write,matches:matches,changed:changed};
  }
  root.HappyProfiles={create:create};
})(globalThis);
