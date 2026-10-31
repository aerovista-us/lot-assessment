import assert from 'node:assert/strict';
import {pondyCandidateRegistry} from '../projects/pondy-lot2/candidate-registry.ts';
import {
  emptyDesignDocument,validateDesignDocument,canonicalDesignValue,
  sourceSignatureMatches,addOwnerFootprintShape
} from '../packages/candidates/design-document.ts';
import {createCandidateConceptHtml} from '../packages/candidates/customer-report.ts';

function jsonbLike(value) {
  if(Array.isArray(value))return value.map(jsonbLike);
  if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().reverse().map(k=>[k,jsonbLike(value[k])]));
  return value;
}
const candidate=structuredClone(pondyCandidateRegistry.candidates[0]);
let document=emptyDesignDocument(candidate,'2026-10-31T00:00:00.000Z');
const owner=candidate.components.find(component=>component.kind==='home');
document=addOwnerFootprintShape(candidate,document,{ownerId:owner.id,label:'Ground floor',kind:'FLOOR_PLATE',story:'GROUND'});
assert.equal(validateDesignDocument(candidate,document).valid,true);
const storedCandidate=jsonbLike(candidate);
const storedDocument=jsonbLike(document);
assert.notEqual(JSON.stringify(candidate),JSON.stringify(storedCandidate),'Fixture must change property order');
assert.equal(sourceSignatureMatches(storedCandidate,storedDocument.sourceSignature),true);
assert.equal(validateDesignDocument(storedCandidate,storedDocument).valid,true);
assert.equal(canonicalDesignValue(storedCandidate),canonicalDesignValue(candidate));
assert.equal(canonicalDesignValue(storedDocument),canonicalDesignValue(document));
const report=await createCandidateConceptHtml(storedCandidate,storedDocument);
const encoded=report.html.match(/<pre data-report-design-document="[^"]+">([\s\S]*?)<\/pre>/);
assert(encoded,'Report must embed its saved design source');
const unescape=string=>string.replaceAll('&quot;','"').replaceAll('&#39;',"'").replaceAll('&gt;','>').replaceAll('&lt;','<').replaceAll('&amp;','&');
assert.equal(canonicalDesignValue(JSON.parse(unescape(encoded[1]))),canonicalDesignValue(storedDocument));
const tampered={...storedCandidate,components:[...storedCandidate.components]};
tampered.components[0]={...tampered.components[0],id:'changed-source-component'};
assert.equal(sourceSignatureMatches(tampered,storedDocument.sourceSignature),false);
assert.throws(()=>validateDesignDocument(tampered,storedDocument),/stale/);
console.log('JSONB_REORDERED_SAVE_RELOAD_AND_MATCHING_REPORT_PASS');
