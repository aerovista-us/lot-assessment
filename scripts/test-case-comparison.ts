import assert from "node:assert/strict";
import { caseFingerprint, caseGate, createCaseProject, generateCaseAlternatives } from "../lib/case-comparison";
import { validCaseDocument } from "../lib/case-document-validation";

const project = createCaseProject();
const first = generateCaseAlternatives(project);
const second = generateCaseAlternatives(project);
assert.deepEqual(first, second, "the same project model and strategy must reproduce the same alternatives");
assert.equal(first[0].fingerprint, caseFingerprint(project));

project.savedLayout = first[0];
generateCaseAlternatives(project, "max_fit");
assert.equal(project.savedLayout.id, first[0].id, "comparison generation must not alter the saved layout");

assert.equal(caseGate(project).state, "conditional", "unknown evidence must fail closed");
project.evidence.forEach(item => { item.status = "verified"; item.source = "test evidence"; });
project.risks.forEach(item => { item.status = "closed"; });
assert.equal(caseGate(project).state, "conditional", "unresolved assumptions and constraints must stay conditional");
assert.equal(caseGate(project).unresolvedFindings.length, 2);
project.constraints.forEach(item => { item.status = "verified"; });
project.assumptions.forEach(item => { item.status = "verified"; });
assert.equal(caseGate(project).state, "evidence-ready");
project.evidence[0].status = "rejected";
assert.equal(caseGate(project).state, "blocked");

console.log("PASS case-comparison: deterministic generation, non-mutating comparison, fail-closed acceptance");

const valid = createCaseProject();
assert.equal(validCaseDocument(valid), true, "a seeded case must pass server schema validation");
const modified = structuredClone(valid);
modified.evidence[0].status = "verified";
assert.equal(validCaseDocument(modified), false, "verified evidence without a source must be rejected");
modified.evidence[0].source = "source-id";
assert.equal(validCaseDocument(modified), true, "sourced evidence may be saved");
const reduced = structuredClone(valid);
reduced.evidence = reduced.evidence.filter(item => item.id !== "survey");
assert.equal(validCaseDocument(reduced), false, "mandatory evidence cannot be removed");
const duplicate = structuredClone(valid);
duplicate.evidence.push(duplicate.evidence[0]);
assert.equal(validCaseDocument(duplicate), false, "duplicate evidence IDs must be rejected");
const invalidLot = structuredClone(valid);
invalidLot.lot.width = -100;
assert.equal(validCaseDocument(invalidLot), false, "invalid lot dimensions must be rejected");
console.log("PASS case-document-validation: structure, mandatory sources, unique gates, dimensions");
