/** Only the NXCore broker process loads this module and its secrets. */
import { createServerAppAdapter } from '@aerovista-us/app-adapter/server';
import { createIdentityProjectAuthorizer } from './identity-authorizer.mjs';

export function configureAdvancedIdentityAuthorizer({ gatewaySecret = process.env.IDGW_SERVICE_SECRET_LOTSCOPE_ADVANCED, gatewayOrigin = process.env.IDGW_BROKER_ORIGIN || 'http://identity-gateway:3110', fetchImpl } = {}) {
  if (!gatewaySecret || gatewaySecret.length < 32) throw Error('advanced_gateway_service_secret_unconfigured');
  const url = new URL(gatewayOrigin);
  // Keep the default broker transport on the private container network.
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && url.hostname === 'identity-gateway')) {
    throw Error('unsupported_identity_gateway_origin');
  }
  const adapter = createServerAppAdapter({
    appId: 'lotscope_advanced',
    identityGatewaySecret: gatewaySecret,
    identityGatewayOrigin: url.origin,
    ...(fetchImpl ? { fetchImpl } : {}),
  });
  return createIdentityProjectAuthorizer(adapter);
}
