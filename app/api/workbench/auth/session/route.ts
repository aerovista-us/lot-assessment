import { NextResponse } from "next/server";
import { getWorkbenchAccess } from "@/lib/aerovista/session";
export const dynamic = "force-dynamic";
export async function GET() {
  const session = await getWorkbenchAccess();
  return NextResponse.json(session ? { authenticated: true, identity: session.identity } : { authenticated: false }, { headers: { "cache-control": "no-store" } });
}
