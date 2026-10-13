import assert from 'node:assert/strict';
import { createBrowserAppAdapter } from '@aerovista-us/app-adapter/browser';

// Reproduce the real adapter's preview-origin return URL construction without
// using a founder account, an Identity handoff code or any stored credentials.
for(const origin of [
 'https://lotscope.aerovista.us',
 'https://lotscope-git-feat-design5-shared-a-bd9f8e-aerovista-us-projects.vercel.app',
]){
 const saved=new Map();
 let redirect='';
 const adapter=createBrowserAppAdapter({
  appId:origin.includes('lotscope-git-feat-design5-')?'lotscope_workbench_preview':'lotscope_workbench',appOrigin:origin,callbackPath:'/workbench-auth/callback',
  storage:{getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)},
  localEndpoints:{handoffExchange:'/api/workbench/auth/handoff-exchange'},
  fetchImpl:async()=>new Response(JSON.stringify({ok:true}),{status:200,headers:{'Content-Type':'application/json'}}),
 });
 const next='/workbench/projects/pondy-lot2/candidates/design5';
 const started=adapter.auth.beginLogin({next,navigate:url=>{redirect=url;}});
 const account=new URL(redirect);
 assert.equal(account.origin,'https://account.aerocoreos.com');
 assert.equal(account.searchParams.get('client_id'),origin.includes('lotscope-git-feat-design5-')?'lotscope_workbench_preview':'lotscope_workbench');
 const callback=new URL(account.searchParams.get('return_to'));
 assert.equal(callback.origin,origin,'Login callback must remain on the initiating origin');
 assert.equal(callback.pathname,'/workbench-auth/callback');
 assert.equal(callback.searchParams.get('next'),next);
 const state=account.searchParams.get('state');
 assert(state);
 callback.searchParams.set('state',state);
 callback.searchParams.set('code','synthetic-noncredential');
 const completed=await adapter.auth.completeLogin({url:callback.toString()});
 assert.equal(completed.next,next);
 assert.equal(saved.size,0,'One-time state must be consumed');
 console.log('Preview handoff contract OK:',origin);
}
