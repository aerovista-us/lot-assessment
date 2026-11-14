import { NextRequest, NextResponse } from "next/server";
import { requireWorkbenchApiAccess } from "@/lib/aerovista/api-guard";
import pondy from "@/projects/import-manifests/pondy-lot2.json";
import bstreet from "@/projects/import-manifests/b-street-1011.json";
import { prepareProjectImport } from "@/lib/project-import-contract.mjs";
import { verifyProjectImportSources, MAX_MANIFEST_BYTES } from "@/lib/project-import-source-verifier.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const noStore = { "cache-control": "no-store" };
const supported: Record<string, unknown> = { "pondy-lot2": pondy, "b-street-1011": bstreet };

export async function GET(request: NextRequest) {
  const denied = await requireWorkbenchApiAccess();
  if (denied) return denied;
  const id = request.nextUrl.searchParams.get("projectId");
  if (!id || !Object.hasOwn(supported, id)) {
    return NextResponse.json({ code: "UNKNOWN_PROJECT", error: "Choose a registered project" }, { status: 404, headers: noStore });
  }
  const result = prepareProjectImport(supported[id]);
  return NextResponse.json(result, { status: result.ok ? 200 : 422, headers: noStore });
}

export async function POST(request: NextRequest) {
  const denied = await requireWorkbenchApiAccess();
  if (denied) return denied;
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ code: "UNSUPPORTED_CONTENT_TYPE" }, { status: 415, headers: noStore });
  }
  const size = Number(request.headers.get("content-length") ?? 0);
  if (size > MAX_MANIFEST_BYTES) {
    return NextResponse.json({ code: "MANIFEST_TOO_LARGE" }, { status: 413, headers: noStore });
  }
  let body: unknown;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw) > MAX_MANIFEST_BYTES) {
      return NextResponse.json({ code: "MANIFEST_TOO_LARGE" }, { status: 413, headers: noStore });
    }
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ code: "INVALID_JSON" }, { status: 400, headers: noStore });
  }
  const result = await verifyProjectImportSources(body);
  return NextResponse.json(result, { status: result.ok ? 200 : result.code === "INVALID_MANIFEST" ? 422 : 409, headers: noStore });
}
