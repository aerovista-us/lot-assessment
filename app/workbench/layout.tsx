import Link from "next/link";
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

export default function WorkbenchLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <><div className="workbench-nav-shell"><nav className="workbench-nav" aria-label="LotScope internal Workbench">
    <div className="workbench-nav-group">{staffNav.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</div>
    <div className="workbench-nav-group workbench-nav-engineering"><span>ENGINEERING</span>{engineeringNav.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</div>
  </nav></div>{children}</>;
}
