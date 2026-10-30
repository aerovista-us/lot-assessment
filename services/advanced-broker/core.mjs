import { createHmac, createHash, timingSafeEqual } from 'node:crypto';

const paths = /^\/v1\/advanced\/projects\/([a-zA-Z0-9_-]{1,128})\/revisions\/([a-zA-Z0-9_-]{1,128})$/;
const maxBytes = 2_000_000;
const code = (status, error) => ({ status, body: { error } });
const sha = (value) => createHash('sha256').update(value).digest('hex');
const json = (value) => JSON.stringify(value);
const canonical = (value) => Array.isArray(value) ? `[${value.map(canonical).join(',')}]` : value && typeof value === 'object'
  ? `{${Object.keys(value).filter(k=>value[k]!==undefined).sort().map(k=>`${json(k)}:${canonical(value[k])}`).join(',')}}` : json(value);
export const canonicalHash = (value) => sha(canonical(value));

/** HMAC verifies the service, not the human or ownership. Never trust a body identityId. */
export function createAdvancedBroker({ secret, authorize, validate, store, clock = () => Date.now() }) {
  if (typeof secret !== 'string' || secret.length < 32 || typeof authorize !== 'function' || typeof validate !== 'function' ||
      !store || typeof store.save !== 'function' || typeof store.read !== 'function') throw Error('broker_configuration_incomplete');
  const seen = new Map();
  return async function handle({ method, path, headers, rawBody }) {
    if (!['GET', 'PUT'].includes(method) || typeof path !== 'string' || !paths.test(path)) return code(404, 'not_found');
    if (typeof rawBody !== 'string' || Buffer.byteLength(rawBody, 'utf8') > maxBytes) return code(413, 'payload_too_large');
    const service = headers['x-av-service'];
    const ts = headers['x-av-timestamp'];
    const signature = headers['x-av-signature'];
    if (service !== 'lotscope_advanced' || typeof ts !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(ts) ||
        !Number.isFinite(Date.parse(ts)) || Math.abs(clock() - Date.parse(ts)) > 300_000 ||
        typeof signature !== 'string' || !/^[0-9a-f]{64}$/.test(signature)) return code(401, 'service_auth_denied');
    const expected = createHmac('sha256', secret).update(`${method}\n${path}\n${ts}\n${rawBody}`).digest();
    if (!timingSafeEqual(expected, Buffer.from(signature, 'hex'))) return code(401, 'service_auth_denied');
    // Prevent signed PUT replays within the accepted timestamp window, without blocking distinct revisions.
    const replayKey = sha(`${method}\n${path}\n${ts}\n${signature}`);
    if (method === 'PUT') {
      for (const [key, expiry] of seen) if (expiry < clock()) seen.delete(key);
      if (seen.has(replayKey)) return code(409, 'signed_request_replayed');
      seen.set(replayKey, clock() + 300_000);
    }
    let body;
    try { body = JSON.parse(rawBody); } catch { return code(400, 'invalid_json'); }
    if (!body || typeof body !== 'object' || typeof body.sessionToken !== 'string' ||
        body.sessionToken.length < 24 || body.sessionToken.length > 2048) return code(401, 'customer_session_required');
    const [, projectId, candidateId] = path.match(paths);
    let identityId;
    try {
      // authorize must resolve a LIVE session using a trusted service, then check
      // lotscope.advanced.access plus resource-scoped project read/edit independently.
      identityId = await authorize({ sessionToken: body.sessionToken, projectId, capability: method === 'PUT' ? 'lotscope.project.edit' : 'lotscope.project.read' });
    } catch { return code(503, 'customer_authorization_unavailable'); }
    if (typeof identityId !== 'string' || !identityId) return code(403, 'project_access_denied');
    try {
      if (method === 'GET') {
        const record = await store.read({ projectId, candidateId });
        return record ? { status: 200, body: record } : code(404, 'revision_not_found');
      }
      if (!body.candidate || !body.document || body.candidate.projectId !== projectId ||
          body.candidate.id !== candidateId || body.document.projectId !== projectId ||
          body.document.candidateId !== candidateId || !Number.isInteger(body.document.revision) || body.document.revision < 1)
        return code(400, 'invalid_revision_binding');
      // Shared geometry validation must run before any write; broker never trusts
      // the candidate's self-declared source signature.
      try { await validate(body.candidate, body.document); } catch { return code(422, 'invalid_design_geometry'); }
      // Database adapter separately verifies staff-provisioned canonical source.
      const result = await store.save({ projectId, candidateId, identityId, candidate: body.candidate, document: body.document });
      if (result === 'conflict') return code(409, 'revision_conflict');
      return { status: result === 'created' ? 201 : 200, body: { saved: true, revision: body.document.revision, unchanged: result === 'unchanged' } };
    } catch (error) {
      if (error?.message === 'canonical_source_mismatch' || error?.message === 'project_not_provisioned') return code(422, 'canonical_source_rejected');
      return code(503, 'storage_unavailable');
    }
  };
}
