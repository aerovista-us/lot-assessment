"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createLotScopeBrowserAdapter } from "@/lib/aerovista/browser";

export default function LotScopeCallbackClient() {
  const router = useRouter();
  const [message, setMessage] = useState("Completing AeroVista sign-in…");
  useEffect(() => {
    let active = true;
    createLotScopeBrowserAdapter().auth.completeLogin()
      .then(({ next }) => { if (active) router.replace(next); })
      .catch((cause) => { if (active) setMessage(cause instanceof Error ? cause.message : "Unable to complete sign-in."); });
    return () => { active = false; };
  }, [router]);
  return <p>{message}</p>;
}
