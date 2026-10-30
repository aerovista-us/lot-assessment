import { NextResponse } from 'next/server';
import { authorizeAdvancedProject } from '@/lib/aerovista/advanced-access';
import { readAccountSavedRevision, saveAccountRevision, AdvancedBrokerError } from '@/lib/aerovista/advanced-persistence.server';
import type { CandidateRecord } from '@/packages/candidates';
import type { DesignDocument } from '@/packages/candidates/design-document';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ projectId: string; candidateId: string }> };
const headers = { 'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff' };
function invalid(code: string, status: number) { return NextResponse.json({ error: code }, { status, headers }); }
function internalError(error: unknown) {
  if (error instanceof AdvancedBrokerError) return invalid(error.code, error.status);
  return invalid(error instanceof Error && error.message === 'advanced_store_unconfigured' ? 'advanced_store_unavailable' : 'advanced_store_error', 503);
}

/** Read latest immutable revision for the authorized project; cross-device resume. */
export async function GET(_request: Request, { params }: Context) {
  const { projectId, candidateId } = await params;
  const auth = await authorizeAdvancedProject(projectId);
  if (!auth.allowed) return invalid(auth.code, auth.status);
  if (!/^[a-zA-Z0-9][\w-]{0,127}$/.test(candidateId)) return invalid('invalid_candidate_id', 400);
  try {
    const saved = await readAccountSavedRevision(projectId, candidateId);
    if (!saved) return invalid('revision_not_found', 404);
    return NextResponse.json(saved, { headers });
  } catch (error) { return internalError(error); }
}

/** Save one exact revision; never overwrite previously persisted design data. */
export async function PUT(request: Request, { params }: Context) {
  const { projectId, candidateId } = await params;
  const auth = await authorizeAdvancedProject(projectId, "write");
  if (!auth.allowed) return invalid(auth.code, auth.status);
  if (!/^[a-zA-Z0-9][\w-]{0,127}$/.test(candidateId)) return invalid('invalid_candidate_id', 400);
  if (Number(request.headers.get('content-length') || 0) > 2_000_000) return invalid('revision_too_large', 413);
  let raw: string;
  try { raw = await request.text(); } catch { return invalid('invalid_revision_payload', 400); }
  if (raw.length > 2_000_000) return invalid('revision_too_large', 413);
  let value: { candidate?: CandidateRecord; document?: DesignDocument } | null = null;
  try { value = JSON.parse(raw); } catch { return invalid('invalid_revision_payload', 400); }
  if (!value?.candidate || !value.document || value.candidate.id !== candidateId || value.candidate.projectId !== projectId || value.document.candidateId !== candidateId || value.document.projectId !== projectId) return invalid('project_revision_mismatch', 400);
  try {
    const outcome = await saveAccountRevision(projectId, candidateId, value.candidate, value.document);
    return NextResponse.json(outcome, { status: outcome.unchanged ? 200 : 201, headers });
  } catch (error) {
    if (error instanceof Error && /^(invalid_project_binding|unsaved_revision|invalid_canonical_parcel|canonical_project_source_mismatch)$|^(Design document|Invalid|Missing|Self-crossing|Door|Room|Roof|Floor)/i.test(error.message)) return invalid('invalid_or_stale_revision', 422);
    return internalError(error);
  }
}
