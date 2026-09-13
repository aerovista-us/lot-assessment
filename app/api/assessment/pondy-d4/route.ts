import { NextResponse } from "next/server";
import { evidenceForAudience } from "@/packages/evidence";
import { pondyDesign4Evidence } from "@/projects/pondy-design4/evidence";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const audience = searchParams.get("audience") === "workbench" ? "WORKBENCH" : "PUBLIC";
  return NextResponse.json(evidenceForAudience(pondyDesign4Evidence, audience), {
    headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" }
  });
}
