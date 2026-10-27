import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { safeAdvancedNext, LOTSCOPE_ADVANCED_APP_ID, LOTSCOPE_ADVANCED_SESSION_COOKIE } from '../lib/aerovista/advanced-config.ts';
const read = path => readFileSync(new URL('../'+path, import.meta.url), 'utf8');
assert.equal(LOTSCOPE_ADVANCED_APP_ID, 'lotscope_advanced');
assert.equal(LOTSCOPE_ADVANCED_SESSION_COOKIE, 'lotscope_advanced_session');
for (const input of [null, '', 'https://evil.example/advanced', '//evil.example/advanced', '/workbench', '/advanced\\evil.example', '/advanced-elsewhere']) {
  assert.equal(safeAdvancedNext(input), '/advanced');
}
assert.equal(safeAdvancedNext('/advanced/projects/owned-1'), '/advanced/projects/owned-1');
assert.equal(safeAdvancedNext('/advanced?tab=projects'), '/advanced?tab=projects');
const adapter = read('lib/aerovista/advanced-app-adapter.server.ts');
const session = read('lib/aerovista/advanced-session.ts');
const guard = read('lib/aerovista/advanced-access.ts');
const handoff = read('app/api/advanced/auth/handoff-exchange/route.ts');
const logout = read('app/api/advanced/auth/logout/route.ts');
assert.match(adapter, /IDGW_SERVICE_SECRET_LOTSCOPE_ADVANCED/);
assert.doesNotMatch(adapter, /IDGW_SERVICE_SECRET_LOTSCOPE_WORKBENCH/);
assert.match(session, /LOTSCOPE_ADVANCED_SESSION_COOKIE/);
assert.doesNotMatch(session, /LOTSCOPE_SESSION_COOKIE/);
assert.match(guard, /getAdvancedSession\(\)/);
assert.match(guard, /PROJECT_EDIT_CAPABILITY/);
assert.match(handoff, /capability: ADVANCED_CAPABILITY/);
assert.match(handoff, /revokeSession\(exchange\.sessionToken\)/);
assert.match(handoff, /LOTSCOPE_ADVANCED_SESSION_COOKIE/);
assert.match(logout, /LOTSCOPE_ADVANCED_SESSION_COOKIE/);
console.log('Independent Advanced SSO and callback contract: PASS');
