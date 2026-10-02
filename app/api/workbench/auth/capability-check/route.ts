import { NextResponse } from "next/server";
import { getAeroVistaServerAdapter } from "@/lib/aerovista/app-adapter.server";
import { getWorkbenchAccess } from "@/lib/aerovista/session";

const ALLOWED_CAPABILITIES = new Set([
  "lotscope.workbench.access", "lotscope.project.read", "lotscope.project.edit",
  "lotscope.workspace.write", "lotscope.proof.run", "lotscope.project.admin",
]);
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const session = await getWorkbenchAccess();
  if (!session) return NextResponse.json({ allowed: false, code: "not_authenticated" }, { status: 401 });
  const body = await request.json().catch(() => null) as { capability?: string; resourceType?: string | null; resourceId?: string | null } | null;
  const capability = String(body?.capability || "").trim();
  if (!ALLOWED_CAPABILITIES.has(capability)) return NextResponse.json({ allowed: false, code: "unsupported_capability" }, { status: 400 });
  if (body?.resourceType && body.resourceType !== "lotscope_project") return NextResponse.json({ allowed: false, code: "unsupported_resource_type" }, { status: 400 });
  try {
    const result = await getAeroVistaServerAdapter().identity.can({
      identityId: session.identity.identityId, capability,
      resourceType: body?.resourceType ?? null, resourceId: body?.resourceId ?? null,
    });
    return NextResponse.json({ allowed: Boolean(result.allowed) }, { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ allowed: false, code: "authorization_unavailable" }, { status: 503 });
  }
}
