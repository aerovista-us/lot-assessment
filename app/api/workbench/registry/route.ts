import { requireWorkbenchApiAccess } from "@/lib/aerovista/api-guard";
import { NextResponse } from "next/server";
import { pondyCandidateRegistry } from "@/projects/pondy-lot2/candidate-registry";

export const dynamic = "force-dynamic";

export async function GET() {
  const authGuard = await requireWorkbenchApiAccess();
  if (authGuard) return authGuard;
  return NextResponse.json(pondyCandidateRegistry, {
    headers: { "cache-control": "no-store" }
  });
}
