import "server-only";
import { NextResponse } from "next/server";
import { getWorkbenchAccess } from "./session";

export async function requireWorkbenchApiAccess() {
  const session = await getWorkbenchAccess();
  if (session) return null;
  return NextResponse.json(
    { error: "LotScope Workbench authentication required.", code: "workbench_not_authorized" },
    { status: 401, headers: { "cache-control": "no-store" } },
  );
}
