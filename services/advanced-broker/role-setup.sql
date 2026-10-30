-- Run only against a separately provisioned LotScope database as an operator.
-- Create a unique non-login group role; supply login credentials through a
-- separate secret manager, never by checking passwords into this repository.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lotscope_advanced_broker_rw') THEN
    CREATE ROLE lotscope_advanced_broker_rw NOLOGIN;
  END IF;
END $$;
REVOKE ALL ON lotscope_advanced_projects FROM PUBLIC;
REVOKE ALL ON lotscope_advanced_revisions FROM PUBLIC;
REVOKE ALL ON lotscope_advanced_replay_claims FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO lotscope_advanced_broker_rw;
GRANT SELECT ON lotscope_advanced_projects TO lotscope_advanced_broker_rw;
GRANT SELECT, INSERT ON lotscope_advanced_revisions TO lotscope_advanced_broker_rw;
GRANT SELECT, INSERT, DELETE ON lotscope_advanced_replay_claims TO lotscope_advanced_broker_rw;
-- Never grant INSERT/UPDATE/DELETE on canonical project source to the broker.
-- A separate audited staff provisioning process must manage that table.
