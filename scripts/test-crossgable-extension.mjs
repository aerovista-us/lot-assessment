import assert from 'node:assert/strict';
import {pondyCandidateRegistry} from '../projects/pondy-lot2/candidate-registry.ts';
import {solveGableZone} from '../packages/roof-geometry/index.ts';
import {previewCrossGableExtension} from '../packages/roof-geometry/crossgable-extension.ts';
const c=pondyCandidateRegistry.candidates.find(c=>c.id==='pondy-d4');
const home=c.components.find(x=>x.id==='home-b'),roof=c.components.find(x=>x.id==='roof-home-b');
const zones=roof.zones.map(z=>{const s=solveGableZone(home,{...z,status:'LOCKED'});assert.equal(s.authoritative,true);return {zoneId:s.zoneId,footprint:s.footprint,ridgeA:s.ridgeA,ridgeB:s.ridgeB,ridgeZFt:s.ridgeZFt,pitchRatio:s.pitchRatio};});
for(const offset of [0,0.5,1]){const r=previewCrossGableExtension(zones,offset,offset);console.log('home-b preview',offset,r.status,r.errors,r.faces.length,r.junction?.kind);assert.equal(r.status,'CANDIDATE');assert(r.faces.length>=5);assert(r.junction.segments.every(s=>s.residualFt<=.02));}
assert.equal(previewCrossGableExtension(zones,NaN,1).status,'WITHHELD');
