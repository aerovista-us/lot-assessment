import assert from 'node:assert/strict';
import { classifyHandoffFailure } from '../lib/aerovista/handoff-failure.ts';

const broker=classifyHandoffFailure({status:403,code:null,message:'Request failed (403)'},'exchange');
assert.equal(broker.status,502);
assert.equal(broker.code,'identity_broker_rejected');
assert(!JSON.stringify(broker).includes('Request failed'));
assert.match(broker.error,/administrator/);

const role=classifyHandoffFailure({status:403,code:'client_access_denied'},'exchange');
assert.equal(role.status,403);
assert.equal(role.code,'founder_access_denied');
assert.match(role.error,/founder/);

const inactive=classifyHandoffFailure({status:403,code:'identity_inactive'},'exchange');
assert.equal(inactive.code,'founder_access_denied');

for (const [status,code] of [[404,'code_not_found'],[409,'code_already_consumed'],[410,'code_expired']]){
 const result=classifyHandoffFailure({status,code},'exchange');
 assert.equal(result.status,401);
 assert.equal(result.code,'handoff_code_unusable');
}
assert.equal(classifyHandoffFailure({status:409,code:'profile_setup_required'},'exchange').code,'account_setup_required');
assert.equal(classifyHandoffFailure({status:401,code:'invalid_hmac'},'exchange').code,'identity_broker_rejected');
assert.equal(classifyHandoffFailure({status:429},'exchange').code,'identity_retry_later');
assert.equal(classifyHandoffFailure(new Error('secret-token-sensitive'), 'exchange').code,'identity_handoff_unavailable');
assert(!JSON.stringify(classifyHandoffFailure(new Error('secret-token-sensitive'), 'exchange')).includes('secret-token-sensitive'));
assert.equal(classifyHandoffFailure({status:403,code:'client_access_denied'},'authorize').status,502,'only exchange role rejection is user authorization evidence');
console.log('PASS: Workbench handoff broker vs founder 403, consumed/expired code, rate limit and no-secret reporting');
