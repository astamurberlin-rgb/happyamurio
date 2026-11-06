/* Day automatic journal scheduler. No transport, credentials or journal data live here. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.HappyDayAutoSync=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  var STATES=['saved','dirty','readback','offline','conflict','pending-confirm','unconfirmed','retryable','blocked','unavailable','other-tab','empty'];
  var PHASES=['idle','reconcile','retry','after-retry','hold'];
  function copy(x){return JSON.parse(JSON.stringify(x));}
  function create(p){
    ['context','guard','lease','step','readRecord','writeRecord'].forEach(function(k){if(!p||typeof p[k]!=='function')throw new TypeError('Missing scheduler port: '+k);});
    var now=p.now||Date.now, later=p.setTimeout||setTimeout, cancel=p.clearTimeout||clearTimeout;
    var onlineTest=p.isOnline||function(){return true;};
    var debounce=Number.isFinite(p.debounceMs)&&p.debounceMs>=0?p.debounceMs:750;
    var backoff=Number.isFinite(p.backoffMs)?Math.max(2000,p.backoffMs):2000;
    var stopped=false,running=null,timer=null,timerAt=null,requested=false,localRequested=null,requestDelay=debounce,dirtyEpoch=0;
    var connected=onlineTest()!==false,events=[],latest=null;
    var view={v:1,owner:null,state:'unavailable',reason:'not-started',localPending:false,durable:false};
    function time(){var n=Number(now());if(!Number.isFinite(n)||n<0)throw new Error('Invalid scheduler clock');return n;}
    function context(){var c=p.context();return c&&typeof c.owner==='string'&&c.owner&&c.generation!==undefined?c:null;}
    function check(c){
      if(stopped)throw Object.assign(new Error('Scheduler stopped'),{code:'stopped'});
      var active=context();
      if(!active||active.owner!==c.owner||active.generation!==c.generation)throw Object.assign(new Error('Stale scheduler context'),{code:'stale-context'});
      p.guard(c);
    }
    function valid(c){try{check(c);return true;}catch(_){return false;}}
    function emit(r,durable){
      view=copy(r);view.durable=durable!==false;
      if(p.onStatus)try{p.onStatus(copy(view));}catch(_){}
      return copy(view);
    }
    function fresh(c){return {v:1,owner:c.owner,state:'dirty',phase:'idle',cycle:0,connected:connected,
      lastOfflineAt:null,lastOnlineAt:null,attemptID:null,pending:false,retryUsed:false,reconcileUsed:false,
      postRetryReconcileUsed:false,due:null,localPending:false,updatedAt:time()};}
    function read(c,value){
      if(value==null)return fresh(c);
      var r=copy(value);
      if(r.v!==1||r.owner!==c.owner||STATES.indexOf(r.state)<0||PHASES.indexOf(r.phase)<0||
        !Number.isSafeInteger(r.cycle)||r.cycle<0||typeof r.connected!=='boolean'||
        (r.attemptID!==null&&(typeof r.attemptID!=='string'||!r.attemptID||r.attemptID.length>512))||
        ['pending','retryUsed','reconcileUsed','postRetryReconcileUsed','localPending'].some(function(k){return typeof r[k]!=='boolean';})||
        ['due','lastOfflineAt','lastOnlineAt'].some(function(k){return r[k]!==null&&(!Number.isFinite(r[k])||r[k]<0);})||
        (r.resumeState!==undefined&&STATES.indexOf(r.resumeState)<0)||
        (r.localRecheck!==undefined&&typeof r.localRecheck!=='boolean')||
        (r.pending!==Boolean(r.attemptID))||(r.postRetryReconcileUsed&&!r.retryUsed)||
        (r.phase==='idle'&&(r.pending||r.retryUsed||r.reconcileUsed||r.postRetryReconcileUsed))||
        (r.phase==='reconcile'&&(r.reconcileUsed||r.due===null))||
        (r.phase==='retry'&&(!r.pending||r.retryUsed||!r.reconcileUsed||r.due===null))||
        (r.phase==='after-retry'&&(!r.pending||!r.retryUsed||r.postRetryReconcileUsed||r.due===null)))throw new Error('Invalid scheduler record');
      return r;
    }
    function resume(r){if(r.state==='offline'){r.state=r.resumeState||'dirty';delete r.resumeState;}}
    function resetBudget(r){r.retryUsed=false;r.reconcileUsed=false;r.postRetryReconcileUsed=false;}
    function connections(r,count){
      resume(r);
      for(var i=0;i<count;i++){
        var e=events[i];
        if(!e.online){
          // Delayed offline events from another tab must not renew a completed edge.
          if(r.lastOnlineAt===null||e.at>r.lastOnlineAt){r.connected=false;r.lastOfflineAt=e.at;}
        }else if(!r.connected){
          if(r.cycle===Number.MAX_SAFE_INTEGER)throw new Error('Connectivity cycle exhausted');
          r.connected=true;r.lastOnlineAt=e.at;r.cycle++;
          if(r.state==='unconfirmed'||r.state==='retryable'||r.state==='readback'){
            resetBudget(r);r.phase='reconcile';r.due=time()+backoff;
          }
        }
      }
      if(!connected||onlineTest()===false){
        r.connected=false;r.resumeState=r.state;r.state='offline';
      }else if(!r.connected){
        // A reload that missed the edge may resume, but never renew the retry budget.
        r.connected=true;r.lastOnlineAt=time();
      }
    }
    async function persist(c,r){
      check(c);r.updatedAt=time();var written=copy(r),out=await p.writeRecord(c,copy(written));check(c);
      if(out===false||(out&&out.durable===false))throw new Error('Scheduler status was not durable');
      latest=written;return written;
    }
    function clearTimer(){if(timer!==null)cancel(timer);timer=null;timerAt=null;}
    function arm(at){
      if(stopped)return;
      clearTimer();timerAt=at;timer=later(function(){timer=null;timerAt=null;void launch();},Math.min(2147483647,Math.max(0,at-time())));
    }
    function planned(r,external,newLocal){
      if(r.state==='offline')return null;
      if(r.phase==='reconcile'&&!r.reconcileUsed)return 'reconcile';
      if(r.phase==='retry'&&!r.retryUsed&&r.pending&&r.attemptID)return 'retry';
      if(r.phase==='after-retry'&&!r.postRetryReconcileUsed)return 'after-retry';
      if(r.phase==='hold'){
        if(r.pending||r.state==='conflict')return null;
        // A new edit can remove an empty-upload confirmation condition. It may
        // not replace an unresolved packet or resolve a remote conflict.
        if(r.state==='pending-confirm')return newLocal?'ordinary':null;
        return external&&(r.state==='blocked'||r.state==='unavailable'||r.state==='other-tab')?'ordinary':null;
      }
      return r.phase==='idle'&&(external||r.due!==null)?'ordinary':null;
    }
    function next(r){
      return r.state!=='offline'&&['idle','reconcile','retry','after-retry'].indexOf(r.phase)>=0?r.due:null;
    }
    function fail(c,reason){
      if(stopped)return;
      if(!valid(c)){var current=context();emit({v:1,owner:current?current.owner:null,state:'unavailable',reason:'stale-context',localPending:false},false);return;}
      var r=latest&&latest.owner===c.owner?copy(latest):fresh(c);r.state='blocked';r.reason=reason;emit(r,false);
    }
    async function execute(c,external,startEpoch,newLocal){
      var invoked=false,stage='lease',nextAt=null;
      try{
        check(c);
        var outcome=await p.lease(c,async function(){
          invoked=true;check(c);stage='status-read';var raw=await p.readRecord(c);check(c);var r=read(c,raw);
          var eventCount=events.length;connections(r,eventCount);
          if(startEpoch!==dirtyEpoch||view.owner===c.owner&&view.localPending)r.localPending=true;
          if(newLocal&&!r.pending&&(r.state==='pending-confirm'||r.state==='offline'&&r.resumeState==='pending-confirm'))r.localRecheck=true;
          var action=planned(r,external,newLocal||r.localRecheck===true),t=time();
          if(action&&(action!=='ordinary'||!external)&&r.due!==null&&r.due>t){
            stage='status-write';await persist(c,r);events.splice(0,eventCount);emit(r,true);nextAt=r.due;return;
          }
          if(!action){
            stage='status-write';await persist(c,r);events.splice(0,eventCount);emit(r,true);return;
          }
          var stepEpoch=dirtyEpoch;
          if(action==='ordinary')delete r.localRecheck;
          // Consume every bounded action durably before entering the adapter.
          if(action==='retry'){
            r.retryUsed=true;r.phase='after-retry';r.due=t+backoff;
          }else if(action==='reconcile'){
            r.reconcileUsed=true;r.phase='hold';r.due=null;
          }else if(action==='after-retry'){
            r.postRetryReconcileUsed=true;r.phase='hold';r.due=null;
          }else{
            resetBudget(r);r.phase='reconcile';r.due=t+backoff;
          }
          r.state='readback';delete r.reason;delete r.message;
          stage='status-write';await persist(c,r);events.splice(0,eventCount);emit(r,true);
          check(c);
          // Going offline while the durable preflight is awaiting must not dispatch.
          if(!connected||onlineTest()===false){
            r.resumeState=r.state;r.state='offline';r.connected=false;
            stage='status-write';await persist(c,r);emit(r,true);return;
          }
          stage='step';var result=await p.step(c,{retry:action==='retry'});check(c);
          if(!result||STATES.indexOf(result.state)<0)throw new Error('Invalid scheduler step result');
          var id=result.attemptID==null?null:result.attemptID;
          if(id!==null&&(typeof id!=='string'||!id||id.length>512))throw new Error('Invalid attempt identity');
          if(r.pending&&r.attemptID&&id&&r.attemptID!==id)throw new Error('Unresolved attempt identity changed');
          var changed=result.localChanged===true||dirtyEpoch!==stepEpoch;
          r.state=result.state;r.localPending=changed||r.localPending;
          if(typeof result.message==='string')r.message=result.message.replace(/[\x00-\x1f\x7f]/g,' ').slice(0,500);
          if(result.state==='unconfirmed'||result.state==='readback'||result.state==='retryable'){
            if(!r.pending){r.attemptID=id;resetBudget(r);if(action==='reconcile')r.reconcileUsed=true;}
            else if(!r.attemptID)r.attemptID=id;
            if(!r.attemptID)throw new Error('Pending step has no attempt identity');
            r.pending=true;
            if(result.state==='retryable'){
              r.reconcileUsed=true;
              if(!r.retryUsed){r.phase='retry';r.due=time()+backoff;}else{r.phase='hold';r.due=null;}
            }else if(action==='retry'&&!r.postRetryReconcileUsed){
              r.phase='after-retry';r.due=time()+backoff;
            }else if(action==='ordinary'&&!r.reconcileUsed){
              r.phase='reconcile';r.due=time()+backoff;
            }else{r.phase='hold';r.due=null;}
          }else if(result.state==='saved'||result.state==='dirty'||result.state==='empty'){
            r.pending=false;r.attemptID=null;r.phase='idle';r.due=null;resetBudget(r);
            r.localPending=changed||result.state==='dirty';
            if((result.state==='saved'||result.state==='empty')&&changed)r.state='dirty';
            if(changed||result.state==='dirty'){r.due=time()+debounce;nextAt=r.due;}
          }else if(result.state==='offline'){
            // The adapter owns any packet; never assume an unknown dispatch failed.
            if(id){
              r.pending=true;r.attemptID=id;r.resumeState='unconfirmed';
              if(action==='retry'){r.phase='after-retry';r.due=time()+backoff;}
              else if(action==='ordinary'){r.phase='reconcile';r.due=time()+backoff;}
              else{r.phase='hold';r.due=null;}
            }
            else{r.resumeState=r.pending?'unconfirmed':'dirty';if(!r.pending){r.phase='idle';r.due=null;}}
            r.connected=false;
          }else{
            r.phase='hold';r.due=null;
            if(id){r.attemptID=id;r.pending=true;}
          }
          if(!connected||onlineTest()===false){
            if(r.state!=='offline')r.resumeState=r.state;
            r.state='offline';r.connected=false;nextAt=null;
          }
          stage='status-write';await persist(c,r);
          // A local save can arrive while status storage itself is awaiting.
          if(r.state==='saved'&&dirtyEpoch!==stepEpoch){
            r.state='dirty';r.localPending=true;r.due=time()+debounce;await persist(c,r);nextAt=r.due;
          }
          emit(r,true);nextAt=next(r)===null?nextAt:next(r);
        });
        check(c);
        if(!invoked){
          if(newLocal&&!localRequested)localRequested=c.owner;
          emit({v:1,owner:c.owner,state:outcome&&outcome.state==='other-tab'?'other-tab':'unavailable',reason:'exclusive-lease-unavailable',localPending:view.localPending===true},false);
          nextAt=null;
        }
      }catch(e){fail(c,stage==='step'?'step-failed':stage==='status-read'?'status-read-failed':stage==='status-write'?'status-store-failed':'lease-failed');nextAt=null;}
      return nextAt;
    }
    function launch(){
      if(stopped)return Promise.resolve(copy(view));
      if(running)return running;
      clearTimer();var external=requested,localOwner=localRequested;requested=false;localRequested=null;var c=context(),newLocal=!!c&&localOwner===c.owner;
      if(!c){emit({v:1,owner:null,state:'unavailable',reason:'no-account',localPending:false},false);return Promise.resolve(copy(view));}
      var epoch=dirtyEpoch;
      running=execute(c,external,epoch,newLocal).then(function(at){
        running=null;
        if(!stopped){
          if(requested){var notified=time()+requestDelay;at=at===null?notified:Math.min(at,notified);}
          if(at!==null)arm(at);
        }
        return copy(view);
      },function(){running=null;fail(c,'scheduler-failed');return copy(view);});
      return running;
    }
    function notify(reason){
      if(stopped)return copy(view);
      requested=true;requestDelay=reason==='boot'||reason==='login'?0:debounce;
      if(reason==='local'){
        dirtyEpoch++;
        var c=context();if(c)localRequested=c.owner;
        if(c){var r=view.owner===c.owner?copy(view):fresh(c);r.localPending=true;if(r.state==='saved'||r.state==='empty')r.state='dirty';emit(r,false);}
      }
      if(!running)arm(time()+requestDelay);
      return copy(view);
    }
    function offline(){
      if(stopped)return copy(view);
      if(connected){connected=false;events.push({online:false,at:time()});}
      requested=true;requestDelay=0;if(!running)arm(time());return copy(view);
    }
    function online(){
      if(stopped)return copy(view);
      if(onlineTest()===false)return offline();
      if(!connected){connected=true;events.push({online:true,at:time()});}
      requested=true;requestDelay=0;if(!running)arm(time());return copy(view);
    }
    return {notify:notify,flush:function(){if(!stopped){requested=true;requestDelay=0;}return launch();},offline:offline,online:online,
      stop:function(){stopped=true;requested=false;localRequested=null;events=[];clearTimer();},status:function(){return copy(view);},
      whenIdle:function(){return running||Promise.resolve(copy(view));}};
  }
  return {create:create};
});
