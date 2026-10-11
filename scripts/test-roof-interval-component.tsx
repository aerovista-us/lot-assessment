import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import RoofLinework from '../app/workbench/roof-drawings/roof-linework';
import type {EdgeInterval} from '../packages/roof-geometry/drawing-verified-intervals';

const build=(faceId:string,visibility:EdgeInterval['visibility'],i:number):EdgeInterval=>({
 faceId,edgeIndex:i,t0:0,t1:1,
 start:[i%2?0:1,i],end:[i%2?9:10,i+2],visibility
});
const segments=[
 build('front','VISIBLE',0),build('behind','HIDDEN',1),
 build('valley','UNRESOLVED',2),build('same-plane','INTERNAL_SEAM',3),
 build('same-edge','DUPLICATE_SHARED',4)
];
const panel=renderToStaticMarkup(
 <RoofLinework title="Home B · north interval acceptance"
  segments={segments} status="REVIEW_REQUIRED"/>
);
assert.match(panel,/CONCEPT ONLY/);
assert.match(panel,/NOT FOR CONSTRUCTION/);
assert.match(panel,/Review required/);
for(const tag of ['VISIBLE','HIDDEN','UNRESOLVED'])assert.match(panel,new RegExp('data-visibility="'+tag+'"'));
for(const tag of ['INTERNAL_SEAM','DUPLICATE_SHARED'])assert.doesNotMatch(panel,new RegExp('data-visibility="'+tag+'"'));
assert.match(panel,/Suppressed proven seams 1/);
assert.match(panel,/Deduplicated shared edges 1/);
const withheld=renderToStaticMarkup(<RoofLinework title="Stale roof" segments={segments} status="WITHHELD"/>);
assert.match(withheld,/Linework withheld/);
assert.doesNotMatch(withheld,/<svg/);
if(process.env.ROOF_INTERVAL_FIXTURE){
 writeFileSync(process.env.ROOF_INTERVAL_FIXTURE,
  '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Concept roof interval fixture</title></head><body style="margin:0;background:#e9eef0;font:14px sans-serif;padding:24px"><main style="width:100%;max-width:760px;margin:auto"><h1>ROOF INTERVAL REVIEW · CONCEPT ONLY</h1>'+panel+'</main></body></html>');
}
console.log('PASS interval linework fixture: visible/hidden/unresolved strokes, hidden seam dedupe, withheld auth, concept disclosure');
