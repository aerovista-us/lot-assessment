-- Integration acceptance for the SQL migration, runs only against disposable CI Postgres.
BEGIN;
DO $$
DECLARE
  revisions integer;
  current_revision integer;
  foreign_rows integer;
  changed_rows integer;
BEGIN
  INSERT INTO lotscope_case(owner_identity_id,case_id,revision,document)
  VALUES ('principal-a','TEST-001',1,'{"id":"TEST-001","state":"conditional"}'::jsonb);
  SELECT count(*) INTO revisions FROM lotscope_case_revision
    WHERE owner_identity_id='principal-a' AND case_id='TEST-001';
  IF revisions <> 1 THEN RAISE EXCEPTION 'initial insert did not snapshot revision'; END IF;
  UPDATE lotscope_case
    SET revision=2, document='{"id":"TEST-001","state":"conditional","note":"changed"}'::jsonb
    WHERE owner_identity_id='principal-a' AND case_id='TEST-001' AND revision=1;
  SELECT revision INTO current_revision FROM lotscope_case
    WHERE owner_identity_id='principal-a' AND case_id='TEST-001';
  IF current_revision <> 2 THEN RAISE EXCEPTION 'revision not updated'; END IF;
  SELECT count(*) INTO revisions FROM lotscope_case_revision
    WHERE owner_identity_id='principal-a' AND case_id='TEST-001';
  IF revisions <> 2 THEN RAISE EXCEPTION 'update did not append revision'; END IF;
  UPDATE lotscope_case SET revision=3, document='{"id":"TEST-001","bad":"stale"}'::jsonb
    WHERE owner_identity_id='principal-a' AND case_id='TEST-001' AND revision=1;
  GET DIAGNOSTICS changed_rows = ROW_COUNT;
  IF changed_rows <> 0 THEN RAISE EXCEPTION 'stale write unexpectedly replaced newer revision'; END IF;
  SELECT count(*) INTO foreign_rows FROM lotscope_case
    WHERE owner_identity_id='principal-b' AND case_id='TEST-001';
  IF foreign_rows <> 0 THEN RAISE EXCEPTION 'cross-owner data leak'; END IF;
  INSERT INTO lotscope_case(owner_identity_id,case_id,revision,document)
    VALUES ('principal-b','TEST-001',1,'{"id":"TEST-001","owner":"b"}'::jsonb);
  SELECT count(*) INTO foreign_rows FROM lotscope_case
    WHERE case_id='TEST-001';
  IF foreign_rows <> 2 THEN RAISE EXCEPTION 'owner namespace collision'; END IF;
  SELECT count(*) INTO revisions FROM lotscope_case_revision
    WHERE owner_identity_id='principal-b' AND case_id='TEST-001';
  IF revisions <> 1 THEN RAISE EXCEPTION 'owner b revision history incorrect'; END IF;
END $$;
ROLLBACK;
