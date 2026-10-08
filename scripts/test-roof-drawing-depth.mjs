import assert from 'node:assert/strict';
import {samplePlanRoofDepth} from '../packages/roof-geometry/drawing-depth.ts';
const poly=z=>[[0,0,z],[2,0,z],[2,2,z],[0,2,z]];
const roof={status:'AUTHORITATIVE',faces:[{id:'top',polygon:poly(12)},{id:'bottom',polygon:poly(10)}]};
const result=samplePlanRoofDepth(roof);
assert.equal(result.status,'SAMPLED_ONLY');assert.equal(result.pairs[0].front,'top');
assert.equal(samplePlanRoofDepth({...roof,status:'WITHHELD',reason:'stale'}).status,'WITHHELD');
assert.equal(samplePlanRoofDepth({...roof,faces:[{id:'a',polygon:poly(12)},{id:'b',polygon:poly(12)}]}).status,'UNRESOLVED');
console.log('PASS plan roof depth sampling explicitly non-authoritative');
