import assert from 'node:assert/strict';
import test from 'node:test';
import { createHmac } from 'node:crypto';
import { createAdvancedBroker } from './core.mjs';
const secret='test-secret-with-at-least-32-characters-and-more';
const now=Date.parse('2026-10-30T12:00:00.000Z');
const time=new Date(now).toISOString();
const path='/v1/advanced/projects/owned/revisions/candidateA';
const raw=(data)=>JSON.stringify(data);
function signed(method, path, body, timestamp=time) {
  return { method, path, rawBody: body, headers: {
    'x-av-service':'lotscope_advanced','x-av-timestamp':timestamp,
    'x-av-signature':createHmac('sha256',secret).update(`${method}\n${path}\n${timestamp}\n${body}`).digest('hex'),
  }};
}
const db=new Map();const replay=new Set();let permissions=0;let saves=0;
const broker=createAdvancedBroker({secret,clock:()=>now,validate:async()=>{},
  authorize:async({sessionToken,projectId,capability})=>{permissions++;return sessionToken==='customer-session-token-much-longer' && projectId==='owned' && capability.startsWith('lotscope.project.') ? 'owner-identity' : null;},
  store:{ claimReplay:async({replayKey})=>{if(replay.has(replayKey))return false;replay.add(replayKey);return true;}, save:async({candidateId,candidate,document})=>{saves++;const key=candidateId+':'+document.revision;const json=JSON.stringify([candidate,document]);if(db.has(key))return db.get(key)===json?'unchanged':'conflict';db.set(key,json);return 'created';},
    read:async({candidateId})=>{const key=[...db.keys()].filter(k=>k.startsWith(candidateId+':')).sort().at(-1);if(!key)return null;const [candidate,document]=JSON.parse(db.get(key));return {candidate,document};} },
});
const customer={sessionToken:'customer-session-token-much-longer'};
const candidate={id:'candidateA',projectId:'owned',components:[]};
const document={candidateId:'candidateA',projectId:'owned',revision:1};
test('rejects unsigned, tampered, expired and cross-project requests',async()=>{
  assert.equal((await broker({method:'POST',path,rawBody:raw(customer),headers:{}})).status,401);
  const good=signed('POST',path,raw(customer));
  assert.equal((await broker({...good,rawBody:raw({...customer,evil:true})})).status,401);
  assert.equal((await broker(signed('POST',path,raw(customer),'2026-10-30T11:50:00.000Z'))).status,401);
  assert.equal((await broker(signed('POST','/v1/advanced/projects/other/revisions/candidateA',raw(customer)))).status,403);
  assert.equal((await broker(signed('POST','/v1/advanced/projects/../../etc',raw(customer)))).status,404);
});
test('requires a resolved customer session; HMAC alone is not customer authorization',async()=>{
  assert.equal((await broker(signed('POST',path,raw({sessionToken:'invalid-token-but-still-long-enough'})))).status,403);
  assert.equal((await broker(signed('POST',path,raw({identityId:'owner-identity'})))).status,401);
});
test('saves, rejects replays and conflicts, permits identical idempotent retry with fresh timestamp',async()=>{
  const body=raw({...customer,candidate,document});
  assert.equal((await broker(signed('PUT',path,body))).status,201);
  assert.equal((await broker(signed('PUT',path,body))).status,409);
  assert.equal((await broker(signed('PUT',path,body,'2026-10-30T12:00:01.000Z'))).status,200);
  const changed=raw({...customer,candidate,document:{...document,modified:true}});
  assert.equal((await broker(signed('PUT',path,changed))).status,409);
  assert.equal((await broker(signed('POST',path,raw(customer)))).body.document.revision,1);
  assert.equal(saves,3);
});
test('rejects a candidate/project mismatch before storage',async()=>{
  const body=raw({...customer,candidate:{...candidate,projectId:'other'},document});
  assert.equal((await broker(signed('PUT',path,body))).status,400);
});
test('fails closed on identity broker errors',async()=>{
  const failure=createAdvancedBroker({secret,clock:()=>now,validate:async()=>{},authorize:async()=>{throw Error('gateway down');},store:{claimReplay:async()=>true,save:async()=>{},read:async()=>{}}});
  assert.equal((await failure(signed('POST',path,raw(customer)))).status,503);
});

test('rejects missing geometry validator, and invalid geometry before write', async()=>{
  assert.throws(()=>createAdvancedBroker({secret,authorize:async()=> 'owner',store:{claimReplay:async()=>true,save:async()=>{},read:async()=>{}}}), /broker_configuration_incomplete/);
  const invalid=createAdvancedBroker({secret,clock:()=>now,authorize:async()=> 'owner',validate:async()=>{throw Error('bad polygon')},store:{claimReplay:async()=>true,save:async()=>{throw Error('should not write')},read:async()=>null}});
  assert.equal((await invalid(signed('PUT',path,raw({...customer,candidate,document})))).status,422);
});

test('two broker instances sharing the replay ledger cannot both accept the same write', async()=>{
  const claims=new Set();
  const store={claimReplay:async({replayKey})=>{if(claims.has(replayKey))return false;claims.add(replayKey);return true;},save:async()=> 'created',read:async()=>null};
  const options={secret,clock:()=>now,validate:async()=>{},authorize:async()=> 'owner',store};
  const a=createAdvancedBroker(options), b=createAdvancedBroker(options);
  const request=signed('PUT',path,raw({...customer,candidate,document}));
  const results=await Promise.all([a(request),b(request)]);
  assert.deepEqual(results.map(r=>r.status).sort(),[201,409]);
});
test('replay store outage fails closed and does not save', async()=>{
  const broker=createAdvancedBroker({secret,clock:()=>now,validate:async()=>{},authorize:async()=> 'owner',store:{claimReplay:async()=>{throw Error('db down')},save:async()=>{throw Error('should not save')},read:async()=>null}});
  assert.equal((await broker(signed('PUT',path,raw({...customer,candidate,document})))).status,503);
});
