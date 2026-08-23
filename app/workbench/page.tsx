"use client";

import { useMemo, useState } from "react";
import { pipelineFor, pondyLot2Spec, seedCandidates } from "@/lib/workbench";

export default function WorkbenchPage() {
  const [selected, setSelected] = useState(seedCandidates[0].id);
  const [showSoft, setShowSoft] = useState(true);
  const spec = pondyLot2Spec;
  const stages = useMemo(() => pipelineFor(spec), [spec]);
  const active = seedCandidates.find((candidate) => candidate.id === selected) ?? seedCandidates[0];
  const constraints = spec.constraints.filter((constraint) => showSoft || constraint.mode === "HARD");

  return (
    <main className="shell workbench-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark">LS</div>
          <div><strong>LotScope Workbench</strong><span>Geometry · solver · agent surface</span></div>
        </div>
        <div className="hero-actions" style={{ marginTop: 0 }}>
          <a className="secondary-button" href="/">Public LotScope</a>
          <span className="mode-pill">INTERNAL WORKBENCH</span>
        </div>
      </header>

      <section className="hero workbench-hero">
        <p className="eyebrow">DESIGN PIPELINE · PROJECTSPEC DRIVEN</p>
        <h1>Generate first. Prove the math. Render last.</h1>
        <p className="lede">This surface is for the agent, solver and designer to work from the same constraints. It does not replace the public feasibility UI; it exposes the machinery underneath it.</p>
      </section>

      <section className="wb-grid">
        <aside className="wb-panel">
          <p className="eyebrow">PROJECT</p>
          <h2>{spec.name}</h2>
          <p className="microcopy">{spec.revision}</p>
          <div className="metric-list">
            <div><span>Frontage</span><strong>{spec.parcel.frontage}</strong></div>
            <div><span>Vehicle access</span><strong>{spec.parcel.accessSides.join(", ")}</strong></div>
            <div><span>Program</span><strong>{spec.program.units} units</strong></div>
            <div><span>Living target</span><strong>{spec.program.targetLivingSqFt[0]}–{spec.program.targetLivingSqFt[1]} SF</strong></div>
            <div><span>Unit delta</span><strong>≤ {spec.program.maxUnitDifferenceSqFt} SF</strong></div>
            <div><span>Design vehicle</span><strong>{spec.circulation.designVehicle}</strong></div>
          </div>

          <div className="wb-subhead">
            <p className="mini-label">CONSTRAINT OWNERSHIP</p>
            <label className="wb-toggle"><input type="checkbox" checked={showSoft} onChange={(e) => setShowSoft(e.target.checked)} /> show soft</label>
          </div>
          <div className="constraint-list">
            {constraints.map((constraint) => (
              <article key={constraint.id} className="constraint-row">
                <div><strong>{constraint.label}</strong><small>{constraint.movement ?? "No movement allowed"}</small></div>
                <div className="constraint-tags"><span>{constraint.mode}</span><span>{constraint.mobility}</span></div>
              </article>
            ))}
          </div>
        </aside>

        <section className="wb-canvas wb-panel">
          <div className="section-heading">
            <div><p className="eyebrow">CANONICAL SITE MODEL</p><h2>Constraint canvas</h2></div>
            <span className="mode-pill">PENN ACCESS LOCKED</span>
          </div>
          <svg viewBox="-8 -8 170 76" className="site-svg" role="img" aria-label="Pondy Lot 2 workbench parcel diagram">
            <polygon points={spec.parcel.polygon.map(([x,y]) => `${x},${y}`).join(" ")} className="wb-lot" />
            <line x1="148" y1="0" x2="148" y2="50" className="wb-frontage" />
            <text x="152" y="25" className="wb-svg-label" transform="rotate(90 152 25)">PENNSYLVANIA · ONLY ACCESS</text>
            <path d="M148 36 L105 36 L80 30" className="wb-drive" />
            <rect x="96" y="5" width="24" height="22" className="wb-mass-a" />
            <rect x="31" y="7" width="38" height="26" className="wb-mass-b" />
            <rect x="73" y="7" width="20" height="20" className="wb-garage" />
            <text x="108" y="17" className="wb-svg-label">A</text>
            <text x="50" y="20" className="wb-svg-label">B</text>
            <text x="83" y="18" className="wb-svg-label">G</text>
          </svg>
          <div className="notice"><strong>Workbench rule:</strong> this preview is not a frozen candidate. Candidate geometry must come from the canonical model and pass the solver gates before promotion.</div>
        </section>

        <aside className="wb-panel">
          <p className="eyebrow">CANDIDATE QUEUE</p>
          <h2>Diverse survivors</h2>
          <div className="candidate-list">
            {seedCandidates.map((candidate) => (
              <button key={candidate.id} onClick={() => setSelected(candidate.id)} className={`candidate-card ${candidate.id === selected ? "selected" : ""}`}>
                <div><strong>{candidate.id}</strong><span>{candidate.status}</span></div>
                <h3>{candidate.family}</h3>
                <p>{candidate.summary}</p>
                <small>Overall {candidate.scores.overall}</small>
              </button>
            ))}
          </div>
        </aside>
      </section>

      <section className="wb-panel wb-detail">
        <div className="section-heading">
          <div><p className="eyebrow">SELECTED CANDIDATE</p><h2>{active.id} · {active.family}</h2></div>
          <span className="mode-pill">{active.status}</span>
        </div>
        <p className="lede wb-copy">{active.summary}</p>
        {active.adjustment && <div className="notice"><strong>Bounded repair:</strong> {active.adjustment}</div>}
        <div className="score-grid">
          {Object.entries(active.scores).map(([name, value]) => <div key={name}><span>{name}</span><strong>{value}</strong></div>)}
        </div>
      </section>

      <section className="wb-panel">
        <p className="eyebrow">END-TO-END PIPELINE</p>
        <h2>One run, explicit gates</h2>
        <div className="pipeline-grid">
          {stages.map((stage) => (
            <article key={stage.id} className="pipeline-card">
              <div><span className={`status-dot status-${stage.status.toLowerCase()}`} /> <strong>{stage.label}</strong></div>
              <p>{stage.purpose}</p>
              <small>{stage.output}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="wb-panel">
        <p className="eyebrow">WORKBENCH COMMAND CONTRACT</p>
        <h2>What the agent should eventually invoke</h2>
        <pre className="command-block">{`lotscope compile pondy-lot2\nlotscope generate pondy-lot2 --count 250\nlotscope solve pondy-lot2 --refine\nlotscope rank pondy-lot2 --diverse 12\nlotscope inspect WB-###\nlotscope refine WB-###\nlotscope freeze WB-###\nlotscope render WB-###\nlotscope deliver WB-###`}</pre>
        <p className="microcopy">The UI is the instrument panel. The skill should call deterministic engine functions/CLI rather than pretending UI clicks are geometry operations.</p>
      </section>

      <footer>LotScope Workbench · Internal computational design surface · AeroVista Local</footer>
    </main>
  );
}
