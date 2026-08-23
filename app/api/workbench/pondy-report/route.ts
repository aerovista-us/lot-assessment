import { NextResponse } from "next/server";
import { solveFamilies } from "@/packages/optimizer";
import { pondyFamilies, pondyProblem, PONDY_BUILDABLE, PONDY_SURVEY } from "@/packages/pondy";
import { evaluateProgram } from "@/packages/program";
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

export async function GET() {
  const started = Date.now();
  const solved = solveFamilies(pondyProblem, pondyFamilies, {
    maxEvaluations: 1600,
    diversePerFamily: 8,
    repairNearPasses: true,
    repairMaxStates: 1200,
    repairMaxActions: 3,
    minimumPreferredClearanceFt: 1
  });

  const evaluated = solved.map((item) => {
    const program = evaluateProgram(item.candidate, PROGRAM);
    const combinedPass = item.evaluation.pass && program.pass;
    return {
      item,
      program,
      combinedPass,
      score: (item.evaluation.pass ? 100 : 0) + program.qualityScore - Math.min(item.objective / 1000, 100)
    };
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
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Pondy rapid solver report</title><style>
  body{font:14px system-ui,sans-serif;margin:24px;background:#f5f5f2;color:#171717}h1{margin-bottom:4px}.meta{color:#666;margin-bottom:22px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:18px}.card{background:white;border:1px solid #ddd;border-radius:14px;padding:16px}.row{display:flex;justify-content:space-between;gap:12px}.pass{color:#18753c}.fail{color:#a12626}svg{width:100%;height:auto;background:#fafafa;border-radius:8px}.small{font-size:12px;color:#555}ul{padding-left:18px}</style></head><body>
  <h1>Pondy Lot 2 · rapid solver comparison</h1><div class="meta">Generated ${new Date().toISOString()} · ${pondyFamilies.length} families · ${solved.length} retained solver states · ${evaluated.filter(x=>x.combinedPass).length} combined passes · ${Date.now()-started} ms</div>
  <div class="grid">${cards.map(({item,program,combinedPass,score})=>`<article class="card"><div class="row"><div><strong>${item.candidate.id}</strong><div>${item.candidate.family}</div></div><strong class="${combinedPass?'pass':'fail'}">${combinedPass?'COMBINED PASS':'NOT PROMOTED'}</strong></div>
  ${renderCandidateSvg({parcel:PONDY_SURVEY,buildableEnvelope:PONDY_BUILDABLE,candidate:item.candidate,title:item.candidate.id})}
  <div class="row"><span>physical ${item.evaluation.pass?'PASS':'FAIL'}</span><span>program ${program.pass?'PASS':'FAIL'}</span><span>score ${score.toFixed(1)}</span></div>
  <div class="small">clearance ${item.evaluation.minimumClearanceFt?.toFixed(2) ?? 'n/a'} ft · repaired ${item.repaired?'yes':'no'} · unit delta ${program.unitDifferenceSqFt ?? 'n/a'} SF</div>
  <ul>${[...item.evaluation.issues.slice(0,4),...program.reasons.slice(0,2),...program.unitResults.flatMap(u=>u.penalties).slice(0,3)].map(x=>`<li>${x}</li>`).join('')}</ul></article>`).join('')}</div></body></html>`;

  return new NextResponse(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}
