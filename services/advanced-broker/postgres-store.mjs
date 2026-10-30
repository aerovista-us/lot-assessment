import { canonicalHash } from './core.mjs';

/** SQL driver is injected: the real connection stays private on the NXCore host. */
export function createPostgresRevisionStore(sql) {
  if (typeof sql !== 'function') throw Error('database_unavailable');
  async function canonicalProject(projectId, candidate) {
    const projects = await sql`SELECT source_parcel_sha256, source_parcel, source_locked_components FROM lotscope_advanced_projects WHERE project_id = ${projectId}`;
    if (projects.length !== 1) throw Error('project_not_provisioned');
    const parcels = candidate?.components?.filter(component => component?.kind === 'parcel') || [];
    if (parcels.length !== 1 || canonicalHash(projects[0].source_parcel) !== projects[0].source_parcel_sha256 ||
        canonicalHash(parcels[0]) !== projects[0].source_parcel_sha256) throw Error('canonical_source_mismatch');
    // Server-side source locks are an allowlisted set of fixed geometry facts;
    // no customer request may modify, omit or duplicate an authoritative lock.
    const locks = projects[0].source_locked_components;
    if (!Array.isArray(locks) || locks.length === 0 || !Array.isArray(candidate?.components))
      throw Error('canonical_source_not_provisioned');
    const ids = new Set();
    for (const lock of locks) {
      if (!lock || typeof lock.id !== 'string' || !lock.id || ids.has(lock.id)) throw Error('canonical_source_corrupt');
      ids.add(lock.id);
      const matches = candidate.components.filter(component => component?.id === lock.id);
      if (matches.length !== 1 || canonicalHash(matches[0]) !== canonicalHash(lock))
        throw Error('canonical_source_mismatch');
    }
  }
  return {
    async claimReplay({ replayKey, expiresAt }) {
      if (!/^[0-9a-f]{64}$/.test(replayKey) || !(expiresAt instanceof Date) || !Number.isFinite(expiresAt.getTime()))
        throw Error('invalid_replay_claim');
      const result = await sql`INSERT INTO lotscope_advanced_replay_claims (replay_sha256, expires_at)
        VALUES (${replayKey}, ${expiresAt.toISOString()}) ON CONFLICT (replay_sha256) DO NOTHING RETURNING replay_sha256`;
      return result.length === 1;
    },
    async save({ projectId, candidateId, identityId, candidate, document }) {
      if (candidate.id !== candidateId || document.revision < 1) throw Error('invalid_revision_binding');
      await canonicalProject(projectId, candidate);
      const payloadSha = canonicalHash([candidate, document]);
      const sourceSha = canonicalHash(candidate.components);
      const inserted = await sql`
        INSERT INTO lotscope_advanced_revisions
          (project_id,candidate_id,revision,identity_id,source_signature_sha256,payload_sha256,candidate,design_document)
        VALUES (${projectId},${candidateId},${document.revision},${identityId},${sourceSha},${payloadSha},${sql.json(candidate)},${sql.json(document)})
        ON CONFLICT (project_id,candidate_id,revision) DO NOTHING RETURNING revision`;
      if (inserted.length) return 'created';
      const existing = await sql`SELECT payload_sha256 FROM lotscope_advanced_revisions WHERE project_id=${projectId} AND candidate_id=${candidateId} AND revision=${document.revision}`;
      return existing[0]?.payload_sha256 === payloadSha ? 'unchanged' : 'conflict';
    },
    async read({ projectId, candidateId }) {
      const rows = await sql`SELECT candidate,design_document,payload_sha256 FROM lotscope_advanced_revisions WHERE project_id=${projectId} AND candidate_id=${candidateId} ORDER BY revision DESC LIMIT 1`;
      if (!rows.length) return null;
      const { candidate, design_document: document, payload_sha256: payloadSha } = rows[0];
      if (candidate.projectId !== projectId || candidate.id !== candidateId || document.projectId !== projectId || document.candidateId !== candidateId ||
          canonicalHash([candidate, document]) !== payloadSha) throw Error('stored_revision_corrupt');
      await canonicalProject(projectId, candidate);
      return { candidate, document, payloadSha256: payloadSha };
    },
  };
}
