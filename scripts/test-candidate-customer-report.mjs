import assert from 'node:assert/strict';
import {pondyCandidateRegistry as registry} from '../projects/pondy-lot2/candidate-registry.ts';
import {createCandidateConceptHtml,REPORT_FEATURE_IDS} from '../packages/candidates/customer-report.ts';
import {getReportFootprints,drawShellElevation,drawSchematicAxon,drawBuildingShellPlan,drawAccessPlan} from '../packages/candidates/customer-report-views.ts';

function verifySiteCoordinates(candidate,html){
 const rendered=new Map([...html.matchAll(/<(?:polygon|polyline)\b[^>]*data-component="([^"]+)"[^>]*points="([^"]+)"/g)].map(match=>[match[1],match[2].split(/\s+/).map(pair=>pair.split(',').map(Number))]));
 const footprints=new Map(getReportFootprints(candidate).map(foot=>[foot.id,foot.points]));
 for(const component of candidate.components){
  const source=['parcel','envelope','pavement'].includes(component.kind)?component.polygon:
   ['home','garage'].includes(component.kind)?footprints.get(component.id):
   ['driveway','route'].includes(component.kind)?component.points:null;
  if(!source)continue;
  const points=rendered.get(component.id);
  assert(points,`Missing source site geometry ${component.id}`);
  assert.equal(points.length,source.length,`Changed vertex count for ${component.id}`);
  source.forEach((point,index)=>point.forEach((value,axis)=>assert(Math.abs(value-points[index][axis])<=.001,`${candidate.id}/${component.id}: rendered site coordinate exceeds 0.001 ft tolerance`)));
 }
}

assert.equal(REPORT_FEATURE_IDS.length,22);
assert.equal(new Set(REPORT_FEATURE_IDS).size,22);
const locked=registry.candidates.find(c=>c.id==='pondy-d4');
assert(locked);
const report=await createCandidateConceptHtml(locked);
assert.equal(report.features.length,22);
assert.equal(report.roofState,'MODEL_VERIFIED','only locked current roof fixture can emit source ridges');
assert(report.html.includes('data-report-feature="roof" data-feature-state="MODEL_VERIFIED"'));
assert(report.html.includes('Verified source roof plan segments'));
assert.equal((report.html.match(/data-report-feature="/g)||[]).length,22);
assert(report.html.includes('CONCEPT ONLY — NOT FOR CONSTRUCTION'));
assert(report.html.includes('data-component="parcel"'));
assert(report.html.includes('data-component="home-b"'));
verifySiteCoordinates(locked,report.html);
assert(report.html.includes('SHA-256 '+report.sha));
for(const [id,state] of [['axon','ILLUSTRATIVE'],['elevations','ILLUSTRATIVE'],['sections','WITHHELD']]){
 assert(report.html.includes('data-report-feature="'+id+'" data-feature-state="'+state+'"'));
}
for(const d of ['north','south','east','west']){
 assert(report.html.includes('data-drawing="elevation-'+d+'"'),'four distinct source horizontal-span projections');
 assert(report.html.includes('data-model-view="'+d+'"'),'projection owner binding');
}
assert.equal((report.html.match(/data-drawing="elevation-/g)||[]).length,4);
assert(report.html.includes('data-drawing="axon-schematic"'));
assert(report.html.includes('data-drawing="shell-plan"'));
assert(report.html.includes('data-drawing="access-plan"'));
assert(report.html.includes('data-height-authority="ILLUSTRATIVE_ONLY"'));
assert(report.html.includes('Dashed tops are NOT roofs'));
assert(report.html.includes('Print / Save PDF'));
assert(report.html.includes('Model-direction projection studies'));

for(const alternate of registry.candidates){
 const r=await createCandidateConceptHtml(alternate);
 verifySiteCoordinates(alternate,r.html);
 assert.equal((r.html.match(/data-report-feature="/g)||[]).length,22,alternate.id);
 const footprintIds=getReportFootprints(alternate).map(x=>x.id);
 for(const id of footprintIds){
  assert(r.html.includes('data-source-footprint="'+id+'"'),alternate.id+': missing source footprint '+id);
 }
 assert.equal((r.html.match(/data-drawing="elevation-/g)||[]).length,4);
 for(const d of ['north','south','east','west']){
  const a=drawShellElevation(alternate,d);
  assert(a.includes('data-model-view="'+d+'"'));
  assert(a.includes('NOT')===false||a.includes('graphic'), 'test should not require invented roofs');
 }
 assert.equal(drawSchematicAxon(alternate).includes('data-height-authority="ILLUSTRATIVE_ONLY"'),true);
 assert(drawBuildingShellPlan(alternate).includes('data-source-footprint'));
 assert(drawAccessPlan(alternate).includes('data-drawing="access-plan"'));
}
const tight=structuredClone(locked);
const current=tight.evaluationHistory.find(x=>x.id===tight.currentEvaluationId);
assert(current?.gates.length,'The active evaluation needs at least one gate');
current.gates[0].status='PASS_TIGHT';
current.gates[0].summary='Tight source-model clearance requires review before customer decisions.';
const tightHtml=(await createCandidateConceptHtml(tight)).html;
assert(tightHtml.includes('data-report-risk="active"'));
assert(tightHtml.includes('PASS_TIGHT'));
assert(tightHtml.includes('Tight source-model clearance requires review'));

const draft=structuredClone(locked);
draft.id='draft-local-with-no-roofs';
draft.label='<script>alert("untrusted")</script>';
draft.revisionLabel='Draft 1';
draft.components=draft.components.filter(x=>x.kind!=='roof');
draft.status='DRAFT';draft.evidenceState='STALE';draft.currentEvaluationId=null;
const concept=await createCandidateConceptHtml(draft);
assert.equal(concept.roofState,'WITHHELD');
assert(!concept.html.includes('Verified source roof plan segments'));
assert(concept.html.includes('data-report-feature="roof" data-feature-state="WITHHELD"'));
assert(concept.html.includes('data-report-feature="elevations" data-feature-state="ILLUSTRATIVE"'));
assert(concept.html.includes('data-report-feature="axon" data-feature-state="ILLUSTRATIVE"'));
assert(concept.html.includes('data-drawing="axon-schematic"'));
assert(concept.html.includes('data-drawing="elevation-north"'));
assert(!concept.html.includes('<script>alert'));
assert(concept.html.includes('&lt;script&gt;'));
assert.equal((concept.html.match(/data-report-feature="/g)||[]).length,22);
assert.notEqual(concept.sha,report.sha);
const stale=structuredClone(locked);
const home=stale.components.find(c=>c.kind==='home'&&c.id==='home-b');
home.x+=2;home.polygon=home.polygon?.map(p=>[p[0]+2,p[1]]);
const invalidRoof=await createCandidateConceptHtml(stale);
assert.equal(invalidRoof.roofState,'REVIEW_REQUIRED','rotated/moved roof owner never inherits source roof authority');
assert(!invalidRoof.html.includes('Verified source roof plan segments'));
const flipped=structuredClone(draft);
flipped.components.find(x=>x.kind==='parcel').polygon[0][0]=Infinity;
await assert.rejects(()=>createCandidateConceptHtml(flipped),/Invalid/);
const badPlacement=structuredClone(draft);
badPlacement.components.find(x=>x.kind==='home').rotationDeg=Infinity;
await assert.rejects(()=>createCandidateConceptHtml(badPlacement),/Invalid placement|Invalid source point/);
console.log('PASS: two layout families, all 22 features, four source-projection views, schematic axon and shell, site coordinates within 0.001 ft with correct parcel handedness, false roofs never render, label escaping and source hash');
