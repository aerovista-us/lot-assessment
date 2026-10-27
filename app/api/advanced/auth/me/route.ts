import { NextResponse } from 'next/server';
import { getAdvancedSession } from '@/lib/aerovista/advanced-session';
import { getAdvancedAeroVistaServerAdapter } from '@/lib/aerovista/advanced-app-adapter.server';
import { ADVANCED_CAPABILITY } from '@/lib/aerovista/advanced-access';
export const dynamic = 'force-dynamic';
export async function GET() {
  const session = await getAdvancedSession();
  if (!session) return NextResponse.json({ error: 'Sign-in required' }, { status: 401 });
  try {
    const grant = await getAdvancedAeroVistaServerAdapter().identity.can({ identityId: session.identity.identityId, capability: ADVANCED_CAPABILITY });
    if (!grant.allowed) return NextResponse.json({ error: 'Advanced entitlement required' }, { status: 403 });
    return NextResponse.json({ identity: session.identity }, { headers: { 'cache-control': 'no-store' } });
  } catch { return NextResponse.json({ error: 'Authorization unavailable' }, { status: 503 }); }
}
