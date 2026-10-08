import assert from 'node:assert/strict';
import {depthExchangeParameter} from '../packages/roof-geometry/drawing-depth-transitions.ts';
const rising=[[0,0,-2],[4,0,2],[4,3,2],[0,3,-2]];
assert(Math.abs(depthExchangeParameter([0,1,0],[4,1,0],rising)-0.5)<1e-6);
assert.equal(depthExchangeParameter([0,1,4],[4,1,4],rising),null);
assert.equal(depthExchangeParameter([0,1,0],[4,1,0],[[0,0,2],[4,0,2],[4,3,2],[0,3,2]]),null);
console.log('PASS analytic roof depth exchange root: crossing, parallel and no crossing');
