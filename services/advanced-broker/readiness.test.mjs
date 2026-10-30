import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateAdvancedBrokerReadiness as check } from './readiness.mjs';
const configured={brokerSecret:'broker-staging-secret-must-be-unique-123456',identitySecret:'identity-staging-secret-must-be-unique-78901',databaseUrl:'postgres://lotscope_advanced_broker:test-only-password@acos-agent-postgres:5432/lotscope_advanced',gatewayOrigin:'http://identity-gateway:3110',gatewayRegistered:true,databaseRole:'lotscope_advanced_broker',projectProvisioned:true};
test('valid staging config passes only a configuration preflight',()=>{assert.equal(check(configured).ready,true)});
test('missing gateway registration or service secret blocks activation',()=>{
  for(const mutation of [{gatewayRegistered:false},{identitySecret:''},{identitySecret:configured.brokerSecret},{brokerSecret:''}])assert.equal(check({...configured,...mutation}).ready,false);
});
test('rejects public database and unsafe gateway origins',()=>{
  for(const mutation of [{databaseUrl:'postgres://user:pass@8.8.8.8:5432/db'},{databaseUrl:'postgres://user:pass@some-public-domain.com/db'},{gatewayOrigin:'http://example.com'},{gatewayOrigin:'http://127.0.0.1:3100'}])assert.equal(check({...configured,...mutation}).ready,false);
});
test('blocks shared elevated DB role and absent canonical locks',()=>{
  assert.equal(check({...configured,databaseRole:'postgres'}).ready,false);
  assert.equal(check({...configured,projectProvisioned:false}).ready,false);
});
