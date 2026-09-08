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
  combinedPass: boolean;
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
  families: string[];
  scenario: string;
  solver: string;
  scoringVersion: string;
  benchmarkControl?: BenchmarkControl;
  shortlist: RankedResult[];
  results: RankedResult[];
};

function fmt(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
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
  const displayResults = solver?.shortlist.length ? solver.shortlist : solver?.results ?? [];
  const activeSolved = displayResults.find((candidate) => candidate.id === solverSelected) ?? displayResults[0] ?? null;
  const constraints = spec.constraints.filter((constraint) => showSoft || constraint.mode === "HARD");

  const runSolver = async () => {
    setRunning(true);
    setSolverError(null);
    try {
      const response = await fetch("/api/workbench/pondy-ranked", { cache: "no-store" });
      if (!response.ok) throw new Error(`Solver returned ${response.status}`);
      const data = await response.json() as RankedResponse;
      setSolver(data);
      const first = data.shortlist[0] ?? data.results[0];
      setSolverSelected(first?.id ?? null);
    } catch (error) {
      setSolverError(error instanceof Error ? error.message : "Solver failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <main className="shell workbench-shell">
      <header className="topbar">
        <div className="brand-lockup"><div className="brand-mark">LS</div><div><strong>LotScope Workbench</strong><span>Geometry · solver · agent surface</span></div></div>
        <div className="hero-actions" style={{ marginTop: 0 }}><a className="secondary-button" href="/">Public LotScope</a><span className="mode-pill">INTERNAL WORKBENCH</span></div>
      </header>

      <section className="hero workbench-hero">
        <p className="eyebrow">DESIGN PIPELINE · PROJECTSPEC DRIVEN</p>
        <h1>Generate first. Prove the math. Render last.</h1>
        <p className="lede">This surface is for the agent, solver and designer to work from the same constraints. Pondy Lot 2 now runs the combined physical, program and site-efficiency discovery stack.</p>
        <div className="hero-actions">
          <button className="primary-button" onClick={runSolver} disabled={running}>{running ? "Running Pondy discovery…" : "Run Pondy discovery"}</button>
          {solver && <span className="mode-pill">{solver.combinedPassCount} combined · {solver.physicalPassCount} physical · {solver.evaluatedCount} retained · {solver.elapsedMs} ms</span>}
        </div>
        {solver && <p className="microcopy">Scenario: {solver.scenario} · {solver.solver} · {solver.scoringVersion}. {solver.shortlist.length ? `${solver.shortlist.length} diverse families promoted.` : "No candidate is promoted unless both physical and program gates pass."}</p>}
        {solverError && <div className="notice"><strong>Solver error:</strong> {solverError}</div>}
      </section>

      <section className="wb-grid">
        <aside className="wb-panel">
          <p className="eyebrow">PROJECT</p><h2>{spec.name}</h2><p className="microcopy">{spec.revision}</p>
          <div className="metric-list">
            <div><span>Frontage</span><strong>{spec.parcel.frontage}</strong></div><div><span>Vehicle access</span><strong>{spec.parcel.accessSides.join(", ")}</strong></div><div><span>Program</span><strong>{spec.program.units} units</strong></div><div><span>Living target</span><strong>{spec.program.targetLivingSqFt[0]}–{spec.program.targetLivingSqFt[1]} SF</strong></div><div><span>Unit delta</span><strong>≤ {spec.program.maxUnitDifferenceSqFt} SF</strong></div><div><span>Design vehicle</span><strong>{spec.circulation.designVehicle}</strong></div>
          </div>
          <div className="wb-subhead"><p className="mini-label">CONSTRAINT OWNERSHIP</p><label className="wb-toggle"><input type="checkbox" checked={showSoft} onChange={(e) => setShowSoft(e.target.checked)} /> show soft</label></div>
          <div className="constraint-list">{constraints.map((constraint) => <article key={constraint.id} className="constraint-row"><div><strong>{constraint.label}</strong><small>{constraint.movement ?? "No movement allowed"}</small></div><div className="constraint-tags"><span>{constraint.mode}</span><span>{constraint.mobility}</span></div></article>)}</div>
        </aside>

        <section className="wb-canvas wb-panel">
          <div className="section-heading"><div><p className="eyebrow">SOLVER-DERIVED SITE MODEL</p><h2>{activeSolved ? activeSolved.id : "Constraint canvas"}</h2></div><span className="mode-pill">PENN ACCESS LOCKED</span></div>
          <svg viewBox="-8 -8 170 76" className="site-svg" role="img" aria-label="Pondy Lot 2 workbench parcel diagram">
            <polygon points={spec.parcel.polygon.map(([x,y]) => `${x},${y}`).join(" ")} className="wb-lot" />
            <line x1="148" y1="0" x2="148" y2="50" className="wb-frontage" />
            <text x="152" y="25" className="wb-svg-label" transform="rotate(90 152 25)">PENNSYLVANIA · ONLY ACCESS</text>
            {activeSolved ? <>
              {activeSolved.drives.map((drive) => <polyline key={drive.id} points={drive.points.map(([x,y]) => `${x},${y}`).join(" ")} className="wb-drive" />)}
              {activeSolved.placements.map((item) => <rect key={item.id} x={item.x} y={item.y} width={item.widthFt} height={item.depthFt} className={item.kind === "garage" ? "wb-garage" : item.id.endsWith("A") ? "wb-mass-a" : "wb-mass-b"} />)}
            </> : <><path d="M148 36 L105 36 L80 30" className="wb-drive" /><rect x="96" y="5" width="24" height="22" className="wb-mass-a" /><rect x="31" y="7" width="38" height="26" className="wb-mass-b" /><rect x="73" y="7" width="20" height="20" className="wb-garage" /></>}
          </svg>
          <div className="notice"><strong>Truth rule:</strong> geometry shown after a run comes directly from the ranked solver candidate. A green-looking diagram is not a PASS unless physical and program gates agree.</div>
        </section>

        <aside className="wb-panel">
          <p className="eyebrow">{solver ? "DISCOVERY RESULTS" : "TOPOLOGY SEEDS"}</p><h2>{solver ? (solver.shortlist.length ? "Promoted shortlist" : "Best failure evidence") : "Not solver results yet"}</h2>
          <div className="candidate-list">
            {solver ? displayResults.slice(0, Math.max(5, solver.shortlist.length)).map((candidate) => <button key={candidate.id} onClick={() => setSolverSelected(candidate.id)} className={`candidate-card ${candidate.id === activeSolved?.id ? "selected" : ""}`}><div><strong>{candidate.id}</strong><span>{candidate.combinedPass ? "COMBINED PASS" : candidate.physicalPass ? "PROGRAM FAIL" : "PHYSICAL FAIL"}</span></div><h3>{candidate.family}</h3><p>{candidate.physicalIssues[0] ?? candidate.program.reasons[0] ?? "All current gates pass."}</p><small>score {candidate.combinedScore.toFixed(1)} · {candidate.minimumClearanceFt == null ? "clearance n/a" : `clearance ${candidate.minimumClearanceFt.toFixed(2)}′`}</small></button>) : seedCandidates.map((candidate) => <button key={candidate.id} onClick={() => setSelected(candidate.id)} className={`candidate-card ${candidate.id === selected ? "selected" : ""}`}><div><strong>{candidate.id}</strong><span>{candidate.status}</span></div><h3>{candidate.family}</h3><p>{candidate.summary}</p><small>Requires deterministic solve</small></button>)}
          </div>
        </aside>
      </section>

      <section className="wb-panel wb-detail">
        {activeSolved ? <>
          <div className="section-heading"><div><p className="eyebrow">RANKED CANDIDATE</p><h2>{activeSolved.id} · {activeSolved.family}</h2></div><span className="mode-pill">{activeSolved.combinedPass ? "COMBINED PASS" : "NOT PROMOTED"}</span></div>
          <div className="metric-list">
            <div><span>Combined score</span><strong>{activeSolved.combinedScore.toFixed(1)}</strong></div>
            <div><span>Physical</span><strong>{activeSolved.physicalPass ? "PASS" : "FAIL"}</strong></div>
            <div><span>Program</span><strong>{activeSolved.programPass ? "PASS" : "FAIL"}</strong></div>
            <div><span>Repair used</span><strong>{activeSolved.repaired ? "Yes" : "No"}</strong></div>
            <div><span>Min boundary clearance</span><strong>{activeSolved.minimumClearanceFt == null ? "—" : `${activeSolved.minimumClearanceFt.toFixed(2)}′`}</strong></div>
            <div><span>Est. pavement in buildable land</span><strong>{fmt(activeSolved.pavement.estimatedBuildablePavementSqFt)} SF</strong></div>
            <div><span>Est. total pavement</span><strong>{fmt(activeSolved.pavement.estimatedTotalPavementSqFt)} SF</strong></div>
            <div><span>Unit area delta</span><strong>{activeSolved.program.unitDifferenceSqFt == null ? "—" : `${activeSolved.program.unitDifferenceSqFt} SF`}</strong></div>
          </div>
          {activeSolved.program.unitResults.length > 0 && <div className="result-columns">{activeSolved.program.unitResults.map((unit) => <article key={unit.unitId}><p className="mini-label">UNIT {unit.unitId}</p><p>Target <strong>{unit.intendedLivingSqFt ?? "—"} SF</strong>{unit.netLivingCapacitySqFt != null ? <> · net envelope capacity <strong>{fmt(unit.netLivingCapacitySqFt)} SF</strong></> : null}</p>{unit.penalties.map((penalty) => <p className="concern" key={penalty}>! {penalty}</p>)}</article>)}</div>}
          {activeSolved.physicalIssues.length > 0 && <div className="next-checks"><p className="mini-label">CURRENT PHYSICAL ISSUES</p><ol>{activeSolved.physicalIssues.map((issue) => <li key={issue}>{issue}</li>)}</ol></div>}
        </> : <>
          <div className="section-heading"><div><p className="eyebrow">SELECTED TOPOLOGY SEED</p><h2>{activeSeed.id} · {activeSeed.family}</h2></div><span className="mode-pill">{activeSeed.status}</span></div><p className="lede wb-copy">{activeSeed.summary}</p><div className="notice"><strong>No score yet.</strong> Run Pondy discovery to replace topology prompts with calculated candidate geometry.</div>
        </>}
      </section>

      {solver?.benchmarkControl && <section className="wb-panel"><p className="eyebrow">HISTORICAL CONTROL</p><h2>{solver.benchmarkControl.label}</h2><p>{solver.benchmarkControl.note ?? "Historical geometry retained for comparison."}</p><p className="microcopy">Comparison class: {solver.benchmarkControl.comparisonClass}. This control is evidence, not an automatic winner under the current garage/program gate.</p></section>}

      <section className="wb-panel"><p className="eyebrow">END-TO-END PIPELINE</p><h2>One run, explicit gates</h2><div className="pipeline-grid">{stages.map((stage) => <article key={stage.id} className="pipeline-card"><div><span className={`status-dot status-${stage.status.toLowerCase()}`} /> <strong>{stage.label}</strong></div><p>{stage.purpose}</p><small>{stage.output}</small></article>)}</div></section>

      <footer>LotScope Workbench · Internal computational design surface · AeroVista Local</footer>
    </main>
  );
}
