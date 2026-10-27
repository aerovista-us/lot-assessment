import { NextResponse } from 'next/server';
import { authorizeAdvancedProject, ADVANCED_CAPABILITY } from '@/lib/aerovista/advanced-access';
import { getAdvancedSession } from '@/lib/aerovista/advanced-session';
import { getAdvancedAeroVistaServerAdapter } from '@/lib/aerovista/advanced-app-adapter.server';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  const session = await getAdvancedSession();
  if (!session) return NextResponse.json({ allowed: false }, { status: 401, headers: { 'cache-control': 'no-store' } });
  const body = await request.json().catch(() => null) as { capability?: string; resourceType?: string; resourceId?: string } | null;
  if (body?.capability === ADVANCED_CAPABILITY && !body.resourceType && !body.resourceId) {
    try {
      const result = await getAdvancedAeroVistaServerAdapter().identity.can({ identityId: session.identity.identityId, capability: ADVANCED_CAPABILITY });
      return NextResponse.json({ allowed: Boolean(result.allowed) }, { headers: { 'cache-control': 'no-store' } });
    } catch { return NextResponse.json({ allowed: false }, { status: 503 }); }
  }
  if (body?.resourceType !== 'lotscope_project' || !body.resourceId ||
      !['lotscope.project.read', 'lotscope.project.edit'].includes(body.capability ?? '')) {
    return NextResponse.json({ allowed: false, code: 'unsupported_capability' }, { status: 400 });
  }
  const decision = await authorizeAdvancedProject(body.resourceId, body.capability === 'lotscope.project.edit' ? 'write' : 'read');
  return NextResponse.json({ allowed: decision.allowed }, { status: decision.allowed ? 200 : decision.status, headers: { 'cache-control': 'no-store' } });
}
