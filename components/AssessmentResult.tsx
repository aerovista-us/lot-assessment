"use client";

import Link from "next/link";
import { evidenceForAudience, summarizeEvidence, type AssessmentEvidence, type EvidenceStatus } from "@/packages/evidence";
import styles from "./assessment-result.module.css";

const statusLabel: Record<EvidenceStatus, string> = {
  PASS: "PASS",
  PASS_TIGHT: "PASS · TIGHT",
  WATCH: "WATCH",
  FAIL: "FAIL",
  PROFESSIONAL_REVIEW: "PRO REVIEW"
};

const statusClass: Record<EvidenceStatus, string> = {
  PASS: styles.pass,
  PASS_TIGHT: styles.tight,
  WATCH: styles.watch,
  FAIL: styles.fail,
  PROFESSIONAL_REVIEW: styles.review
};

function metricValue(value: string | number | boolean | null, unit?: string) {
  if (value == null) return "—";
  return `${String(value)}${unit ? ` ${unit}` : ""}`;
}

export function AssessmentResult({ evidence, mode }: { evidence: AssessmentEvidence; mode: "PUBLIC" | "WORKBENCH" }) {
  const view = evidenceForAudience(evidence, mode);
  const summary = summarizeEvidence(view);
  const publicMode = mode === "PUBLIC";

  return (
    <main className={styles.shell}>
      <header className={styles.topbar}>
        <div>
          <span className={styles.brand}>LotScope {publicMode ? "Assessment" : "Workbench"}</span>
          <strong>{publicMode ? "Solve → Prove → Explain" : "Evidence-backed design development"}</strong>
        </div>
        <nav>
          <Link href="/">Public</Link>
          {!publicMode && <Link href="/workbench">Workbench</Link>}
        </nav>
      </header>

      <section className={styles.heroGrid}>
        <article className={`${styles.card} ${styles.hero}`}>
          <p className={styles.eyebrow}>{view.lifecycle} · {publicMode ? "DECISION SUPPORT" : "TECHNICAL EVIDENCE"}</p>
          <h1>{view.title}</h1>
          <p className={styles.subtitle}>{view.subtitle}</p>
          <p className={styles.lede}>{view.executiveSummary}</p>
          <div className={styles.pills}>
            <span className={`${styles.pill} ${view.geometryVerdict === "PASS" ? styles.pass : styles.fail}`}>Geometry {view.geometryVerdict}</span>
            <span className={`${styles.pill} ${view.releaseVerdict === "READY" ? styles.pass : view.releaseVerdict === "BLOCKED" ? styles.fail : styles.watch}`}>Release {view.releaseVerdict}</span>
            <span className={styles.pill}>{summary.passCount} passing gates</span>
            {summary.watchCount > 0 && <span className={`${styles.pill} ${styles.watch}`}>{summary.watchCount} watch items</span>}
          </div>
        </article>

        <aside className={`${styles.card} ${styles.verdict}`}>
          <p className={styles.eyebrow}>CURRENT READ</p>
          <div className={styles.verdictBlock}><span>Feasibility</span><strong>{view.feasibilityLabel}</strong></div>
          <div className={styles.verdictBlock}><span>Information confidence</span><strong>{view.informationConfidenceLabel}</strong></div>
          <div className={styles.verdictBlock}><span>Overall</span><strong>{summary.overall.replaceAll("_", " ")}</strong></div>
        </aside>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}><div><p className={styles.eyebrow}>PROOF MAP</p><h2>What the engine says</h2></div><p>One evidence record drives both surfaces. Public simplifies the explanation; Workbench keeps the engineering detail.</p></div>
        <div className={styles.gateGrid}>
          {view.gates.map((gate) => (
            <article className={`${styles.gate} ${statusClass[gate.status]}`} key={gate.id}>
              <div className={styles.gateTop}><strong>{gate.label}</strong><span>{statusLabel[gate.status]}</span></div>
              <p>{gate.summary}</p>
              {mode === "WORKBENCH" && gate.details?.map((detail) => <small key={detail}>{detail}</small>)}
              {gate.metrics?.length ? <div className={styles.metrics}>{gate.metrics.map((metric) => <div key={metric.id}><span>{metric.label}</span><strong>{metricValue(metric.value, metric.unit)}</strong>{metric.note && <small>{metric.note}</small>}</div>)}</div> : null}
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}><div><p className={styles.eyebrow}>ATTENTION</p><h2>What deserves another look</h2></div><p>Passing geometry is not the same thing as comfortable daily use or professional approval.</p></div>
        <div className={styles.findings}>
          {view.findings.length ? view.findings.map((finding) => (
            <article className={styles.finding} key={finding.id}>
              <span className={`${styles.badge} ${statusClass[finding.status]}`}>{statusLabel[finding.status]}</span>
              <h3>{finding.title}</h3>
              <p>{finding.summary}</p>
              {finding.recommendation && <strong>{finding.recommendation}</strong>}
            </article>
          )) : <article className={styles.finding}><span className={`${styles.badge} ${styles.pass}`}>CLEAR</span><h3>No additional surfaced findings</h3><p>The current evidence gates carry the active result.</p></article>}
        </div>
      </section>

      <section className={`${styles.card} ${styles.boundary}`}>
        <div><p className={styles.eyebrow}>PROFESSIONAL REVIEW BOUNDARY</p><h2>What LotScope is not claiming</h2></div>
        <div className={styles.boundaryGrid}>{view.professionalBoundaries.map((item) => <div key={item.id}><strong>{item.label}</strong><span>{item.status}</span><p>{item.note}</p></div>)}</div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}><div><p className={styles.eyebrow}>ASSUMPTIONS</p><h2>What this result depends on</h2></div></div>
        <div className={styles.assumptions}>{view.assumptions.map((assumption) => <p key={assumption}>• {assumption}</p>)}</div>
      </section>

      <section className={`${styles.card} ${styles.trace}`}>
        <div><p className={styles.eyebrow}>TRACEABILITY</p><h2>Reproducible result</h2></div>
        <dl>
          <div><dt>Source project</dt><dd>{view.trace.sourceProject}</dd></div>
          <div><dt>Source revision</dt><dd><code>{view.trace.sourceRevision}</code></dd></div>
          <div><dt>Engine revision</dt><dd>{view.trace.engineRevision}</dd></div>
          <div><dt>Workflow run</dt><dd>{view.trace.workflowRunId ?? "—"}</dd></div>
          <div><dt>Artifact</dt><dd>{view.trace.artifactId ?? "—"}</dd></div>
          {mode === "WORKBENCH" && view.trace.artifactSha256 && <div><dt>Artifact SHA-256</dt><dd><code>{view.trace.artifactSha256}</code></dd></div>}
        </dl>
      </section>

      <footer className={styles.footer}>LotScope · early planning and design-development evidence · not permit approval</footer>
    </main>
  );
}
