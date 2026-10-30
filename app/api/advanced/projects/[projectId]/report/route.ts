import { NextResponse } from "next/server";
import { authorizeAdvancedProject } from "@/lib/aerovista/advanced-access";
import { validateDesignDocument, type DesignDocument } from "@/packages/candidates/design-document";
import { createCandidateConceptHtml } from "@/packages/candidates/customer-report";
import type { CandidateRecord } from "@/packages/candidates";
import { readAccountSavedRevision, AdvancedBrokerError } from "@/lib/aerovista/advanced-persistence.server";
import { canonicalHash } from "@/lib/aerovista/advanced-canonical-hash";

export const dynamic = "force-dynamic";

/** Render exactly the selected saved revision, never a regenerated top-ranked draft. */
export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const auth = await authorizeAdvancedProject(projectId);
  if (!auth.allowed) {
    return NextResponse.json({ error: auth.code }, {
      status: auth.status,
      headers: { "cache-control": "no-store" },
    });
  }
  // Existing saved designs are browser-local. This accepts an explicit saved
  // revision snapshot; server persistence must be added in a separate release.
  const size = Number(request.headers.get("content-length") || "0");
  if (size > 2_000_000) {
    return NextResponse.json({ error: "report_payload_too_large" }, { status: 413 });
  }
  const raw = await request.text();
  if (raw.length > 2_000_000) return NextResponse.json({ error: "report_payload_too_large" }, { status: 413 });
  let parsed: unknown = null;
  try { parsed = JSON.parse(raw); } catch { /* invalid input */ }
  const body = parsed as
    { candidate?: CandidateRecord; document?: DesignDocument } | null;
  const candidate = body?.candidate;
  const document = body?.document;
  if (!candidate || !document || candidate.projectId !== projectId ||
      document.projectId !== projectId || document.candidateId !== candidate.id) {
    return NextResponse.json({ error: "saved_project_revision_required" }, { status: 400 });
  }
  try {
    validateDesignDocument(candidate, document);
    if (document.revision < 1) throw Error("Unsaved design revision");
    // Never publish a client-submitted draft as if it were an account-saved revision.
    // The authoritative data always comes from the project-owned persisted record.
    const saved = await readAccountSavedRevision(projectId, candidate.id);
    if (saved && (saved.document.revision !== document.revision || saved.payloadSha256 !== canonicalHash([candidate, document]))) return NextResponse.json({ error: 'saved_revision_not_current' }, {status:409, headers:{'cache-control':'no-store'}});
    if (!saved) return NextResponse.json({ error: "saved_revision_not_current" }, {
      status: 409, headers: { "cache-control": "no-store" },
    });
    const report = await createCandidateConceptHtml(saved.candidate, saved.document);
    return new NextResponse(report.html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "content-disposition": "attachment; filename=customer-concept.html",
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof AdvancedBrokerError) return NextResponse.json({error:error.code}, {status:error.status,headers:{'cache-control':'no-store'}});
    return NextResponse.json({ error: "invalid_or_stale_saved_revision" }, {
      status: 422, headers: { "cache-control": "no-store" },
    });
  }
}

/** Generate a report from the server-stored, authenticated latest revision. */
export async function GET(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const auth = await authorizeAdvancedProject(projectId);
  if (!auth.allowed) return NextResponse.json({ error: auth.code }, { status: auth.status, headers: { "cache-control": "no-store" } });
  const candidateId = new URL(request.url).searchParams.get("candidateId");
  if (!candidateId || !/^[a-zA-Z0-9][\w-]{0,127}$/.test(candidateId))
    return NextResponse.json({ error: "invalid_candidate_id" }, { status: 400 });
  try {
    const saved = await readAccountSavedRevision(projectId, candidateId);
    if (!saved) return NextResponse.json({ error: "revision_not_found" }, { status: 404 });
    const report = await createCandidateConceptHtml(saved.candidate, saved.document);
    return new NextResponse(report.html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
        "content-security-policy": "sandbox",
      },
    });
  } catch (error) {
    if (error instanceof AdvancedBrokerError) return NextResponse.json({error:error.code}, {status:error.status,headers:{'cache-control':'no-store'}});
    return NextResponse.json({ error: "advanced_report_unavailable" }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
