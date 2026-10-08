import assert from 'node:assert/strict';
import {sampleElevationEdgeDepth} from '../packages/roof-geometry/drawing-elevation-depth.ts';
const face=(id,y)=>({id,polygon:[[0,y,0],[2,y,0],[2,y,2],[0,y,2]]});
const roof={status:'AUTHORITATIVE',faces:[face('near',3),face('far',1)]};
const north=sampleElevationEdgeDepth(roof,'NORTH');assert.equal(north.status,'SAMPLED_ONLY');
assert(north.segments.some(x=>x.faceId==='far'&&x.visibility==='BACK_SAMPLE'));
assert.equal(sampleElevationEdgeDepth({...roof,status:'WITHHELD',reason:'stale'},'NORTH').status,'WITHHELD');
assert.equal(sampleElevationEdgeDepth(roof,'INVALID').status,'WITHHELD');
console.log('PASS cardinal elevation depth classification, invalid view and withheld authority');
