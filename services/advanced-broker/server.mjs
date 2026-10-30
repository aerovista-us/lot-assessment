/** NXCore-only broker launcher. Not wired into a public deployment. */
import postgres from 'postgres';
import { createAdvancedBroker } from './core.mjs';
import { createAdvancedBrokerHttp } from './http.mjs';
import { createPostgresRevisionStore } from './postgres-store.mjs';
import { configureAdvancedIdentityAuthorizer } from './identity-adapter.server.mjs';
import { validateAdvancedBrokerGeometry } from './geometry-validator.ts';

const secret = process.env.LOTSCOPE_ADVANCED_BROKER_HMAC_SECRET ?? '';
const databaseUrl = process.env.LOTSCOPE_ADVANCED_PRIVATE_DATABASE_URL ?? '';
const port = Number(process.env.LOTSCOPE_ADVANCED_BROKER_PORT ?? '18897');
if (secret.length < 32 || !databaseUrl || !Number.isSafeInteger(port) || port < 1024 || port > 65535)
  throw Error('advanced_broker_configuration_incomplete');
const database = new URL(databaseUrl);
if (!['127.0.0.1', 'localhost'].includes(database.hostname) && !database.hostname.startsWith('10.'))
  throw Error('advanced_database_must_be_private');
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
