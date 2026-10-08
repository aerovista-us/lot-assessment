import assert from 'node:assert/strict';
import {pondyCandidateRegistry} from '../projects/pondy-lot2/candidate-registry.ts';
import {validateCandidateRoofs} from '../packages/roof-geometry/index.ts';
import {roofDrawingHandoff} from '../packages/roof-geometry/drawing-contract.ts';
import {projectAuthorizedRoof} from '../packages/roof-geometry/drawing-projection.ts';
const d4=pondyCandidateRegistry.candidates.find(c=>c.id==='pondy-d4');
for(const roof of validateCandidateRoofs(d4.components).results){
 const handoff=roofDrawingHandoff(roof);
 for(const view of ['PLAN','NORTH','SOUTH','EAST','WEST']){
  const projection=projectAuthorizedRoof(handoff,view);assert.equal(projection.status,'DRAWABLE');
  assert.equal(projection.faces.length,roof.surfaceFaces.length);
  for(let i=0;i<projection.faces.length;i++){
   const original=roof.surfaceFaces[i].polygon,points=projection.faces[i].points;
   assert(points.every((p,j)=>view==='PLAN'?p[0]===original[j][0]&&p[1]===original[j][1]:p[1]===original[j][2]));
  }
 }
 assert.equal(projectAuthorizedRoof(roofDrawingHandoff({...roof,ownerGeometryCurrent:false}),'PLAN').status,'WITHHELD');
}
console.log('PASS five exact roof projections for all four locked design 4 roofs');
