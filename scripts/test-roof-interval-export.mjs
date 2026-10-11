import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {runInNewContext} from 'node:vm';

const script=execFileSync(process.execPath,
 ['--experimental-loader','./scripts/alias-loader.mjs','scripts/export-d4-roof-intervals.mjs'],
 {cwd:process.cwd(),encoding:'utf8',maxBuffer:4*1024*1024});
const context={};
runInNewContext(script,context);
const module=context.Lot2Design4RoofIntervals;
assert.equal(module.manifest.schemaVersion,'lotscope-verified-roof-intervals-v1');
assert.equal(module.manifest.owners.length,4);
for(const source of module.manifest.owners){
 const faces=JSON.parse(source.surfaceFacesKey).map(([id,polygon])=>({id,polygon}));
 const sample={ownerId:source.ownerId,ownerGeometryKey:source.ownerGeometryKey,surfaceFaces:faces};
 assert.equal(module.matchingOwner(sample,source),true,source.ownerId+' must bind');
 assert.equal(module.matchingOwner({...sample,surfaceFaces:null},source),false);
 assert.equal(module.matchingOwner({...sample,surfaceFaces:{}},source),false);
 assert.equal(module.matchingOwner({...sample,surfaceFaces:[null]},source),false);
 assert.equal(module.matchingOwner({...sample,surfaceFaces:[{},...faces.slice(1)]},source),false);
 assert.equal(module.matchingOwner({...sample,surfaceFaces:[{...faces[0],polygon:[[0,0,0],[1,0,0],[0,1,0]]},...faces.slice(1)]},source),false);
 assert.equal(module.matchingOwner({...sample,ownerGeometryKey:'stale'},source),false);
 for(const view of ['north','south','east','west','pondy-iso-01']){
  assert(['INTERVAL_VERIFIED','REVIEW_REQUIRED'].includes(source.views[view].status),source.ownerId+' '+view);
 }
}
assert(module.manifest.owners.every(o=>o.views['pondy-iso-01'].status==='INTERVAL_VERIFIED'));
assert(module.manifest.owners.find(o=>o.ownerId==='home-b').views.north.status==='REVIEW_REQUIRED');
console.log('PASS four canonical roof snapshot bindings, stale/malformed faces withheld, Home B cardinal review retained');
