import { NextResponse } from "next/server";
import { distance, pointInPolygon, Point } from "@/packages/geometry";
import { solveFamilies } from "@/packages/optimizer";
import { pondyFamilies, pondyProblem, PONDY_BUILDABLE, PONDY_SURVEY } from "@/packages/pondy";
import { evaluateProgram } from "@/packages/program";
import type { PlacementCandidate } from "@/packages/placement";
import { renderCandidateSvg } from "@/packages/site-render";

export const dynamic = "force-dynamic";

const PROGRAM = {
  units: ["A", "B"],
  livingRangeSqFt: [1600, 1900] as [number, number],
  maxUnitDifferenceSqFt: 120,
  stories: 2,
  minimumPlateWidthFt: 22,
  minimumPlateDepthFt: 22,
  maximumPlateAspectRatio: 2.2,
  garageAreaSqFt: 484
};

const DRIVE_WIDTH_FT = 12;
const SAMPLE_STEP_FT = 2;

function interpolate(a: Point, b: Point, t: number): Point {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

function pavementMetrics(candidate: PlacementCandidate) {
  let totalFt = 0;
  let buildableFt = 0;
  for (const drive of candidate.drives) {
    for (let i = 0; i < drive.points.length - 1; i += 1) {
      const a = drive.points[i];
      const b = drive.points[i + 1];
      const segmentFt = distance(a, b);
      totalFt += segmentFt;
      const steps = Math.max(1, Math.ceil(segmentFt / SAMPLE_STEP_FT));
      const sliceFt = segmentFt / steps;
      for (let step = 0; step < steps; step += 1) {
        if (pointInPolygon(interpolate(a, b, (step + 0.5) / steps), PONDY_BUILDABLE)) buildableFt += sliceFt;
      }
    }
  }
  return {
    totalSqFt: totalFt * DRIVE_WIDTH_FT,
    buildableSqFt: buildableFt * DRIVE_WIDTH_FT
  };
}

export async function GET() {
  const started = Date.now();
  const solved = solveFamilies(pondyProblem, pondyFamilies, {
    maxEvaluations: 360,
    diversePerFamily: 6,
    repairNearPasses: true,
    repairMaxStates: 300,
    repairMaxActions: 3,
    minimumPreferredClearanceFt: 1
  });

  const evaluated = solved.map((item) => {
    const program = evaluateProgram(item.candidate, PROGRAM);
    const pavement = pavementMetrics(item.candidate);
    const combinedPass = item.evaluation.pass && program.pass;
    const score = (item.evaluation.pass ? 100 : 0) + program.qualityScore -
      Math.min(item.objective / 1000, 100) - Math.min(pavement.buildableSqFt / 45, 35) -
      Math.min(pavement.totalSqFt / 220, 12);
    return { item, program, pavement, combinedPass, score };
  }).sort((a, b) => Number(b.combinedPass) - Number(a.combinedPass) || b.score - a.score);

  const selected: typeof evaluated = [];
  const seen = new Set<string>();
  for (const entry of evaluated) {
    if (!entry.combinedPass || seen.has(entry.item.candidate.family)) continue;
    selected.push(entry);
    seen.add(entry.item.candidate.family);
    if (selected.length >= 5) break;
  }

  const cards = selected.length ? selected : evaluated.slice(0, 5);
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Pondy discovery comparison</title><style>
  body{font:14px system-ui,sans-serif;margin:24px;background:#f5f5f2;color:#171717}h1{margin-bottom:4px}.meta{color:#666;margin-bottom:22px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:18px}.card{background:white;border:1px solid #ddd;border-radius:14px;padding:16px}.row{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}.pass{color:#18753c}.fail{color:#a12626}svg{width:100%;height:auto;background:#fafafa;border-radius:8px}.small{font-size:12px;color:#555}ul{padding-left:18px}</style></head><body>
  <h1>Pondy Lot 2 · baseline discovery comparison</h1><div class="meta">Generated ${new Date().toISOString()} · coarse full-grid sample · ${pondyFamilies.length} families · ${solved.length} retained states · ${evaluated.filter(x=>x.combinedPass).length} combined passes · ${Date.now()-started} ms</div>
  <div class="grid">${cards.map(({item,program,pavement,combinedPass,score})=>`<article class="card"><div class="row"><div><strong>${item.candidate.id}</strong><div>${item.candidate.family}</div></div><strong class="${combinedPass?'pass':'fail'}">${combinedPass?'COMBINED PASS':'NOT PROMOTED'}</strong></div>
  ${renderCandidateSvg({parcel:PONDY_SURVEY,buildableEnvelope:PONDY_BUILDABLE,candidate:item.candidate,title:item.candidate.id})}
  <div class="row"><span>physical ${item.evaluation.pass?'PASS':'FAIL'}</span><span>program ${program.pass?'PASS':'FAIL'}</span><span>score ${score.toFixed(1)}</span></div>
  <div class="small">clearance ${item.evaluation.minimumClearanceFt?.toFixed(2) ?? 'n/a'} ft · repaired ${item.repaired?'yes':'no'} · unit delta ${program.unitDifferenceSqFt ?? 'n/a'} SF · est. buildable-land pavement ${pavement.buildableSqFt.toFixed(0)} SF · est. total pavement ${pavement.totalSqFt.toFixed(0)} SF</div>
  <ul>${[...item.evaluation.issues.slice(0,4),...program.reasons.slice(0,2),...program.unitResults.flatMap(u=>u.penalties).slice(0,3)].map(x=>`<li>${x}</li>`).join('')}</ul></article>`).join('')}</div><p class="small">Pavement figures are ranking estimates based on a 12 ft corridor, not civil takeoffs.</p></body></html>`;

  return new NextResponse(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}
