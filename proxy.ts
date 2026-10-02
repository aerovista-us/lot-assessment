import { NextRequest, NextResponse } from "next/server";
import { WORKBENCH_SESSION_COOKIE, evaluateWorkbenchAccess, isWorkbenchAuthBypassed } from "@/lib/aerovista/workbench-access";

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/workbench/auth/")) return NextResponse.next();
  if (isWorkbenchAuthBypassed()) return NextResponse.next();
  const token = request.cookies.get(WORKBENCH_SESSION_COOKIE)?.value || null;
  const access = await evaluateWorkbenchAccess(token);
  if (access.status === "allowed") return NextResponse.next();

  if (request.nextUrl.pathname.startsWith("/workbench")) {
    const target = request.nextUrl.clone();
    if (access.status === "unauthenticated") {
      target.pathname = "/auth/lotscope/login";
      target.search = "";
      target.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    } else {
      target.pathname = "/auth/lotscope/denied";
      target.search = "";
      target.searchParams.set("reason", access.status === "unavailable" ? "unavailable" : "forbidden");
    }
    return NextResponse.redirect(target);
  }

  const status = access.status === "unavailable" ? 503 : access.status === "forbidden" ? 403 : 401;
  return NextResponse.json({
    error: access.status === "unavailable" ? "identity_unavailable" : access.status === "forbidden" ? "workbench_forbidden" : "not_authenticated",
  }, { status });
}

export const config = { matcher: ["/workbench/:path*", "/api/workbench/:path*"] };
