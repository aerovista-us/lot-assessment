import "server-only";
import { createHmac } from "node:crypto";

/**
 * Proposal for the private NXCore persistence broker.
 * Reuses AeroVista's existing HMAC wire format:
 * METHOD + newline + exact path + newline + ISO timestamp + newline + raw body.
 *
 * This helper does NOT perform a request, resolve customer identity, grant
 * permissions, or expose the internal PostgreSQL host. Broker-side verification
 * and per-resource authorization are separate mandatory acceptance gates.
 */
export const ADVANCED_BROKER_SERVICE_ID = "lotscope_advanced";
export const ADVANCED_BROKER_ALLOWED_PATH = /^\/v1\/advanced\/(?:projects\/[a-zA-Z0-9_-]{1,128}(?:\/revisions\/[a-zA-Z0-9_-]{1,128}|\/report)?|health)$/;

export function signAdvancedBrokerRequest(
  method: "GET" | "PUT" | "POST",
  path: string,
  body: string,
  secret: string,
  timestamp: string,
): Record<string, string> {
  if (!ADVANCED_BROKER_ALLOWED_PATH.test(path) || path.includes("..")) {
    throw new Error("invalid_broker_path");
  }
  if (!secret || secret.length < 32) throw new Error("broker_secret_unconfigured");
  if (!Number.isFinite(Date.parse(timestamp)) || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(timestamp)) {
    throw new Error("invalid_broker_timestamp");
  }
  const payload = `${method}\n${path}\n${timestamp}\n${body}`;
  const signature = createHmac("sha256", secret).update(payload, "utf8").digest("hex");
  return {
    "X-AV-Service": ADVANCED_BROKER_SERVICE_ID,
    "X-AV-Timestamp": timestamp,
    "X-AV-Signature": signature,
  };
}
