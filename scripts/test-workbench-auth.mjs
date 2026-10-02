import assert from "node:assert/strict";
import { createServerAppAdapter } from "@aerovista-us/app-adapter/server";

const calls = [];
const identity = {
  identityId: "founder-1", externalIdentityId: "avi_founder", email: "founder@example.test", name: "Founder",
  status: "active", principalType: "person", membershipPlan: null, avccRole: "founder", effectiveRoles: ["founder"],
  service: "lotscope_workbench", serviceRoles: [], accessVersion: 1,
  profile: { title: null, division: null, team: null, timezone: null, locale: null },
};
const fetchImpl = async (url, init) => {
  const path = new URL(url).pathname;
  const body = init?.body ? JSON.parse(String(init.body)) : {};
  calls.push({ path, body, service: new Headers(init?.headers).get("X-AV-Service") });
  if (path === "/v1/identity/describe") return Response.json({ ok: true, authenticated: true, identity });
  if (path === "/v1/authorization/check") return Response.json({ ok: true, allowed: body.capability === "lotscope.workbench.access" });
  throw new Error(`Unexpected path ${path}`);
};
const av = createServerAppAdapter({ appId: "lotscope_workbench", identityGatewaySecret: "test-secret", fetchImpl });
const allowed = await av.content.canView("session-token", { mode: "protected", roles: ["founder"], allCapabilities: ["lotscope.workbench.access"] });
assert.equal(allowed.allowed, true);
assert.equal(calls.every((call) => call.service === "LOTSCOPE_WORKBENCH"), true);
const denied = await av.content.canView("session-token", { mode: "protected", roles: ["founder"], allCapabilities: ["lotscope.project.admin"] });
assert.equal(denied.allowed, false);
console.log(JSON.stringify({ appId: "lotscope_workbench", protectedAccess: allowed.allowed, deniedUnknownGrant: !denied.allowed }));
