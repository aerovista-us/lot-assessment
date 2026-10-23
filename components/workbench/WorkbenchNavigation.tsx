"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const staffNav = [
  ["Home", "/workbench"],
  ["Projects", "/workbench/projects"],
  ["Pondy Lot 2", "/workbench/projects/pondy-lot2"],
  ["Explore", "/workbench/projects/pondy-lot2/explore"],
  ["Candidates", "/workbench/projects/pondy-lot2/candidates"],
  ["Compare", "/workbench/projects/pondy-lot2/compare"]
] as const;

const engineeringNav = [
  ["Solver", "/workbench/solver"],
  ["D4 repair", "/workbench/design4-repair"],
  ["Automation", "/workbench/automation"],
  ["Evidence", "/workbench/evidence"]
] as const;

export function WorkbenchNavigation({ sourceCommit, environment }: { sourceCommit: string; environment: string }) {
  const pathname = usePathname();
  const activeHref = [...staffNav, ...engineeringNav]
    .filter(([, href]) => pathname === href || pathname.startsWith(href + "/"))
    .sort((a, b) => b[1].length - a[1].length)[0]?.[1];
  const link = ([label, href]: readonly [string, string]) =>
    <Link key={href} href={href} aria-current={activeHref === href ? "page" : undefined}>{label}</Link>;

  return <div className="workbench-nav-shell" data-source-commit={sourceCommit} data-deployment-environment={environment}>
    <a className="workbench-skip-link" href="#workbench-content">Skip to workspace</a>
    <nav className="workbench-nav" aria-label="LotScope Workbench">
      <div className="workbench-nav-group">{staffNav.map(link)}</div>
      <details className="workbench-tools" open={engineeringNav.some(([, href]) => activeHref === href)}>
        <summary>Engineering tools</summary>
        <div className="workbench-nav-group">{engineeringNav.map(link)}</div>
      </details>
    </nav>
  </div>;
}
