/** Side-effect-free deploy readiness checks: never return credentials. */
import { isIP } from 'node:net';

const bad = (reason) => ({ ready: false, reason });
export function evaluateAdvancedBrokerReadiness({ brokerSecret, identitySecret, databaseUrl, gatewayOrigin, gatewayRegistered, databaseRole, projectProvisioned }) {
  if (typeof brokerSecret !== 'string' || brokerSecret.length < 32) return bad('broker_hmac_unconfigured');
  if (typeof identitySecret !== 'string' || identitySecret.length < 32 || identitySecret === brokerSecret) return bad('identity_secret_unconfigured_or_reused');
  if (gatewayRegistered !== true) return bad('identity_gateway_registration_missing');
  if (typeof gatewayOrigin !== 'string') return bad('gateway_origin_invalid');
  let gateway, database;
  try { gateway = new URL(gatewayOrigin); database = new URL(databaseUrl); } catch { return bad('runtime_url_invalid'); }
  if (gateway.username || gateway.password || gateway.search || gateway.hash ||
      !(gateway.protocol === 'https:' || (gateway.protocol === 'http:' && gateway.hostname === 'identity-gateway')))
    return bad('gateway_origin_not_private_or_tls');
  if (!['postgres:', 'postgresql:'].includes(database.protocol) || !database.username || !database.password ||
      database.search || database.hash || !database.pathname || database.pathname === '/')
    return bad('postgres_connection_invalid');
  // Hostnames on an approved private overlay must be declared explicitly; an
  // arbitrary 10.x address alone is insufficient evidence of private routing.
  const host = database.hostname;
  if (host !== 'localhost' && host !== '127.0.0.1' && host !== 'acos-agent-postgres' &&
      !(isIP(host) === 4 && /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)))
    return bad('postgres_host_not_private');
  if (databaseRole !== 'lotscope_advanced_broker') return bad('dedicated_postgres_role_missing');
  if (projectProvisioned !== true) return bad('canonical_project_source_unprovisioned');
  return { ready: true, reason: 'configuration_preflight_passed_not_live_authorization_proof' };
}
