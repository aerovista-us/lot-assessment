export type HandoffFailureStage='exchange'|'describe'|'authorize';
export type HandoffFailure={status:number;code:string;error:string;upstreamStatus:number|null;upstreamCode:string|null};

/** Classify trusted server-side adapter failures without exposing handoff codes,
 * session tokens, gateway credentials, raw response bodies or identity details.
 */
export function classifyHandoffFailure(cause:unknown,stage:HandoffFailureStage):HandoffFailure{
 const e=(cause&&typeof cause==='object'?cause:{}) as {status?:unknown;code?:unknown};
 const status=typeof e.status==='number'&&Number.isInteger(e.status)?e.status:null;
 const code=typeof e.code==='string'&&/^[a-z0-9_]{1,80}$/i.test(e.code)?e.code:null;
 const common={upstreamStatus:status,upstreamCode:code};
 if(stage==='exchange'){
  if(code==='code_not_found'||code==='code_already_consumed'||code==='code_expired')
   return {...common,status:401,code:'handoff_code_unusable',error:'This sign-in handoff is invalid, expired or already used. Start a fresh AeroVista sign-in.'};
  if(code==='client_access_denied'||code==='identity_inactive')
   return {...common,status:403,code:'founder_access_denied',error:'The account was denied access to the LotScope founder-only Workbench. Sign in with an authorized founder account.'};
  if(code==='profile_setup_required')
   return {...common,status:409,code:'account_setup_required',error:'Complete your AeroVista Account profile before returning to LotScope.'};
  if(status===401||status===403)
   return {...common,status:502,code:'identity_broker_rejected',error:'AeroVista Identity Gateway rejected the LotScope server handoff. An administrator needs to check the broker service configuration.'};
 }
 if(status===429)return {...common,status:503,code:'identity_retry_later',error:'AeroVista sign-in is temporarily rate limited. Try again later.'};
 return {...common,status:502,code:'identity_handoff_unavailable',error:'LotScope could not complete AeroVista sign-in. Retry once, then contact an administrator if the problem continues.'};
}
