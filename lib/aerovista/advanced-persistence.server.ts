import 'server-only';
import { getAdvancedSession } from './advanced-session';
import { signAuthorizedAdvancedBrokerRequest } from './advanced-broker-client.server';
import type { CandidateRecord } from '@/packages/candidates';
import type { DesignDocument } from '@/packages/candidates/design-document';

export type BrokerRevision = { candidate: CandidateRecord; document: DesignDocument; payloadSha256: string };
const idPattern = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/;
function endpoint(projectId: string, candidateId: string) {
  if (!idPattern.test(projectId) || !idPattern.test(candidateId)) throw Error('advanced_invalid_scope');
  return `/v1/advanced/projects/${projectId}/revisions/${candidateId}`;
}
export class AdvancedBrokerError extends Error {
  constructor(public readonly status: number, public readonly code: string) { super(code); }
}
async function requestBroker(method: 'POST' | 'PUT', projectId: string, candidateId: string, data?: { candidate: CandidateRecord; document: DesignDocument }): Promise<unknown> {
  const originString = process.env.LOTSCOPE_ADVANCED_BROKER_ORIGIN;
  if (!originString) throw new AdvancedBrokerError(503, 'advanced_broker_unconfigured');
  let origin: URL;
  try { origin = new URL(originString); } catch { throw new AdvancedBrokerError(503, 'advanced_broker_origin_invalid'); }
  // No public internet routing; a deliberately configured trusted private
  // proxy must carry the signed request to NXCore's loopback listener.
  if (origin.protocol !== 'https:' || origin.username || origin.password || origin.search || origin.hash || origin.pathname !== '/')
    throw new AdvancedBrokerError(503, 'advanced_private_broker_required');
  const session = await getAdvancedSession();
  if (!session) throw new AdvancedBrokerError(401, 'advanced_session_required');
  const path = endpoint(projectId, candidateId);
  const body = JSON.stringify({ sessionToken: session.sessionToken, ...(data || {}) });
  const signed = signAuthorizedAdvancedBrokerRequest(method, path, body);
  let response: Response;
  try {
    response = await fetch(new URL(path, origin), {
      method, body,
      headers: { ...signed, 'content-type': 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
  } catch { throw new AdvancedBrokerError(503, 'advanced_broker_unavailable'); }
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new AdvancedBrokerError(response.status, typeof result?.error === 'string' ? result.error : 'advanced_broker_failed');
  return result;
}
export async function readAccountSavedRevision(projectId: string, candidateId: string): Promise<BrokerRevision> {
  return requestBroker('POST', projectId, candidateId) as Promise<BrokerRevision>;
}
export async function saveAccountRevision(projectId: string, candidateId: string, candidate: CandidateRecord, document: DesignDocument): Promise<{saved:boolean; revision:number; unchanged:boolean}> {
  return requestBroker('PUT', projectId, candidateId, { candidate, document }) as Promise<{saved:boolean; revision:number; unchanged:boolean}>;
}
