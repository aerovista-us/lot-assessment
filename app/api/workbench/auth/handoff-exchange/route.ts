import { NextResponse } from "next/server";
import { getAeroVistaServerAdapter } from "@/lib/aerovista/app-adapter.server";
import { LOTSCOPE_ACCESS_CAPABILITY, LOTSCOPE_SESSION_COOKIE } from "@/lib/aerovista/config";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { code?: string } | null;
  const code = String(body?.code || "").trim();
  if (!code) return NextResponse.json({ error: "Handoff code required.", code: "missing_code" }, { status: 400 });
  try {
    const av = getAeroVistaServerAdapter();
    const exchange = await av.auth.exchangeHandoff(code);
    const described = exchange.identity ? { authenticated: true, identity: exchange.identity } : await av.identity.describe(exchange.sessionToken);
    if (!described.authenticated || !described.identity) {
      await av.auth.revokeSession(exchange.sessionToken).catch(() => null);
      return NextResponse.json({ error: "Identity unavailable.", code: "identity_unavailable" }, { status: 401 });
    }
    const access = await av.identity.can({ identityId: described.identity.identityId, capability: LOTSCOPE_ACCESS_CAPABILITY });
    if (!access.allowed) {
      await av.auth.revokeSession(exchange.sessionToken).catch(() => null);
      return NextResponse.json({ error: "Workbench access denied.", code: "capability_denied" }, { status: 403 });
    }
    const response = NextResponse.json({ ok: true, identity: described.identity }, { headers: { "cache-control": "no-store" } });
    response.cookies.set(LOTSCOPE_SESSION_COOKIE, exchange.sessionToken, {
      httpOnly: true, secure: true, sameSite: "lax", path: "/",
      expires: new Date(exchange.expiresAt),
    });
    return response;
  } catch (cause) {
    const error = cause as { status?: number; code?: string; message?: string };
    return NextResponse.json({ error: error.message || "Handoff exchange failed.", code: error.code || "handoff_exchange_failed" }, { status: error.status || 502, headers: { "cache-control": "no-store" } });
  }
}
