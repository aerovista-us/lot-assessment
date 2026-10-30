-- Run against a separately provisioned managed PostgreSQL database before enabling Advanced persistence.
-- No destructive migrations and no writes to Pondy client repositories.
-- Staff/provisioning-only authoritative project parcel. No public API may insert here.
CREATE TABLE IF NOT EXISTS lotscope_advanced_projects (
  project_id text PRIMARY KEY,
  source_parcel_sha256 char(64) NOT NULL,
  source_parcel jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS lotscope_advanced_revisions (
  project_id text NOT NULL REFERENCES lotscope_advanced_projects(project_id),
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

-- Durable signed-write replay claims. Delete expired rows only after all
-- accepted signature timestamps are outside the replay window.
CREATE TABLE IF NOT EXISTS lotscope_advanced_replay_claims (
  replay_sha256 char(64) PRIMARY KEY,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lotscope_advanced_replay_expiry
  ON lotscope_advanced_replay_claims (expires_at);
