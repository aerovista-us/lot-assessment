import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { WORKBENCH_SESSION_COOKIE, evaluateWorkbenchAccess } from "@/lib/aerovista/workbench-access";

export async function GET() {
  const token = (await cookies()).get(WORKBENCH_SESSION_COOKIE)?.value || null;
  const access = await evaluateWorkbenchAccess(token);
  if (access.status === "unavailable") {
    return NextResponse.json({ authenticated: false, authorized: false, error: "identity_unavailable" }, { status: 503 });
  }
  return NextResponse.json({
    authenticated: access.status === "allowed" || access.status === "forbidden",
    authorized: access.status === "allowed",
    identity: access.identity,
  }, { status: access.status === "unauthenticated" ? 401 : access.status === "forbidden" ? 403 : 200 });
}
