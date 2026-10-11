"use client";
import { createBrowserAppAdapter } from "@aerovista-us/app-adapter/browser";
import { useEffect, useState } from "react";
import { LOTSCOPE_APP_ID, safeWorkbenchNext } from "@/lib/aerovista/config";

function browserAdapter(){
 return createBrowserAppAdapter({
  appId:LOTSCOPE_APP_ID,appOrigin:window.location.origin,callbackPath:"/workbench-auth/callback",
  localEndpoints:{session:"/api/workbench/auth/session",handoffExchange:"/api/workbench/auth/handoff-exchange",capabilityCheck:"/api/workbench/auth/capability-check",identityMe:"/api/workbench/auth/me",logout:"/api/workbench/auth/logout"}
 });
}

export default function WorkbenchAuthCallback(){
 const [message,setMessage]=useState("Completing AeroVista sign in…");
 const [failed,setFailed]=useState(false);
 const [requestId,setRequestId]=useState<string|null>(null);
 useEffect(()=>{
  // Retain the one-time code only in this callback's in-memory URL snapshot.
  // Do not leave a spent credential visible in browser history or retry it.
  const originalUrl=window.location.href;
  const next=safeWorkbenchNext(new URL(originalUrl).searchParams.get("next"));
  window.history.replaceState(null,"","/workbench-auth/callback?next="+encodeURIComponent(next));
  browserAdapter().auth.completeLogin({url:originalUrl})
   .then(({next:destination})=>window.location.replace(safeWorkbenchNext(destination)))
   .catch((error:unknown)=>{
    const e=(error&&typeof error==="object"?error:{}) as {message?:string;body?:{requestId?:string}};
    setMessage(typeof e.message==="string"&&e.message?e.message:"AeroVista sign in could not be completed.");
    const id=e.body?.requestId;
    if(typeof id==="string"&&/^[0-9a-f-]{36}$/i.test(id))setRequestId(id);
    setFailed(true);
   });
 },[]);
 function retry(){
  const next=safeWorkbenchNext(new URLSearchParams(window.location.search).get("next"));
  browserAdapter().auth.beginLogin({next});
 }
 return <main style={{maxWidth:640,margin:"12vh auto",padding:24,fontFamily:"system-ui"}}>
  <p>LOTSCOPE WORKBENCH</p><h1>{message}</h1>
  {failed?<><p>Workbench access remains protected. You can start a new sign-in, or ask an administrator to check the AeroVista Identity Gateway configuration.</p>
   {requestId?<p>Support reference: <code>{requestId}</code></p>:null}
   <button onClick={retry}>Try a fresh sign-in</button>
   <p><a href="/workbench-auth?next=/workbench">Return to sign-in</a></p></>:null}
 </main>;
}
