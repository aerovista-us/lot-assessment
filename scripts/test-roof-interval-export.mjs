import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {runInNewContext} from 'node:vm';

const script=execFileSync(process.execPath,
 ['--experimental-loader','./scripts/alias-loader.mjs','scripts/export-d4-roof-intervals.mjs'],
 {cwd:process.cwd(),encoding:'utf8',maxBuffer:4*1024*1024});
const context={};
runInNewContext(script,context);
const module=context.Lot2Design4RoofIntervals;
assert.equal(module.manifest.schemaVersion,'lotscope-verified-roof-intervals-v2');
assert.equal(module.manifest.owners.length,4);
assert.equal(JSON.stringify(module.manifest.camera.cardinalDepthDirections),JSON.stringify({north:'NEGATIVE_Y',south:'POSITIVE_Y',east:'POSITIVE_X',west:'NEGATIVE_X'}));
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
for(const o of module.manifest.owners)for(const id of ['north','south','east','west']){
 const view=o.views[id];assert.equal(view.status,'INTERVAL_VERIFIED');assert.equal(view.counts.unresolved,0);
 assert.equal(view.projectionProof.method,'CARDINAL_RAY_DEPTH_V1');
 assert.equal(view.projectionProof.collapsedProjection.length,view.counts.collapsedEdges);
 assert.equal(view.suppressedSegments.length,view.counts.internalSeams+view.counts.duplicateShared);
 assert(view.segments.every(s=>Number.isFinite(s.t0)&&s.t0<s.t1));
}

console.log('PASS four canonical roof snapshot bindings, stale/malformed faces withheld, complete cardinal source-edge proof retained; model verification grants no drawing acceptance');
