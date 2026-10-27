import { NextResponse } from 'next/server';
import { getAdvancedAeroVistaServerAdapter } from '@/lib/aerovista/advanced-app-adapter.server';
import { LOTSCOPE_ADVANCED_SESSION_COOKIE } from '@/lib/aerovista/advanced-config';
import { ADVANCED_CAPABILITY } from '@/lib/aerovista/advanced-access';
import { classifyHandoffFailure, type HandoffFailureStage } from '@/lib/aerovista/handoff-failure';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { code?: string } | null;
  const code = typeof body?.code === 'string' ? body.code.trim() : '';
  if (!code) return NextResponse.json({ error: 'Handoff code required', code: 'missing_code' }, { status: 400 });
  let stage: HandoffFailureStage = 'exchange';
  try {
    const av = getAdvancedAeroVistaServerAdapter();
    const exchange = await av.auth.exchangeHandoff(code);
    stage = 'describe';
    const described = exchange.identity ? { authenticated: true, identity: exchange.identity } : await av.identity.describe(exchange.sessionToken);
    if (!described.authenticated || !described.identity) {
      await av.auth.revokeSession(exchange.sessionToken).catch(() => null);
      return NextResponse.json({ error: 'Identity unavailable', code: 'identity_unavailable' }, { status: 401 });
    }
    stage = 'authorize';
    const grant = await av.identity.can({ identityId: described.identity.identityId, capability: ADVANCED_CAPABILITY });
    if (!grant.allowed) {
      await av.auth.revokeSession(exchange.sessionToken).catch(() => null);
      return NextResponse.json({ error: 'Advanced entitlement required', code: 'advanced_entitlement_required' }, { status: 403 });
    }
    const response = NextResponse.json({ ok: true, identity: described.identity }, { headers: { 'cache-control': 'no-store' } });
    response.cookies.set(LOTSCOPE_ADVANCED_SESSION_COOKIE, exchange.sessionToken, {
      httpOnly: true, secure: true, sameSite: 'lax', path: '/', expires: new Date(exchange.expiresAt),
    });
    return response;
  } catch (cause) {
    const diagnostic = classifyHandoffFailure(cause, stage);
    const requestId = crypto.randomUUID();
    console.error('[lotscope/advanced-handoff] rejected', { requestId, stage, upstreamStatus: diagnostic.upstreamStatus, upstreamCode: diagnostic.upstreamCode });
    return NextResponse.json({ error: diagnostic.error, code: diagnostic.code, requestId }, {
      status: diagnostic.status, headers: { 'cache-control': 'no-store' },
    });
  }
}
