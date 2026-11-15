import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getWorkbenchAccess } from "@/lib/aerovista/session";
import { caseGate, type CaseProject } from "@/lib/case-comparison";

export const dynamic = "force-dynamic";
const headers = { "cache-control": "no-store" };
const respond = (data: unknown, status = 200) => NextResponse.json(data, { status, headers });

function database() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return neon(url);
}
function validId(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(value);
}
function validProject(value: unknown): value is CaseProject {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const p = value as Partial<CaseProject>;
  return validId(p.id) && typeof p.name === "string" && p.name.length <= 200
    && p.lot !== null && typeof p.lot === "object"
    && p.program !== null && typeof p.program === "object"
    && Array.isArray(p.program?.rooms) && Array.isArray(p.evidence)
    && Array.isArray(p.risks) && Array.isArray(p.constraints)
    && Array.isArray(p.assumptions) && Array.isArray(p.alternatives)
    && p.evidence.length >= 6 && p.evidence.length <= 100
    && p.risks.length <= 100 && p.alternatives.length <= 100
    && ["survey", "zoning", "access", "structure", "circulation", "approval"].every(
      id => p.evidence?.some(item => item?.id === id && item.required === true
        && ["unknown", "tentative", "verified", "rejected"].includes(item.status)
        && typeof item.source === "string")
    );
}

export async function GET(request: Request) {
  const session = await getWorkbenchAccess();
  if (!session) return respond({ error: "Workbench capability required." }, 401);
  const id = new URL(request.url).searchParams.get("id");
  if (!validId(id)) return respond({ error: "Valid case id required." }, 400);
  const sql = database();
  if (!sql) return respond({ error: "Case store not configured." }, 503);
  try {
    const rows = await sql`SELECT revision, document FROM lotscope_case
      WHERE owner_identity_id = ${session.identity.identityId} AND case_id = ${id}`;
    if (!rows.length) return respond({ error: "Case not found." }, 404);
    return respond({ revision: rows[0].revision, project: rows[0].document });
  } catch {
    return respond({ error: "Case store unavailable." }, 503);
  }
}

export async function PUT(request: Request) {
  const session = await getWorkbenchAccess();
  if (!session) return respond({ error: "Workbench capability required." }, 401);
  const size = Number(request.headers.get("content-length") || "0");
  if (size > 1024 * 1024) return respond({ error: "Case package exceeds 1 MB." }, 413);
  let input: { project?: unknown; expectedRevision?: unknown };
  try {
    const raw = await request.text();
    if (raw.length > 1024 * 1024) return respond({ error: "Case package exceeds 1 MB." }, 413);
    input = JSON.parse(raw);
  } catch {
    return respond({ error: "Invalid JSON." }, 400);
  }
  if (!validProject(input?.project) || !Number.isSafeInteger(input.expectedRevision)
      || Number(input.expectedRevision) < 0) {
    return respond({ error: "Invalid case document or expected revision." }, 400);
  }
  const project = input.project as CaseProject;
  const expected = Number(input.expectedRevision);
  // Never accept client-supplied approval. Evidence-ready is not an explicit approval.
  // Enforce valid evidence structure on every persisted revision.
  if (project.evidence.some(item => item.status === "verified" && !item.source.trim())) {
    return respond({ error: "Verified evidence requires a source." }, 422);
  }
  const gate = caseGate(project);
  const sanitized = { ...project, acceptedAt: null, revision: expected + 1, updatedAt: new Date().toISOString() };
  const sql = database();
  if (!sql) return respond({ error: "Case store not configured." }, 503);
  try {
    const rows = await sql`INSERT INTO lotscope_case (owner_identity_id, case_id, revision, document)
      SELECT ${session.identity.identityId}, ${sanitized.id}, ${sanitized.revision}, ${JSON.stringify(sanitized)}::jsonb
      WHERE ${expected} = 0
      ON CONFLICT (owner_identity_id, case_id) DO UPDATE
      SET revision = EXCLUDED.revision, document = EXCLUDED.document, updated_at = now()
      WHERE lotscope_case.revision = ${expected}
      RETURNING revision`;
    if (!rows.length) return respond({ error: "Revision conflict. Reload before saving.", code: "revision_conflict" }, 409);
    return respond({ revision: rows[0].revision, project: sanitized, decisionState: gate.state });
  } catch {
    return respond({ error: "Case store unavailable; no save confirmed." }, 503);
  }
}
