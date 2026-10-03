import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAeroVistaServerAdapter } from "@/lib/aerovista/app-adapter.server";
import { LOTSCOPE_SESSION_COOKIE } from "@/lib/aerovista/config";
export const dynamic = "force-dynamic";
export async function POST() {
  const store = await cookies();
  const token = store.get(LOTSCOPE_SESSION_COOKIE)?.value;
  if (token) await getAeroVistaServerAdapter().auth.revokeSession(token).catch(() => null);
  const response = NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  response.cookies.set(LOTSCOPE_SESSION_COOKIE, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}
