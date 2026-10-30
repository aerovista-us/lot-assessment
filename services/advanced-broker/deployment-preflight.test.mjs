import assert from 'node:assert/strict';
import test from 'node:test';
import { checkGatewayDeployment as check } from './deployment-preflight.mjs';
const secret = 'test-only-not-for-production-secret-with-adequate-length';
const composeText = 'services:\n  identity-gateway:\n    environment:\n      IDGW_SERVICE_SECRET_LOTSCOPE_ADVANCED: "${IDGW_SERVICE_SECRET_LOTSCOPE_ADVANCED:-}"';
const secretEnvText = `IDGW_SERVICE_SECRET_LOTSCOPE_ADVANCED=${secret}\nIDGW_BROKER_SERVICE_ADDITIONS=lotscope_workbench,lotscope_advanced`;
test('registered, explicitly mapped secret and live runtime checks required',()=>{
  assert.equal(check({composeText,secretEnvText,runningRegistered:true,runningSecretPresent:true}).ready,true);
});
test('all incomplete registration cases fail closed without echoing secrets',()=>{
  for(const data of [
    {composeText:'services:\n  identity-gateway:',secretEnvText},
    {composeText,secretEnvText:'IDGW_BROKER_SERVICE_ADDITIONS=lotscope_advanced'},
    {composeText,secretEnvText:`IDGW_SERVICE_SECRET_LOTSCOPE_ADVANCED=${secret}`},
    {composeText,secretEnvText,runningRegistered:false,runningSecretPresent:false},
  ]) {
    const result=check(data);
    assert.equal(result.ready,false);
    assert.equal(JSON.stringify(result).includes(secret),false);
  }
});
