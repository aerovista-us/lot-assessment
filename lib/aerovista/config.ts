export const LOTSCOPE_APP_ID = "lotscope_workbench" as const;
export const LOTSCOPE_SESSION_COOKIE = "lotscope_workbench_session" as const;
export const LOTSCOPE_ACCESS_CAPABILITY = "lotscope.workbench.access" as const;
export const LOTSCOPE_PROJECT_RESOURCE_TYPE = "lotscope_project" as const;

export function safeWorkbenchNext(value: string | null | undefined) {
  if (!value || !value.startsWith("/workbench")) return "/workbench";
  return value;
}
