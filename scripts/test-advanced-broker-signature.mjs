import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHmac } from "node:crypto";
import { signAdvancedBrokerRequest } from "../lib/aerovista/advanced-broker-signature.ts";

const secret = "deterministic-test-secret-at-least-32-characters";
const timestamp = "2026-10-30T12:00:00.000Z";
const path = "/v1/advanced/projects/test-project/revisions/candidate_1";
const body = '{"candidateId":"candidate_1","revision":2}';
const headers = signAdvancedBrokerRequest("PUT", path, body, secret, timestamp);
const expected = createHmac("sha256", secret)
  .update(`PUT\n${path}\n${timestamp}\n${body}`, "utf8")
  .digest("hex");
assert.equal(headers["X-AV-Signature"], expected);
assert.equal(headers["X-AV-Service"], "lotscope_advanced");
assert.equal(headers["X-AV-Timestamp"], timestamp);
assert.notEqual(signAdvancedBrokerRequest("PUT", path, body + "x", secret, timestamp)["X-AV-Signature"], expected);
assert.notEqual(signAdvancedBrokerRequest("GET", path, body, secret, timestamp)["X-AV-Signature"], expected);
for (const bad of [
  "https://evil.example/v1/advanced/projects/test-project",
  "//evil.example/v1/advanced/health",
  "/v1/advanced/projects/../health",
  "/api/internal/identity/capability/check",
  "/v1/advanced/projects/p?target=other",
  "/v1/advanced/projects/p/%2e%2e",
]) {
  assert.throws(() => signAdvancedBrokerRequest("GET", bad, "", secret, timestamp), /invalid_broker_path/);
}
assert.throws(() => signAdvancedBrokerRequest("GET", "/v1/advanced/health", "", "short", timestamp), /broker_secret_unconfigured/);
assert.throws(() => signAdvancedBrokerRequest("GET", "/v1/advanced/health", "", secret, "not-date"), /invalid_broker_timestamp/);
const serverTransport = readFileSync(new URL("../lib/aerovista/advanced-broker-client.server.ts", import.meta.url), "utf8");
assert.match(serverTransport, /import "server-only"/);
assert.match(serverTransport, /process\.env\.LOTSCOPE_ADVANCED_BROKER_HMAC_SECRET/);
assert.match(serverTransport, /signAdvancedBrokerRequest\(method, path, body, secret, timestamp\)/);
console.log("Advanced broker HMAC signing and server-only secret boundary: PASS");
