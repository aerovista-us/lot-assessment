"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SitePlanDiagram } from "@/components/SitePlanDiagram";
import { STUDY_STORAGE_KEY, createPublicStudy, parsePublicStudy } from "@/lib/study-session";
import { IrregularLotSketch, type IrregularLotSnapshot } from "@/components/IrregularLotSketch";
import { assessLot, type LotAssessmentInput } from "@/lib/assessment";
import { trackEvent } from "@/lib/analytics";
import {
  assessInformationConfidence,
  type ConfidenceMap,
  type FactState,
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
    note: "This public gate screens width; turning geometry still needs a site-plan check.",
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

type Comparison = {id:string;label:string;status:string;score:number;confidence:string;utilization:number;units:number;stories:number;mode:"RECTANGLE"|"CUSTOM";input:LotAssessmentInput;studyConfidence:ConfidenceMap;customLot:IrregularLotSnapshot|null;};
const examplePrograms: ReadonlyArray<{id:string;label:string;detail:string;value:LotAssessmentInput}>= [
  {id:"narrow",label:"Narrow infill",detail:"Single home · one-car garage",value:{...initialInput,lotWidthFt:40,lotDepthFt:115,units:1,livingAreaPerUnitSqFt:1600,stories:2,garageSpacesPerUnit:1,drivewayWidthFt:12,minimumAccessWidthFt:12,leftSetbackFt:5,rightSetbackFt:5}},
  {id:"duplex",label:"Duplex concept",detail:"Two homes · integrated parking",value:{...initialInput}},
  {id:"compact",label:"Compact cottage",detail:"Single level · modest footprint",value:{...initialInput,lotWidthFt:66,lotDepthFt:100,units:1,livingAreaPerUnitSqFt:980,stories:1,garageSpacesPerUnit:1,garageIntegrated:false,frontSetbackFt:20,rearSetbackFt:18,leftSetbackFt:7,rightSetbackFt:7,drivewayWidthFt:12,minimumAccessWidthFt:12}}
];
export default function Home() {
  const [input, setInput] = useState<LotAssessmentInput>(initialInput);
  const [confidence, setConfidence] = useState<ConfidenceMap>(initialConfidence);
  const [lotMode, setLotMode] = useState<"RECTANGLE" | "CUSTOM">("RECTANGLE");
  const [customLot, setCustomLot] = useState<IrregularLotSnapshot | null>(null);
  const [hasRun, setHasRun] = useState(false);
  const [studyMessage,setStudyMessage] = useState("");
  const [comparisons,setComparisons] = useState<Comparison[]>([]);
  const applyStudy = (value:ReturnType<typeof parsePublicStudy>) => {
    setInput(value.input);setConfidence(value.confidence);
    setLotMode(value.lotMode);setCustomLot(value.customLot);
    setHasRun(false);
    setStudyMessage("Your saved study was restored. Run a fresh assessment to update the verdict.");
  };
  const saveLocal = () => {
    try {
      if(lotMode==="CUSTOM"&&!customLot?.complete)throw Error("Finish the irregular polygon before saving.");
      localStorage.setItem(STUDY_STORAGE_KEY,JSON.stringify(createPublicStudy(input,confidence,lotMode,customLot)));
      setStudyMessage("Study saved on this device only. No account upload or site approval occurred.");
    } catch(cause){setStudyMessage(cause instanceof Error?cause.message:"Browser storage is unavailable.");}
  };
  const restoreLocal = () => {
    try {
      const raw=localStorage.getItem(STUDY_STORAGE_KEY);
      if(!raw)throw Error("No locally saved LotScope study exists on this device.");
      applyStudy(parsePublicStudy(JSON.parse(raw)));
    }catch(cause){setStudyMessage(cause instanceof Error?cause.message:"Saved study could not be restored.");}
  };
  const exportStudy = () => {
    if(lotMode==="CUSTOM"&&!customLot?.complete){setStudyMessage("Complete the parcel polygon before exporting.");return;}
    const payload=createPublicStudy(input,confidence,lotMode,customLot);
    const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}));
    const link=document.createElement("a");link.href=url;link.download="lotscope-site-study.json";link.click();
    window.setTimeout(()=>URL.revokeObjectURL(url),1000);
    setStudyMessage("Portable study exported. This is a local concept file, not a broker-saved Advanced revision.");
  };
  const applyExample = (id:string) => {
    const example=examplePrograms.find(p=>p.id===id);
    if(!example)return;
    setInput({...example.value});setConfidence(initialConfidence);
    setLotMode("RECTANGLE");setCustomLot(null);setHasRun(false);
    setStudyMessage(example.label+" loaded as example assumptions. Confirm real site and jurisdiction values.");
  };
  const compareCurrent = () => {
    if(!hasRun)return;
    setComparisons(current=>{
      const next={id:String(Date.now()),label:"Study "+(current.length+1),status:result.status,score:result.score,
       confidence:infoConfidence.level,utilization:result.utilizationPct,units:input.units,stories:input.stories,
       mode:lotMode,input:{...input},studyConfidence:{...confidence},customLot:lotMode==="CUSTOM"?customLot:null};
      return [...current.slice(-2),next];
    });
    setStudyMessage("Comparison captured. Scores only compare entered assumptions, not zoning approval.");
  };

  useEffect(() => {
    trackEvent("journey_start", { surface: "guided_assessment_v2" });
  }, []);

  const result = useMemo(() => assessLot(input), [input]);
  const infoConfidence = useMemo(() => assessInformationConfidence(confidence), [confidence]);

  const update = (key: NumberField, raw: string) => {
    const parsed = Number(raw);
    setInput((current) => ({ ...current, [key]: Number.isFinite(parsed) ? parsed : 0 }));
    setHasRun(false);
  };

  const updateConfidence = (key: keyof LotAssessmentInput, state: FactState) => {
    setConfidence((current) => ({ ...current, [key]: state }));
    setHasRun(false);
  };

  const syncCustomLot = useCallback((snapshot: IrregularLotSnapshot) => {
    setCustomLot(snapshot);
    setHasRun(false);
    if (!snapshot.complete) return;
    setInput((current) => {
      if (current.lotWidthFt === snapshot.screenWidthFt && current.lotDepthFt === snapshot.screenDepthFt) return current;
      return {
        ...current,
        lotWidthFt: snapshot.screenWidthFt,
        lotDepthFt: snapshot.screenDepthFt
      };
    });
    setConfidence((current) => {
      if (current.lotWidthFt === "USER_SUPPLIED" && current.lotDepthFt === "USER_SUPPLIED") return current;
      return { ...current, lotWidthFt: "USER_SUPPLIED", lotDepthFt: "USER_SUPPLIED" };
    });
  }, []);

  const runAssessment = () => {
    setHasRun(true);
    trackEvent("assessment_run", {
      status: result.status,
      confidence: infoConfidence.level,
      lot_mode: lotMode,
      custom_polygon_vertices: lotMode === "CUSTOM" ? customLot?.points.length ?? 0 : 0,
      custom_frontage_ft: lotMode === "CUSTOM" ? customLot?.frontageLengthFt ?? 0 : 0,
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
    setCustomLot(null);
    setHasRun(false);
    trackEvent("assessment_reset");
  };

  const share = async () => {
    const shape = lotMode === "CUSTOM" && customLot?.complete
      ? ` Irregular parcel: ${fmt(customLot.areaSqFt)} sq ft, ${customLot.frontageLengthFt} ft selected frontage.`
      : "";
    const text = `LotScope: ${result.status} (${result.score}/100 feasibility), information confidence ${infoConfidence.level} (${infoConfidence.score}/100).${shape} Early planning aid only.`;
    trackEvent("share_assessment", { status: result.status, confidence: infoConfidence.level, lot_mode: lotMode });
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

  const visibleGroups = lotMode === "CUSTOM" ? groups.filter((group) => group.id !== "lot") : groups;

  return (
    <main className="shell">
      <header className="topbar" aria-label="LotScope site navigation">
        <Link className="brand-lockup" href="/" style={{textDecoration:"none"}}>
          <div className="brand-mark">LS</div>
          <div><strong>LotScope<span style={{display:"inline",color:"var(--accent)"}}> /</span> Site Studio</strong><span>Land intelligence by AeroVista</span></div>
        </Link>
        <nav className="studio-nav" aria-label="Main navigation">
          <a href="#assessment">Lot assessment</a>
          <a href="#result">Findings</a><Link href="/assessment/guided">Evidence view</Link>
          <Link href="/workbench">Workbench</Link>
          <Link href="/advanced/overview" className="nav-accent">Advanced ↗</Link>
        </nav>
      </header>

      <section className="public-hero" aria-label="Start your lot planning journey">
        <div className="public-hero-copy">
          <p className="hero-kicker">SITE INTELLIGENCE / 01 — DISCOVER</p>
          <h1>Every great build starts <span className="hero-strong">with the lot.</span></h1>
          <p className="lede">Explore your parcel. Test a building program against the setbacks and coverage you know. See where the constraints begin—before you invest in detailed plans.</p>
          <div className="hero-ctas"><a href="#assessment" className="primary-button">Assess a lot ↘</a><Link href="/advanced/overview" className="secondary-button">Explore Advanced ↗</Link></div>
          <div className="hero-footnotes"><span>Rectangular & irregular parcels</span><span>Transparent assumptions</span><span>No account required</span></div>
          <div className="notice"><strong>Conceptual feasibility only.</strong> No inferred zoning, surveyed boundaries, permit determination, or guaranteed building placement.</div>
        </div>
        <div className="hero-plan">
          {lotMode==="CUSTOM"&&!customLot?.complete?<div className="architect-plan" data-site-plan="awaiting-polygon"><div className="architect-plan-head"><span>LS — 001 / CUSTOM PARCEL</span><span>AWAITING SOURCE GEOMETRY</span></div><div style={{minHeight:340,display:"grid",placeItems:"center",padding:25,textAlign:"center",color:"#a6c6ca"}}>Draw or paste at least three parcel corners below. The plan will display only your submitted geometry, not an invented lot outline.</div><div className="architect-plan-foot"><span>UNVERIFIED INPUT</span><span>NO PARCEL GENERATED</span></div></div>:<SitePlanDiagram input={input} result={result} customLot={lotMode==="CUSTOM"?customLot:null} id="public-site-hero"/>}
        </div>
      </section>

      <div className="public-workflow" aria-label="LotScope workflow">
        <div className="current"><b>01</b><span>Understand the parcel</span></div>
        <div><b>02</b><span>Test buildability</span></div>
        <div><b>03</b><span>Compare scenarios</span></div>
        <div><b>04</b><span>Advance the design</span></div>
      </div>

      <section className="study-toolbox" aria-label="Study tools">
        <div className="study-toolbox-top"><div><p className="eyebrow">PROJECT STARTER</p><h2>Start from a program or your own site.</h2><p>Examples are assumptions, not local building-code defaults. Changes stay in this browser unless you explicitly save them.</p></div>
        <span className="mode-pill">FREE PUBLIC STUDIO</span></div>
        <div className="study-tools">
          <select aria-label="Choose an example project program" defaultValue="" onChange={event=>{if(event.target.value)applyExample(event.target.value);event.currentTarget.value="";}}>
            <option value="">Load example project…</option>{examplePrograms.map(p=><option key={p.id} value={p.id}>{p.label} — {p.detail}</option>)}
          </select>
          <button type="button" onClick={saveLocal}>Save on this device</button>
          <button type="button" onClick={restoreLocal}>Restore local study</button>
          <button type="button" onClick={exportStudy}>Export study JSON ↓</button>
          <button type="button" onClick={reset}>Reset inputs</button>
        </div>
        {studyMessage&&<p className="study-notice" role="status" aria-live="polite">{studyMessage}</p>}
      </section>

      <section className="mode-selector" aria-label="Lot input mode" id="assessment">
        <button className={lotMode === "RECTANGLE" ? "mode-card active" : "mode-card"} onClick={() => {setLotMode("RECTANGLE");setHasRun(false);}}>
          <strong>QUICK RECTANGLE</strong><span>Use width + depth for a fast dimensional screen.</span>
        </button>
        <button className={lotMode === "CUSTOM" ? "mode-card active" : "mode-card"} onClick={() => {setLotMode("CUSTOM");setHasRun(false);}}>
          <strong>CUSTOM / IRREGULAR LOT</strong><span>Draw or paste parcel corners and identify the actual street frontage.</span>
        </button>
      </section>

      {lotMode === "CUSTOM" && (
        <div className="notice custom-mode-note"><strong>Irregular lot ingest is now public.</strong> Draw or paste the real polygon and select its frontage edge. LotScope measures the polygon area and frontage, then feeds an area-equivalent rectangle into the current public screening math. Exact polygon setback insets, building placement, and vehicle paths remain Workbench-level proof.</div>
      )}

      <section className="workspace">
        <article className="input-panel">
          <div className="section-heading">
            <div><p className="eyebrow">STEP 1</p><h2>Describe the site</h2></div>
            <span className="mode-pill">{lotMode === "RECTANGLE" ? "RECTANGLE" : "IRREGULAR / SCREENED"}</span>
          </div>

          {lotMode === "CUSTOM" && <IrregularLotSketch onChange={syncCustomLot} initialSnapshot={customLot} />}

          <div className="input-groups">
            {visibleGroups.map((group) => (
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
            <input id="garageIntegrated" type="checkbox" checked={input.garageIntegrated} onChange={(event) => {setInput((current) => ({ ...current, garageIntegrated: event.target.checked }));setHasRun(false);}} />
            <label htmlFor="garageIntegrated"><strong>Garage integrated under/within building footprint</strong><small>Use this when upper-floor living area can overlap the garage footprint.</small></label>
            <select className={`fact-state ${confidence.garageIntegrated.toLowerCase()}`} value={confidence.garageIntegrated} onChange={(event) => updateConfidence("garageIntegrated", event.target.value as FactState)}>
              <option value="CONFIRMED">Confirmed</option>
              <option value="USER_SUPPLIED">User supplied</option>
              <option value="ASSUMED">Assumed</option>
              <option value="UNKNOWN">Unknown</option>
            </select>
          </div>

          <button className="primary-button full" onClick={runAssessment} disabled={lotMode === "CUSTOM" && !customLot?.complete}>Assess this lot</button>
        </article>

        <aside className="preview-panel">
          <p className="eyebrow">LIVE CALCULATION</p>
          <h2>{lotMode === "CUSTOM" ? "Irregular lot screen" : "Buildable envelope"}</h2>
          <p className="microcopy">Drawing LS-001 above reflects the submitted parcel inputs. The metrics below are screening estimates, not an engineered placement solution.</p>
          <div className="confidence-mini"><span>Current lot mode</span><strong>{lotMode==="CUSTOM"?"Supplied polygon":"Rectangular envelope"}</strong></div>
          <div className="metric-list">
            {lotMode === "CUSTOM" && customLot?.complete && <>
              <div><span>Measured polygon area</span><strong>{fmt(customLot.areaSqFt)} sq ft</strong></div>
              <div><span>Selected frontage</span><strong>{customLot.frontageLengthFt} ft · {customLot.frontageStreet}</strong></div>
            </>}
            <div><span>Screening lot area</span><strong>{fmt(result.lotAreaSqFt)} sq ft</strong></div>
            <div><span>Setback envelope</span><strong>{fmt(result.setbackEnvelopeSqFt)} sq ft</strong></div>
            <div><span>Coverage cap</span><strong>{fmt(result.maxCoverageAreaSqFt)} sq ft</strong></div>
            <div><span>Estimated footprint</span><strong>{fmt(result.estimatedProjectFootprintSqFt)} sq ft</strong></div>
          </div>
          <div className="confidence-mini">
            <span>Information confidence</span>
            <strong>{infoConfidence.level} · {infoConfidence.score}/100</strong>
          </div>
          <p className="microcopy">{lotMode === "RECTANGLE"
            ? "Quick Rectangle is a dimensional screen. Irregular lines, easements, driveway turns, utilities, slope and building shape still require deeper review."
            : "The actual polygon is captured here, but the public result still uses an area-equivalent rectangle for coarse capacity/setback screening. Workbench remains authoritative for true irregular placement and circulation."}</p>
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
                {infoConfidence.verify.length ? infoConfidence.verify.map((key) => <p className="concern" key={key}>! {fieldLabels[key] || String(key)} — {stateLabel(confidence[key])}</p>) : <p className="check">✓ No tracked numeric input is currently marked assumed or unknown.</p>}
                {lotMode === "CUSTOM" && <p className="concern">! Parcel shape — polygon/frontage are captured, but exact irregular setback geometry is not yet part of the public screening verdict.</p>}
              </article>
              <article className="next-checks"><p className="mini-label">VERIFY NEXT</p><ol>{result.nextChecks.map((item) => <li key={item}>{item}</li>)}</ol></article>
            </div>

            <div className="hero-actions">
              <button className="primary-button" onClick={share}>Share findings</button>
              <button className="secondary-button" onClick={compareCurrent}>Add to comparison +</button>
              <button className="secondary-button" onClick={exportStudy}>Export inputs ↓</button>
            </div>
          </>
        ) : <p>Adjust the facts and confidence states above, then run the assessment. Feasibility and information confidence are intentionally scored separately.</p>}
      </section>

      <section className="section" aria-label="Compare screened scenarios" id="compare">
        <div className="section-heading"><div><p className="eyebrow">03 / COMPARE</p><h2>What changes when the program changes?</h2></div>
          <span className="mode-pill">UP TO 3 OPTIONS</span></div>
        <p className="microcopy">Capture different assessed programs on the same site, or test another set of assumptions. These screening scores are comparisons—not verified physical layouts or zoning determinations.</p>
        {comparisons.length?<div className="study-set">{comparisons.map(study=><article className="study-scenario" key={study.id}>
          <span>{study.mode} · {study.confidence} CONFIDENCE</span>
          <strong>{study.status}</strong>
          <p>{study.units} unit(s) · {study.stories} stories · {fmt(study.utilization)}% estimated capacity used</p>
          <p>Feasibility score <b>{study.score}/100</b></p>
          <button type="button" onClick={()=>{setInput({...study.input});setLotMode(study.mode);setConfidence({...study.studyConfidence});setCustomLot(study.customLot);setHasRun(false);setStudyMessage("Comparison inputs loaded. Review the parcel and reassess before relying on the verdict.");document.getElementById("assessment")?.scrollIntoView({behavior:"smooth"});}}>Use these inputs</button>
        </article>)}</div>:<div className="notice">Run an assessment and select <strong>Add to comparison</strong> to record your first scenario. Compare how project size, garage needs and setbacks affect the result.</div>}
        <div className="hero-actions"><Link className="primary-button" href="/advanced/overview">Continue toward a private design ↗</Link><Link className="secondary-button" href="/workbench">Explore the design Workbench</Link></div>
      </section>

      <section className="section disclaimer-card">
        <p className="eyebrow">PUBLIC PROMOTION RULE</p>
        <h2>Proven capability first.</h2>
        <p>LotScope Public packages capabilities already proven in the shared engine and Workbench. The irregular-lot sketcher records real parcel polygons and frontage, while deeper placement and turning claims stay behind the Workbench evidence gate until they are proven for the specific site.</p>
      </section>

      <footer>LOT SCOPE / AEROVISTA LOCAL · Site intelligence for thoughtful building · Digital screening is not construction approval.</footer>
    </main>
  );
}
