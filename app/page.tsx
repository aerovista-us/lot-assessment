"use client";

import { useEffect, useMemo, useState } from "react";
import { assessLot, LotAssessmentInput } from "@/lib/assessment";
import { trackEvent } from "@/lib/analytics";
import {
  assessInformationConfidence,
  ConfidenceMap,
  FactState,
  initialConfidence,
  stateLabel
} from "@/lib/confidence";

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
type FieldDef = { key: NumberField; label: string; suffix?: string; min?: number };
type GroupDef = { id: string; title: string; note: string; fields: FieldDef[] };

const groups: GroupDef[] = [
  {
    id: "lot",
    title: "LOT",
    note: "Start with the dimensions you actually know.",
    fields: [
      { key: "lotWidthFt", label: "Lot width", suffix: "ft", min: 1 },
      { key: "lotDepthFt", label: "Lot depth", suffix: "ft", min: 1 }
    ]
  },
  {
    id: "rules",
    title: "RULES",
    note: "Treat unverified zoning numbers as assumptions, not facts.",
    fields: [
      { key: "frontSetbackFt", label: "Front setback", suffix: "ft", min: 0 },
      { key: "rearSetbackFt", label: "Rear setback", suffix: "ft", min: 0 },
      { key: "leftSetbackFt", label: "Left side setback", suffix: "ft", min: 0 },
      { key: "rightSetbackFt", label: "Right side setback", suffix: "ft", min: 0 },
      { key: "maxLotCoveragePct", label: "Max lot coverage", suffix: "%", min: 1 }
    ]
  },
  {
    id: "project",
    title: "PROJECT",
    note: "Describe the thing you are trying to fit.",
    fields: [
      { key: "units", label: "Units", min: 1 },
      { key: "livingAreaPerUnitSqFt", label: "Living area / unit", suffix: "sq ft", min: 1 },
      { key: "stories", label: "Stories", min: 1 },
      { key: "garageSpacesPerUnit", label: "Garage spaces / unit", min: 0 }
    ]
  },
  {
    id: "access",
    title: "ACCESS",
    note: "This is a width screen only; turning geometry still needs a site-plan check.",
    fields: [
      { key: "drivewayWidthFt", label: "Available driveway width", suffix: "ft", min: 0 },
      { key: "minimumAccessWidthFt", label: "Assumed minimum access", suffix: "ft", min: 0 }
    ]
  }
];

const fieldLabels: Partial<Record<keyof LotAssessmentInput, string>> = Object.fromEntries(
  groups.flatMap((group) => group.fields.map((field) => [field.key, field.label]))
) as Partial<Record<keyof LotAssessmentInput, string>>;

function fmt(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

export default function Home() {
  const [input, setInput] = useState<LotAssessmentInput>(initialInput);
  const [confidence, setConfidence] = useState<ConfidenceMap>(initialConfidence);
  const [lotMode, setLotMode] = useState<"RECTANGLE" | "CUSTOM">("RECTANGLE");
  const [hasRun, setHasRun] = useState(false);

  useEffect(() => {
    trackEvent("journey_start", { surface: "guided_assessment_v2" });
  }, []);

  const result = useMemo(() => assessLot(input), [input]);
  const infoConfidence = useMemo(() => assessInformationConfidence(confidence), [confidence]);

  const update = (key: NumberField, raw: string) => {
    const parsed = Number(raw);
    setInput((current) => ({ ...current, [key]: Number.isFinite(parsed) ? parsed : 0 }));
  };

  const updateConfidence = (key: keyof LotAssessmentInput, state: FactState) => {
    setConfidence((current) => ({ ...current, [key]: state }));
  };

  const runAssessment = () => {
    setHasRun(true);
    trackEvent("assessment_run", {
      status: result.status,
      confidence: infoConfidence.level,
      lot_mode: lotMode,
      units: input.units,
      stories: input.stories,
      garage_spaces_per_unit: input.garageSpacesPerUnit,
      garage_integrated: input.garageIntegrated
    });
    document.getElementById("result")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const reset = () => {
    setInput(initialInput);
    setConfidence(initialConfidence);
    setLotMode("RECTANGLE");
    setHasRun(false);
    trackEvent("assessment_reset");
  };

  const share = async () => {
    const text = `LotScope: ${result.status} (${result.score}/100 feasibility), information confidence ${infoConfidence.level} (${infoConfidence.score}/100). Early planning aid only.`;
    trackEvent("share_assessment", { status: result.status, confidence: infoConfidence.level });
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
        <p className="eyebrow">AEROVISTA LOCAL · GUIDED ASSESSMENT v2.0</p>
        <h1>Find the constraints before they become redesigns.</h1>
        <p className="lede">Describe the lot, the rules you are using, the project, and access. LotScope keeps physical feasibility separate from how confident we should be in the information behind it.</p>
        <div className="notice"><strong>Planning aid, not permit approval.</strong> LotScope uses the facts and assumptions you enter. It does not invent zoning rules or silently convert assumptions into confirmed facts.</div>
      </section>

      <section className="mode-selector" aria-label="Lot input mode">
        <button className={lotMode === "RECTANGLE" ? "mode-card active" : "mode-card"} onClick={() => setLotMode("RECTANGLE")}>
          <strong>QUICK RECTANGLE</strong><span>Use width + depth for a fast dimensional screen.</span>
        </button>
        <button className={lotMode === "CUSTOM" ? "mode-card active" : "mode-card"} onClick={() => setLotMode("CUSTOM")}>
          <strong>CUSTOM LOT FACTS</strong><span>Use the same assessment as an approximation when the real parcel is irregular.</span>
        </button>
      </section>

      {lotMode === "CUSTOM" && (
        <div className="notice custom-mode-note"><strong>Custom lot mode is intentionally honest in v2.0.</strong> The Workbench already supports irregular geometry, but this public release does not add a new drawing tool. Width/depth below are treated as an approximate bounding rectangle and information confidence should reflect that.</div>
      )}

      <section className="workspace">
        <article className="input-panel">
          <div className="section-heading">
            <div><p className="eyebrow">STEP 1</p><h2>Describe the site</h2></div>
            <span className="mode-pill">{lotMode === "RECTANGLE" ? "RECTANGLE" : "CUSTOM / APPROX"}</span>
          </div>

          <div className="input-groups">
            {groups.map((group) => (
              <section className="input-group" key={group.id}>
                <div className="group-heading"><div><strong>{group.title}</strong><span>{group.note}</span></div></div>
                <div className="field-grid">
                  {group.fields.map((field) => (
                    <label className="field" key={field.key}>
                      <span>{field.label}</span>
                      <div className="input-wrap">
                        <input inputMode="decimal" type="number" min={field.min ?? 0} step={1} value={input[field.key]} onChange={(event) => update(field.key, event.target.value)} />
                        {field.suffix && <small>{field.suffix}</small>}
                      </div>
                      <select className={`fact-state ${confidence[field.key].toLowerCase()}`} value={confidence[field.key]} onChange={(event) => updateConfidence(field.key, event.target.value as FactState)}>
                        <option value="CONFIRMED">Confirmed</option>
                        <option value="USER_SUPPLIED">User supplied</option>
                        <option value="ASSUMED">Assumed</option>
                        <option value="UNKNOWN">Unknown</option>
                      </select>
                    </label>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="toggle-row">
            <input id="garageIntegrated" type="checkbox" checked={input.garageIntegrated} onChange={(event) => setInput((current) => ({ ...current, garageIntegrated: event.target.checked }))} />
            <label htmlFor="garageIntegrated"><strong>Garage integrated under/within building footprint</strong><small>Use this when upper-floor living area can overlap the garage footprint.</small></label>
            <select className={`fact-state ${confidence.garageIntegrated.toLowerCase()}`} value={confidence.garageIntegrated} onChange={(event) => updateConfidence("garageIntegrated", event.target.value as FactState)}>
              <option value="CONFIRMED">Confirmed</option>
              <option value="USER_SUPPLIED">User supplied</option>
              <option value="ASSUMED">Assumed</option>
              <option value="UNKNOWN">Unknown</option>
            </select>
          </div>

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
          <div className="confidence-mini">
            <span>Information confidence</span>
            <strong>{infoConfidence.level} · {infoConfidence.score}/100</strong>
          </div>
          <p className="microcopy">{lotMode === "RECTANGLE" ? "Quick Rectangle is a dimensional screen. Irregular lines, easements, driveway turns, utilities, slope and building shape still require deeper review." : "Custom Lot Facts uses a rectangular approximation in public v2.0. Do not treat this preview as the true parcel polygon."}</p>
        </aside>
      </section>

      <section className={`result-card ${hasRun ? "visible" : "muted"}`} id="result">
        <div className="dual-result">
          <div>
            <p className="eyebrow">FEASIBILITY</p>
            <h2>{hasRun ? result.status : "RUN THE ASSESSMENT"}</h2>
            <div className="score-line"><strong>{hasRun ? result.score : "—"}</strong><span>/100</span></div>
          </div>
          <div>
            <p className="eyebrow">INFORMATION CONFIDENCE</p>
            <h2>{hasRun ? infoConfidence.level : "—"}</h2>
            <div className="score-line"><strong>{hasRun ? infoConfidence.score : "—"}</strong><span>/100</span></div>
          </div>
        </div>

        {hasRun ? (
          <>
            <div className="capacity-bar"><span style={{ width: `${Math.min(result.utilizationPct, 100)}%` }} /></div>
            <p className="capacity-copy">Estimated project footprint uses about <strong>{fmt(result.utilizationPct)}%</strong> of calculated footprint capacity.</p>

            <div className="result-columns">
              <article><p className="mini-label">WHAT WORKS</p>{result.reasons.length ? result.reasons.map((reason) => <p className="check" key={reason}>✓ {reason}</p>) : <p>No positive finding is strong enough yet.</p>}</article>
              <article><p className="mini-label">CURRENT CONCERNS</p>{result.concerns.length ? result.concerns.map((concern) => <p className="concern" key={concern}>! {concern}</p>) : <p>No immediate dimensional red flags from the entered facts.</p>}</article>
            </div>

            <div className="result-columns">
              <article className="verify-panel">
                <p className="mini-label">ASSUMPTIONS TO VERIFY</p>
                {infoConfidence.verify.length ? infoConfidence.verify.map((key) => <p className="concern" key={key}>! {fieldLabels[key] || String(key)} — {stateLabel(confidence[key])}</p>) : <p className="check">✓ No tracked input is currently marked assumed or unknown.</p>}
                {lotMode === "CUSTOM" && <p className="concern">! Parcel shape — public v2.0 is using a bounding-rectangle approximation.</p>}
              </article>
              <article className="next-checks"><p className="mini-label">VERIFY NEXT</p><ol>{result.nextChecks.map((item) => <li key={item}>{item}</li>)}</ol></article>
            </div>

            <div className="hero-actions"><button className="primary-button" onClick={share}>Share summary</button></div>
          </>
        ) : <p>Adjust the facts and confidence states above, then run the assessment. Feasibility and information confidence are intentionally scored separately.</p>}
      </section>

      <section className="section disclaimer-card">
        <p className="eyebrow">PUBLIC PROMOTION RULE</p>
        <h2>Proven capability first.</h2>
        <p>LotScope Public packages capabilities already proven in the shared engine and Workbench. New geometry, circulation, placement and solver behavior is validated internally before it is promoted here.</p>
      </section>

      <footer>LotScope · “Can I Build That Here?” · An AeroVista Local utility</footer>
    </main>
  );
}
