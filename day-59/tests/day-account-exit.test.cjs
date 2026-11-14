'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');

const page = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const start = page.indexOf('async function clSignOut(){');
const end = page.indexOf('async function clToken(', start);
assert.ok(start >= 0 && end > start, 'Day must wire its normal signout handler');
const signout = new vm.Script(page.slice(start, end) + '\nclSignOut()');

function fixture() {
  const trace = [];
  const state = { s: {uid:'first', at:'first-token'}, authGeneration:'login-1', ck:{}, kraw:'test' };
  const realm = {
    CL:state, CLOUD:{url:'https://test.invalid'}, saveT:null, DB:{note:'new'}, CFG:{},
    K:{db:'db',cfg:'cfg'}, MIND:{on:false}, clearTimeout, setTimeout,
    clTestPolicy:()=>({assertAllowed(){}}),
    clAssertStoredSession:()=>state.s?.at,
    HappyProfile:{ matches:uid=>uid===state.s?.uid, changed:()=>trace.push('guest') },
    rawSet:async key=>{trace.push('store '+key);}, clToken:async()=>state.s.at,
    clNewGeneration:()=>'logout', clStore:async()=>{}, HappySnapshotSync:{stable:JSON.stringify},
    DayJournal:{
      capture:()=>({...realm.DB}),
      confirmProfileForExit:async()=>{trace.push('verified'); return JSON.stringify(realm.DB);},
      invalidate:()=>{}
    },
    confirmBox:async()=>{trace.push('unconfirmed'); return false;},
    fetch:async()=>{trace.push('logout');}
  };
  realm.window=realm;
  return {realm,state,trace,exit:()=>signout.runInNewContext(realm)};
}

test('normal same-login token renewal permits logout after fresh verification', async()=>{
  const {realm,state,trace,exit}=fixture();
  realm.clToken=async()=>{state.s={uid:'first',at:'renewed-token'};};
  await exit();
  assert.ok(trace.indexOf('verified') < trace.indexOf('logout'));
  assert.ok(trace.includes('verified') && trace.includes('guest') && !trace.includes('unconfirmed'));
});

test('a refresh during the read requires another verified read before logout', async()=>{
  const {realm,state,trace,exit}=fixture();
  let reads=0;
  realm.DayJournal.confirmProfileForExit=async()=>{
    if(++reads===1){state.s={uid:'first',at:'renewed-token'}; throw Error('stale read');}
    trace.push('verified'); return JSON.stringify(realm.DB);
  };
  await exit();
  assert.equal(reads,2);
  assert.ok(trace.includes('logout') && !trace.includes('unconfirmed'));
});

for(const change of ['owner','login','key']) {
  test('an actual change of '+change+' stops logout even with an old verification', async()=>{
    const {realm,state,trace,exit}=fixture();
    realm.DayJournal.confirmProfileForExit=async()=>{
      if(change==='owner')state.s={uid:'second',at:'other-token'};
      if(change==='login')state.authGeneration='login-2';
      if(change==='key')state.ck={};
      return JSON.stringify(realm.DB);
    };
    await assert.rejects(exit,/Аккаунт изменился/);
    assert.ok(state.s && !trace.includes('logout') && !trace.includes('unconfirmed'));
  });
}

test('a new local edit during counter verification cannot exit silently', async()=>{
  const {realm,state,trace,exit}=fixture();
  realm.HappyDayCounters={confirmForExit:async()=>{realm.DB.note='newer';}};
  await assert.rejects(exit,/остался в профиле/);
  assert.ok(trace.includes('unconfirmed') && !trace.includes('logout') && state.s);
});
