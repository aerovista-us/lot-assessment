import { createHmac } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getWorkbenchAccess } from "@/lib/aerovista/session";
import { LOTSCOPE_PROJECTS } from "@/lib/lotscope-project-catalog";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const noStore = { "cache-control": "no-store" };
const gatewayPath = "/v1/lotscope/imports/reviews";
const projects = new Set(LOTSCOPE_PROJECTS.map(project => project.id));

export async function POST(request: NextRequest) {
  const session = await getWorkbenchAccess();
  if (!session) return NextResponse.json({code:"WORKBENCH_NOT_AUTHORIZED"}, {status:401,headers:noStore});

  // Staging-only on both sides; never allow this browser action in production.
  if (process.env.VERCEL_ENV !== "preview" || process.env.LOTSCOPE_IMPORT_REVIEW_ENABLED !== "true") {
    return NextResponse.json({code:"IMPORT_REVIEW_DISABLED"}, {status:503,headers:noStore});
  }
  const origin = request.headers.get("origin");
  if (!origin || origin !== request.nextUrl.origin) return NextResponse.json({code:"ORIGIN_DENIED"}, {status:403,headers:noStore});
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({code:"INVALID_CONTENT_TYPE"}, {status:415,headers:noStore});
  }
  const secret = process.env.IDGW_SERVICE_SECRET_LOTSCOPE_WORKBENCH;
  const gatewayBase = process.env.LOTSCOPE_IDENTITY_GATEWAY_URL;
  if (!secret || !gatewayBase) return NextResponse.json({code:"BROKER_NOT_CONFIGURED"}, {status:503,headers:noStore});
  let url: URL;
  try { url = new URL(gatewayBase); }
  catch { return NextResponse.json({code:"BROKER_NOT_CONFIGURED"}, {status:503,headers:noStore}); }
  if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    return NextResponse.json({code:"BROKER_NOT_CONFIGURED"}, {status:503,headers:noStore});
  }

  let proposal: unknown;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 32768) return NextResponse.json({code:"REQUEST_TOO_LARGE"}, {status:413,headers:noStore});
    proposal = JSON.parse(raw);
  } catch { return NextResponse.json({code:"INVALID_JSON"}, {status:400,headers:noStore}); }
  if (!proposal || typeof proposal !== "object" || Array.isArray(proposal)
    || !("sourceProjectKey" in proposal)
    || typeof proposal.sourceProjectKey !== "string" || !projects.has(proposal.sourceProjectKey)) {
    return NextResponse.json({code:"INVALID_PROJECT"}, {status:422,headers:noStore});
  }
  const timestamp = new Date().toISOString();
  const body = JSON.stringify({sessionToken:session.sessionToken,proposal});
  const signature = createHmac("sha256",secret).update(`POST\n${gatewayPath}\n${timestamp}\n${body}`,"utf8").digest("hex");
  try {
    const response = await fetch(new URL(gatewayPath,url),{
      method:"POST",cache:"no-store",signal:AbortSignal.timeout(8000),
      headers:{"content-type":"application/json","x-av-service":"LOTSCOPE_WORKBENCH",
        "x-av-timestamp":timestamp,"x-av-signature":signature},
      body,
    });
    const payload = await response.json().catch(()=>({code:"INVALID_GATEWAY_RESPONSE"}));
    const code = typeof payload?.code === "string" ? payload.code :
      payload?.action === "CREATED" || payload?.action === "NOOP" ? payload.action : "BROKER_UNAVAILABLE";
    if (!response.ok) return NextResponse.json({code}, {status:response.status,headers:noStore});
    return NextResponse.json({action:payload.action,id:payload.id,status:payload.status,reportRelease:payload.reportRelease},
      {status:response.status,headers:noStore});
  } catch {
    return NextResponse.json({code:"BROKER_UNAVAILABLE"}, {status:503,headers:noStore});
  }
}
