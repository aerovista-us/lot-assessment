import { NextResponse } from "next/server";
import { getWorkbenchAccess } from "@/lib/aerovista/session";
export const dynamic = "force-dynamic";
export async function GET() {
  const session = await getWorkbenchAccess();
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  return NextResponse.json({ identity: session.identity }, { headers: { "cache-control": "no-store" } });
}
