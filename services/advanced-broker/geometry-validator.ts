import { validateDesignDocument } from '../../packages/candidates/design-document';
import type { CandidateRecord } from '../../packages/candidates';
import type { DesignDocument } from '../../packages/candidates/design-document';

/** Reuse the existing universal validator, not a separate acceptance implementation. */
export function validateAdvancedBrokerGeometry(candidate: CandidateRecord, document: DesignDocument) {
  return validateDesignDocument(candidate, document);
}
