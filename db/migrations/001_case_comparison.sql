-- LotScope owns case data. AVCC remains the identity/capability authority.
-- Apply explicitly to the intended Neon branch; do not run automatically at request time.
BEGIN;
CREATE TABLE IF NOT EXISTS lotscope_case (
  owner_identity_id text NOT NULL,
  case_id text NOT NULL,
  revision integer NOT NULL CHECK (revision > 0),
  document jsonb NOT NULL CHECK (jsonb_typeof(document) = 'object'),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_identity_id, case_id)
);
CREATE TABLE IF NOT EXISTS lotscope_case_revision (
  owner_identity_id text NOT NULL,
  case_id text NOT NULL,
  revision integer NOT NULL CHECK (revision > 0),
  document jsonb NOT NULL CHECK (jsonb_typeof(document) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_identity_id, case_id, revision)
);
CREATE OR REPLACE FUNCTION lotscope_record_case_revision()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO lotscope_case_revision (owner_identity_id, case_id, revision, document)
  VALUES (NEW.owner_identity_id, NEW.case_id, NEW.revision, NEW.document);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS lotscope_case_revision_capture ON lotscope_case;
CREATE TRIGGER lotscope_case_revision_capture
AFTER INSERT OR UPDATE OF document ON lotscope_case
FOR EACH ROW EXECUTE FUNCTION lotscope_record_case_revision();
-- Defense in depth: an application SQL role may append case snapshots but must
-- never rewrite the recorded history through ordinary UPDATE/DELETE statements.
CREATE OR REPLACE FUNCTION lotscope_reject_revision_mutation()
RETURNS trigger LANGUAGE plpgsql AS $immutable$
BEGIN
  RAISE EXCEPTION 'Case revision history is append-only';
END;
$immutable$;
DROP TRIGGER IF EXISTS lotscope_case_revision_immutable ON lotscope_case_revision;
CREATE TRIGGER lotscope_case_revision_immutable
BEFORE UPDATE OR DELETE ON lotscope_case_revision
FOR EACH ROW EXECUTE FUNCTION lotscope_reject_revision_mutation();
COMMIT;
