import assert from 'node:assert/strict';
import test from 'node:test';
import { createIdentityProjectAuthorizer } from './identity-authorizer.mjs';

const sessionToken = 'valid-customer-session-token-over-24-chars';
function fixture({ active = true, paid = true, owned = true, crash = false } = {}) {
  const calls=[];
  const adapter={
    auth:{ resolveSession:async(token)=>{calls.push(['session',token]);if(crash)throw Error('gateway unavailable');return active?{authenticated:true,identityId:'identity-owner'}:{authenticated:false,identityId:null};}},
    identity:{can:async(args)=>{calls.push(['can',args]);return {allowed:args.capability==='lotscope.advanced.access'?paid:owned && args.resourceId==='owned'};}},
  };
  return { authorize:createIdentityProjectAuthorizer(adapter), calls };
}
const read={sessionToken,projectId:'owned',capability:'lotscope.project.read'};
test('checks live session, paid access and exact project scope, in order',async()=>{
  const f=fixture();assert.equal(await f.authorize(read),'identity-owner');
  assert.equal(f.calls.length,3);
  assert.equal(f.calls[1][1].capability,'lotscope.advanced.access');
  assert.deepEqual(f.calls[2][1],{identityId:'identity-owner',capability:'lotscope.project.read',resourceType:'lotscope_project',resourceId:'owned'});
});
test('denies revoked login before checking privileges',async()=>{
  const f=fixture({active:false});assert.equal(await f.authorize(read),null);assert.equal(f.calls.length,1);
});
test('denies unpaid customer before project check',async()=>{
  const f=fixture({paid:false});assert.equal(await f.authorize(read),null);assert.equal(f.calls.length,2);
});
test('denies unauthorized project and verifies scoped edit separately',async()=>{
  const f=fixture();assert.equal(await f.authorize({...read,projectId:'someone-elses-project'}),null);
  const edit=fixture({owned:false});assert.equal(await edit.authorize({...read,capability:'lotscope.project.edit'}),null);
});
test('rejects unexpected capabilities, malformed ids, and missing sessions',async()=>{
  const f=fixture();assert.equal(await f.authorize({...read,capability:'lotscope.workspace.write'}),null);
  assert.equal(await f.authorize({...read,projectId:'bad/project'}),null);
  assert.equal(await f.authorize({...read,sessionToken:'x'}),null);assert.equal(f.calls.length,0);
});
test('gateway outage propagates so broker fails closed with 503',async()=>{
  const f=fixture({crash:true});await assert.rejects(()=>f.authorize(read),/gateway unavailable/);
});
test('does not cache permissions after revocation',async()=>{
  let valid=true;const adapter={auth:{resolveSession:async()=>({authenticated:valid,identityId:valid?'identity-owner':null})},identity:{can:async()=>({allowed:true})}};
  const check=createIdentityProjectAuthorizer(adapter);assert.equal(await check(read),'identity-owner');valid=false;assert.equal(await check(read),null);
});
