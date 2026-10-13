import "server-only";
import { createServerAppAdapter } from "@aerovista-us/app-adapter/server";
import { serverWorkbenchAppId } from "./config";
import { normalizeGatewayResponse } from "./gateway-response";

export function getAeroVistaServerAdapter() {
  const identityGatewaySecret = process.env.VERCEL_ENV === "preview"
    ? process.env.IDGW_SERVICE_SECRET_LOTSCOPE_WORKBENCH_PREVIEW
    : process.env.IDGW_SERVICE_SECRET_LOTSCOPE_WORKBENCH;
  if (!identityGatewaySecret) throw new Error("LotScope gateway service credential is not configured for this environment.");
  return createServerAppAdapter({
    appId:serverWorkbenchAppId(), identityGatewaySecret,
    fetchImpl:async (input,init)=>normalizeGatewayResponse(await fetch(input,init)),
  });
}
