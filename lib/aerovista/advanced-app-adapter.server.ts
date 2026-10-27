import 'server-only';
import { createServerAppAdapter } from '@aerovista-us/app-adapter/server';
import { LOTSCOPE_ADVANCED_APP_ID } from './advanced-config';
import { normalizeGatewayResponse } from './gateway-response';

/** Independent relying party. Never fall back to the founder Workbench secret. */
export function getAdvancedAeroVistaServerAdapter() {
  const identityGatewaySecret = process.env.IDGW_SERVICE_SECRET_LOTSCOPE_ADVANCED;
  if (!identityGatewaySecret) throw Error('Advanced Identity Gateway client is not configured.');
  return createServerAppAdapter({
    appId: LOTSCOPE_ADVANCED_APP_ID,
    identityGatewaySecret,
    fetchImpl: async (input, init) => normalizeGatewayResponse(await fetch(input, init)),
  });
}
