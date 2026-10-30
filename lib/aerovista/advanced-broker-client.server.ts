import "server-only";
import { signAdvancedBrokerRequest } from "./advanced-broker-signature";

/**
 * Only the trusted Next.js server may load the broker signing secret.
 * Never export the secret, call this from a client component, or use
 * a browser-supplied identity as authorization for a project.
 */
export function signAuthorizedAdvancedBrokerRequest(
  method: "GET" | "PUT" | "POST",
  path: string,
  body: string,
  timestamp: string = new Date().toISOString(),
): Record<string, string> {
  const secret = process.env.LOTSCOPE_ADVANCED_BROKER_HMAC_SECRET ?? "";
  return signAdvancedBrokerRequest(method, path, body, secret, timestamp);
}
