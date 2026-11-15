import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { createCaseProject } from "../lib/case-comparison.ts";

const records = new Map();
let identity = null;
let databaseUnavailable = false;
const previousUrl = process.env.DATABASE_URL;
process.env.DATABASE_URL = "postgresql://fake-host/never-connect";
globalThis.__caseApiTest = {
  getIdentity: () => identity,
  query: async (strings, values) => {
    if (databaseUnavailable) throw new Error("mock DB unavailable");
    const statement = strings.join("?").trim();
    if (statement.startsWith("SELECT revision, document")) {
      const [owner, id] = values;
      const record = records.get(owner + ":" + id);
      return record ? [{ revision: record.revision, document: structuredClone(record.document) }] : [];
    }
    if (statement.startsWith("INSERT INTO lotscope_case")) {
      const [owner, id, json] = values;
      const key = owner + ":" + id;
      if (records.has(key)) return [];
      const document = JSON.parse(json);
      records.set(key, { revision: 1, document });
      return [{ revision: 1 }];
    }
    if (statement.startsWith("UPDATE lotscope_case")) {
      const [revision, json, owner, id, expected] = values;
      const key = owner + ":" + id;
      const current = records.get(key);
      if (!current || current.revision !== expected) return [];
      records.set(key, { revision, document: JSON.parse(json) });
      return [{ revision }];
    }
    throw new Error("Unexpected SQL in test: " + statement);
  }
};

const root = process.cwd();
const bundle = await build({
  entryPoints: [path.join(root, "app/api/workbench/cases/route.ts")],
  write: false, bundle: true, platform: "node", format: "esm", target: "node22",
  plugins: [{
    name: "case-route-mocks",
    setup(b) {
      b.onResolve({ filter: /^next\/server$/ }, () => ({ path: "next/server", namespace: "test-mock" }));
      b.onResolve({ filter: /^@neondatabase\/serverless$/ }, () => ({ path: "neon", namespace: "test-mock" }));
      b.onResolve({ filter: /^@\/lib\/aerovista\/session$/ }, () => ({ path: "session", namespace: "test-mock" }));
      b.onResolve({ filter: /^@\// }, args => ({ path: path.join(root, args.path.slice(2) + ".ts") }));
      b.onLoad({ filter: /.*/, namespace: "test-mock" }, args => {
        if (args.path === "next/server") {
          return { contents: "export const NextResponse = { json(body, init) { return Response.json(body, init); } };", loader: "js" };
        }
        if (args.path === "neon") {
          return { contents: "export const neon = () => ((strings, ...values) => globalThis.__caseApiTest.query(strings, values));", loader: "js" };
        }
        return { contents: "export async function getWorkbenchAccess() { const id = globalThis.__caseApiTest.getIdentity(); return id ? { identity: { identityId: id } } : null; }", loader: "js" };
      });
    }
  }]
});
const encoded = Buffer.from(bundle.outputFiles[0].text).toString("base64");
const { GET, PUT } = await import("data:text/javascript;base64," + encoded);
const url = "http://localhost/api/workbench/cases";
function get(id = "HZ-001") { return GET(new Request(url + "?id=" + encodeURIComponent(id))); }
function put(project, expectedRevision, headers = {}) {
  return PUT(new Request(url, { method: "PUT", headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify({ project, expectedRevision }) }));
}
async function verify(response, status, context) {
  assert.equal(response.status, status, context);
  assert.equal(response.headers.get("cache-control"), "no-store", context + " must not cache");
  return response.json();
}
const project = createCaseProject();
await verify(await get(), 401, "anonymous GET");
await verify(await put(project, 0), 401, "anonymous PUT");
identity = "founder-test";
await verify(await put(project, 0, { origin: "https://untrusted.example" }), 403, "cross-origin mutation");
await verify(await put(project, 0, { "sec-fetch-site": "cross-site" }), 403, "cross-site browser mutation");
await verify(await put(project, 0, { origin: "invalid-origin" }), 403, "invalid mutation origin");
await verify(await GET(new Request(url)), 400, "missing ID");
await verify(await get("NO_CASE"), 404, "missing case");
const invalid = structuredClone(project);
invalid.lot.width = -1;
await verify(await put(invalid, 0), 400, "invalid case");
const badEvidence = structuredClone(project);
badEvidence.evidence[0].status = "verified";
await verify(await put(badEvidence, 0), 422, "unsourced verified evidence");
const created = await verify(await put({ ...project, acceptedAt: "2026-01-01T00:00:00.000Z" }, 0), 200, "case create");
assert.equal(created.revision, 1);
assert.equal(created.project.acceptedAt, null, "unverified client acceptance must not survive");
assert.equal(created.decisionState, "conditional");
await verify(await put(project, 0), 409, "duplicate create");
const loaded = await verify(await get(), 200, "case read");
assert.equal(loaded.revision, 1);
assert.equal(loaded.project.id, project.id);
const changed = { ...loaded.project, name: "Revised founder case" };
const saved = await verify(await put(changed, 1), 200, "case update");
assert.equal(saved.revision, 2);
await verify(await put(changed, 1), 409, "stale update");
identity = "staff-test";
await verify(await get(), 404, "other owner cannot read founder case");
await verify(await put(changed, 1), 409, "other owner cannot overwrite founder case");
const staff = await verify(await put(project, 0), 200, "owner-scoped separate case");
assert.equal(staff.revision, 1);
identity = "founder-test";
assert.equal((await verify(await get(), 200, "founder case intact")).project.name, "Revised founder case");
const founderKey = "founder-test:" + project.id;
const originalRecord = structuredClone(records.get(founderKey));
records.set(founderKey, { revision: originalRecord.revision, document: { id: project.id } });
await verify(await get(), 503, "corrupt stored case refused");
records.set(founderKey, { ...originalRecord, revision: originalRecord.revision + 1 });
await verify(await get(), 503, "document/revision mismatch refused");
records.set(founderKey, originalRecord);
await verify(await get(), 200, "restored record loads");
databaseUnavailable = true;
await verify(await get(), 503, "read DB outage");
await verify(await put(changed, 2), 503, "write DB outage");
databaseUnavailable = false;
delete process.env.DATABASE_URL;
await verify(await get(), 503, "missing DATABASE_URL");
await verify(await put(changed, 2), 503, "missing DATABASE_URL write");
if (previousUrl === undefined) delete process.env.DATABASE_URL;
else process.env.DATABASE_URL = previousUrl;
console.log("PASS case API: auth, schema, evidence, create/read/update, stale conflict, owner isolation, outages");
