import { NextRequest, NextResponse } from "next/server";
import {
  WORKBENCH_SESSION_COOKIE,
  createWorkbenchServerAdapter,
  evaluateWorkbenchAccess,
} from "@/lib/aerovista/workbench-access";

export async function POST(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); } catch { body = null; }
  const code = typeof body === "object" && body && "code" in body ? String((body as { code?: unknown }).code || "").trim() : "";
  if (!code) return NextResponse.json({ error: "Missing handoff code", code: "missing_code" }, { status: 400 });

  try {
    const av = createWorkbenchServerAdapter();
    const exchange = await av.auth.exchangeHandoff(code);
    if (!exchange.sessionToken || exchange.cookieName !== WORKBENCH_SESSION_COOKIE) {
      if (exchange.sessionToken) await av.auth.revokeSession(exchange.sessionToken).catch(() => undefined);
      return NextResponse.json({ error: "Session contract mismatch", code: "session_contract_mismatch" }, { status: 502 });
    }

    const access = await evaluateWorkbenchAccess(exchange.sessionToken);
    if (access.status !== "allowed") {
      await av.auth.revokeSession(exchange.sessionToken).catch(() => undefined);
      return NextResponse.json({ error: "LotScope Workbench access denied", code: "workbench_access_denied" }, { status: access.status === "unavailable" ? 503 : 403 });
    }

    const response = NextResponse.json({ ok: true, identity: access.identity });
    const expires = new Date(exchange.expiresAt);
    response.cookies.set(WORKBENCH_SESSION_COOKIE, exchange.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      ...(Number.isNaN(expires.getTime()) ? {} : { expires }),
    });
    return response;
  } catch (error) {
    const candidate = error as { status?: number; code?: string; message?: string };
    return NextResponse.json({
      error: candidate.message || "Handoff exchange failed",
      code: candidate.code || "handoff_exchange_failed",
    }, { status: candidate.status || 502 });
  }
}
