/**
 * Live project-scoped authorization backed by AeroVista Identity Gateway.
 * NO role shortcut, local entitlement cache, or browser-supplied identity is trusted.
 */
export function createIdentityProjectAuthorizer(adapter) {
  if (!adapter?.auth?.resolveSession || !adapter?.identity?.can) throw Error('identity_adapter_required');
  return async ({ sessionToken, projectId, capability }) => {
    if (typeof sessionToken !== 'string' || sessionToken.length < 24 ||
        !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(projectId) ||
        !['lotscope.project.read', 'lotscope.project.edit'].includes(capability)) return null;
    // Live every request. A revoked/expired session must not reuse any prior authorization.
    const session = await adapter.auth.resolveSession(sessionToken);
    if (session?.authenticated !== true || typeof session.identityId !== 'string' || !session.identityId) return null;
    const identityId = session.identityId;
    const paid = await adapter.identity.can({ identityId, capability: 'lotscope.advanced.access' });
    if (paid?.allowed !== true) return null;
    const project = await adapter.identity.can({ identityId, capability, resourceType: 'lotscope_project', resourceId: projectId });
    return project?.allowed === true ? identityId : null;
  };
}
