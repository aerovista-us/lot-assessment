"use client";

import { useMemo, useState } from "react";
import { SITE_AUTOMATION_PASSES, SITE_STRATEGY_TOOLBOX, evaluateCandidateAutomation, type CandidateAutomation } from "@/packages/automation";

type RepairAction = { kind: "shift-placement" | "shift-drive-point"; targetId: string; dx: number; dy: number; pointIndex?: number };
type MobilityDrive = { result?: { gearChanges?: number } | null; pathIssues: string[]; failures: string[]; warnings: string[] };
type MobilityAudit = {
  pass: boolean;
  promotionReady: boolean;
  driveWidthFt: number;
  turningPavementWidthFt: number;
  failures: string[];
  warnings: string[];
  drives: MobilityDrive[];
};
type ProgramUnit = { unitId: string; netLivingCapacitySqFt?: number | null; intendedLivingSqFt: number | null };
type ProgramResult = { pass: boolean; reasons: string[]; unitResults: ProgramUnit[] };
type Placement = { id: string; kind: string; x: number; y: number; widthFt: number; depthFt: number; rotationDeg?: number };
type RankedResult = {
  id: string;
  family: string;
  conceptGroup?: string;
  combinedPass: boolean;
  promotionReady?: boolean;
  promotionBoundaryClearanceFt?: number | null;
  physicalPass: boolean;
  programPass: boolean;
  combinedScore: number;
  physicalIssues: string[];
  repairActions: RepairAction[];
  placements: Placement[];
  drives: Array<{ id: string; points: Array<[number, number]> }>;
  metadata: Record<string, string | number | boolean>;
  mobilityAudit: MobilityAudit;
  program: ProgramResult;
};
type RankedResponse = {
  evaluatedCount: number;
  physicalPassCount: number;
  combinedPassCount: number;
  promotionReadyCount?: number;
  distinctPromotionReadyCount?: number;
  promotionClearanceFt?: number;
  shortlist: RankedResult[];
  results: RankedResult[];
};
type PavementScenario = {
  driveWidthFt: number;
  turningPavementWidthFt: number;
  pass: boolean;
  promotionReady: boolean;
  status: string;
  gearChanges: number;
  failures: string[];
  warnings: string[];
};
type PavementSensitivity = {
  schemaVersion: string;
  model: string;
  note: string;
  minimumHardPassWidthFt: number | null;
  minimumPromotionWidthFt: number | null;
  pavementOnlyRescuePossible: boolean;
  scenarios: PavementScenario[];
};

function polygonFor(item: Placement) {
  const angle = (item.rotationDeg ?? 0) * Math.PI / 180;
  const cx = item.x + item.widthFt / 2;
  const cy = item.y + item.depthFt / 2;
  const corners: Array<[number, number]> = [
    [item.x, item.y], [item.x + item.widthFt, item.y],
    [item.x + item.widthFt, item.y + item.depthFt], [item.x, item.y + item.depthFt]
  ];
  if (Math.abs(angle) < 1e-8) return corners;
  return corners.map(([x, y]) => {
    const dx = x - cx;
    const dy = y - cy;
    return [cx + dx * Math.cos(angle) - dy * Math.sin(angle), cy + dx * Math.sin(angle) + dy * Math.cos(angle)] as [number, number];
  });
}

function fmt(value: number | null | undefined, digits = 1) {
  return value == null ? "—" : value.toFixed(digits);
}

export default function AutomationPage() {
  const [data, setData] = useState<RankedResponse | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pavement, setPavement] = useState<PavementSensitivity | null>(null);
  const [testingPavement, setTestingPavement] = useState(false);
  const [pavementError, setPavementError] = useState<string | null>(null);

  const run = async () => {
    setRunning(true);
    setError(null);
    setPavement(null);
    try {
      const response = await fetch("/api/workbench/pondy-ranked", { cache: "no-store" });
      if (!response.ok) throw new Error(`Workbench returned ${response.status}`);
      const next = await response.json() as RankedResponse;
      setData(next);
      setSelectedId(next.shortlist[0]?.id ?? next.results[0]?.id ?? null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Automation run failed");
    } finally {
      setRunning(false);
    }
  };

  const candidate = useMemo(() => data?.results.find((item) => item.id === selectedId) ?? data?.shortlist[0] ?? data?.results[0] ?? null, [data, selectedId]);
  const automation: CandidateAutomation | null = useMemo(() => {
    if (!candidate) return null;
    return evaluateCandidateAutomation({
      candidate: candidate as never,
      repairActions: candidate.repairActions as never,
      mobilityAudit: candidate.mobilityAudit as never,
      program: candidate.program as never,
      promotionBoundaryClearanceFt: candidate.promotionBoundaryClearanceFt ?? null,
      promotionClearanceFt: data?.promotionClearanceFt ?? 1
    });
  }, [candidate, data?.promotionClearanceFt]);

  const review = data ? [...data.shortlist, ...data.results.filter((item) => !data.shortlist.some((short) => short.id === item.id)).slice(0, 15)] : [];

  const selectCandidate = (id: string) => {
    setSelectedId(id);
    setPavement(null);
    setPavementError(null);
  };

  const testPavement = async () => {
    if (!candidate) return;
    setTestingPavement(true);
    setPavementError(null);
    try {
      const response = await fetch("/api/workbench/pondy-pavement-sensitivity", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ candidate, widthsFt: [12, 14, 16, 18, 20] })
      });
      if (!response.ok) throw new Error(`Pavement sensitivity returned ${response.status}`);
      setPavement(await response.json() as PavementSensitivity);
    } catch (cause) {
      setPavementError(cause instanceof Error ? cause.message : "Pavement sensitivity failed");
    } finally {
      setTestingPavement(false);
    }
  };

  return <main className="shell workbench-shell automation-shell">
    <section className="workbench-brief automation-hero">
      <div>
        <p className="eyebrow">SITE OPTIMIZATION · AUTOMATION LAYER</p>
        <h1>Use the whole toolbox, then prove the result.</h1>
        <p className="lede">Workbench can move or re-proportion buildings, move/resize/rotate garages, reshape the access path, add localized pavement or apron area, and eventually use a bounded forward/reverse maneuver. Pavement is intentionally retained as a first-class option—not treated as a failure.</p>
        <div className="hero-actions">
          <button className="primary-button" onClick={run} disabled={running}>{running ? "Running authoritative search…" : "Run automation review"}</button>
          <a className="secondary-button" href="/api/workbench/pondy-automation" target="_blank" rel="noreferrer">Machine-readable plan</a>
          <a className="secondary-button" href="/workbench/report">Open user report</a>
          <span className="mode-pill">MULTI-TOOL SITE REPAIR V1</span>
        </div>
        {error && <div className="notice"><strong>Automation error:</strong> {error}</div>}
      </div>
      <div className="focus-rules">
        <p className="mini-label">DECISION RULE</p>
        <strong>Hard gates do not move</strong><span>Parcel, setbacks, vehicle body, turning radius, collision, door crossing and final parking stay authoritative.</span>
        <strong>Repair tools compete</strong><span>The engine compares massing, garage, route and pavement changes instead of assuming one answer.</span>
        <strong>Usability matters</strong><span>Continuous-forward access is preferred, but a low-gear-change maneuver remains a legitimate future tool.</span>
      </div>
    </section>

    <section className="wb-panel automation-toolbox">
      <div className="section-heading"><div><p className="eyebrow">AVAILABLE REPAIR TOOLS</p><h2>Automation toolbox</h2></div><span className="mode-pill">{SITE_STRATEGY_TOOLBOX.length} TOOLS</span></div>
      <div className="automation-tool-grid">{SITE_STRATEGY_TOOLBOX.map((tool) => <article key={tool.id} className={`automation-tool state-${tool.availability.toLowerCase()}`}>
        <div><span>{tool.category}</span><b>{tool.availability}</b></div>
        <h3>{tool.label}</h3>
        <p>{tool.description}</p>
        <small>{tool.tradeoff}</small>
      </article>)}</div>
    </section>

    <section className="wb-panel automation-toolbox">
      <div className="section-heading"><div><p className="eyebrow">HOW THE AUTOMATION RUNS</p><h2>Passes are capability buckets, not a forced waterfall.</h2></div><span className="mode-pill">{SITE_AUTOMATION_PASSES.length} PASSES</span></div>
      <p className="wb-copy">The first pass deliberately compares building, garage, access-path and pavement repairs together. Garage rotation is isolated while it remains experimental; explicit gear-change planning is the next planner capability.</p>
      <div className="pipeline-grid">{SITE_AUTOMATION_PASSES.map((pass) => <article key={pass.id} className="pipeline-card"><div><span className="status-dot status-ready" /><strong>{pass.label}</strong></div><p>{pass.trigger}</p><small>{pass.rankingRule}</small><div className="constraint-tags">{pass.tools.map((id) => <span key={id}>{SITE_STRATEGY_TOOLBOX.find((tool) => tool.id === id)?.label ?? id}</span>)}</div></article>)}</div>
    </section>

    {data && <section className="status-strip automation-status">
      <div><span>Evaluated</span><strong>{data.evaluatedCount}</strong></div>
      <div><span>Physical passes</span><strong>{data.physicalPassCount}</strong></div>
      <div><span>Combined passes</span><strong>{data.combinedPassCount}</strong></div>
      <div><span>Promotion-ready</span><strong>{data.promotionReadyCount ?? 0}</strong></div>
      <div><span>Distinct finalists</span><strong>{data.distinctPromotionReadyCount ?? data.shortlist.length}</strong></div>
    </section>}

    {candidate && automation && <section className="automation-focus-grid">
      <article className="wb-panel">
        <div className="section-heading"><div><p className="eyebrow">ACTIVE CANDIDATE</p><h2>{candidate.id}</h2></div><span className={`result-badge ${candidate.promotionReady ? "good" : candidate.physicalPass ? "warn" : "bad"}`}>{candidate.promotionReady ? "PROMOTION READY" : candidate.physicalPass ? "PHYSICAL PASS" : "REPAIR"}</span></div>
        <svg viewBox="-8 -8 170 76" className="site-svg" role="img" aria-label={`Automation review for ${candidate.id}`}>
          <polygon points="0,0 148,0 148,50 125.143,43.016 84.813,43.016 0,57.01" className="wb-lot" />
          <line x1="148" y1="0" x2="148" y2="50" className="wb-frontage" />
          {candidate.drives.map((drive) => <polyline key={drive.id} points={drive.points.map(([x,y]) => `${x},${y}`).join(" ")} className="wb-drive" />)}
          {candidate.placements.map((item) => <polygon key={item.id} points={polygonFor(item).map(([x,y]) => `${x},${y}`).join(" ")} className={item.kind === "garage" ? "wb-garage" : item.id.includes("HOME-A") ? "wb-mass-a" : "wb-mass-b"} />)}
        </svg>
        <div className="automation-metrics"><span>score <b>{candidate.combinedScore.toFixed(1)}</b></span><span>boundary <b>{fmt(candidate.promotionBoundaryClearanceFt)}′</b></span><span>straight aisle <b>{fmt(candidate.mobilityAudit.driveWidthFt, 0)}′</b></span><span>turn flare <b>{fmt(candidate.mobilityAudit.turningPavementWidthFt, 2)}′</b></span></div>

        <div className="pavement-test">
          <div><p className="mini-label">PAVEMENT AS AN ACTUAL REPAIR TOOL</p><h3>Would a wider paved corridor solve this geometry without moving the buildings?</h3><p>This runs the hardened vehicle audit again at 12′, 14′, 16′, 18′ and 20′ modeled corridor widths. It is a coarse sensitivity test—not a civil takeoff.</p></div>
          <button className="secondary-button" onClick={testPavement} disabled={testingPavement}>{testingPavement ? "Testing widths…" : "Test more pavement"}</button>
        </div>
        {pavementError && <div className="notice"><strong>Pavement test:</strong> {pavementError}</div>}
        {pavement && <div className="pavement-results">
          <div className="pavement-verdict"><strong>{pavement.pavementOnlyRescuePossible ? `YES · hard pass at ${fmt(pavement.minimumHardPassWidthFt,0)}′` : pavement.minimumHardPassWidthFt != null ? `Already passes by ${fmt(pavement.minimumHardPassWidthFt,0)}′` : "NO · pavement alone does not clear the current hard failures"}</strong><span>{pavement.minimumPromotionWidthFt == null ? "No tested width reaches mobility promotion by pavement alone." : `Mobility promotion at ${fmt(pavement.minimumPromotionWidthFt,0)}′ corridor.`}</span></div>
          <div className="pavement-scenario-grid">{pavement.scenarios.map((scenario) => <article key={scenario.driveWidthFt} className={scenario.pass ? "pave-pass" : "pave-fail"}><span>{fmt(scenario.driveWidthFt,0)}′ corridor</span><strong>{scenario.pass ? "HARD PASS" : "FAIL"}</strong><small>turn flare {fmt(scenario.turningPavementWidthFt,2)}′ · {scenario.gearChanges} gear changes</small><p>{scenario.failures[0] ?? scenario.warnings[0] ?? "Current hardened mobility gates pass."}</p></article>)}</div>
          <p className="microcopy">{pavement.note}</p>
        </div>}
      </article>

      <article className="wb-panel automation-decision">
        <p className="eyebrow">AUTOMATION DECISION</p>
        <h2>{automation.decisionSummary}</h2>
        <p className="wb-copy">Applied tools describe what this candidate already spends. Next tools are alternatives the engine should compare—not mandatory sequential steps.</p>
        <div className="strategy-state-list">{automation.optionStates.map((tool) => <div key={tool.id} className={`strategy-state strategy-${tool.state.toLowerCase()}`}><span>{tool.state}</span><p><strong>{tool.label}</strong><small>{tool.tradeoff}</small></p></div>)}</div>
        {automation.recommendedNext.length > 0 && <div className="next-checks"><p className="mini-label">NEXT COMPARISONS</p><ol>{automation.recommendedNext.map((item) => <li key={item.id}><strong>{SITE_STRATEGY_TOOLBOX.find((tool) => tool.id === item.id)?.label ?? item.id}:</strong> {item.reason}</li>)}</ol></div>}
      </article>
    </section>}

    {data && <section className="wb-panel">
      <div className="section-heading"><div><p className="eyebrow">CANDIDATE QUEUE</p><h2>Compare strategies across viable and near-viable concepts</h2></div><span className="mode-pill">{review.length} SHOWN</span></div>
      <div className="automation-candidate-grid">{review.map((item) => <button key={item.id} className={`current-card ${item.id === candidate?.id ? "selected" : ""}`} onClick={() => selectCandidate(item.id)}>
        <div><strong>{item.id}</strong><span className={item.promotionReady ? "pass-text" : item.physicalPass ? "warn-text" : "fail-text"}>{item.promotionReady ? "READY" : item.physicalPass ? "PHYSICAL" : "REPAIR"}</span></div>
        <p>{item.family}</p>
        <small>{item.physicalIssues[0] ?? item.program.reasons[0] ?? "Current hard gates pass."}</small>
      </button>)}</div>
    </section>}

    {!data && <section className="wb-panel empty-workbench"><p className="eyebrow">READY</p><h2>Run the authoritative Workbench once, then inspect which repair tools each candidate actually used.</h2><p>The automation page does not weaken any gate. It exposes the repair choices and the tradeoffs that were previously buried in solver code.</p></section>}
  </main>;
}
