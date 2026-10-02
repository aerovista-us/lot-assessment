"use client";

import { useState } from "react";
import { createLotScopeBrowserAdapter } from "@/lib/aerovista/browser";

export default function LotScopeLoginLauncher({ next }: { next: string }) {
  const [error, setError] = useState<string | null>(null);
  return <button className="primary-button" type="button" onClick={() => {
    try { createLotScopeBrowserAdapter().auth.beginLogin({ next }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to start AeroVista login."); }
  }}>{error || "Continue with AeroVista Account"}</button>;
}
