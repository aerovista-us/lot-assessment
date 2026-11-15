import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getWorkbenchAccess } from "@/lib/aerovista/session";
import { safeWorkbenchNext } from "@/lib/aerovista/config";
import { WorkbenchNavigation } from "@/components/workbench/WorkbenchNavigation";
import "./workbench.css";

export const dynamic = "force-dynamic";

export default async function WorkbenchLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await getWorkbenchAccess();
  if (!session) {
    const requestHeaders = await headers();
    const next = safeWorkbenchNext(requestHeaders.get("x-lotscope-workbench-path"));
    redirect(`/workbench-auth?next=${encodeURIComponent(next)}`);
  }
  return <><WorkbenchNavigation sourceCommit={process.env.VERCEL_GIT_COMMIT_SHA ?? "local"}
    environment={process.env.VERCEL_ENV ?? "development"} />
    <div id="workbench-content" tabIndex={-1}>{children}</div></>;
}
