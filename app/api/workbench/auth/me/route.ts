import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { WORKBENCH_SESSION_COOKIE, createWorkbenchServerAdapter } from "@/lib/aerovista/workbench-access";

export async function GET() {
  const token = (await cookies()).get(WORKBENCH_SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ authenticated: false, identity: null }, { status: 401 });
  try {
    const described = await createWorkbenchServerAdapter().identity.describe(token);
    return NextResponse.json(described, { status: described.authenticated ? 200 : 401 });
  } catch {
    return NextResponse.json({ authenticated: false, identity: null, error: "identity_unavailable" }, { status: 503 });
  }
}
