import "server-only";

import { createServerAppAdapter } from "@aerovista-us/app-adapter/server";
import type { ContentAccessDecision, IdentityDescriptor } from "@aerovista-us/app-adapter";

export const LOTSCOPE_APP_ID = "lotscope_workbench";
export const WORKBENCH_SESSION_COOKIE = process.env.LOTSCOPE_AUTH_COOKIE || "acos_session";
export const WORKBENCH_ACCESS_CAPABILITY = "lotscope.workbench.access";
export const WORKBENCH_PROJECT_RESOURCE_TYPE = "lotscope_project";

export type WorkbenchAccessStatus = "allowed" | "unauthenticated" | "forbidden" | "unavailable";

export type WorkbenchAccessResult = {
  status: WorkbenchAccessStatus;
  identity: IdentityDescriptor | null;
  decision: ContentAccessDecision | null;
};

export function isWorkbenchAuthBypassed() {
  return process.env.LOTSCOPE_AUTH_MODE === "disabled" && process.env.VERCEL_ENV !== "production";
}

export function createWorkbenchServerAdapter() {
  const secret = process.env.IDGW_SERVICE_SECRET_LOTSCOPE_WORKBENCH;
  if (!secret) throw new Error("IDGW_SERVICE_SECRET_LOTSCOPE_WORKBENCH is not configured");
  return createServerAppAdapter({
    appId: LOTSCOPE_APP_ID,
    identityGatewaySecret: secret,
    identityGatewayOrigin: process.env.AEROVISTA_IDENTITY_GATEWAY_ORIGIN || "https://identity-api.aerovista.us",
  });
}

export async function evaluateWorkbenchAccess(sessionToken: string | null | undefined): Promise<WorkbenchAccessResult> {
  if (isWorkbenchAuthBypassed()) {
    return { status: "allowed", identity: null, decision: null };
  }
  if (!sessionToken) return { status: "unauthenticated", identity: null, decision: null };
  try {
    const decision = await createWorkbenchServerAdapter().content.canView(sessionToken, {
      mode: "protected",
      roles: ["founder"],
      allCapabilities: [WORKBENCH_ACCESS_CAPABILITY],
    });
    if (decision.allowed) return { status: "allowed", identity: decision.identity, decision };
    return {
      status: decision.authenticated ? "forbidden" : "unauthenticated",
      identity: decision.identity,
      decision,
    };
  } catch {
    return { status: "unavailable", identity: null, decision: null };
  }
}

export function isAllowedWorkbenchCapability(value: string) {
  return [
    "lotscope.workbench.access",
    "lotscope.project.read",
    "lotscope.project.edit",
    "lotscope.workspace.write",
    "lotscope.proof.run",
    "lotscope.project.admin",
  ].includes(value);
}

export function sanitizeWorkbenchNext(value: string | null | undefined) {
  if (!value || !value.startsWith("/workbench")) return "/workbench";
  if (value.startsWith("//")) return "/workbench";
  return value;
}
