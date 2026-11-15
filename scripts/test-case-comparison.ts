import assert from "node:assert/strict";
import { caseFingerprint, caseGate, createCaseProject, generateCaseAlternatives } from "../lib/case-comparison";

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
assert.equal(caseGate(project).state, "evidence-ready");
project.evidence[0].status = "rejected";
assert.equal(caseGate(project).state, "blocked");

console.log("PASS case-comparison: deterministic generation, non-mutating comparison, fail-closed acceptance");
