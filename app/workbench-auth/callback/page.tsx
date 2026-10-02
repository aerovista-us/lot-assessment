"use client";
import { createBrowserAppAdapter } from "@aerovista-us/app-adapter/browser";
import { useEffect, useState } from "react";
import { LOTSCOPE_APP_ID } from "@/lib/aerovista/config";
export default function WorkbenchAuthCallback() {
  const [message,setMessage]=useState("Completing AeroVista sign in…");
  useEffect(() => {
    const av=createBrowserAppAdapter({appId:LOTSCOPE_APP_ID,appOrigin:window.location.origin,callbackPath:"/workbench-auth/callback",localEndpoints:{session:"/api/workbench/auth/session",handoffExchange:"/api/workbench/auth/handoff-exchange",capabilityCheck:"/api/workbench/auth/capability-check",identityMe:"/api/workbench/auth/me",logout:"/api/workbench/auth/logout"}});
    av.auth.completeLogin().then(({next})=>window.location.replace(next)).catch((error)=>setMessage(error instanceof Error?error.message:"Sign in failed."));
  },[]);
  return <main style={{maxWidth:640,margin:"12vh auto",padding:24,fontFamily:"system-ui"}}><p>LOTSCOPE WORKBENCH</p><h1>{message}</h1></main>;
}
