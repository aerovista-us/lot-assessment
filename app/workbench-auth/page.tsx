"use client";
import { createBrowserAppAdapter } from "@aerovista-us/app-adapter/browser";
import { LOTSCOPE_APP_ID, safeWorkbenchNext } from "@/lib/aerovista/config";

function adapter() {
  return createBrowserAppAdapter({
    appId: LOTSCOPE_APP_ID,
    appOrigin: window.location.origin,
    callbackPath: "/workbench-auth/callback",
    localEndpoints: {
      session: "/api/workbench/auth/session", handoffExchange: "/api/workbench/auth/handoff-exchange",
      capabilityCheck: "/api/workbench/auth/capability-check", identityMe: "/api/workbench/auth/me", logout: "/api/workbench/auth/logout",
    },
  });
}
export default function WorkbenchAuthPage() {
  return <main style={{maxWidth:640,margin:"12vh auto",padding:24,fontFamily:"system-ui"}}>
    <p>LOTSCOPE WORKBENCH</p><h1>AeroVista sign in required</h1>
    <p>The professional Workbench uses your AeroVista Account and live AVCC authorization. Public LotScope assessment remains available without signing in.</p>
    <button onClick={() => { const next = safeWorkbenchNext(new URLSearchParams(window.location.search).get("next")); adapter().auth.beginLogin({ next }); }}>Sign in with AeroVista</button>
  </main>;
}
