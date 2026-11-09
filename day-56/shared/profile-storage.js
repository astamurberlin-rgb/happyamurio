/* A diary belongs to one account. Legacy local journals remain recoverable. */
(function(root){
  'use strict';
  function create(app, options){
    var o=options||{},store,authKey=o.authKey||('happy-auth:'+app);
    try{store=o.storage||root.localStorage}catch(e){}
    // Update 53 (09.11.2026): each Happy app keeps its own sign-in cell. Day used to share
    // `hd_cloud_v1` with Meal on the same origin, so a token refresh in one app looked like an
    // account change in the other. The old cell is copied once and left in place for older releases.
    try{if(store&&store.getItem(authKey)===null){var legacyAuth=store.getItem('hd_cloud_v1');if(legacyAuth!==null)store.setItem(authKey,legacyAuth);}}catch(e){}
    function get(k){try{return store?store.getItem(k):null}catch(e){return null}}
    function parse(v){try{return JSON.parse(v)}catch(e){return null}}
    function uid(v){return typeof v==='string'&&v?v:'local'}
    var saved=parse(get(authKey)),owner=uid(saved&&saved.s&&saved.s.uid);
    var marker='happy-profile-legacy-owner:'+app,legacy=get(marker);
    if(legacy===null){
      // A current login is not evidence that an unowned legacy diary belongs to it.
      legacy='local';
      if(app==='sport'){
        var old=parse(get('happy-sport-prototype-v1'));
        if(old&&old.sportOwner)legacy=uid(old.sportOwner);
      }
      // If ownership cannot be recorded, leave legacy data untouched.
      try{store.setItem(marker,legacy)}catch(e){legacy=null}
    }
    function authIdentity(value){var a=parse(value);return JSON.stringify(a&&a.s?{uid:a.s.uid,at:a.s.at,rt:a.s.rt,exp:a.s.exp,k:a.k,g:a.g||null}:{uid:null,g:a&&a.g||null});}
    var changing=false,observedAuth=authIdentity(get(authKey));
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
    function changed(value,force,external){
      if(!force&&uid(value)===owner)return false;
      changing=true;
      if(external){if(o.pause)o.pause();else if(root.dispatchEvent&&root.Event)root.dispatchEvent(new root.Event('happy-profile-paused'));return true;}
      if(o.reload)o.reload();else if(root.location)root.location.reload();
      return true;
    }
    if(root.addEventListener)root.addEventListener('storage',function(e){
      if(e.key===null){changed(null,true,true);return;}
      if(e.key!==authKey)return;
      var next=authIdentity(e.newValue);if(next===observedAuth)return;observedAuth=next;
      if(root.CL&&next===authIdentity(JSON.stringify({s:root.CL.s,k:root.CL.kraw,g:root.CL.authGeneration})))return;
      var s=parse(e.newValue);changed(s&&s.s&&s.s.uid,true,true);
    });
    return {owner:owner,key:key,getSync:getSync,read:read,write:write,matches:matches,changed:changed};
  }
  root.HappyProfiles={create:create};
})(globalThis);
