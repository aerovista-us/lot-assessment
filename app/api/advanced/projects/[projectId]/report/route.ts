import { NextResponse } from "next/server";
import { authorizeAdvancedProject } from "@/lib/aerovista/advanced-access";
import { validateDesignDocument, type DesignDocument } from "@/packages/candidates/design-document";
import { createCandidateConceptHtml } from "@/packages/candidates/customer-report";
import type { CandidateRecord } from "@/packages/candidates";

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
  const body = await request.json().catch(() => null) as
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
    const report = await createCandidateConceptHtml(candidate, document);
    return new NextResponse(report.html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "content-disposition": "attachment; filename=customer-concept.html",
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "invalid_or_stale_saved_revision" }, {
      status: 422, headers: { "cache-control": "no-store" },
    });
  }
}
