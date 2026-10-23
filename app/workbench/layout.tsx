import { redirect } from "next/navigation";
import { getWorkbenchAccess } from "@/lib/aerovista/session";
import { WorkbenchNavigation } from "@/components/workbench/WorkbenchNavigation";
import "./workbench.css";

export const dynamic = "force-dynamic";

export default async function WorkbenchLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await getWorkbenchAccess();
  if (!session) redirect("/workbench-auth?next=/workbench");
  return <><WorkbenchNavigation sourceCommit={process.env.VERCEL_GIT_COMMIT_SHA ?? "local"}
    environment={process.env.VERCEL_ENV ?? "development"} />
    <div id="workbench-content" tabIndex={-1}>{children}</div></>;
}
