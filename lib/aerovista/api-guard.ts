import "server-only";
import { NextResponse } from "next/server";
import { getWorkbenchAccess } from "./session";
import { getAeroVistaServerAdapter } from "./app-adapter.server";

function denied(code: string, status: number) {
  return NextResponse.json(
    { error: "Authorized LotScope access required.", code },
    { status, headers: { "cache-control": "no-store" } },
  );
}

export async function requireWorkbenchApiAccess() {
  const session = await getWorkbenchAccess();
  if (session) return null;
  return denied("workbench_not_authorized", 401);
}

/**
 * Internal engineering capability, not a paid Advanced entitlement.
 * Both the existing Workbench grant and the explicit staff-side
 * Workspace grant are required. Gateway errors fail closed.
 */
export async function requireInternalWorkspaceApiAccess() {
  const session = await getWorkbenchAccess();
  if (!session) return denied("workbench_not_authorized", 401);
  try {
    const decision = await getAeroVistaServerAdapter().identity.can({
      identityId: session.identity.identityId,
      capability: "lotscope.workspace.write",
    });
    return decision.allowed ? null : denied("workspace_capability_denied", 403);
  } catch {
    return denied("workspace_authorization_unavailable", 503);
  }
}
