"use client";

import { useEffect, useMemo, useState } from "react";
import { assessLot, LotAssessmentInput } from "@/lib/assessment";
import { trackEvent } from "@/lib/analytics";

const initialInput: LotAssessmentInput = {
  lotWidthFt: 50,
  lotDepthFt: 148,
  frontSetbackFt: 20,
  rearSetbackFt: 20,
  leftSetbackFt: 5,
  rightSetbackFt: 10,
  maxLotCoveragePct: 45,
  units: 2,
  livingAreaPerUnitSqFt: 1800,
  stories: 2,
  garageSpacesPerUnit: 2,
  garageIntegrated: true,
  drivewayWidthFt: 20,
  minimumAccessWidthFt: 20
};

type NumberField = Exclude<keyof LotAssessmentInput, "garageIntegrated">;

const fields: Array<{ key: NumberField; label: string; suffix?: string; min?: number; step?: number }> = [
  { key: "lotWidthFt", label: "Lot width", suffix: "ft", min: 1 },
  { key: "lotDepthFt", label: "Lot depth", suffix: "ft", min: 1 },
  { key: "frontSetbackFt", label: "Front setback", suffix: "ft", min: 0 },
  { key: "rearSetbackFt", label: "Rear setback", suffix: "ft", min: 0 },
  { key: "leftSetbackFt", label: "Left side setback", suffix: "ft", min: 0 },
  { key: "rightSetbackFt", label: "Right side setback", suffix: "ft", min: 0 },
  { key: "maxLotCoveragePct", label: "Max lot coverage", suffix: "%", min: 1 },
  { key: "units", label: "Units", min: 1 },
  { key: "livingAreaPerUnitSqFt", label: "Living area / unit", suffix: "sq ft", min: 1 },
  { key: "stories", label: "Stories", min: 1 },
  { key: "garageSpacesPerUnit", label: "Garage spaces / unit", min: 0 },
  { key: "drivewayWidthFt", label: "Available driveway width", suffix: "ft", min: 0 },
  { key: "minimumAccessWidthFt", label: "Assumed minimum access", suffix: "ft", min: 0 }
];

function fmt(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

export default function Home() {
  const [input, setInput] = useState<LotAssessmentInput>(initialInput);
  const [hasRun, setHasRun] = useState(false);

  useEffect(() => {
    trackEvent("journey_start", { surface: "quick_assessment" });
  }, []);

  const result = useMemo(() => assessLot(input), [input]);

  const update = (key: NumberField, raw: string) => {
    const parsed = Number(raw);
    setInput((current) => ({ ...current, [key]: Number.isFinite(parsed) ? parsed : 0 }));
  };

  const runAssessment = () => {
    setHasRun(true);
    trackEvent("assessment_run", {
      status: result.status,
      units: input.units,
      stories: input.stories,
      garage_spaces_per_unit: input.garageSpacesPerUnit,
      garage_integrated: input.garageIntegrated
    });
    document.getElementById("result")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const reset = () => {
    setInput(initialInput);
    setHasRun(false);
    trackEvent("assessment_reset");
  };

  const share = async () => {
    const text = `LotScope: ${result.status}. Estimated footprint ${fmt(result.estimatedProjectFootprintSqFt)} sq ft against about ${fmt(result.footprintCapacitySqFt)} sq ft of calculated capacity. Early feasibility only.`;
    trackEvent("share_assessment", { status: result.status });
    if (navigator.share) {
      try {
        await navigator.share({ title: "LotScope", text, url: window.location.origin });
        return;
      } catch {
        return;
      }
    }
    await navigator.clipboard.writeText(`${text} ${window.location.origin}`);
    alert("LotScope summary copied.");
  };

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark">LS</div>
          <div><strong>LotScope</strong><span>Can I build that here?</span></div>
        </div>
        <button className="ghost-button" onClick={reset}>Reset example</button>
      </header>

      <section className="hero">
        <p className="eyebrow">AEROVISTA LOCAL · EARLY SITE FEASIBILITY</p>
        <h1>Find the constraints before they become redesigns.</h1>
        <p className="lede">Enter the lot facts you know. LotScope turns setbacks, coverage, project size, garages and access into a fast feasibility screen with plain-English concerns and next checks.</p>
        <div className="notice"><strong>Planning aid, not permit approval.</strong> v1 uses the facts you enter and does not claim to know the governing zoning code automatically.</div>
      </section>

      <section className="workspace">
        <article className="input-panel">
          <div className="section-heading">
            <div><p className="eyebrow">STEP 1</p><h2>Lot + project facts</h2></div>
            <span className="mode-pill">MANUAL FACTS MODE</span>
          </div>

          <div className="field-grid">
            {fields.map((field) => (
              <label className="field" key={field.key}>
                <span>{field.label}</span>
                <div className="input-wrap">
                  <input
                    inputMode="decimal"
                    type="number"
                    min={field.min ?? 0}
                    step={field.step ?? 1}
                    value={input[field.key]}
                    onChange={(event) => update(field.key, event.target.value)}
                  />
                  {field.suffix && <small>{field.suffix}</small>}
                </div>
              </label>
            ))}
          </div>

          <label className="toggle-row">
            <input
              type="checkbox"
              checked={input.garageIntegrated}
              onChange={(event) => setInput((current) => ({ ...current, garageIntegrated: event.target.checked }))}
            />
            <span><strong>Garage integrated under/within building footprint</strong><small>Use this when upper-floor living area can overlap the garage footprint.</small></span>
          </label>

          <button className="primary-button full" onClick={runAssessment}>Assess this lot</button>
        </article>

        <aside className="preview-panel">
          <p className="eyebrow">LIVE CALCULATION</p>
          <h2>Buildable envelope</h2>
          <div className="envelope-visual" aria-label="Conceptual rectangular buildable envelope">
            <div className="lot-box"><div className="build-box"><span>{fmt(result.buildableWidthFt)}′ × {fmt(result.buildableDepthFt)}′</span></div></div>
          </div>
          <div className="metric-list">
            <div><span>Lot area</span><strong>{fmt(result.lotAreaSqFt)} sq ft</strong></div>
            <div><span>Setback envelope</span><strong>{fmt(result.setbackEnvelopeSqFt)} sq ft</strong></div>
            <div><span>Coverage cap</span><strong>{fmt(result.maxCoverageAreaSqFt)} sq ft</strong></div>
            <div><span>Estimated footprint</span><strong>{fmt(result.estimatedProjectFootprintSqFt)} sq ft</strong></div>
          </div>
          <p className="microcopy">This is intentionally rectangular. Irregular lot lines, easements, driveway turns, utilities, slope and building shape are not modeled yet.</p>
        </aside>
      </section>

      <section className={`result-card ${hasRun ? "visible" : "muted"}`} id="result">
        <div className="result-top">
          <div>
            <p className="eyebrow">STEP 2 · EARLY FEASIBILITY</p>
            <h2>{hasRun ? result.status : "RUN THE ASSESSMENT"}</h2>
          </div>
          <div className="score-ring"><strong>{hasRun ? result.score : "—"}</strong><span>/100</span></div>
        </div>

        {hasRun ? (
          <>
            <div className="capacity-bar"><span style={{ width: `${Math.min(result.utilizationPct, 100)}%` }} /></div>
            <p className="capacity-copy">Estimated project footprint uses about <strong>{fmt(result.utilizationPct)}%</strong> of calculated footprint capacity.</p>

            <div className="result-columns">
              <article>
                <p className="mini-label">WHAT WORKS</p>
                {result.reasons.length ? result.reasons.map((reason) => <p className="check" key={reason}>✓ {reason}</p>) : <p>No positive finding is strong enough yet.</p>}
              </article>
              <article>
                <p className="mini-label">CURRENT CONCERNS</p>
                {result.concerns.length ? result.concerns.map((concern) => <p className="concern" key={concern}>! {concern}</p>) : <p>No immediate dimensional red flags from the entered facts.</p>}
              </article>
            </div>

            <div className="next-checks">
              <p className="mini-label">VERIFY NEXT</p>
              <ol>{result.nextChecks.map((item) => <li key={item}>{item}</li>)}</ol>
            </div>

            <div className="hero-actions">
              <button className="primary-button" onClick={share}>Share summary</button>
              <a className="secondary-button" href="#roadmap" onClick={() => trackEvent("roadmap_view")}>What gets smarter next?</a>
            </div>
          </>
        ) : <p>Adjust the assumptions above, then run the assessment. Nothing here is sent to analytics as an address or parcel identifier.</p>}
      </section>

      <section className="section" id="roadmap">
        <p className="eyebrow">CAPABILITY ROADMAP</p>
        <h2>This starts as a calculator. It grows into a site-planning assistant.</h2>
        <div className="roadmap-grid">
          <article><span>NOW</span><h3>Dimensional feasibility</h3><p>Setbacks, coverage, unit size, stories, garages, access width and plain-English constraint flags.</p></article>
          <article><span>NEXT</span><h3>Jurisdiction + parcel facts</h3><p>Address/parcel lookup, zoning district, allowed uses, official code citations, frontage, parking and source timestamps.</p></article>
          <article><span>PONDY LEARNING LAYER</span><h3>Geometry + circulation</h3><p>Irregular lot shapes, driveway adjustment, garage door placement, turning paths, two-building placement, pass/fail geometry and alternative layouts.</p></article>
          <article><span>LATER</span><h3>Visual site-fit engine</h3><p>Drop conceptual footprints onto a lot, compare schemes, explain why one layout works better and preserve an auditable chain from source rule to design constraint.</p></article>
        </div>
      </section>

      <section className="section disclaimer-card">
        <p className="eyebrow">SOURCE STANDARD</p>
        <h2>No invented zoning answers.</h2>
        <p>When automatic jurisdiction data is added, every rule that affects the result should carry its source, effective/verified date and confidence. If the source is unavailable or ambiguous, the app should say <strong>Needs Verification</strong> instead of guessing.</p>
      </section>

      <footer>LotScope · “Can I Build That Here?” · An AeroVista Local utility</footer>
    </main>
  );
}
