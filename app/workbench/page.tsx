"use client";

import { useMemo, useState } from "react";
import { pipelineFor, pondyLot2Spec, seedCandidates } from "@/lib/workbench";

type ProgramUnitResult = {
  unitId: string;
  pass: boolean;
  intendedLivingSqFt: number | null;
  netLivingCapacitySqFt?: number | null;
  penalties: string[];
  reasons: string[];
};

type ProgramResult = {
  pass: boolean;
  unitDifferenceSqFt: number | null;
  qualityScore: number;
  reasons: string[];
  unitResults: ProgramUnitResult[];
};

type RankedResult = {
  id: string;
  family: string;
  conceptGroup?: string;
  combinedPass: boolean;
  promotionReady?: boolean;
  promotionBoundaryClearanceFt?: number | null;
  promotionChecks?: {
    clearanceReady: boolean;
    capacityReady: boolean;
    minimumClearanceFt: number;
    requiredNetLivingCapacitySqFt: number;
  };
  physicalPass: boolean;
  programPass: boolean;
  combinedScore: number;
  physicalObjective: number;
  repaired: boolean;
  minimumClearanceFt: number | null;
  physicalIssues: string[];
  placements: Array<{ id: string; kind: string; x: number; y: number; widthFt: number; depthFt: number }>;
  drives: Array<{ id: string; points: Array<[number, number]> }>;
  metadata: Record<string, string | number | boolean>;
  pavement: {
    estimatedTotalPavementSqFt: number;
    estimatedBuildablePavementSqFt: number;
    buildableSharePct: number;
  };
  program: ProgramResult;
};

type BenchmarkControl = {
  id: string;
  label: string;
  comparisonClass: string;
  source?: string;
  note?: string;
};

type RankedResponse = {
  elapsedMs: number;
  evaluatedCount: number;
  physicalPassCount: number;
  programPassCount: number;
  combinedPassCount: number;
  promotionReadyCount?: number;
  distinctPromotionReadyCount?: number;
  preferredLivingSqFt?: number;
  promotionTargetCapacitySqFt?: number;
  promotionClearanceFt?: number;
  families: string[];
  scenario: string;
  solver: string;
  scoringVersion: string;
  benchmarkControl?: BenchmarkControl;
  shortlist: RankedResult[];
  results: RankedResult[];
};

const CURRENT_FAMILY = "rear-garage-stack";
const PROVEN_FAMILIES = new Set(["side-spine", "staggered-spine", "e2-r", "g1-r"]);

function fmt(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function resultStatus(result: RankedResult) {
  if (result.promotionReady) return "PROMOTION READY";
  if (result.combinedPass) return "TECHNICAL PASS";
  if (result.physicalPass) return "PROGRAM TUNING";
  return "PHYSICAL TUNING";
}

function bestOf(results: RankedResult[]) {
  return [...results].sort((a, b) => Number(b.promotionReady) - Number(a.promotionReady) || Number(b.combinedPass) - Number(a.combinedPass) || b.combinedScore - a.combinedScore)[0] ?? null;
}

export default function WorkbenchPage() {
  const [selected, setSelected] = useState(seedCandidates[0].id);
  const [showSoft, setShowSoft] = useState(true);
  const [solver, setSolver] = useState<RankedResponse | null>(null);
  const [solverSelected, setSolverSelected] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [solverError, setSolverError] = useState<string | null>(null);
  const spec = pondyLot2Spec;
  const stages = useMemo(() => pipelineFor(spec), [spec]);
  const activeSeed = seedCandidates.find((candidate) => candidate.id === selected) ?? seedCandidates[0];
  const constraints = spec.constraints.filter((constraint) => showSoft || constraint.mode === "HARD");

  const currentResults = useMemo(() => solver?.results.filter((r) => r.family === CURRENT_FAMILY) ?? [], [solver]);
  const provenResults = useMemo(() => solver?.results.filter((r) => PROVEN_FAMILIES.has(r.family)) ?? [], [solver]);
  const previousResults = useMemo(() => solver?.results.filter((r) => r.family !== CURRENT_FAMILY && !PROVEN_FAMILIES.has(r.family)) ?? [], [solver]);
  const currentBest = bestOf(currentResults);
  const provenBest = bestOf(provenResults);
  const previousByFamily = useMemo(() => {
    const map = new Map<string, RankedResult[]>();
    for (const result of previousResults) map.set(result.family, [...(map.get(result.family) ?? []), result]);
    return [...map.entries()].map(([family, results]) => ({ family, best: bestOf(results), count: results.length })).filter((x): x is { family: string; best: RankedResult; count: number } => Boolean(x.best));
  }, [previousResults]);

  const allDisplay = solver?.results ?? [];
  const activeSolved = allDisplay.find((candidate) => candidate.id === solverSelected) ?? currentBest ?? solver?.shortlist[0] ?? allDisplay[0] ?? null;

  const selectResult = (result: RankedResult | null) => result && setSolverSelected(result.id);

  const runSolver = async () => {
    setRunning(true);
    setSolverError(null);
    try {
      const response = await fetch("/api/workbench/pondy-ranked", { cache: "no-store" });
      if (!response.ok) throw new Error(`Solver returned ${response.status}`);
      const data = await response.json() as RankedResponse;
      setSolver(data);
      const focus = bestOf(data.results.filter((r) => r.family === CURRENT_FAMILY)) ?? data.shortlist[0] ?? data.results[0];
      setSolverSelected(focus?.id ?? null);
    } catch (error) {
      setSolverError(error instanceof Error ? error.message : "Solver failed");
    } finally {
      setRunning(false);
    }
  };

  const renderPlan = (result: RankedResult | null) => (
    <svg viewBox="-8 -8 170 76" className="site-svg" role="img" aria-label="Pondy Lot 2 workbench parcel diagram">
      <polygon points={spec.parcel.polygon.map(([x,y]) => `${x},${y}`).join(" ")} className="wb-lot" />
      <line x1="148" y1="0" x2="148" y2="50" className="wb-frontage" />
      <line x1="25" y1="3" x2="25" y2="50" className="wb-principal-rear" />
      <line x1="5" y1="3" x2="5" y2="55" className="wb-accessory-rear" />
      <text x="152" y="25" className="wb-svg-label" transform="rotate(90 152 25)">PENNSYLVANIA · FRONT / ACCESS</text>
      {result ? <>
        {result.drives.map((drive) => <polyline key={drive.id} points={drive.points.map(([x,y]) => `${x},${y}`).join(" ")} className="wb-drive" />)}
        {result.placements.map((item) => <rect key={item.id} x={item.x} y={item.y} width={item.widthFt} height={item.depthFt} className={item.kind === "garage" ? "wb-garage" : item.id.includes("HOME-A") ? "wb-mass-a" : "wb-mass-b"} />)}
      </> : null}
    </svg>
  );

  return (
    <main className="shell workbench-shell">
      <header className="topbar">
        <div className="brand-lockup"><div className="brand-mark">LS</div><div><strong>LotScope Workbench</strong><span>Pondy Lot 2 · evidence-backed design development</span></div></div>
        <div className="hero-actions" style={{ marginTop: 0 }}><a className="secondary-button" href="/">Public LotScope</a><span className="mode-pill">INTERNAL</span></div>
      </header>

      <section className="workbench-brief">
        <div>
          <p className="eyebrow">CURRENT DESIGN SET · DESIGN #2</p>
          <h1>Rear accessory garages + connected L-duplex.</h1>
          <p className="lede">The workbench now leads with the design we are actively refining, while preserving the proven baseline and every earlier exploration as evidence—not clutter.</p>
          <div className="hero-actions">
            <button className="primary-button" onClick={runSolver} disabled={running}>{running ? "Running full Workbench…" : "Run full Workbench"}</button>
            <span className="mode-pill">FS-SUV · 5′ ACCESSORY REAR HYPOTHESIS</span>
          </div>
          {solverError && <div className="notice"><strong>Solver error:</strong> {solverError}</div>}
        </div>
        <div className="focus-rules">
          <p className="mini-label">WHAT IS LOCKED</p>
          <strong>Two rear detached garages</strong><span>Accessory envelope; keep them west.</span>
          <strong>Connected duplex</strong><span>Unit B folds into an L and joins Unit A.</span>
          <strong>North-side access</strong><span>No vehicle path through residential mass.</span>
          <strong>What may move</strong><span>Drive flare, apron, L-leg proportions, small garage offsets.</span>
        </div>
      </section>

      {solver ? <>
        <section className="status-strip">
          <div><span>Current concept</span><strong>{currentResults.filter(r => r.physicalPass).length}/{currentResults.length} physical pass</strong></div>
          <div><span>Best current</span><strong>{currentBest ? currentBest.id : "—"}</strong></div>
          <div><span>Promotion-ready</span><strong>{solver.promotionReadyCount ?? solver.shortlist.length}</strong></div>
          <div><span>Retained evidence</span><strong>{solver.evaluatedCount} candidates</strong></div>
          <div><span>Solver</span><strong>{solver.solver}</strong></div>
        </section>

        <section className="wb-focus-grid">
          <article className="wb-panel focus-plan">
            <div className="section-heading"><div><p className="eyebrow">ACTIVE CANDIDATE</p><h2>{activeSolved?.id ?? "No result"}</h2></div>{activeSolved && <span className={`result-badge ${activeSolved.promotionReady ? "good" : activeSolved.physicalPass ? "warn" : "bad"}`}>{resultStatus(activeSolved)}</span>}</div>
            {renderPlan(activeSolved)}
            <div className="plan-legend"><span><i className="legend-a" /> Unit A</span><span><i className="legend-b" /> Unit B</span><span><i className="legend-g" /> detached garages</span><span><i className="legend-d" /> vehicle path</span><span><i className="legend-principal" /> 25′ principal rear</span><span><i className="legend-accessory" /> 5′ accessory target</span></div>
          </article>

          <article className="wb-panel focus-score">
            <p className="eyebrow">CAN THIS BECOME DESIGN #2?</p>
            <h2>{activeSolved?.promotionReady ? "Yes — promotion gate cleared." : activeSolved?.physicalPass ? "Geometry works. Refine the program." : "Still solving physical geometry."}</h2>
            {activeSolved && <div className="gate-stack">
              <div className={activeSolved.physicalPass ? "gate-pass" : "gate-fail"}><span>01</span><p><strong>Vehicle + geometry</strong><small>{activeSolved.physicalPass ? "PASS" : activeSolved.physicalIssues[0] ?? "Needs repair"}</small></p></div>
              <div className={activeSolved.programPass ? "gate-pass" : "gate-warn"}><span>02</span><p><strong>Duplex program</strong><small>{activeSolved.programPass ? "PASS" : activeSolved.program.reasons[0] ?? "Needs tuning"}</small></p></div>
              <div className={activeSolved.promotionChecks?.capacityReady ? "gate-pass" : "gate-warn"}><span>03</span><p><strong>Capacity reserve</strong><small>{activeSolved.promotionChecks?.capacityReady ? "PASS" : `Target ${fmt(activeSolved.promotionChecks?.requiredNetLivingCapacitySqFt ?? solver.promotionTargetCapacitySqFt ?? 1944)} SF net capacity / unit`}</small></p></div>
              <div className={activeSolved.promotionChecks?.clearanceReady ? "gate-pass" : "gate-warn"}><span>04</span><p><strong>Boundary margin</strong><small>{activeSolved.promotionBoundaryClearanceFt == null ? "Not measured" : `${activeSolved.promotionBoundaryClearanceFt.toFixed(2)}′ current · ${(activeSolved.promotionChecks?.minimumClearanceFt ?? solver.promotionClearanceFt ?? 1).toFixed(0)}′ target`}</small></p></div>
            </div>}
          </article>
        </section>

        <section className="wb-panel current-set">
          <div className="section-heading"><div><p className="eyebrow">CURRENT SET · REAR GARAGE STACK</p><h2>Refine this family, not the whole universe.</h2></div><span className="mode-pill">{currentResults.length} RETAINED VARIANTS</span></div>
          <p className="wb-copy">These are the best retained versions of the new base shape. Click one to inspect its exact geometry and gate status above.</p>
          <div className="current-card-grid">{currentResults.slice(0, 10).map((candidate) => <button key={candidate.id} className={`current-card ${candidate.id === activeSolved?.id ? "selected" : ""}`} onClick={() => selectResult(candidate)}>
            <div><strong>{candidate.id}</strong><span className={candidate.physicalPass ? "pass-text" : "fail-text"}>{resultStatus(candidate)}</span></div>
            <div className="mini-metrics"><span>score <b>{candidate.combinedScore.toFixed(1)}</b></span><span>clear <b>{candidate.promotionBoundaryClearanceFt == null ? "—" : `${candidate.promotionBoundaryClearanceFt.toFixed(2)}′`}</b></span></div>
            <p>{candidate.physicalIssues[0] ?? candidate.program.reasons[0] ?? "Current gates pass."}</p>
          </button>)}</div>
        </section>

        {activeSolved && <section className="wb-panel candidate-detail">
          <div className="section-heading"><div><p className="eyebrow">WHY THIS CANDIDATE IS / ISN'T READY</p><h2>{activeSolved.id} detail</h2></div><span className="mode-pill">{activeSolved.family}</span></div>
          <div className="metric-list metric-grid">
            <div><span>Physical</span><strong>{activeSolved.physicalPass ? "PASS" : "FAIL"}</strong></div><div><span>Program</span><strong>{activeSolved.programPass ? "PASS" : "FAIL"}</strong></div><div><span>Promotion</span><strong>{activeSolved.promotionReady ? "READY" : "OPEN"}</strong></div><div><span>Combined score</span><strong>{activeSolved.combinedScore.toFixed(1)}</strong></div><div><span>Non-access clearance</span><strong>{activeSolved.promotionBoundaryClearanceFt == null ? "—" : `${activeSolved.promotionBoundaryClearanceFt.toFixed(2)}′`}</strong></div><div><span>Buildable-land pavement</span><strong>{fmt(activeSolved.pavement.estimatedBuildablePavementSqFt)} SF</strong></div>
          </div>
          <div className="unit-grid">{activeSolved.program.unitResults.map((unit) => <article key={unit.unitId}><p className="mini-label">UNIT {unit.unitId}</p><strong>{unit.netLivingCapacitySqFt == null ? "—" : `${fmt(unit.netLivingCapacitySqFt)} SF capacity`}</strong><span>Intent {unit.intendedLivingSqFt ?? "—"} SF</span>{[...unit.penalties, ...unit.reasons].slice(0,3).map((item) => <small key={item}>• {item}</small>)}</article>)}</div>
          {(activeSolved.physicalIssues.length > 0 || activeSolved.program.reasons.length > 0) && <div className="next-checks"><p className="mini-label">NEXT MOVES</p><ol>{[...activeSolved.physicalIssues, ...activeSolved.program.reasons].slice(0,6).map((issue) => <li key={issue}>{issue}</li>)}</ol></div>}
        </section>}

        <section className="evidence-grid">
          <article className="wb-panel evidence-card proven-card">
            <p className="eyebrow">DESIGN #1 · PROVEN BASELINE</p><h2>Edge / staggered spine</h2><p>Keep the earlier successful geometry as our control. It proves the solver, program logic, and circulation stack can produce a promotion-ready Pondy layout.</p>
            {provenBest && <button className="evidence-result" onClick={() => selectResult(provenBest)}><strong>{provenBest.id}</strong><span>{resultStatus(provenBest)}</span><small>{provenBest.promotionBoundaryClearanceFt?.toFixed(2) ?? "—"}′ non-access clearance · score {provenBest.combinedScore.toFixed(1)}</small></button>}
          </article>
          <article className="wb-panel evidence-card">
            <p className="eyebrow">WHAT WE LEARNED</p><h2>Prior runs stay useful.</h2><div className="lesson-list"><p><strong>False-pass cleanup</strong><span>Garage area no longer counts as living area; homes are solid obstacles.</span></p><p><strong>Compound massing</strong><span>L-shaped / multi-piece homes are supported and evaluated as one unit.</span></p><p><strong>Diversity lesson</strong><span>Five records are not five designs; concept groups now collapse near-duplicates.</span></p><p><strong>Accessory opportunity</strong><span>Rear detached garages now use a separate accessory-envelope hypothesis.</span></p></div>
          </article>
        </section>

        <details className="wb-panel archive-panel">
          <summary><div><p className="eyebrow">PREVIOUS EXPLORATIONS</p><h2>Open the archive of earlier families</h2></div><span className="mode-pill">{previousByFamily.length} FAMILIES</span></summary>
          <p className="wb-copy">Nothing is deleted. These families remain available as failure evidence, alternate massing studies, and regression checks—but they no longer compete visually with the active design.</p>
          <div className="archive-grid">{previousByFamily.map(({ family, best, count }) => <button key={family} className="archive-card" onClick={() => selectResult(best)}><strong>{family}</strong><span>{count} retained</span><small>{resultStatus(best)} · best score {best.combinedScore.toFixed(1)}</small></button>)}</div>
        </details>
      </> : <section className="empty-workbench wb-panel"><p className="eyebrow">READY TO RUN</p><h2>The page is organized around the new base shape.</h2><p>Run Workbench to populate the current rear-garage family, compare it against Design #1, and retain the earlier families in the archive.</p>{renderPlan(null)}</section>}

      <details className="wb-panel support-panel">
        <summary><div><p className="eyebrow">PROJECT RULES + CONSTRAINTS</p><h2>Reference, not dashboard noise</h2></div><span className="mode-pill">{spec.revision}</span></summary>
        <div className="support-grid"><div className="metric-list"><div><span>Frontage</span><strong>{spec.parcel.frontage}</strong></div><div><span>Access</span><strong>{spec.parcel.accessSides.join(", ")}</strong></div><div><span>Program</span><strong>{spec.program.units} units</strong></div><div><span>Living target</span><strong>{spec.program.targetLivingSqFt[0]}–{spec.program.targetLivingSqFt[1]} SF</strong></div><div><span>Design vehicle</span><strong>{spec.circulation.designVehicle}</strong></div></div><div><div className="wb-subhead"><p className="mini-label">CONSTRAINT OWNERSHIP</p><label className="wb-toggle"><input type="checkbox" checked={showSoft} onChange={(e) => setShowSoft(e.target.checked)} /> show soft</label></div><div className="constraint-list">{constraints.map((constraint) => <article key={constraint.id} className="constraint-row"><div><strong>{constraint.label}</strong><small>{constraint.movement ?? "No movement allowed"}</small></div><div className="constraint-tags"><span>{constraint.mode}</span><span>{constraint.mobility}</span></div></article>)}</div></div></div>
      </details>

      {solver?.benchmarkControl && <details className="wb-panel support-panel"><summary><div><p className="eyebrow">HISTORICAL CONTROL</p><h2>{solver.benchmarkControl.label}</h2></div><span className="mode-pill">CONTROL</span></summary><p>{solver.benchmarkControl.note ?? "Historical geometry retained for comparison."}</p><p className="microcopy">Comparison class: {solver.benchmarkControl.comparisonClass}. Evidence only; not an automatic winner under today's garage/program gate.</p></details>}

      <details className="wb-panel support-panel"><summary><div><p className="eyebrow">END-TO-END PIPELINE</p><h2>How Workbench reaches a verdict</h2></div><span className="mode-pill">{stages.length} STAGES</span></summary><div className="pipeline-grid">{stages.map((stage) => <article key={stage.id} className="pipeline-card"><div><span className={`status-dot status-${stage.status.toLowerCase()}`} /> <strong>{stage.label}</strong></div><p>{stage.purpose}</p><small>{stage.output}</small></article>)}</div></details>

      {!solver && <details className="wb-panel support-panel"><summary><div><p className="eyebrow">LEGACY TOPOLOGY SEEDS</p><h2>Pre-solver idea prompts</h2></div><span className="mode-pill">ARCHIVE</span></summary><div className="candidate-list">{seedCandidates.map((candidate) => <button key={candidate.id} onClick={() => setSelected(candidate.id)} className={`candidate-card ${candidate.id === selected ? "selected" : ""}`}><div><strong>{candidate.id}</strong><span>{candidate.status}</span></div><h3>{candidate.family}</h3><p>{candidate.summary}</p></button>)}</div><div className="notice"><strong>Selected:</strong> {activeSeed.id} · {activeSeed.summary}</div></details>}

      <footer>LotScope Workbench · Pondy Lot 2 · Current design + retained evidence · AeroVista Local</footer>
    </main>
  );
}
