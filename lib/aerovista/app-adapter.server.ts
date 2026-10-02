import "server-only";
import { createServerAppAdapter } from "@aerovista-us/app-adapter/server";
import { LOTSCOPE_APP_ID } from "./config";

export function getAeroVistaServerAdapter() {
  const identityGatewaySecret = process.env.IDGW_SERVICE_SECRET_LOTSCOPE_WORKBENCH;
  if (!identityGatewaySecret) throw new Error("IDGW_SERVICE_SECRET_LOTSCOPE_WORKBENCH is not configured.");
  return createServerAppAdapter({ appId: LOTSCOPE_APP_ID, identityGatewaySecret });
}
