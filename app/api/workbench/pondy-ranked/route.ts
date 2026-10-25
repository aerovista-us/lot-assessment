import { requireInternalWorkspaceApiAccess } from "@/lib/aerovista/api-guard";
import { NextResponse } from "next/server";
import { runPondyRankedSearch } from "@/packages/pondy-search";

export const dynamic = "force-dynamic";

export async function GET() {
  const authGuard = await requireInternalWorkspaceApiAccess();
  if (authGuard) return authGuard;
  return NextResponse.json(runPondyRankedSearch(), { headers: { "cache-control": "no-store" } });
}
