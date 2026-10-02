import "server-only";
import { cookies } from "next/headers";
import type { IdentityDescriptor } from "@aerovista-us/app-adapter";
import { getAeroVistaServerAdapter } from "./app-adapter.server";
import { LOTSCOPE_ACCESS_CAPABILITY, LOTSCOPE_SESSION_COOKIE } from "./config";

export type WorkbenchSession = { sessionToken: string; identity: IdentityDescriptor };

export async function getWorkbenchSession(): Promise<WorkbenchSession | null> {
  const store = await cookies();
  const sessionToken = store.get(LOTSCOPE_SESSION_COOKIE)?.value;
  if (!sessionToken) return null;
  try {
    const av = getAeroVistaServerAdapter();
    const resolved = await av.auth.resolveSession(sessionToken);
    if (!resolved.authenticated || !resolved.identityId) return null;
    const described = await av.identity.describe(sessionToken);
    if (!described.authenticated || !described.identity) return null;
    return { sessionToken, identity: described.identity };
  } catch {
    return null;
  }
}

export async function getWorkbenchAccess(): Promise<WorkbenchSession | null> {
  const session = await getWorkbenchSession();
  if (!session) return null;
  try {
    const result = await getAeroVistaServerAdapter().identity.can({
      identityId: session.identity.identityId,
      capability: LOTSCOPE_ACCESS_CAPABILITY,
    });
    return result.allowed ? session : null;
  } catch {
    return null;
  }
}
