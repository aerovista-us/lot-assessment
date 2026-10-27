-- Run against a separately provisioned managed PostgreSQL database before enabling Advanced persistence.
-- No destructive migrations and no writes to Pondy client repositories.
CREATE TABLE IF NOT EXISTS lotscope_advanced_revisions (
  project_id text NOT NULL,
  candidate_id text NOT NULL,
  revision integer NOT NULL CHECK (revision >= 1),
  identity_id text NOT NULL,
  source_signature_sha256 char(64) NOT NULL,
  payload_sha256 char(64) NOT NULL,
  candidate jsonb NOT NULL,
  design_document jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, candidate_id, revision)
);
CREATE INDEX IF NOT EXISTS lotscope_advanced_revisions_latest
  ON lotscope_advanced_revisions (project_id, candidate_id, revision DESC);
-- DB credentials are server-only. Client ownership is authorized by Identity Gateway
-- before queries; the repository has no public database endpoint or service key.
