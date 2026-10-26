import "server-only";
import { getWorkbenchSession } from "./session";
import { getAeroVistaServerAdapter } from "./app-adapter.server";

export const ADVANCED_CAPABILITY = "lotscope.advanced.access";
export const PROJECT_READ_CAPABILITY = "lotscope.project.read";
export const PROJECT_RESOURCE_TYPE = "lotscope_project";

export async function authorizeAdvancedProject(projectId: string) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(projectId)) {
    return { allowed: false as const, status: 403, code: "invalid_project_scope" };
  }
  const session = await getWorkbenchSession();
  if (!session) return { allowed: false as const, status: 401, code: "advanced_session_required" };
  try {
    const identity = getAeroVistaServerAdapter().identity;
    const plan = await identity.can({ identityId: session.identity.identityId, capability: ADVANCED_CAPABILITY });
    if (!plan.allowed) return { allowed: false as const, status: 403, code: "advanced_entitlement_required" };
    const project = await identity.can({
      identityId: session.identity.identityId, capability: PROJECT_READ_CAPABILITY,
      resourceType: PROJECT_RESOURCE_TYPE, resourceId: projectId,
    });
    if (!project.allowed) return { allowed: false as const, status: 403, code: "project_access_denied" };
    return { allowed: true as const, identityId: session.identity.identityId };
  } catch {
    return { allowed: false as const, status: 503, code: "advanced_authorization_unavailable" };
  }
}
