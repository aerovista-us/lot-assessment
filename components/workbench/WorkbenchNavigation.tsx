"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";

const staffNav = [
  ["Home", "/workbench"],
  ["Projects", "/workbench/projects"],
  ["Pondy Lot 2", "/workbench/projects/pondy-lot2"],
  ["Explore", "/workbench/projects/pondy-lot2/explore"],
  ["Designs", "/workbench/projects/pondy-lot2/candidates"],
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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuToggle = useRef<HTMLButtonElement>(null);
  const activeHref = [...staffNav, ...engineeringNav]
    .filter(([, href]) => pathname === href || pathname.startsWith(href + "/"))
    .sort((a, b) => b[1].length - a[1].length)[0]?.[1];
  const link = ([label, href]: readonly [string, string]) =>
    <Link key={href} href={href} onClick={() => setMenuOpen(false)} aria-current={activeHref === href ? "page" : undefined}>{label}</Link>;

  return <div className="workbench-nav-shell" data-source-commit={sourceCommit} data-deployment-environment={environment}>
    <a className="workbench-skip-link" href="#workbench-content">Skip to workspace</a>
    <div className="workbench-topbar">
    <Link className="workbench-brand" href="/workbench" aria-label="LotScope Workbench home" onClick={() => setMenuOpen(false)}>
      <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 12V5h7M20 5h7v7M27 20v7h-7M12 27H5v-7M10 21V11h12v10H10Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M17 11v10M10 16h7" fill="none" stroke="currentColor" strokeWidth="1.3"/></svg>
      <span><strong>LotScope</strong><small>Design Workbench</small></span>
    </Link>
    <button ref={menuToggle} className="workbench-menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="workbench-navigation-links" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? "Close menu" : "Menu"}<span aria-hidden="true">{menuOpen ? "×" : "☰"}</span></button>
    <nav id="workbench-navigation-links" className="workbench-nav" aria-label="LotScope Workbench" data-menu-open={menuOpen} onKeyDown={event => { if (event.key === "Escape" && menuOpen) {setMenuOpen(false);menuToggle.current?.focus();} }}>
      <div className="workbench-nav-group">{staffNav.map(link)}</div>
      <details className="workbench-tools" open={engineeringNav.some(([, href]) => activeHref === href)}>
        <summary>Engineering tools</summary>
        <div className="workbench-nav-group">{engineeringNav.map(link)}</div>
      </details>
    </nav>
    </div>
  </div>;
}
