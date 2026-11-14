import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { prepareProjectImport, compareImportPlans } from "../lib/project-import-contract.mjs";

const read = name => JSON.parse(readFileSync(new URL("../projects/import-manifests/" + name + ".json", import.meta.url)));
const pondy = read("pondy-lot2"), bstreet = read("b-street-1011");
const p = prepareProjectImport(pondy), b = prepareProjectImport(bstreet);
assert.equal(p.ok, true, p.errors.join("; "));
assert.equal(b.ok, true, b.errors.join("; "));
assert.equal(p.plan.mutationAllowed, false);
assert.equal(b.plan.automaticPublication, false);
assert.ok(p.plan.artifacts.every(a => a.reportRelease === "WITHHELD"));
assert.ok(b.plan.artifacts.every(a => a.importState === "PENDING_SOURCE_VERIFICATION"));
assert.equal(compareImportPlans(p, p).action, "NOOP");
assert.equal(compareImportPlans(p, b).action, "BLOCK");
const modified = structuredClone(pondy); modified.sourceRevision = "f".repeat(40);
assert.equal(compareImportPlans(p, prepareProjectImport(modified)).action, "REVIEW_REQUIRED");
for (const [name, candidate] of [
  ["wrong source", {...pondy, sourceRepository: "someone-else/private"}],
  ["invalid revision", {...pondy, sourceRevision: "main"}],
  ["traversal", {...pondy, artifacts: [{...pondy.artifacts[0], path: "../secret"}]}],
  ["unsupported approval", {...pondy, artifacts: [{...pondy.artifacts[0], evidenceState: "APPROVED"}]}],
  ["duplicate", {...pondy, artifacts: [pondy.artifacts[0], pondy.artifacts[0]]}],
  ["empty", {...pondy, artifacts: []}],
]) assert.equal(prepareProjectImport(candidate).ok, false, name);
console.log("PASS: two projects; immutable preflight; no autopublish; noop/revision checks; 6 invalid cases");
