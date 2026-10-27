import { NextResponse } from 'next/server';
import { getAdvancedSession } from '@/lib/aerovista/advanced-session';
import { getAdvancedAeroVistaServerAdapter } from '@/lib/aerovista/advanced-app-adapter.server';
import { ADVANCED_CAPABILITY } from '@/lib/aerovista/advanced-access';
export const dynamic = 'force-dynamic';
export async function GET() {
  const session = await getAdvancedSession();
  if (!session) return NextResponse.json({ authenticated: false }, { headers: { 'cache-control': 'no-store' } });
  try {
    const grant = await getAdvancedAeroVistaServerAdapter().identity.can({ identityId: session.identity.identityId, capability: ADVANCED_CAPABILITY });
    return NextResponse.json(grant.allowed ? { authenticated: true, identity: session.identity } : { authenticated: false }, { headers: { 'cache-control': 'no-store' } });
  } catch { return NextResponse.json({ authenticated: false }, { status: 503, headers: { 'cache-control': 'no-store' } }); }
}
