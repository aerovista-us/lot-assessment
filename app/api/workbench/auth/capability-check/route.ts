import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  WORKBENCH_PROJECT_RESOURCE_TYPE,
  WORKBENCH_SESSION_COOKIE,
  createWorkbenchServerAdapter,
  isAllowedWorkbenchCapability,
} from "@/lib/aerovista/workbench-access";

export async function POST(request: NextRequest) {
  const token = (await cookies()).get(WORKBENCH_SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ allowed: false }, { status: 401 });
  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch {}
  const capability = String(body.capability || "").trim();
  const resourceType = body.resourceType == null ? null : String(body.resourceType).trim();
  const resourceId = body.resourceId == null ? null : String(body.resourceId).trim();
  if (!isAllowedWorkbenchCapability(capability)) {
    return NextResponse.json({ allowed: false, error: "unsupported_capability" }, { status: 400 });
  }
  if ((resourceType == null) !== (resourceId == null) || (resourceType && resourceType !== WORKBENCH_PROJECT_RESOURCE_TYPE)) {
    return NextResponse.json({ allowed: false, error: "invalid_resource_scope" }, { status: 400 });
  }
  try {
    const av = createWorkbenchServerAdapter();
    const described = await av.identity.describe(token);
    if (!described.authenticated || !described.identity) return NextResponse.json({ allowed: false }, { status: 401 });
    const result = await av.identity.can({
      identityId: described.identity.identityId,
      capability,
      resourceType,
      resourceId,
    });
    return NextResponse.json({ allowed: !!result.allowed });
  } catch {
    return NextResponse.json({ allowed: false, error: "authorization_unavailable" }, { status: 503 });
  }
}
