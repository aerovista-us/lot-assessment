import Link from "next/link";
import repair from "@/projects/pondy-design4/repair-comparison.json";

function statusClass(status: string) {
  if (status.startsWith("PASS")) return "repair-pass";
  if (status === "FAIL") return "repair-fail";
  return "repair-watch";
}

function metric(value: number | null | undefined, suffix = "") {
  return value == null ? "—" : `${value}${suffix}`;
}

export const metadata = {
  title: "LotScope Workbench · Design 4 Repair Lab",
  description: "Internal multi-tool comparison for Pondy Flats Lot 2 Design 4 outbound circulation and B-South door clearance."
};

export default function Design4RepairPage() {
  const baseline = repair.strategies.find((item) => item.id === "baseline");
  const comfortRows = repair.strategies.filter((item) => item.changes.doorClearanceTarget >= 0.75);
  return <main className="shell workbench-shell repair-shell">
    <section className="repair-hero">
      <p className="eyebrow">PONDY LOT 2 · DESIGN 4 · INTERNAL REPAIR LAB</p>
      <h1>Compare the fix. Do not choose it in advance.</h1>
      <p className="lede">The runner attacks the open outbound gate and the marginal B-South garage opening under one locked vehicle/program standard. Pavement, route, building movement, garage movement, and combined repair are evaluated as peers.</p>
      <div className="hero-actions"><Link className="primary-button" href="/workbench/solver">Run core solver</Link><Link className="secondary-button" href="/workbench/automation">Open automation</Link><Link className="secondary-button" href="/workbench">Internal home</Link></div>
    </section>
    <section className="repair-summary-grid">
      <article className="wb-panel"><span>Current B-South door</span><strong>{metric(baseline?.bSouthWorstDoorClearanceFt, " ft")}</strong><small>Marginal inbound opening in the current geometry.</small></article>
      <article className="wb-panel"><span>Explicit outbound</span><strong>OPEN</strong><small>No compared strategy has earned a full outbound PASS.</small></article>
      <article className="wb-panel"><span>Comfort route found</span><strong>{comfortRows.some((item) => (item.bSouthWorstDoorClearanceFt ?? 0) >= 0.75) ? "YES" : "NO"}</strong><small>Inbound-only result; does not close circulation.</small></article>
      <article className="wb-panel"><span>Rotation</span><strong>EXPERIMENTAL NEXT</strong><small>Held out until the D4 planner uses rotation-aware walls and door geometry.</small></article>
    </section>

    <section className="wb-panel repair-policy">
      <div className="section-heading"><div><p className="eyebrow">LOCKED POLICY</p><h2>Hard gates stay hard.</h2></div><span className="mode-pill">{repair.schema}</span></div>
      <p>{repair.policy.selection}</p>
      <div className="repair-locks">{repair.policy.locked.map((item) => <span key={item}>{item}</span>)}</div>
      <p className="microcopy">{repair.policy.rotation.note}</p>
    </section>

    <section className="wb-panel repair-table-panel">
      <div className="section-heading"><div><p className="eyebrow">LATEST COMPARISON SNAPSHOT</p><h2>Same gate set, different intervention.</h2></div><span className="mode-pill">{repair.strategies.length} STRATEGIES</span></div>
      <div className="repair-table-wrap"><table className="repair-table"><thead><tr><th>Strategy</th><th>Tool</th><th>Status</th><th>B-South door</th><th>Outbound</th><th>Pavement</th></tr></thead>
      <tbody>{repair.strategies.map((item) => {
        const south = item.rows["B-SOUTH"];
        return <tr key={item.id}><td><strong>{item.label}</strong><small>{item.note}</small></td><td>{item.tool}</td><td><span className={statusClass(item.status)}>{item.status}</span></td><td>{metric(item.bSouthWorstDoorClearanceFt, " ft")}</td><td>{south.outbound.ok ? "PASS" : `OPEN · ${south.outbound.expanded.toLocaleString()} states`}</td><td>{item.pavementPass ? "PASS" : "OPEN"}</td></tr>;
      })}</tbody></table></div>
    </section>
    <section className="repair-findings-grid">
      <article className="wb-panel">
        <p className="eyebrow">WHAT THE RUN SAYS</p><h2>Extra pavement is not the B-South door fix.</h2>
        <p>The 4 ft and 6 ft pavement-only cases leave the B-South crossing at the same 0.073 ft margin. Added pavement remains valid for swept-body containment, but this run does not support calling it the garage-opening repair.</p>
      </article>
      <article className="wb-panel">
        <p className="eyebrow">ROUTE SIGNAL</p><h2>A comfortable inbound crossing is possible.</h2>
        <p>The comfort-routed cases find B-South inbound paths above the 0.75 ft practical door target. That is meaningful progress, but outbound is still unresolved, so the concept remains an iteration rather than a circulation PASS.</p>
      </article>
      <article className="wb-panel">
        <p className="eyebrow">OUTBOUND SIGNAL</p><h2>The blocker is now explicit.</h2>
        <p>B-South outbound remains open across the comparison set. The baseline A-North and A-South outbound searches are also open, so the next repair pass should target full site-exit topology instead of polishing only one garage door.</p>
      </article>
      <article className="wb-panel">
        <p className="eyebrow">NEXT EXPERIMENT</p><h2>Rotation stays available, but must be earned.</h2>
        <p>LotScope already has true rotated detached-garage polygon, door-frame, and parked-pose foundations. Design 4 rotation should enter this comparison only after its A* wall/door model is rotation-aware.</p>
      </article>
    </section>

    <section className="wb-panel repair-source">
      <div><p className="eyebrow">TRACE</p><h2>Reproducible evidence snapshot</h2></div>
      <p>Generated {repair.generatedAt} from Design 4 revision <code>{repair.sourceRevision}</code>. The Pondy Flats source runner writes this comparison and the internal LotScope UI consumes the checked-in snapshot.</p>
      <div className="hero-actions"><Link className="secondary-button" href="/api/workbench/pondy-d4-repair">Open JSON API</Link><Link className="secondary-button" href="/workbench/assessment/pondy-d4">Open D4 evidence</Link></div>
    </section>

    <footer>LotScope Workbench · Design 4 repair lab · internal evidence, not permit or civil certification</footer>
  </main>;
}
