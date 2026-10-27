import 'server-only';
import { cookies } from 'next/headers';
import type { IdentityDescriptor } from '@aerovista-us/app-adapter';
import { getAdvancedAeroVistaServerAdapter } from './advanced-app-adapter.server';
import { LOTSCOPE_ADVANCED_SESSION_COOKIE } from './advanced-config';

export type AdvancedSession = { sessionToken: string; identity: IdentityDescriptor };

export async function getAdvancedSession(): Promise<AdvancedSession | null> {
  const store = await cookies();
  const token = store.get(LOTSCOPE_ADVANCED_SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const adapter = getAdvancedAeroVistaServerAdapter();
    const resolved = await adapter.auth.resolveSession(token);
    if (!resolved.authenticated || !resolved.identityId) return null;
    const described = await adapter.identity.describe(token);
    if (!described.authenticated || !described.identity ||
      described.identity.identityId !== resolved.identityId) return null;
    return { sessionToken: token, identity: described.identity };
  } catch { return null; }
}
