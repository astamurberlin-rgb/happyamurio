'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const P=require('../dist/day/day-passive-plan.js');
const cp=x=>JSON.parse(JSON.stringify(x));
const digest='a'.repeat(64),remoteDigest='b'.repeat(64);
const identity=()=>({at:123456,iv:'AAAAAAAAAAAAAAAA',digest:remoteDigest});
const mind=()=>({n:3,sec:91,ss:[['08:12',45],['08:12',45],['08:13',0]]});
const day=()=>({cp:{},tags:{},train:null,screen:{},note:'synthetic shared note',num:{},mind:mind()});
const snapshot=()=>({app:'happyday',v:1,db:{fmt:49,metrics:[],days:{'2026-11-04':day()},selfCare:{},taps:[]}});
function project(s){const out=cp(s);for(const d of Object.values(out.db.days))delete d.mind;return out;}
function fixture(){
  const remote=snapshot(),local=cp(remote);
  local.db.days['2026-11-04'].mind={n:7,sec:222,ss:[['08:12',15],['08:12',15],['08:13',0]],unknownRaw:{labels:['first','first']}};
  return {local,remote,localFullDigest:digest,remoteIdentity:identity(),project};
}
function good(o){const r=P.plan(o);assert.equal(r.ok,true,JSON.stringify(r));return r;}
function refused(o,reason){const r=P.plan(o);assert.equal(r.ok,false);if(reason)assert.equal(r.reason,reason);assert.deepEqual(Object.keys(r).sort(),['ok','path','reason']);assert.equal(typeof r.path,'string');return r;}

test('first repair retains both complete, separate histories without totals or normalization',()=>{
  const o=fixture(),r=good(o),a=r.candidate.db.passiveMindArchive;
  assert.equal(a.v,1);assert.equal(a.status,'separate-histories-no-total');assert.equal(a.sources.length,2);
  assert.equal(a.sources[0].source,'local');assert.equal(a.sources[1].source,'cloud');
  assert.equal(a.sources[0].snapshotDigest,digest);assert.equal(a.sources[1].snapshotDigest,remoteDigest);
  assert.deepEqual(a.sources[1].identity,identity());
  assert.deepEqual(a.sources[0].mindByDate['2026-11-04'],o.local.db.days['2026-11-04'].mind);
  assert.deepEqual(a.sources[1].mindByDate['2026-11-04'],o.remote.db.days['2026-11-04'].mind);
  assert.deepEqual(Object.keys(a).sort(),['sources','status','v']);
  for(const s of a.sources)assert.equal('snapshot'in s||'db'in s||'total'in s||'sec'in s||'n'in s,false);
  const expected=project(o.local);expected.db.passiveMindArchive=cp(a);assert.deepEqual(r.candidate,expected);
});

test('duplicates, overlaps, zero durations and inconsistent historic counters survive exactly',()=>{
  const o=fixture();o.remote.db.days['2026-11-04'].mind={n:999,sec:2,ss:[['00:00',0],['08:12',60],['08:12',60],['08:13',90],['23:59',0]],unknown:'retained'};
  const r=good(o);assert.deepEqual(r.candidate.db.passiveMindArchive.sources[1].mindByDate['2026-11-04'],o.remote.db.days['2026-11-04'].mind);
});

test('current-shape local-only dates, cp keys and draft entries are admitted without merge',()=>{
  const o=fixture();o.local.db.days['2026-11-04'].cp.synthetic=3;o.local.db.days['2026-11-04'].drafts=[{text:'synthetic local draft'}];
  o.local.db.days['2026-11-05']={cp:{localOnly:2},note:'synthetic later note',mind:mind()};o.local.db.metrics=[{id:'synthetic-added'}];
  const r=good(o),expected=project(o.local);expected.db.passiveMindArchive=cp(r.candidate.db.passiveMindArchive);assert.deepEqual(r.candidate,expected);
});

test('settings, records, imported mindx and unknown personal structures remain intact',()=>{
  const o=fixture();for(const s of [o.local,o.remote]){s.db.settings={a:true,n:0};s.db.days['2026-11-04'].records=[{text:'synthetic',values:[0,0]}];s.db.days['2026-11-04'].mindx=[{s:'08:12',sec:30,src:'synthetic external'}];s.db.unknown={nested:{data:['same','same']}};}
  o.local.db.unknown.nested.localExtra={stillHere:true};const r=good(o),expected=project(o.local);expected.db.passiveMindArchive=cp(r.candidate.db.passiveMindArchive);assert.deepEqual(r.candidate,expected);
});

test('remote-only note, date, setting and unknown field always refuse',()=>{
  for(const add of [s=>s.db.days['2026-11-04'].remoteNote='secret remote-only value',s=>s.db.days['2026-11-03']={note:'secret remote-only value'},s=>s.db.settings={remote:true},s=>s.db.unknown={remote:true}]){
    const o=fixture();add(o.remote);const r=refused(o,'remote-only-personal-content');assert.equal(JSON.stringify(r).includes('secret remote-only value'),false);
  }
});

test('different scalars including blank/default values refuse rather than choosing local',()=>{
  for(const [remote,local]of [['','later'],[null,{}],[false,true],[0,1],['remote secret','local secret']]){
    const o=fixture();o.remote.db.unknown=remote;o.local.db.unknown=local;const r=refused(o);assert.ok(r.reason.startsWith('personal-'));assert.equal(JSON.stringify(r).includes('remote secret'),false);assert.equal(JSON.stringify(r).includes('local secret'),false);
  }
});

test('nonempty arrays require exact full equality, never append, reorder or deduplicate',()=>{
  for(const local of [[{id:1},{id:2}],[{id:2}],[{id:1,extra:true}],[],[{id:1},{id:1}]]){
    const o=fixture();o.remote.db.records=[{id:1}];o.local.db.records=local;refused(o,'personal-array-differs');
  }
  const o=fixture();o.remote.db.records=[{b:2,a:1}];o.local.db.records=[{a:1,b:2}];good(o);
});

test('subset is directional and accepts empty arrays, object additions and scalar equality only',()=>{
  assert.equal(P.subset({a:[],b:{n:1}},{a:['new'],b:{n:1,x:2},c:true}).ok,true);
  assert.equal(P.subset({a:['new']},{a:[]}).ok,false);assert.equal(P.subset({a:[]},{a:{}}).ok,false);
  assert.equal(P.subset({a:1},{}).reason,'remote-only-personal-content');assert.equal(P.subset({a:null},{a:0}).ok,false);
  assert.equal(P.subset({a:[1,2]},{a:[2,1]}).ok,false);assert.equal(P.subset({},[]).ok,false);
});

test('missing cloud never creates a journal and cloud without nonempty legacy mind refuses',()=>{
  for(const remote of [null,undefined])refused({...fixture(),remote},'cloud-missing');
  for(const m of [undefined,{n:0,sec:0,ss:[]}]){const o=fixture();if(m)o.remote.db.days['2026-11-04'].mind=m;else delete o.remote.db.days['2026-11-04'].mind;refused(o,'no-legacy-cloud-mind');}
  const o=fixture();o.remote.db.days['2026-11-04'].mind={n:0,sec:0,ss:[['00:00',0]]};good(o);
});

test('missing local mind is captured as an explicit empty local variant',()=>{
  const o=fixture();delete o.local.db.days['2026-11-04'].mind;assert.deepEqual(good(o).candidate.db.passiveMindArchive.sources[0].mindByDate,{});
});

test('all dates with raw mind, including empty objects of the known shape, are archived',()=>{
  const o=fixture();for(const s of [o.local,o.remote])s.db.days['2026-11-02']={mind:{n:0,sec:0,ss:[]}};
  const a=good(o).candidate.db.passiveMindArchive;for(const s of a.sources)assert.deepEqual(s.mindByDate['2026-11-02'],{n:0,sec:0,ss:[]});
});

test('documented existing empty-day pruning keeps every removed raw mind in its source archive',()=>{
  const o=fixture();o.remote.db.days['2026-11-03']={cp:{},tags:{},note:'',mind:mind()};o.local.db.days['2026-11-02']={cp:{},note:'',mind:mind()};
  o.local.db.days['2026-11-01']={num:{zero:0},mind:mind()};o.local.db.days['2026-10-31']={unknownEmpty:{},mind:mind()};
  const meaningful=v=>v!==null&&v!==undefined&&v!==''&&v!==false&&(Array.isArray(v)?v.length>0:typeof v==='object'?Object.values(v).some(meaningful):true);
  const known=new Set(['cp','tags','train','screen','note','num','cnt','cntLog','taps','now','care']);
  o.project=s=>{const p=project(s);for(const [date,d]of Object.entries(p.db.days))if(Object.keys(d).every(k=>known.has(k)&&!meaningful(d[k])))delete p.db.days[date];return p;};
  const r=good(o),a=r.candidate.db.passiveMindArchive;assert.equal('2026-11-03'in r.candidate.db.days,false);assert.equal('2026-11-02'in r.candidate.db.days,false);
  assert.equal('2026-11-01'in r.candidate.db.days,true);assert.equal('2026-10-31'in r.candidate.db.days,true);
  assert.deepEqual(a.sources[0].mindByDate['2026-11-02'],o.local.db.days['2026-11-02'].mind);assert.deepEqual(a.sources[1].mindByDate['2026-11-03'],o.remote.db.days['2026-11-03'].mind);
});

test('malformed mind shape, times, negative/noninteger durations and counters refuse',()=>{
  for(const m of [null,[],{}, {n:0,sec:0}, {n:-1,sec:0,ss:[]}, {n:1.5,sec:0,ss:[]}, {n:0,sec:-1,ss:[]}, {n:1,sec:0.5,ss:[]}, {n:1,sec:0,ss:[['24:00',0]]}, {n:1,sec:0,ss:[['8:00',0]]}, {n:1,sec:0,ss:[['08:00',-1]]}, {n:1,sec:0,ss:[['08:00',0.1]]}, {n:1,sec:0,ss:[['08:00',0,'extra']]}]){
    for(const side of ['local','remote']){const o=fixture();o[side].db.days['2026-11-04'].mind=m;refused(o,'invalid-mind');}
  }
});

test('local digest and remote identity must have validated syntax',()=>{
  for(const d of ['',null,'a'.repeat(63),'A'.repeat(64),'g'.repeat(64),123])refused({...fixture(),localFullDigest:d},'invalid-digest');
  for(const id of [null,{}, {...identity(),at:-1},{...identity(),at:0.1},{...identity(),iv:'bad'},{...identity(),digest:'bad'}])refused({...fixture(),remoteIdentity:id},'invalid-identity');
});

test('snapshot shape and unowned Meal/sync metadata fail closed',()=>{
  for(const change of [s=>s.app='other',s=>s.v=2,s=>s.db.days=[],s=>s.db.metrics={},s=>s.db.days['2026-11-04']=null,s=>s.db.__dayJournalSync={},s=>s.db.mealLink={},s=>s.db.mealCounters={},s=>s.db.taps=[{mealCounterId:'synthetic'}],s=>s.db.days['2026-11-04'].taps={a:[{counterEventId:'synthetic'}]}]){
    const o=fixture();change(o.remote);refused(o);
  }
});

test('invalid/lossy JSON, cycles, dangerous keys, accessors and symbols refuse',()=>{
  for(const value of [undefined,NaN,Infinity,()=>{},1n,new Date(),[,1],Object.assign([1],{extra:2}),Object.create({inherited:1}),JSON.parse('{"__proto__":{}}')]){
    const o=fixture();o.local.db.bad=value;refused(o,'invalid-json');
  }
  const o=fixture();o.local.db.bad=o.local;refused(o,'invalid-json');
  const a=fixture();let calls=0;Object.defineProperty(a.local.db,'bad',{enumerable:true,get(){calls++;return 3;}});refused(a,'invalid-json');assert.equal(calls,0);
  const b=fixture();b.local.db[Symbol('bad')]=1;refused(b,'invalid-json');
  assert.equal(P.subset({n:Infinity},{n:Infinity}).ok,false);
});

test('projection must exist, produce a snapshot and remove all per-day mind',()=>{
  refused({...fixture(),project:null},'invalid-projection');refused({...fixture(),project:()=>null},'invalid-snapshot');
  refused({...fixture(),project:x=>x},'projection-retains-mind');refused({...fixture(),project:()=>{throw Error('PRIVATE VALUE');}},'invalid-projection');
  const o=fixture();o.project=s=>{const p=project(s);p.db.passiveMindArchive={};return p;};refused(o,'projection-changes-archive');
});

test('planner and mutating projection cannot change caller snapshots or identity',()=>{
  const o=fixture(),before=cp(o),id=cp(o.remoteIdentity);o.project=s=>{for(const d of Object.values(s.db.days))delete d.mind;return s;};const r=good(o);
  assert.deepEqual(o.local,before.local);assert.deepEqual(o.remote,before.remote);assert.deepEqual(o.remoteIdentity,id);
  assert.notEqual(r.candidate,o.local);assert.notEqual(r.candidate.db.passiveMindArchive.sources[0].mindByDate['2026-11-04'],o.local.db.days['2026-11-04'].mind);
});

test('candidate and archive are recursively frozen to prevent post-plan packet drift',()=>{
  const r=good(fixture());assert.equal(Object.isFrozen(r),true);assert.equal(Object.isFrozen(r.candidate.db.passiveMindArchive.sources[0].mindByDate['2026-11-04'].ss[0]),true);
  assert.throws(()=>{r.candidate.db.passiveMindArchive.sources[0].mindByDate['2026-11-04'].ss.push(['00:00',0]);},TypeError);
  assert.throws(()=>{r.candidate.db.passiveMindArchive={};},TypeError);
});

test('archive byte limit admits the exact boundary and refuses one UTF-8 byte above',()=>{
  const o=fixture();o.local.db.days['2026-11-04'].mind.padding='';const base=good(o).archiveBytes;
  o.local.db.days['2026-11-04'].mind.padding='x'.repeat(P.MAX_ARCHIVE_BYTES-base);const r=good(o);assert.equal(r.archiveBytes,P.MAX_ARCHIVE_BYTES);assert.equal(Buffer.byteLength(JSON.stringify(r.candidate.db.passiveMindArchive),'utf8'),r.archiveBytes);
  o.local.db.days['2026-11-04'].mind.padding+='x';refused(o,'archive-too-large');
});

test('archive bound measures multibyte text rather than JS string length',()=>{
  const o=fixture();o.local.db.days['2026-11-04'].mind.padding='🙂éя';const r=good(o);assert.equal(r.archiveBytes,Buffer.byteLength(JSON.stringify(r.candidate.db.passiveMindArchive),'utf8'));
  o.local.db.days['2026-11-04'].mind.padding='🙂'.repeat(65536);refused(o,'archive-too-large');
});

test('same remote resumes exact existing local archive without changing either historical source',()=>{
  const o=fixture(),first=good(o),archive=cp(first.candidate.db.passiveMindArchive);o.local.db.passiveMindArchive=cp(archive);
  // A new tick or local personal entry is not folded into either archived source.
  o.localFullDigest='c'.repeat(64);o.local.db.days['2026-11-04'].mind.ss.push(['10:00',5]);o.local.db.days['2026-11-04'].drafts={text:'synthetic newer draft'};
  const r=good(o);assert.deepEqual(r.candidate.db.passiveMindArchive,archive);assert.deepEqual(o.local.db.passiveMindArchive,archive);
});

test('archive resumption refuses any changed remote identity or raw remote mind',()=>{
  for(const change of [o=>o.remoteIdentity.at++,o=>o.remoteIdentity.iv='BBBBBBBBBBBBBBBB',o=>o.remoteIdentity.digest='c'.repeat(64),o=>o.remote.db.days['2026-11-04'].mind.ss.push(['10:00',0]),o=>o.remote.db.days['2026-11-04'].mind.unknown=true]){
    const o=fixture();o.local.db.passiveMindArchive=cp(good(o).candidate.db.passiveMindArchive);change(o);const r=refused(o);assert.ok(/^archive-cloud-(identity|mind)-differs$/.test(r.reason));
  }
});

test('existing cloud archives always refuse and unknown/malformed local archives never migrate',()=>{
  for(const archive of [null,{},[],{v:2,status:'other',sources:[]}]){const o=fixture();o.local.db.passiveMindArchive=archive;refused(o,'invalid-existing-archive');const q=fixture();q.remote.db.passiveMindArchive=archive;refused(q,'existing-remote-archive');}
  for(const change of [a=>a.extra=true,a=>a.sources.push({}),a=>a.sources.reverse(),a=>a.sources[0].snapshotDigest='bad',a=>a.sources[0].mindByDate=null,a=>a.sources[1].identity.extra=true,a=>a.sources[1].snapshotDigest='c'.repeat(64),a=>a.sources[0].mindByDate['2026-11-04'].ss[0][1]=-1]){
    const o=fixture(),a=cp(good(o).candidate.db.passiveMindArchive);change(a);o.local.db.passiveMindArchive=a;refused(o);
  }
});

test('projection cannot change/drop an existing archive and large resumed archive refuses',()=>{
  for(const mode of ['drop','change','large']){const o=fixture();o.local.db.passiveMindArchive=cp(good(o).candidate.db.passiveMindArchive);
    if(mode==='large')o.local.db.passiveMindArchive.sources[0].mindByDate['2026-11-04'].padding='x'.repeat(P.MAX_ARCHIVE_BYTES);
    else o.project=s=>{const p=project(s);if(p.db.passiveMindArchive){if(mode==='drop')delete p.db.passiveMindArchive;else p.db.passiveMindArchive.sources[0].snapshotDigest='d'.repeat(64);}return p;};
    refused(o,mode==='large'?'archive-too-large':'projection-changes-archive');
  }
});

test('browser UMD uses no IO and also accepts cross-realm JSON snapshots',()=>{
  const context={fetch(){throw Error('IO forbidden');},localStorage:new Proxy({},{get(){throw Error('IO forbidden');}})};vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../dist/day/day-passive-plan.js'),'utf8'),context);
  assert.equal(typeof context.HappyDayPassivePlan.plan,'function');assert.equal(context.HappyDayPassivePlan.plan(fixture()).ok,true);
});

test('validArchive recognizes only exact bounded schema without mutating or recomputing history',()=>{
  const archive=good(fixture()).candidate.db.passiveMindArchive,before=JSON.stringify(archive);
  assert.equal(P.validArchive(archive),true);assert.equal(JSON.stringify(archive),before);
  const unusual=cp(archive);unusual.sources[0].mindByDate['2026-11-04'].n=999;unusual.sources[0].mindByDate['2026-11-04'].sec=1;
  const raw=JSON.stringify(unusual);assert.equal(P.validArchive(unusual),true);assert.equal(JSON.stringify(unusual),raw);
  for(const bad of [undefined,null,{},[],{v:2,status:'other',sources:[]}, {...cp(archive),extra:true}])assert.equal(P.validArchive(bad),false);
  for(const change of [a=>a.sources[0].extra=true,a=>a.sources.reverse(),a=>a.sources[1].identity.at=-1,a=>a.sources[1].snapshotDigest='c'.repeat(64),a=>a.sources[0].mindByDate['2026-11-04'].ss[0][1]=-1]){
    const value=cp(archive);change(value);const saved=JSON.stringify(value);assert.equal(P.validArchive(value),false);assert.equal(JSON.stringify(value),saved);
  }
});

test('validArchive enforces exact UTF-8 byte limit and rejects lossy/accessor input',()=>{
  const o=fixture();o.local.db.days['2026-11-04'].mind.padding='';const base=good(o).archiveBytes;
  o.local.db.days['2026-11-04'].mind.padding='x'.repeat(P.MAX_ARCHIVE_BYTES-base);const a=cp(good(o).candidate.db.passiveMindArchive);assert.equal(P.validArchive(a),true);
  a.sources[0].mindByDate['2026-11-04'].padding+='é';assert.equal(P.validArchive(a),false);
  const b=cp(good(fixture()).candidate.db.passiveMindArchive);b.sources[0].mindByDate['2026-11-04'].unknown=undefined;assert.equal(P.validArchive(b),false);
  let calls=0;const c={};Object.defineProperty(c,'sources',{enumerable:true,get(){calls++;throw Error('do not invoke');}});assert.equal(P.validArchive(c),false);assert.equal(calls,0);
});
