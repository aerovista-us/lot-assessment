import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// This source-contract gate catches an accidentally exposed new project API.
// It does not substitute for Identity Gateway grant and browser tests.
const root = new URL('../app/api/workbench/', import.meta.url).pathname;
function routes(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? routes(path) : entry.name === 'route.ts' ? [path] : [];
  });
}
const protectedRoutes = routes(root).filter((path) => !path.includes('/auth/'));
assert.ok(protectedRoutes.length >= 11, 'Unexpectedly few Workbench project routes; audit the route inventory');
for (const path of protectedRoutes) {
  const source = readFileSync(path, 'utf8');
  assert.match(source, /import\s*\{\s*requireInternalWorkspaceApiAccess\s*\}\s*from\s*["']@\/lib\/aerovista\/api-guard["']/, `${path}: missing internal guard import`);
  assert.match(source, /await\s+requireInternalWorkspaceApiAccess\s*\(\s*\)/, `${path}: internal guard must execute`);
  assert.match(source, /if\s*\(authGuard\)\s*return\s+authGuard/, `${path}: guard denial must return`);
  assert.doesNotMatch(source, /requireWorkbenchApiAccess/, `${path}: generic Workbench access is insufficient`);
}
const guard = readFileSync(new URL('../lib/aerovista/api-guard.ts', import.meta.url), 'utf8');
assert.match(guard, /getWorkbenchAccess\s*\(/);
assert.match(guard, /capability:\s*["']lotscope\.workspace\.write["']/);
assert.match(guard, /decision\.allowed\s*\?/);
assert.match(guard, /workspace_capability_denied["'],\s*403/);
assert.match(guard, /workspace_authorization_unavailable["'],\s*503/);
console.log(`Workspace route guard contract passed (${protectedRoutes.length} routes).`);
