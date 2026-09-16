import { NextResponse } from "next/server";
import { runPondyTriage } from "@/projects/pondy-lot2/triage";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  try {
    const result = runPondyTriage();
    return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Candidate exploration failed.";
    return NextResponse.json({ error: message }, { status: 500, headers: { "cache-control": "no-store" } });
  }
}
