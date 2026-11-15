-- Preview acceptance: run only after identifying Neon project AND isolated branch.
-- All test writes are rolled back. Do not use this script to perform the migration.
BEGIN;
DO $proof$
DECLARE
  first_revision integer;
  last_revision integer;
  owner_count integer;
  modified integer;
  rejected_update boolean := false;
  rejected_delete boolean := false;
BEGIN
  IF to_regclass('public.lotscope_case') IS NULL
    OR to_regclass('public.lotscope_case_revision') IS NULL THEN
    RAISE EXCEPTION 'Case migration is absent from this database';
  END IF;
  IF (SELECT count(*) FROM pg_trigger
      WHERE tgrelid = 'public.lotscope_case'::regclass
        AND tgname = 'lotscope_case_revision_capture' AND NOT tgisinternal) <> 1
    OR (SELECT count(*) FROM pg_trigger
      WHERE tgrelid = 'public.lotscope_case_revision'::regclass
        AND tgname = 'lotscope_case_revision_immutable' AND NOT tgisinternal) <> 1 THEN
    RAISE EXCEPTION 'Case revision capture/immutable trigger missing';
  END IF;
  -- Fixed probe owner has no authority in application auth. Transaction rolls back.
  INSERT INTO lotscope_case(owner_identity_id,case_id,revision,document)
    VALUES ('__preview_acceptance_probe__','PROBE-001',1,'{"id":"PROBE-001","version":1}'::jsonb)
    ON CONFLICT (owner_identity_id,case_id) DO NOTHING;
  GET DIAGNOSTICS modified = ROW_COUNT;
  IF modified <> 1 THEN RAISE EXCEPTION 'Probe already exists; select a clean isolated branch'; END IF;
  SELECT count(*) INTO first_revision FROM lotscope_case_revision
    WHERE owner_identity_id='__preview_acceptance_probe__' AND case_id='PROBE-001';
  IF first_revision <> 1 THEN RAISE EXCEPTION 'Insert revision not captured'; END IF;
  UPDATE lotscope_case SET revision=2,document='{"id":"PROBE-001","version":2}'::jsonb
    WHERE owner_identity_id='__preview_acceptance_probe__' AND case_id='PROBE-001' AND revision=1;
  GET DIAGNOSTICS modified = ROW_COUNT;
  IF modified <> 1 THEN RAISE EXCEPTION 'Optimistic update failed'; END IF;
  UPDATE lotscope_case SET revision=3,document='{"id":"PROBE-001","stale":true}'::jsonb
    WHERE owner_identity_id='__preview_acceptance_probe__' AND case_id='PROBE-001' AND revision=1;
  GET DIAGNOSTICS modified = ROW_COUNT;
  IF modified <> 0 THEN RAISE EXCEPTION 'Stale update was accepted'; END IF;
  SELECT count(*) INTO last_revision FROM lotscope_case_revision
    WHERE owner_identity_id='__preview_acceptance_probe__' AND case_id='PROBE-001';
  IF last_revision <> 2 THEN RAISE EXCEPTION 'Revision history count wrong'; END IF;
  SELECT count(*) INTO owner_count FROM lotscope_case
    WHERE owner_identity_id='__other_probe__' AND case_id='PROBE-001';
  IF owner_count <> 0 THEN RAISE EXCEPTION 'Cross-owner case visible'; END IF;
  BEGIN
    DELETE FROM lotscope_case_revision
      WHERE owner_identity_id='__preview_acceptance_probe__' AND case_id='PROBE-001' AND revision=1;
  EXCEPTION WHEN raise_exception THEN rejected_delete := true;
  END;
  IF NOT rejected_delete THEN RAISE EXCEPTION 'Revision delete was not protected'; END IF;
  BEGIN
    UPDATE lotscope_case_revision SET document='{"tampered":true}'::jsonb
      WHERE owner_identity_id='__preview_acceptance_probe__' AND case_id='PROBE-001' AND revision=1;
  EXCEPTION WHEN raise_exception THEN rejected_update := true;
  END;
  IF NOT rejected_update THEN RAISE EXCEPTION 'Revision mutation was not protected'; END IF;
  RAISE NOTICE 'PASS schema, triggers, append-only history, stale conflict, owner isolation';
END $proof$;
ROLLBACK;
