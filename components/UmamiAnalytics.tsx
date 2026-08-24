"use client";

import { useEffect } from "react";
import { flushQueuedEvents } from "@/lib/analytics";

const DEFAULT_UMAMI_URL = "https://stats.aerocoreos.com";
const DEFAULT_UMAMI_WEBSITE_ID = "d40b0dc6-aabc-4467-800e-74866098c119";

function hostAllowed(hostname: string, domains: string[]) {
  if (!domains.length) return true;
  const host = hostname.toLowerCase();
  return domains.some((domain) => {
    const normalized = domain.toLowerCase();
    return normalized === host || (normalized.startsWith(".") && host.endsWith(normalized));
  });
}

export default function UmamiAnalytics() {
  useEffect(() => {
    const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID?.trim() || DEFAULT_UMAMI_WEBSITE_ID;

    const url = (process.env.NEXT_PUBLIC_UMAMI_URL || DEFAULT_UMAMI_URL).replace(/\/$/, "");
    const domains = (process.env.NEXT_PUBLIC_UMAMI_DOMAINS || "").split(",").map((v) => v.trim()).filter(Boolean);
    const { hostname, protocol, search } = window.location;
    if (protocol === "file:" || ["localhost", "127.0.0.1", "::1"].includes(hostname)) return;
    if (new URLSearchParams(search).get("no_analytics") === "1" || !hostAllowed(hostname, domains)) return;

    const existing = document.querySelector<HTMLScriptElement>("script[data-lot-assessment-umami]");
    if (existing) {
      if (window.umami) flushQueuedEvents();
      else existing.addEventListener("load", flushQueuedEvents, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.defer = true;
    script.src = `${url}/script.js`;
    script.setAttribute("data-website-id", websiteId);
    script.setAttribute("data-lot-assessment-umami", "true");
    script.addEventListener("load", flushQueuedEvents, { once: true });
    document.head.appendChild(script);
  }, []);

  return null;
}
