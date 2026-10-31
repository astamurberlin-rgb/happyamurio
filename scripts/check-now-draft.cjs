const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const C=require('../day/selfcare-core.js');
test('Now drafts discard on close; explicit save and undo round-trip without losing other entries',async()=>{
 const date='2026-10-31',DB={days:{},sections:[{k:'morning',scales:['energy']}],metrics:[{k:'energy',t:'Энергия',lo:0,hi:4}]};C.init(DB,date);DB.selfCare.checkinSection.scales=['energy'];
 C.saveSectionCheckin(DB,date,'existing',{time:'08:00',energy:1},DB.metrics,{scales:['energy']});
 const nodes={},node=id=>nodes[id]||(nodes[id]={hidden:true,classList:{toggle(){}},style:{}});
 const ctx={window:{HappyCare:C},DB,RO:false,curSec:'care_current',cur:0,CURS:DB.metrics,curDate:date,todayISO:()=>date,nowHM:()=> '10:00',save(){},saveT:0,clearTimeout(){},fmtCheck:async()=>{},rawSet:async()=>{},K_FMT:'fmt',FMT:49,K:{db:'db'},document:{getElementById:node,body:node('body')},renderDay(){},buildTracks(){},renderCpTags(){},paintCpMeal(){},toast(){},toastLong(){}};
 vm.createContext(ctx);let src=fs.readFileSync('day/selfcare-ui.js','utf8');src=src.replace('root.SelfCare={','renderNow=()=>{};root.test={submitNow,undoNowSave,set(v){session=v;},get(){return session;}};root.SelfCare={');vm.runInContext(src,ctx);
 ctx.go=name=>ctx.window.SelfCare.onNavigate(name);
 const draft=()=>({id:'new',date,checkpoint:{time:'10:00',energy:3,tags:{}},defs:{},readOnly:false,returnTo:'day'});
 ctx.window.test.set(draft());ctx.window.SelfCare.saveCheckin();assert.equal(C.readDay(DB,date).checkins.length,1);
 ctx.go('day');assert.equal(ctx.window.test.get(),null);assert.equal(C.readDay(DB,date).checkins.length,1);
 ctx.curSec='care_current';ctx.window.test.set(draft());await ctx.window.test.submitNow();assert.equal(C.readDay(DB,date).checkins.length,2);assert.equal(nodes.nowNotice.hidden,false);
 await ctx.window.test.undoNowSave();assert.equal(C.readDay(DB,date).checkins.length,1);assert.equal(ctx.window.test.get().checkpoint.energy,3);
 await ctx.window.test.submitNow();assert.equal(C.readDay(DB,date).checkins.length,2);
});
