import assert from 'node:assert/strict';
import {projectedOverlapArea,auditProjectedRoofVisibility} from '../packages/roof-geometry/drawing-visibility.ts';
const square=[[0,0],[2,0],[2,2],[0,2]];
assert(Math.abs(projectedOverlapArea(square,[[1,1],[3,1],[3,3],[1,3]])-1)<1e-6);
assert.equal(projectedOverlapArea(square,[[2,0],[4,0],[4,2],[2,2]]),0);
assert.equal(auditProjectedRoofVisibility([{id:'A',points:square},{id:'B',points:[[1,1],[3,1],[3,3],[1,3]]}]).status,'OCCLUSION_UNRESOLVED');
assert.equal(auditProjectedRoofVisibility([{id:'A',points:square}]).status,'NO_FACE_OVERLAP_DETECTED');
console.log('PASS conservative projected roof occlusion detection');
