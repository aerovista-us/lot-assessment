import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { pondyCandidateRegistry } from '../projects/pondy-lot2/candidate-registry.ts';
import { emptyDesignDocument, addOwnerFootprintShape, addDesignShape, prepareDraftRoomAlternatives, rankDraftRoomLayouts, packLCorridorSeed, assessAuthoredCirculation } from '../packages/candidates/design-document.ts';
import { emptyCandidateWorkspace, saveWorkspaceDesignDocument, currentWorkspaceDesignDocument } from '../packages/candidates/workspace.ts';
import { WORKSPACE_STORAGE_KEY, readBrowserWorkspace, persistBrowserWorkspace } from '../packages/candidates/browser-workspace.ts';
import { createCandidateConceptHtml } from '../packages/candidates/customer-report.ts';

function fixture(polygon) {
  const candidate = structuredClone(pondyCandidateRegistry.candidates[0]);
  candidate.id = 'journey-geometry-fixture';
  candidate.components = candidate.components.filter(c => c.kind !== 'roof');
  const home = candidate.components.find(c => c.kind === 'home');
  Object.assign(home, { polygon, x:20, y:5, widthFt:40, depthFt:30, rotationDeg:0 });
  const base = addOwnerFootprintShape(candidate, emptyDesignDocument(candidate), {
    ownerId: home.id, label:'Ground floor', kind:'FLOOR_PLATE', story:'GROUND'
  });
  return { candidate, home, base };
}

const decode = text => text.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
async function verifyRoundTrip(candidate, selected) {
  let raw = null;
  const storage = { getItem:key => { assert.equal(key, WORKSPACE_STORAGE_KEY); return raw; }, setItem:(key,value) => { assert.equal(key, WORKSPACE_STORAGE_KEY); raw=value; } };
  const saved = saveWorkspaceDesignDocument(emptyCandidateWorkspace(), candidate, selected);
  persistBrowserWorkspace(storage, saved);
  const restored = currentWorkspaceDesignDocument(readBrowserWorkspace(storage), candidate);
  assert.deepEqual(restored, selected, 'Read-back must preserve the full selected document');
  const report = await createCandidateConceptHtml(candidate, restored);
  const manifest = report.html.match(/<pre data-report-design-document="[^"]+">([\s\S]*?)<\/pre>/);
  assert(manifest, 'Report must expose its saved document records');
  assert.deepEqual(JSON.parse(decode(manifest[1])), selected, 'Report must preserve room/corridor coordinates, doors and source references exactly');
  const shapes = [...report.html.matchAll(/<polygon\b[^>]*data-design-shape="([^"]+)"[^>]*>/g)];
  assert.equal(shapes.length, selected.shapes.length, 'Every selected shape must be drawn once');
  for (const shape of selected.shapes) {
    const tag = shapes.find(match => match[1] === shape.id);
    assert(tag, `Missing saved shape ${shape.id}`);
    const points = tag[0].match(/\bpoints="([^"]+)"/)[1].split(/\s+/).map(pair => pair.split(',').map(Number));
    assert.equal(points.length, shape.polygon.length);
    shape.polygon.forEach((point,i) => point.forEach((value,axis) => assert(Math.abs(value-points[i][axis]) <= .001, 'Rendered polygon changed saved coordinates')));
  }
  assert.equal(report.designSha, createHash('sha256').update(JSON.stringify(selected)).digest('hex'));
  assert(report.html.includes(`data-design-sha256="${report.designSha}"`));
  assert(!report.features.find(f => f.id === 'groundPlan').explanation.includes('Only footprint shells'));
  assert.equal(report.features.find(f => f.id === 'groundPlan').status, 'REVIEW_REQUIRED');
  const renamed = structuredClone(selected);
  renamed.shapes.find(s => s.kind === 'ROOM').label = '<script>different selection</script>';
  const changed = await createCandidateConceptHtml(candidate, renamed);
  assert.equal(changed.sha, report.sha, 'Candidate provenance remains distinct from the design attachment');
  assert.notEqual(changed.designSha, report.designSha, 'Different room design must have a different report design digest');
  assert(!changed.html.includes('<script>different selection</script>'), 'Verification data must escape authored labels');
}

const names = ['Laundry','Kitchen','Living','Primary Bedroom','Primary Bath'];
const rectangular = fixture([[20,5],[60,5],[60,35],[20,35]]);
const original = structuredClone(rectangular.base);
const alternatives = rankDraftRoomLayouts(rectangular.candidate, rectangular.base, rectangular.base.shapes[0].id, names, 'X');
assert(alternatives.length >= 3, 'Unconditional rectangular fixture must compare at least three layouts');
assert.deepEqual(rectangular.base, original, 'Generating alternatives cannot alter the saved design');
await verifyRoundTrip(rectangular.candidate, alternatives[1].document);

const bent = fixture([[20,5],[60,5],[60,35],[38,35],[38,27.5],[20,27.5]]);
const turning = packLCorridorSeed(bent.candidate, bent.base, bent.base.shapes[0].id, names);
assert(turning.shapes.some(shape => shape.kind === 'CIRCULATION' && shape.polygon.length === 6));
assert.equal(turning.doors.length, 5);
assert.equal(assessAuthoredCirculation(turning,bent.home.id,'GROUND').status,'DRAFT_ROUTE_CONNECTED', 'A hallway average outside its concave polygon cannot obstruct a neighboring room');
const duplicateHall=structuredClone(turning);
duplicateHall.shapes.push({...structuredClone(turning.shapes.find(s=>s.kind==='CIRCULATION')),id:'duplicate-turning-hall'});
assert.equal(assessAuthoredCirculation(duplicateHall,bent.home.id,'GROUND').status,'UNVERIFIED','Duplicate concave corridor must still be rejected');
assert(assessAuthoredCirculation(duplicateHall,bent.home.id,'GROUND').corridorCollisions.length>0);
await verifyRoundTrip(bent.candidate, turning);
const withUpper=addOwnerFootprintShape(bent.candidate,turning,{ownerId:bent.home.id,label:'Upper plate',kind:'FLOOR_PLATE',story:'UPPER'});
const previous=structuredClone(withUpper);
const replacementBase=prepareDraftRoomAlternatives(bent.candidate,withUpper,bent.home.id,'GROUND');
assert.deepEqual(withUpper,previous,'Comparing replacements must preserve the saved layout');
assert.deepEqual(replacementBase.shapes.filter(s=>s.story==='UPPER'),withUpper.shapes.filter(s=>s.story==='UPPER'));
assert.equal(replacementBase.doors.length,0,'Replaced floor doors cannot retain dangling references');
const replacement=rankDraftRoomLayouts(bent.candidate,replacementBase,replacementBase.shapes[0].id,names,'X');
assert(replacement.length>=3,'A saved floor must support another comparison without deleting it first');
const stairReserved=addDesignShape(bent.candidate,withUpper,{ownerId:bent.home.id,label:'Reserved stair',kind:'STAIR_ZONE',story:'GROUND',polygon:[[21,6],[25,6],[25,10],[21,10]]});
assert.throws(()=>prepareDraftRoomAlternatives(bent.candidate,stairReserved,bent.home.id,'GROUND'),/stair reservation/);

let writes = 0;
const corrupt = { getItem:() => '{broken', setItem:() => { writes++; } };
assert.throws(() => readBrowserWorkspace(corrupt), /Existing data has been kept/);
assert.equal(writes, 0, 'An unreadable workspace must never be reset automatically');
assert.throws(() => readBrowserWorkspace({getItem:() => JSON.stringify({schemaVersion:'future'})}), /unsupported/);
assert.throws(() => readBrowserWorkspace({getItem:() => { throw Error('blocked'); }}), /unavailable/);
assert.throws(() => persistBrowserWorkspace({getItem:() => null, setItem:() => { throw Error('quota'); }}, emptyCandidateWorkspace()), /could not be confirmed/);
assert.throws(() => persistBrowserWorkspace({getItem:() => 'different', setItem:() => {}}, emptyCandidateWorkspace()), /could not be confirmed/);
const legacy = emptyCandidateWorkspace(); delete legacy.designDocuments;
assert.deepEqual(readBrowserWorkspace({getItem:() => JSON.stringify(legacy)}), legacy, 'Existing workspace schema stays compatible');
console.log('PASS: non-top rectangle and turning L saved/reloaded/report geometry, door records, design hashes, escaped labels, legacy storage, blocked/quota/corrupt/read-back failure handling');
