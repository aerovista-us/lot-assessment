import assert from 'node:assert/strict';
import {depthExchangeParameter} from '../packages/roof-geometry/drawing-depth-transitions.ts';
const rising=[[0,0,-2],[4,0,2],[4,3,2],[0,3,-2]];
assert(Math.abs(depthExchangeParameter([0,1,0],[4,1,0],rising)-0.5)<1e-6);
assert.equal(depthExchangeParameter([0,1,4],[4,1,4],rising),null);
assert.equal(depthExchangeParameter([0,1,0],[4,1,0],[[0,0,2],[4,0,2],[4,3,2],[0,3,2]]),null);
console.log('PASS analytic roof depth exchange root: crossing, parallel and no crossing');
// Rigid in-plane rotation preserves the transition fraction.
for(const angle of [Math.PI/6,Math.PI/2,Math.PI*0.73]){
 const rotate=p=>[p[0]*Math.cos(angle)-p[1]*Math.sin(angle),p[0]*Math.sin(angle)+p[1]*Math.cos(angle),p[2]];
 const t=depthExchangeParameter(rotate([0,1,0]),rotate([4,1,0]),rising.map(rotate));
 assert(t!==null&&Math.abs(t-0.5)<1e-6,`rotation ${angle}`);
}
// Near-parallel planes: a tiny real crossover must remain finite and interior.
const shallow=[[0,0,-0.0002],[4,0,0.0002],[4,3,0.0002],[0,3,-0.0002]];
assert(Math.abs(depthExchangeParameter([0,1,0],[4,1,0],shallow)-0.5)<1e-6);
console.log('PASS rotated and near-parallel analytic depth exchanges');
