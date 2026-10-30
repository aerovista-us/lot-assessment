import assert from 'node:assert/strict';
import test from 'node:test';
import { configureAdvancedIdentityAuthorizer } from './identity-adapter.server.mjs';
import { requireServiceAuth, requireServiceIn } from '../../../../../../srv/ACOS/aerovista-command-center/services/identity-gateway/src/serviceAuth.js';

const secret='isolated-advanced-identity-test-secret-over-32-chars';
const envKey='IDGW_SERVICE_SECRET_LOTSCOPE_ADVANCED';
const additionKey='IDGW_BROKER_SERVICE_ADDITIONS';
const oldSecret=process.env[envKey], oldAdditions=process.env[additionKey];
const state={session:true,paid:true,project:true};
const calls=[];
function middleware(req, fn) {
  let result;
  fn(req, {status(status){result={status};return {json(body){result.body=body;return result;}};}}, ()=>{result={status:200};});
  return result;
}
async function fetchGateway(url,options) {
  const parsed=new URL(url);
  const rawBody=options.body||'';
  const headers=Object.fromEntries(new Headers(options.headers).entries());
  const req={method:options.method,originalUrl:parsed.pathname,headers,rawBody};
  let check=middleware(req,requireServiceAuth);
  if(check.status===200)check=middleware(req,requireServiceIn(['aerovista_site','lotscope_workbench']));
  if(check.status!==200)return new Response(JSON.stringify(check.body),{status:check.status,headers:{'content-type':'application/json'}});
  const body=JSON.parse(rawBody);
  calls.push({path:parsed.pathname,body});
  let result;
  if(parsed.pathname==='/v1/session/resolve')result={ok:true,authenticated:state.session,identityId:state.session?'real-adapter-test-principal':null};
  else if(parsed.pathname==='/v1/authorization/check')result={ok:true,allowed:body.capability==='lotscope.advanced.access'?state.paid:state.project&&body.resourceType==='lotscope_project'&&body.resourceId==='own-project'};
  else return new Response(JSON.stringify({error:'not_found'}),{status:404});
  return new Response(JSON.stringify(result),{status:200,headers:{'content-type':'application/json'}});
}
function reset(){state.session=true;state.paid=true;state.project=true;calls.length=0;}
try {
  process.env[envKey]=secret;
  process.env[additionKey]=[oldAdditions,'lotscope_advanced'].filter(Boolean).join(',');
  const authorize=configureAdvancedIdentityAuthorizer({gatewaySecret:secret,gatewayOrigin:'https://identity.test.invalid',fetchImpl:fetchGateway});
  const request={sessionToken:'isolated-identity-session-token-123456789',projectId:'own-project',capability:'lotscope.project.read'};
  await test('real App Adapter signs requests that real Identity Gateway middleware accepts',async()=>{
    reset();assert.equal(await authorize(request),'real-adapter-test-principal');
    assert.deepEqual(calls.map(c=>c.path),['/v1/session/resolve','/v1/authorization/check','/v1/authorization/check']);
    assert.equal(calls[2].body.resourceId,'own-project');
  });
  await test('live session, payment, project edit and other-project denial stay fail-closed',async()=>{
    reset();state.session=false;assert.equal(await authorize(request),null);assert.equal(calls.length,1);
    reset();state.paid=false;assert.equal(await authorize(request),null);assert.equal(calls.length,2);
    reset();state.project=false;assert.equal(await authorize({...request,capability:'lotscope.project.edit'}),null);
    reset();assert.equal(await authorize({...request,projectId:'other-project'}),null);
  });
  await test('service is rejected without explicit relying-party registration',async()=>{
    reset();delete process.env[additionKey];await assert.rejects(()=>authorize(request));
  });
  await test('wrong HMAC secret fails closed',async()=>{
    reset();process.env[additionKey]='lotscope_advanced';
    const wrong=configureAdvancedIdentityAuthorizer({gatewaySecret:'different-secret-with-at-least-thirty-two-characters',gatewayOrigin:'https://identity.test.invalid',fetchImpl:fetchGateway});
    await assert.rejects(()=>wrong(request));
  });
} finally {
  if(oldSecret===undefined)delete process.env[envKey];else process.env[envKey]=oldSecret;
  if(oldAdditions===undefined)delete process.env[additionKey];else process.env[additionKey]=oldAdditions;
}
