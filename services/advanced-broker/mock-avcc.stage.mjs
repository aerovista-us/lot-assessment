import { createServer } from 'node:http';
import { createHmac, timingSafeEqual } from 'node:crypto';
const key=process.env.STAGE_INTERNAL_SECRET;
if (!key || key.length < 32) throw Error('isolated_stage_secret_required');
createServer(async(req,res)=>{
 const parts=[];for await(const chunk of req)parts.push(chunk);
 const raw=Buffer.concat(parts).toString('utf8');
 const sig=req.headers['x-av-signature'];
 const expected=createHmac('sha256',key).update(`${req.method}\n${req.url}\n${req.headers['x-av-timestamp']}\n${raw}`).digest('hex');
 if(req.headers['x-av-service']!=='IDENTITY_GATEWAY'||!sig||!/^[a-f0-9]{64}$/.test(sig)||!timingSafeEqual(Buffer.from(sig,'hex'),Buffer.from(expected,'hex'))){res.writeHead(401);res.end('{}');return;}
 let reqbody;try{reqbody=JSON.parse(raw)}catch{res.writeHead(400);res.end('{}');return;}
 let response;
 if(req.url==='/api/internal/identity/session/resolve'){
  response={authenticated:reqbody.session_token!=='staging-revoked-customer-session-000' && /^staging-[a-z-]+-session-/.test(reqbody.session_token||''),identity_id:'isolated-staging-identity'};
 } else if(req.url==='/api/internal/identity/capability/check'){
  response={allowed:reqbody.capability==='lotscope.advanced.access'? reqbody.identity_id==='isolated-staging-identity' : reqbody.resource_type==='lotscope_project' && reqbody.resource_id==='owned-project'};
 } else {res.writeHead(404);res.end('{}');return;}
 res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify(response));
}).listen(19091,'0.0.0.0');
