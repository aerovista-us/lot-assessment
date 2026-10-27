import 'server-only';
import postgres from 'postgres';
import { createHash } from 'node:crypto';
import type { CandidateRecord } from '@/packages/candidates';
import { designSourceSignature, validateDesignDocument, type DesignDocument } from '@/packages/candidates/design-document';

let database: ReturnType<typeof postgres> | null = null;
function connection() {
  const url = process.env.LOTSCOPE_ADVANCED_DATABASE_URL;
  if (!url) throw new Error('advanced_store_unconfigured');
  // One pool per server process; never leak credentials or SQL details to clients.
  return database ??= postgres(url, { max: 3, idle_timeout: 15, connect_timeout: 5, ssl: 'require' });
}
function digest(text: string) { return createHash('sha256').update(text).digest('hex'); }
function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().filter(key => (value as Record<string,unknown>)[key] !== undefined).map(key => JSON.stringify(key) + ':' + canonical((value as Record<string,unknown>)[key])).join(',') + '}';
  return JSON.stringify(value);
}
/** Only staff-provisioned canonical parcel geometry can authorize a design revision. */
async function requireCanonicalProjectSource(sql: ReturnType<typeof postgres>, projectId: string, candidate: CandidateRecord) {
  const parcel = candidate.components.filter(c => c.kind === 'parcel');
  if (parcel.length !== 1) throw Error('invalid_canonical_parcel');
  const rows = await sql`SELECT source_parcel_sha256, source_parcel FROM lotscope_advanced_projects WHERE project_id=${projectId}`;
  if (rows.length !== 1) throw Error('canonical_project_not_provisioned');
  const source = rows[0].source_parcel;
  if (digest(canonical(source)) !== rows[0].source_parcel_sha256 ||
      digest(canonical(parcel[0])) !== rows[0].source_parcel_sha256)
    throw Error('canonical_project_source_mismatch');
}

export type SavedRevision = { candidate: CandidateRecord; document: DesignDocument; payloadSha256: string };
export type SaveRevisionOutcome = 'created' | 'unchanged' | 'conflict';

/** Immutable revisions prevent a lost update or an accidental downgrade. */
export async function storeAdvancedRevision(projectId: string, identityId: string, candidate: CandidateRecord, document: DesignDocument): Promise<SaveRevisionOutcome> {
  if (candidate.projectId !== projectId || document.projectId !== projectId || document.candidateId !== candidate.id) throw Error('invalid_project_binding');
  validateDesignDocument(candidate, document);
  if (document.revision < 1) throw Error('unsaved_revision');
  const sourceHash = digest(designSourceSignature(candidate));
  const payloadHash = digest(canonical([candidate, document]));
  const sql = connection();
  await requireCanonicalProjectSource(sql, projectId, candidate);
  const inserted = await sql`
    INSERT INTO lotscope_advanced_revisions
      (project_id,candidate_id,revision,identity_id,source_signature_sha256,payload_sha256,candidate,design_document)
    VALUES (${projectId},${candidate.id},${document.revision},${identityId},${sourceHash},${payloadHash},${sql.json(candidate)},${sql.json(document)})
    ON CONFLICT (project_id,candidate_id,revision) DO NOTHING
    RETURNING revision
  `;
  if (inserted.length) return 'created';
  const existing = await sql`
    SELECT payload_sha256 FROM lotscope_advanced_revisions
    WHERE project_id=${projectId} AND candidate_id=${candidate.id} AND revision=${document.revision}
  `;
  return existing[0]?.payload_sha256 === payloadHash ? 'unchanged' : 'conflict';
}

export async function readAdvancedRevision(projectId: string, candidateId: string): Promise<SavedRevision | null> {
  const sql = connection();
  const rows = await sql`
    SELECT candidate, design_document, payload_sha256 FROM lotscope_advanced_revisions
    WHERE project_id=${projectId} AND candidate_id=${candidateId}
    ORDER BY revision DESC LIMIT 1
  `;
  if (!rows.length) return null;
  const candidate = rows[0].candidate as CandidateRecord;
  const document = rows[0].design_document as DesignDocument;
  if (candidate.projectId !== projectId || candidate.id !== candidateId || document.projectId !== projectId || document.candidateId !== candidateId) throw Error('stored_project_binding_invalid');
  validateDesignDocument(candidate, document);
  await requireCanonicalProjectSource(sql, projectId, candidate);
  if (digest(canonical([candidate, document])) !== rows[0].payload_sha256) throw Error('stored_payload_integrity_invalid');
  return { candidate, document, payloadSha256: rows[0].payload_sha256 as string };
}

/** Reject reports made from unsigned browser-local copies or superseded revisions.
 * Only the latest persisted, source-checked revision can be customer-published. */
export async function verifyReportSnapshot(
  projectId: string, candidate: CandidateRecord, document: DesignDocument,
): Promise<SavedRevision | null> {
  if (!candidate?.id || candidate.projectId !== projectId ||
      document?.projectId !== projectId || document.candidateId !== candidate.id ||
      !Number.isInteger(document.revision) || document.revision < 1) return null;
  const saved = await readAdvancedRevision(projectId, candidate.id);
  if (!saved || saved.document.revision !== document.revision ||
      saved.payloadSha256 !== digest(canonical([candidate, document]))) return null;
  return saved;
}
