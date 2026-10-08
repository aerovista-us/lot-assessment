import assert from 'node:assert/strict';
import {auditRoofSurfaceMesh} from '../packages/roof-geometry/mesh-audit.ts';
import {pondyCandidateRegistry} from '../projects/pondy-lot2/candidate-registry.ts';
import {solveGableZone} from '../packages/roof-geometry/index.ts';
import {previewCrossGableExtension} from '../packages/roof-geometry/crossgable-extension.ts';
const fixture=[{id:'plane',polygon:[[0,0,10],[10,0,10],[10,10,10],[0,10,10]]}];
assert.equal(auditRoofSurfaceMesh(fixture).ok,true);
assert.equal(auditRoofSurfaceMesh([]).ok,false);
assert.equal(auditRoofSurfaceMesh([{id:'bad',polygon:[[0,0,0],[0,0,0],[1,1,1]]}]).ok,false);
const c=pondyCandidateRegistry.candidates.find(x=>x.id==='pondy-d4');
const owner=c.components.find(x=>x.id==='home-b');const roof=c.components.find(x=>x.id==='roof-home-b');
const zones=roof.zones.map(z=>{const s=solveGableZone(owner,{...z,status:'LOCKED'});assert.equal(s.authoritative,true);return {zoneId:s.zoneId,footprint:s.footprint,ridgeA:s.ridgeA,ridgeB:s.ridgeB,ridgeZFt:s.ridgeZFt,pitchRatio:s.pitchRatio};});
for(const offset of [0,.5,1]){
 const preview=previewCrossGableExtension(zones,offset,offset);
 assert.equal(preview.status,'CANDIDATE');
 const audit=auditRoofSurfaceMesh(preview.faces);
 console.log('Home B mesh audit',offset,JSON.stringify(audit));
}
