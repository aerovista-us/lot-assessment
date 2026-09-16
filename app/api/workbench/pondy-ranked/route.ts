import { NextResponse } from "next/server";
import { runPondyRankedSearch } from "@/packages/pondy-search";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(runPondyRankedSearch(), { headers: { "cache-control": "no-store" } });
}
