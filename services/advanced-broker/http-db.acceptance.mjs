import assert from 'node:assert/strict';
import postgres from 'postgres';
import { createAdvancedBroker, canonicalHash } from './core.mjs';
import { createPostgresRevisionStore } from './postgres-store.mjs';
import { createAdvancedBrokerHttp } from './http.mjs';
import { signAdvancedBrokerRequest } from '../../lib/aerovista/advanced-broker-signature.ts';

if (!process.env.LOTSCOPE_TEST_DATABASE_URL || !process.env.LOTSCOPE_TEST_DATABASE_URL.includes('lotscope_broker_http_'))
  throw Error('explicit_disposable_database_required');
const sql = postgres(process.env.LOTSCOPE_TEST_DATABASE_URL, { max: 5, ssl: false });
const secret = 'isolated-acceptance-secret-with-32-characters';
const parcel = {kind:'parcel',id:'parcel-1',points:[[0,0],[50,0],[50,50],[0,50]]};
const setback = {kind:'setback',id:'survey-east-boundary',offsetFt:12,direction:'east'};
const candidate = {id:'candidateA',projectId:'owned',revisionLabel:'r1',components:[parcel,setback]};
const document = {projectId:'owned',candidateId:'candidateA',revision:1,sourceRevision:'r1'};
const sessionToken = 'acceptance-owner-session-validated-in-fixture';
const makeBody = (value) => JSON.stringify({sessionToken,...value});
const location = '/v1/advanced/projects/owned/revisions/candidateA';
let port;
function payload(method,path,body,offset=0) {
  const timestamp = new Date(Date.now()+offset).toISOString();
  return { method, headers: { ...signAdvancedBrokerRequest(method,path,body,secret,timestamp), 'content-type':'application/json' },body };
}
async function preparedSend(method,path,request) {
  const res=await fetch(`http://127.0.0.1:${port}${path}`,request);
  return {status:res.status,body:await res.json()};
}
async function send(method,path,body,offset=0) { return preparedSend(method,path,payload(method,path,body,offset)); }
const authorize = async ({sessionToken:token,projectId,capability}) => token===sessionToken && projectId==='owned' && ['lotscope.project.read','lotscope.project.edit'].includes(capability) ? 'acceptance-owner' : null;
const store=createPostgresRevisionStore(sql);
const validate=async(c,d)=>{if(c.projectId!==d.projectId)throw Error('invalid');}; // harness-only test double, NOT the production geometry validator
async function launch() {
  const server=createAdvancedBrokerHttp({handle:createAdvancedBroker({secret,authorize,validate,store})});
  await new Promise((ok,fail)=>server.once('error',fail).listen(0,'127.0.0.1',ok));
  port=server.address().port;
  return server;
}
let server;
try {
  if (process.env.LOTSCOPE_TEST_PROJECT_PREPROVISIONED === 'true') {
    const [source] = await sql`SELECT source_parcel_sha256 FROM lotscope_advanced_projects WHERE project_id='owned'`;
    assert.equal(source?.source_parcel_sha256, canonicalHash(parcel), 'staff-provisioned source must match');
  } else {
    // Legacy unrestricted fixture mode; NEVER use for restricted-role acceptance.
    await sql`INSERT INTO lotscope_advanced_projects (project_id, source_parcel_sha256, source_parcel, source_locked_components) VALUES ('owned',${canonicalHash(parcel)},${sql.json(parcel)},${sql.json([parcel,setback])})`;
  }
  server=await launch();
  const body=makeBody({candidate,document});
  const firstSigned = payload('PUT',location,body);
  const gapBeforeFirst=await send('PUT',location,makeBody({candidate,document:{...document,revision:5}}),500);assert.equal(gapBeforeFirst.status,409);
  const first=await preparedSend('PUT',location,firstSigned);assert.equal(first.status,201);
  const read=await send('POST',location,makeBody({}));assert.equal(read.status,200);assert.deepEqual(read.body.document,document);
  const duplicate=await preparedSend('PUT',location,firstSigned);assert.equal(duplicate.status,409);
  const retry=await send('PUT',location,body,1000);assert.equal(retry.status,200);
  const changed=await send('PUT',location,makeBody({candidate,document:{...document,revision:1,updatedAt:'different'}}),2000);assert.equal(changed.status,409);
  const denied=await send('POST','/v1/advanced/projects/other/revisions/candidateA',makeBody({}));assert.equal(denied.status,403);
  const altered=await send('PUT',location,makeBody({candidate:{...candidate,components:[{...parcel,points:[[0,0],[51,0],[50,50]]}]},document}),3000);assert.equal(altered.status,422);
  const alteredLock=await send('PUT',location,makeBody({candidate:{...candidate,components:[parcel,{...setback,offsetFt:11}]},document:{...document,revision:3}}),3001);assert.equal(alteredLock.status,422);
  await new Promise(ok=>server.close(ok));server=await launch();
  // Replayed signed payload survives broker restart due to PostgreSQL claim.
  const afterRestart=await preparedSend('PUT',location,firstSigned);assert.equal(afterRestart.status,409);
  const afterRestartRead=await send('POST',location,makeBody({}));assert.equal(afterRestartRead.status,200);
  const freshRevision={...document,revision:2};
  const concurrently=await Promise.all([send('PUT',location,makeBody({candidate,document:freshRevision}),4000),send('PUT',location,makeBody({candidate,document:freshRevision}),4000)]);
  assert.deepEqual(concurrently.map(v=>v.status).sort(),[201,409]);
  const skip=await send('PUT',location,makeBody({candidate,document:{...document,revision:4}}),5000);assert.equal(skip.status,409);
  const third=await send('PUT',location,makeBody({candidate,document:{...document,revision:3}}),6000);assert.equal(third.status,201);
  const stale=await send('PUT',location,makeBody({candidate,document:{...document,revision:1}}),7000);assert.equal(stale.status,409);
  const latest=await send('POST',location,makeBody({}));assert.equal(latest.status,200);assert.equal(latest.body.document.revision,3);
  console.log('HTTP + real disposable PostgreSQL: save/read/conflict/canonical-source/restart/cross-project/concurrency PASS');
} finally {
  if (server?.listening) await new Promise(ok=>server.close(ok));
  await sql.end();
}
