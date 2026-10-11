import assert from 'node:assert/strict';
import { classifyHandoffFailure } from '../lib/aerovista/handoff-failure.ts';
import { normalizeGatewayResponse } from '../lib/aerovista/gateway-response.ts';

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

const gatewayHtml=new Response('<html>blocked</html>',{status:403,headers:{'content-type':'text/html','server':'cloudflare','cf-ray':'diagnostic-only'}});
const normalized=normalizeGatewayResponse(gatewayHtml);
assert.equal(normalized.status,403);
const normalizedBody=await normalized.json();
assert.equal(normalizedBody.code,'gateway_cloudflare_nonjson_403');
assert(!JSON.stringify(normalizedBody).includes('blocked'));
assert.equal(classifyHandoffFailure({status:403,code:normalizedBody.code},'exchange').code,'identity_gateway_cloudflare_rejected');
assert.equal(classifyHandoffFailure({status:403,code:'gateway_nonjson_403'},'exchange').code,'identity_gateway_nonjson_rejected');
const jsonRejection=Response.json({error:'Unauthorized',code:'invalid_hmac'},{status:401});
assert.equal(normalizeGatewayResponse(jsonRejection),jsonRejection,'regular broker 401 JSON must stay untouched');
const jsonRoleDenied=Response.json({error:'Founder only',code:'client_access_denied'},{status:403});
assert.equal(normalizeGatewayResponse(jsonRoleDenied),jsonRoleDenied,'real role deny must stay intact');
const accepted=Response.json({ok:true},{status:200});
assert.equal(normalizeGatewayResponse(accepted),accepted,'successful broker responses must not change');

console.log('PASS: Workbench handoff broker vs founder 403, consumed/expired code, rate limit and no-secret reporting');
