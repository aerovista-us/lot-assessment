import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { WORKBENCH_SESSION_COOKIE, createWorkbenchServerAdapter } from "@/lib/aerovista/workbench-access";

export async function POST(request: NextRequest) {
  const store = await cookies();
  const token = store.get(WORKBENCH_SESSION_COOKIE)?.value;
  if (token) {
    try { await createWorkbenchServerAdapter().auth.revokeSession(token); }
    catch { return NextResponse.json({ error: "logout_unavailable" }, { status: 503 }); }
  }
  const acceptsHtml = (request.headers.get("accept") || "").includes("text/html");
  const response = acceptsHtml
    ? NextResponse.redirect(new URL("/auth/lotscope/login?logged_out=1", request.url), 303)
    : NextResponse.json({ ok: true });
  response.cookies.set(WORKBENCH_SESSION_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}
