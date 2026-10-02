"use client";

import { createBrowserAppAdapter } from "@aerovista-us/app-adapter/browser";
import { LOTSCOPE_APP_ID } from "./public-config";

export function createLotScopeBrowserAdapter() {
  if (typeof window === "undefined") throw new Error("LotScope browser adapter requires a browser");
  return createBrowserAppAdapter({
    appId: LOTSCOPE_APP_ID,
    appOrigin: window.location.origin,
    callbackPath: "/auth/lotscope/callback",
    localEndpoints: {
      session: "/api/workbench/auth/session",
      handoffExchange: "/api/workbench/auth/handoff-exchange",
      capabilityCheck: "/api/workbench/auth/capability-check",
      identityMe: "/api/workbench/auth/me",
      logout: "/api/workbench/auth/logout",
    },
  });
}
