import assert from 'node:assert/strict';
import {pondyCandidateRegistry as registry} from '../projects/pondy-lot2/candidate-registry.ts';
import {createCandidateConceptHtml,REPORT_FEATURE_IDS} from '../packages/candidates/customer-report.ts';

assert.equal(REPORT_FEATURE_IDS.length,22);
assert.equal(new Set(REPORT_FEATURE_IDS).size,22);
const locked=registry.candidates.find(c=>c.id==='pondy-d4');
assert(locked,'Locked D4 is required as positive roof authority fixture');
const report=await createCandidateConceptHtml(locked);
assert.equal(report.features.length,22);
assert.equal(report.roofState,'MODEL_VERIFIED','only locked canonical roof fixtures can emit source ridges');
assert(report.html.includes('data-report-feature="roof" data-feature-state="MODEL_VERIFIED"'));
assert(report.html.includes('Verified source roof plan segments'));
assert.equal((report.html.match(/data-report-feature="/g)||[]).length,22);
assert(report.html.includes('CONCEPT ONLY — NOT FOR CONSTRUCTION'));
assert(report.html.includes('data-component="parcel"'));
assert(report.html.includes('data-component="home-b"'));
assert(report.html.includes('points="0,0 148,0 148,50 125.14,43.02 84.81,43.02 0,57.01"'),'Parcel +Y must remain down, jog retained');
assert(report.html.includes('SHA-256 '+report.sha));

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
assert(concept.html.includes('data-report-feature="elevations" data-feature-state="WITHHELD"'));
assert(!concept.html.includes('<script>alert'));
assert(concept.html.includes('&lt;script&gt;'));
assert.equal((concept.html.match(/data-report-feature="/g)||[]).length,22);
assert.notEqual(concept.sha,report.sha,'source hash must change for edits');
const stale=structuredClone(locked);
const home=stale.components.find(c=>c.kind==='home'&&c.id==='home-b');
home.x+=2; home.polygon=home.polygon?.map(p=>[p[0]+2,p[1]]);
const roofStale=await createCandidateConceptHtml(stale);
assert.equal(roofStale.roofState,'REVIEW_REQUIRED','moved roof owners never inherit source roof authority');
assert(!roofStale.html.includes('Verified source roof plan segments'));

const nonfinite=structuredClone(draft);nonfinite.components.find(x=>x.kind==='parcel').polygon[0][0]=Infinity;
await assert.rejects(()=>createCandidateConceptHtml(nonfinite),/Invalid/);

console.log('PASS: saved candidate concept report, 22 categories, source parcel orientation, locked vs absent/stale roof withholding, XSS escape and component provenance');
