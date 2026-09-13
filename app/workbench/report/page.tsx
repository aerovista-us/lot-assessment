export default function WorkbenchReportPage() {
  return <main className="shell workbench-shell automation-shell">
    <section className="workbench-brief automation-hero">
      <div>
        <p className="eyebrow">USER REPORT · PONDY LOT 2</p>
        <h1>What works, what is still open, and what the optimizer can change.</h1>
        <p className="lede">This report is generated from the same authoritative Workbench run used for promotion. It separates hard feasibility from design tradeoffs and shows which repair tools remain available—including localized pavement and apron expansion.</p>
        <div className="hero-actions">
          <a className="secondary-button" href="/workbench/automation">Automation toolbox</a>
          <a className="secondary-button" href="/workbench">Full Workbench</a>
          <a className="primary-button" href="/api/workbench/pondy-report" target="_blank" rel="noreferrer">Open printable report</a>
        </div>
      </div>
      <div className="focus-rules">
        <p className="mini-label">REPORT PROMISE</p>
        <strong>No false certainty</strong><span>Promotion-ready means the current site/mobility gates pass; architectural room packing is reported separately.</span>
        <strong>No single-tool bias</strong><span>Building moves, garage changes, drive geometry and pavement are compared as legitimate options.</span>
        <strong>Evidence stays visible</strong><span>Near-passes and historical controls remain available for review instead of disappearing.</span>
      </div>
    </section>
    <section className="wb-panel" style={{marginTop:16}}>
      <iframe className="report-frame" src="/api/workbench/pondy-report" title="Pondy Lot 2 user report" />
    </section>
  </main>;
}
