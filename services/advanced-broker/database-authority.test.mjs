import assert from 'node:assert/strict';
import test from 'node:test';
import { verifyAdvancedDatabaseAuthority as verify } from './database-authority.mjs';
const grants={read_projects:true,insert_projects:false,update_projects:false,delete_projects:false,read_revisions:true,insert_revisions:true,update_revisions:false,delete_revisions:false,read_replay:true,insert_replay:true,delete_replay:true};
const identity={role_name:'lotscope_advanced_broker',is_superuser:false,bypass_rls:false};
const driver=(i=identity,g=grants)=>{let count=0;return async()=>++count===1?[i]:[g];};
test('dedicated restricted role accepted',async()=>assert.equal(await verify(driver()),true));
test('superuser, bypass role, other account rejected',async()=>{
 for(const change of [{is_superuser:true},{bypass_rls:true},{role_name:'postgres'}])
  await assert.rejects(()=>verify(driver({...identity,...change})));
});
test('missing grants and write authority over canonical or immutable revisions rejected',async()=>{
 for(const change of [{read_projects:false},{insert_projects:true},{update_projects:true},{delete_projects:true},{insert_revisions:false},{update_revisions:true},{delete_revisions:true},{insert_replay:false}])
  await assert.rejects(()=>verify(driver(identity,{...grants,...change})));
});
