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
COMMIT;
