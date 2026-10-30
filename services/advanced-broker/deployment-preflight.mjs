import { readFileSync } from 'node:fs';

/** Read-only. Never prints or exports credential values. */
export function checkGatewayDeployment({ composeText, secretEnvText, runningRegistered = false, runningSecretPresent = false }) {
  const problems = [];
  const key = 'IDGW_SERVICE_SECRET_LOTSCOPE_ADVANCED';
  if (!new RegExp(`^\\s*${key}:\\s*['\"]?\\$\\{${key}:-\\}`, 'm').test(composeText))
    problems.push('compose_missing_advanced_secret_mapping');
  const env = Object.fromEntries(secretEnvText.split(/\r?\n/)
    .filter(line => /^[A-Z][A-Z0-9_]*=/.test(line))
    .map(line => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]));
  if ((env[key] || '').length < 32) problems.push('protected_env_missing_advanced_secret');
  const addition = (env.IDGW_BROKER_SERVICE_ADDITIONS || '').split(',').map(s => s.trim());
  if (!addition.includes('lotscope_advanced')) problems.push('protected_env_missing_advanced_registration');
  if (!runningRegistered) problems.push('runtime_registration_not_active');
  if (!runningSecretPresent) problems.push('runtime_secret_not_active');
  return { ready: problems.length === 0, problems };
}
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const compose = process.argv[2];
  const protectedEnv = process.argv[3];
  if (!compose || !protectedEnv) throw Error('usage: node deployment-preflight.mjs <compose> <protected-env>');
  const { ready, problems } = checkGatewayDeployment({
    composeText: readFileSync(compose, 'utf8'),
    secretEnvText: readFileSync(protectedEnv, 'utf8'),
    runningRegistered: process.env.ADVANCED_RUNTIME_REGISTERED === 'true',
    runningSecretPresent: process.env.ADVANCED_RUNTIME_SECRET_PRESENT === 'true',
  });
  console.log(JSON.stringify({ ready, problems }));
  if (!ready) process.exitCode = 2;
}
