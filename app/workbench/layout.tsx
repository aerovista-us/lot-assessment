import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { WORKBENCH_SESSION_COOKIE, evaluateWorkbenchAccess, isWorkbenchAuthBypassed } from "@/lib/aerovista/workbench-access";
import "./workbench.css";

const staffNav = [
  ["HOME", "/workbench"],
  ["PROJECTS", "/workbench/projects"],
  ["PONDY LOT 2", "/workbench/projects/pondy-lot2"],
  ["EXPLORE", "/workbench/projects/pondy-lot2/explore"],
  ["CANDIDATES", "/workbench/projects/pondy-lot2/candidates"],
  ["COMPARE", "/workbench/projects/pondy-lot2/compare"]
] as const;

const engineeringNav = [
  ["SOLVER", "/workbench/solver"],
  ["D4 REPAIR", "/workbench/design4-repair"],
  ["AUTOMATION", "/workbench/automation"],
  ["EVIDENCE", "/workbench/evidence"]
] as const;

export default async function WorkbenchLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  let identityName: string | null = null;
  if (!isWorkbenchAuthBypassed()) {
    const token = (await cookies()).get(WORKBENCH_SESSION_COOKIE)?.value || null;
    const access = await evaluateWorkbenchAccess(token);
    if (access.status === "unauthenticated") redirect("/auth/lotscope/login?next=/workbench");
    if (access.status === "forbidden") redirect("/auth/lotscope/denied?reason=forbidden");
    if (access.status === "unavailable") redirect("/auth/lotscope/denied?reason=unavailable");
    identityName = access.identity?.name || access.identity?.email || "AeroVista identity";
  }
  return <><div className="workbench-nav-shell"><nav className="workbench-nav" aria-label="LotScope internal Workbench">
    <div className="workbench-nav-group">{staffNav.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</div>
    <div className="workbench-nav-group workbench-nav-engineering"><span>ENGINEERING</span>{engineeringNav.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</div>
  <div className="workbench-nav-identity">{identityName && <span>{identityName}</span>}<form action="/api/workbench/auth/logout" method="post"><button type="submit">SIGN OUT</button></form></div></nav></div>{children}</>;
}
