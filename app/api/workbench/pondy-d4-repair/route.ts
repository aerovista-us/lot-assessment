import { NextResponse } from "next/server";
import repair from "@/projects/pondy-design4/repair-comparison.json";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(repair, { headers: { "cache-control": "no-store" } });
}
