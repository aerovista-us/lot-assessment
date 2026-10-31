import assert from 'node:assert/strict';
import {pondyCandidateRegistry} from '../projects/pondy-lot2/candidate-registry.ts';
import {createCandidateConceptHtml,REPORT_FEATURE_IDS} from '../packages/candidates/customer-report.ts';
import {emptyDesignDocument,addOwnerFootprintShape} from '../packages/candidates/design-document.ts';
import {readFileSync} from 'node:fs';

const candidate=structuredClone(pondyCandidateRegistry.candidates[0]);
const owner=candidate.components.find(part=>part.kind==='home');
const document=addOwnerFootprintShape(candidate,emptyDesignDocument(candidate),{
  ownerId:owner.id,label:'Source-bound floor',kind:'FLOOR_PLATE',story:'GROUND'
});
const local=await createCandidateConceptHtml(candidate,document);
const account=await createCandidateConceptHtml(candidate,document,'ACCOUNT_SAVED');
assert.equal(REPORT_FEATURE_IDS.length,22);
for(const [report,origin] of [[local,'BROWSER_LOCAL'],[account,'ACCOUNT_SAVED']]){
  assert.equal(report.features.length,22);
  assert.equal(new Set(report.features.map(feature=>feature.id)).size,22);
  assert.equal((report.html.match(/data-report-feature="/g)||[]).length,22);
  assert(report.features.every(feature=>feature.status&&feature.explanation));
  assert(report.html.includes('data-report-origin="'+origin+'"'));
  assert(report.html.includes('data-report-provenance="'+origin+'"'));
  assert(report.html.includes('data-design-sha256="'+report.designSha+'"'));
  assert(report.html.includes('data-report-design-document'));
  assert(report.html.includes('NOT FOR CONSTRUCTION'));
}
assert(local.html.includes('Generated from a browser-local design'));
assert(!local.html.includes('account’s server-stored'));
assert(account.html.includes('account’s server-stored, authorized design revision'));
assert(!account.html.includes('The report request did not upload a design'));
assert.equal(local.sha,account.sha);
assert.equal(local.designSha,account.designSha);
await assert.rejects(()=>createCandidateConceptHtml(candidate,undefined,'ACCOUNT_SAVED'),/requires an authoritative design document/);
const route=readFileSync(new URL('../app/api/advanced/projects/[projectId]/report/route.ts',import.meta.url),'utf8');
assert.equal((route.match(/createCandidateConceptHtml\(saved\.candidate, saved\.document, 'ACCOUNT_SAVED'\)/g)||[]).length,2);
console.log('REPORT_PROVENANCE_AND_ALL_22_CATEGORIES_ACCOUNTED_FOR_PASS');
