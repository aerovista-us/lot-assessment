export const LOTSCOPE_APP_ID = "lotscope_workbench" as const;
export const LOTSCOPE_PREVIEW_APP_ID = "lotscope_workbench_preview" as const;
export const LOTSCOPE_APPROVED_PREVIEW_ORIGIN = "https://lotscope-git-feat-design5-shared-a-bd9f8e-aerovista-us-projects.vercel.app" as const;

/** The registered preview origin is explicit; arbitrary Vercel URLs fail closed. */
export function browserWorkbenchAppId(origin: string) {
  return origin === LOTSCOPE_APPROVED_PREVIEW_ORIGIN ? LOTSCOPE_PREVIEW_APP_ID : LOTSCOPE_APP_ID;
}

export function serverWorkbenchAppId() {
  return process.env.VERCEL_ENV === "preview" ? LOTSCOPE_PREVIEW_APP_ID : LOTSCOPE_APP_ID;
}

export const LOTSCOPE_SESSION_COOKIE = "lotscope_workbench_session" as const;
export const LOTSCOPE_ACCESS_CAPABILITY = "lotscope.workbench.access" as const;
export const LOTSCOPE_PROJECT_RESOURCE_TYPE = "lotscope_project" as const;

export function safeWorkbenchNext(value: string | null | undefined) {
  if (!value || !value.startsWith("/workbench")) return "/workbench";
  return value;
}
