/** NXCore-only broker launcher. Not wired into a public deployment. */
import postgres from 'postgres';
import { createAdvancedBroker } from './core.mjs';
import { createAdvancedBrokerHttp } from './http.mjs';
import { createPostgresRevisionStore } from './postgres-store.mjs';
import { configureAdvancedIdentityAuthorizer } from './identity-adapter.server.mjs';
import { validateAdvancedBrokerGeometry } from './geometry-validator.ts';
import { evaluateAdvancedBrokerReadiness } from './readiness.mjs';

const secret = process.env.LOTSCOPE_ADVANCED_BROKER_HMAC_SECRET ?? '';
const databaseUrl = process.env.LOTSCOPE_ADVANCED_PRIVATE_DATABASE_URL ?? '';
const port = Number(process.env.LOTSCOPE_ADVANCED_BROKER_PORT ?? '18897');
if (secret.length < 32 || !databaseUrl || !Number.isSafeInteger(port) || port < 1024 || port > 65535)
  throw Error('advanced_broker_configuration_incomplete');
const readiness = evaluateAdvancedBrokerReadiness({
  brokerSecret: secret,
  identitySecret: process.env.IDGW_SERVICE_SECRET_LOTSCOPE_ADVANCED,
  databaseUrl,
  gatewayOrigin: process.env.IDGW_BROKER_ORIGIN || 'http://identity-gateway:3110',
  gatewayRegistered: process.env.LOTSCOPE_ADVANCED_GATEWAY_REGISTERED === 'true',
  databaseRole: process.env.LOTSCOPE_ADVANCED_DATABASE_ROLE,
  projectProvisioned: process.env.LOTSCOPE_ADVANCED_CANONICAL_SOURCE_PROVISIONED === 'true',
});
if (!readiness.ready) throw Error(`advanced_broker_not_ready:${readiness.reason}`);
// The explicit readiness flags are operator assertions; real entitlement and
// source authorization still run for every request and must be acceptance-tested.
const sql = postgres(databaseUrl, { max: 5, connect_timeout: 5, idle_timeout: 15 });
const authorize = configureAdvancedIdentityAuthorizer();
const handle = createAdvancedBroker({
  secret,
  authorize,
  validate: validateAdvancedBrokerGeometry,
  store: createPostgresRevisionStore(sql),
});
const server = createAdvancedBrokerHttp({ handle });
server.listen(port, '127.0.0.1', () => {
  // No hostname, secrets, user identity or DB URL in logs.
  console.info('[advanced-broker] private localhost listener ready', { port });
});
const shutdown = () => server.close(() => { void sql.end().then(() => process.exit(0)); });
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
