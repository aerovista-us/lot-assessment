import { NextRequest, NextResponse } from "next/server";
import { createExportPackage } from "@/packages/candidates";
import { pondyCandidateRegistry } from "@/projects/pondy-lot2/candidate-registry";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const candidateId = request.nextUrl.searchParams.get("id");
  if (!candidateId) return NextResponse.json({ error: "candidate id is required" }, { status: 400 });
  const pkg = createExportPackage(pondyCandidateRegistry, candidateId);
  if (!pkg) return NextResponse.json({ error: "candidate not found" }, { status: 404 });
  const filename = `${candidateId}.lotscope.json`;
  return new NextResponse(JSON.stringify(pkg, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store"
    }
  });
}
