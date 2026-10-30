/** Read-only connection-level authority verification before HTTP listener activation. */
export async function verifyAdvancedDatabaseAuthority(sql) {
  if (typeof sql !== 'function') throw Error('advanced_database_unavailable');
  const [identity] = await sql`SELECT current_user AS role_name,
    rolsuper AS is_superuser, rolbypassrls AS bypass_rls
    FROM pg_roles WHERE rolname = current_user`;
  if (!identity || identity.is_superuser || identity.bypass_rls ||
      identity.role_name !== 'lotscope_advanced_broker')
    throw Error('advanced_database_role_not_dedicated');
  const [rights] = await sql`SELECT
    has_table_privilege(current_user, 'lotscope_advanced_projects', 'SELECT') AS read_projects,
    has_table_privilege(current_user, 'lotscope_advanced_projects', 'INSERT') AS insert_projects,
    has_table_privilege(current_user, 'lotscope_advanced_projects', 'UPDATE') AS update_projects,
    has_table_privilege(current_user, 'lotscope_advanced_projects', 'DELETE') AS delete_projects,
    has_table_privilege(current_user, 'lotscope_advanced_revisions', 'SELECT') AS read_revisions,
    has_table_privilege(current_user, 'lotscope_advanced_revisions', 'INSERT') AS insert_revisions,
    has_table_privilege(current_user, 'lotscope_advanced_revisions', 'UPDATE') AS update_revisions,
    has_table_privilege(current_user, 'lotscope_advanced_revisions', 'DELETE') AS delete_revisions,
    has_table_privilege(current_user, 'lotscope_advanced_replay_claims', 'SELECT') AS read_replay,
    has_table_privilege(current_user, 'lotscope_advanced_replay_claims', 'INSERT') AS insert_replay,
    has_table_privilege(current_user, 'lotscope_advanced_replay_claims', 'DELETE') AS delete_replay`;
  if (!rights || !rights.read_projects || rights.insert_projects || rights.update_projects ||
      rights.delete_projects || !rights.read_revisions || !rights.insert_revisions ||
      rights.update_revisions || rights.delete_revisions || !rights.read_replay ||
      !rights.insert_replay || !rights.delete_replay)
    throw Error('advanced_database_privileges_invalid');
  return true;
}
