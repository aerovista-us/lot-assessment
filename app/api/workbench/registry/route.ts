import { NextResponse } from "next/server";
import { pondyCandidateRegistry } from "@/projects/pondy-lot2/candidate-registry";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(pondyCandidateRegistry, {
    headers: { "cache-control": "no-store" }
  });
}
