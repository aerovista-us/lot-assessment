import { NextRequest, NextResponse } from "next/server";
import {
  SITE_AUTOMATION_PASSES,
  SITE_STRATEGY_TOOLBOX,
  evaluateCandidateAutomation
} from "@/packages/automation";
import { evaluatePavementSensitivity } from "@/packages/automation/pavement";
import { insetPolygonBySegment } from "@/packages/geometry";
import { PONDY_BUILDABLE, PONDY_SURVEY, pondyProblem } from "@/packages/pondy";
import type { PlacementProblem } from "@/packages/placement";
import { renderCandidateSvg } from "@/packages/site-render";

export const dynamic = "force-dynamic";

const ACCESSORY_SEGMENT_SETBACK = [5, 20, 5, 5, 5, 5];
const PONDY_ACCESSORY_BUILDABLE = insetPolygonBySegment(
  PONDY_SURVEY,
  (segmentIndex) => ACCESSORY_SEGMENT_SETBACK[segmentIndex] ?? 0
);
const accessoryProblem: PlacementProblem = {
  ...pondyProblem,
  buildableEnvelope: PONDY_ACCESSORY_BUILDABLE
};

type RankedResult = {
  id: string;
  family: string;
  conceptGroup?: string;
  lifecycle?: string;
  combinedPass: boolean;
  promotionReady?: boolean;
  physicalPass: boolean;
  programPass: boolean;
  combinedScore: number;
  promotionBoundaryClearanceFt?: number | null;
  promotionChecks?: {
    clearanceReady: boolean;
    capacityReady: boolean;
    mobilityReady?: boolean;
    requiredNetLivingCapacitySqFt: number;
  };
  physicalIssues: string[];
  repaired: boolean;
  repairActions: Array<{
    kind: "shift-placement" | "shift-drive-point";
    targetId: string;
    dx: number;
    dy: number;
    pointIndex?: number;
  }>;
  pavement: {
    estimatedTotalPavementSqFt: number;
    estimatedBuildablePavementSqFt: number;
    buildableSharePct: number;
  };
  mobilityAudit: {
    pass: boolean;
    promotionReady: boolean;
    driveWidthFt: number;
    turningPavementWidthFt: number;
    failures: string[];
    warnings: string[];
    drives: Array<{
      driveId: string;
      result?: {
        gearChanges?: number;
        minimumTurningRadiusFt?: number | null;
        pavementViolationSamples?: number;
      } | null;
      pathIssues: string[];
      failures: string[];
      warnings: string[];
    }>;
  };
  program: {
    pass: boolean;
    reasons: string[];
    unitResults: Array<{
      unitId: string;
      intendedLivingSqFt: number | null;
      netLivingCapacitySqFt?: number | null;
      reasons: string[];
      penalties: string[];
    }>;
  };
  placements: Array<{
    id: string;
    kind: "home" | "garage" | "reserved" | "other";
    x: number;
    y: number;
    widthFt: number;
    depthFt: number;
    rotationDeg?: number;
    rotationLimitDeg?: number;
    movable: boolean;
    movementLimitFt?: number;
    integrationGroupId?: string;
    circulationObstacle?: boolean;
  }>;
  drives: Array<{
    id: string;
    garageId?: string;
    points: Array<[number, number]>;
    movableControlPoints?: number[];
    controlPointLimitFt?: number;
  }>;
  metadata: Record<string, string | number | boolean>;
  freeze?: { freezeHash: string };
  roomPacking?: {
    pass: boolean;
    score: number;
    reasons: string[];
    unitResults: Array<{ unitId: string; penalties: string[]; reasons: string[] }>;
  };
};

type RankedResponse = {
  project: string;
  scenario: string;
  solver: string;
  scoringVersion: string;
  elapsedMs: number;
  evaluatedCount: number;
  physicalPassCount: number;
  combinedPassCount: number;
  promotionReadyCount?: number;
  distinctPromotionReadyCount?: number;
  finalistFreezeCount?: number;
  roomPackingPassCount?: number;
  architecturallyEvaluatedCount?: number;
  architecturalPassCount?: number;
  architecturalLeader?: string | null;
  promotionClearanceFt?: number;
  shortlist: RankedResult[];
  results: RankedResult[];
};

function esc(value: unknown): string {
  return String(value ?? "").replace(/[&<>\"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[ch] ?? ch));
}

function fmt(value: number | null | undefined, digits = 0) {
  return value == null || !Number.isFinite(value) ? "—" : value.toFixed(digits);
}

function candidateAutomation(candidate: RankedResult, promotionClearanceFt: number) {
  return evaluateCandidateAutomation({
    candidate: candidate as never,
    repairActions: candidate.repairActions as never,
    mobilityAudit: candidate.mobilityAudit as never,
    program: candidate.program as never,
    promotionBoundaryClearanceFt: candidate.promotionBoundaryClearanceFt ?? null,
    promotionClearanceFt
  });
}

function problemFor(candidate: RankedResult) {
  return candidate.family === "rear-garage-stack" ? accessoryProblem : pondyProblem;
}

function pavementScenarioStrip(candidate: RankedResult) {
  const sensitivity = evaluatePavementSensitivity(
    problemFor(candidate),
    candidate as never,
    [12, 14, 16, 18, 20]
  );
  const scenarios = sensitivity.scenarios.map((scenario) => `<div class="pave-chip ${scenario.pass ? "pave-good" : "pave-bad"}"><span>${fmt(scenario.driveWidthFt)}′ corridor</span><strong>${scenario.pass ? "PASS" : "FAIL"}</strong><small>${fmt(scenario.turningPavementWidthFt, 2)}′ turn zone</small></div>`).join("");
  const verdict = sensitivity.pavementOnlyRescuePossible
    ? `Pavement-only rescue appears possible at ${fmt(sensitivity.minimumHardPassWidthFt)}′ in this coarse corridor sensitivity.`
    : sensitivity.minimumHardPassWidthFt != null
      ? `This candidate already clears the hardened mobility audit by ${fmt(sensitivity.minimumHardPassWidthFt)}′.`
      : "More pavement alone does not clear the remaining hard failure in the tested range.";
  return `<div class="pave-read"><div><span class="label">PAVEMENT SENSITIVITY · 12′–20′</span><p>${esc(verdict)}</p></div><div class="pave-chips">${scenarios}</div><small>${esc(sensitivity.note)}</small></div>`;
}

export async function GET(request: NextRequest) {
  const rankedUrl = new URL("/api/workbench/pondy-ranked", request.url);
  const rankedResponse = await fetch(rankedUrl, { cache: "no-store" });
  if (!rankedResponse.ok) {
    return new NextResponse(`Workbench report could not load ranked evidence (${rankedResponse.status}).`, { status: 502 });
  }

  const ranked = await rankedResponse.json() as RankedResponse;
  const promotionClearanceFt = ranked.promotionClearanceFt ?? 1;
  const primaryCards = ranked.shortlist.length
    ? ranked.shortlist
    : ranked.results.filter((item) => item.promotionReady || item.combinedPass).slice(0, 5);
  const cards = primaryCards.length ? primaryCards : ranked.results.slice(0, 5);
  const design2Diagnostics = ranked.results
    .filter((item) => item.family === "rear-garage-stack")
    .slice(0, 4);
  const promotionCount = ranked.promotionReadyCount ?? ranked.results.filter((item) => item.promotionReady).length;
  const distinctCount = ranked.distinctPromotionReadyCount ?? ranked.shortlist.length;
  const roomPass = ranked.roomPackingPassCount ?? ranked.shortlist.filter((item) => item.roomPacking?.pass).length;

  const toolbox = SITE_STRATEGY_TOOLBOX.map((tool) => `<article class="tool ${tool.availability.toLowerCase()}"><div><span>${esc(tool.category)}</span><b>${esc(tool.availability)}</b></div><h3>${esc(tool.label)}</h3><p>${esc(tool.description)}</p><small>${esc(tool.tradeoff)}</small></article>`).join("");

  const passes = SITE_AUTOMATION_PASSES.map((pass) => `<article class="pass-card"><span>${esc(pass.label)}</span><p>${esc(pass.trigger)}</p><small>${esc(pass.rankingRule)}</small><div class="chips">${pass.tools.map((id) => `<b>${esc(SITE_STRATEGY_TOOLBOX.find((tool) => tool.id === id)?.label ?? id)}</b>`).join("")}</div></article>`).join("");

  const cardHtml = cards.map((candidate, index) => {
    const automation = candidateAutomation(candidate, promotionClearanceFt);
    const applied = automation.appliedTools.map((id) => SITE_STRATEGY_TOOLBOX.find((tool) => tool.id === id)?.label ?? id);
    const next = automation.recommendedNext.map((item) => `<li><strong>${esc(SITE_STRATEGY_TOOLBOX.find((tool) => tool.id === item.id)?.label ?? item.id)}:</strong> ${esc(item.reason)}</li>`).join("");
    const status = candidate.promotionReady ? "PROMOTION READY" : candidate.combinedPass ? "TECHNICAL PASS" : candidate.physicalPass ? "PHYSICAL PASS" : "REPAIR";
    const room = candidate.roomPacking;
    const roomStatus = room ? (room.pass ? "ROOM PACK PASS" : `ROOM PACK REVIEW · ${room.score.toFixed(1)}`) : "ARCHITECTURE NOT YET FROZEN";
    const unitSummary = candidate.program.unitResults.map((unit) => `Unit ${unit.unitId}: ${fmt(unit.netLivingCapacitySqFt)} SF capacity / ${fmt(unit.intendedLivingSqFt)} SF intent`).join(" · ");
    return `<article class="candidate">
      <div class="candidate-head"><div><span class="rank">${index + 1}</span><div><h2>${esc(candidate.id)}</h2><p>${esc(candidate.family)} · ${esc(candidate.conceptGroup ?? candidate.metadata.designIntent ?? "")}</p></div></div><b class="status ${candidate.promotionReady ? "good" : candidate.physicalPass ? "warn" : "bad"}">${status}</b></div>
      <div class="plan">${renderCandidateSvg({ parcel: PONDY_SURVEY, buildableEnvelope: PONDY_BUILDABLE, candidate: candidate as never, title: candidate.id })}</div>
      <div class="metrics"><div><span>Score</span><strong>${candidate.combinedScore.toFixed(1)}</strong></div><div><span>Non-access clearance</span><strong>${fmt(candidate.promotionBoundaryClearanceFt, 2)} ft</strong></div><div><span>Buildable-land pavement</span><strong>${fmt(candidate.pavement.estimatedBuildablePavementSqFt)} SF</strong></div><div><span>Turning pavement width</span><strong>${fmt(candidate.mobilityAudit.turningPavementWidthFt, 2)} ft</strong></div><div><span>Architecture</span><strong>${roomStatus}</strong></div></div>
      <p class="unit-summary">${esc(unitSummary)}</p>
      <div class="strategy-block"><div><h3>Automation read</h3><p>${esc(automation.decisionSummary)}</p></div><div><span class="label">TOOLS ALREADY USED</span><div class="chips">${applied.length ? applied.map((label) => `<span>${esc(label)}</span>`).join("") : "<span>baseline geometry only</span>"}</div></div>${next ? `<div><span class="label">NEXT OPTIONS TO COMPARE</span><ol>${next}</ol></div>` : ""}</div>
      ${pavementScenarioStrip(candidate)}
      ${candidate.physicalIssues.length || candidate.program.reasons.length ? `<details><summary>Open technical notes</summary><ul>${[...candidate.physicalIssues, ...candidate.program.reasons].slice(0, 8).map((item) => `<li>${esc(item)}</li>`).join("")}</ul></details>` : ""}
    </article>`;
  }).join("");

  const design2Html = design2Diagnostics.length ? design2Diagnostics.map((candidate) => {
    const automation = candidateAutomation(candidate, promotionClearanceFt);
    const issue = candidate.physicalIssues[0] ?? candidate.mobilityAudit.failures[0] ?? candidate.program.reasons[0] ?? "No open issue recorded.";
    const garageAngles = candidate.placements.filter((item) => item.kind === "garage").map((item) => `${item.id} ${fmt(item.rotationDeg ?? 0, 0)}°`).join(" · ");
    return `<article class="diagnostic"><div><div><h3>${esc(candidate.id)}</h3><span>${esc(garageAngles || candidate.family)}</span></div><b class="status ${candidate.physicalPass ? "warn" : "bad"}">${candidate.physicalPass ? "PHYSICAL PASS" : "REPAIR"}</b></div><p><strong>Current blocker:</strong> ${esc(issue)}</p>${pavementScenarioStrip(candidate)}<div class="next-line"><span class="label">NEXT NON-PAVEMENT OPTIONS</span><p>${automation.recommendedNext.filter((item) => item.id !== "local-pavement-flare").slice(0, 3).map((item) => SITE_STRATEGY_TOOLBOX.find((tool) => tool.id === item.id)?.label ?? item.id).join(" · ") || "Keep current geometry and compare architectural fit."}</p></div></article>`;
  }).join("") : `<div class="note">No active Rear Garage Stack diagnostic was retained by this run.</div>`;

  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pondy Lot 2 · User Report</title><style>
  :root{color-scheme:light}*{box-sizing:border-box}body{font:14px/1.5 Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;margin:0;background:#f3f4f1;color:#172033}main{max-width:1280px;margin:auto;padding:34px 24px 70px}h1{font-size:42px;line-height:1.05;margin:8px 0 12px;max-width:900px}h2{margin:0;font-size:21px}h3{margin:0 0 6px}.eyebrow,.label{font-size:10px;font-weight:900;letter-spacing:.1em;color:#8a5a11}.lead{font-size:17px;max-width:940px;color:#556070}.hero{display:grid;grid-template-columns:1.4fr .8fr;gap:18px;align-items:start}.summary,.toolbox,.candidate,.note,.diagnostic,.pass-set{background:#fff;border:1px solid #dfe3dc;border-radius:18px;box-shadow:0 14px 35px #1620330c}.summary{padding:20px;display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.summary div{border:1px solid #e8ebe5;border-radius:12px;padding:13px}.summary span,.metrics span{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:#7a8492}.summary strong{display:block;font-size:23px;margin-top:4px}.note{padding:18px;background:#fffaf0;border-color:#efcf94}.section-title{margin:30px 0 12px}.toolbox,.pass-set{padding:16px}.tool-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.tool{border:1px solid #e1e5de;border-radius:12px;padding:13px;min-height:175px}.tool>div{display:flex;justify-content:space-between;gap:8px;font-size:9px;font-weight:900;letter-spacing:.08em}.tool>div span{color:#7a8492}.tool>div b{color:#92601f}.tool h3{font-size:15px;margin-top:12px}.tool p{font-size:11px;color:#4f5b6b;min-height:50px}.tool small{display:block;border-top:1px solid #eceeea;padding-top:8px;color:#7a8492;font-size:9px}.tool.experimental{border-color:#b9d5f5}.tool.planned{border-style:dashed;opacity:.7}.pass-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.pass-card{border:1px solid #e5e8e2;border-radius:12px;padding:13px}.pass-card>span{font-weight:900}.pass-card p{color:#556070;font-size:11px}.pass-card small{color:#7a8492;font-size:9px}.candidate{padding:18px;margin-top:14px}.candidate-head,.candidate-head>div,.diagnostic>div:first-child{display:flex;align-items:center;justify-content:space-between;gap:12px}.candidate-head>div{justify-content:flex-start}.candidate-head p{margin:2px 0 0;color:#6b7280}.rank{width:30px;height:30px;border-radius:50%;background:#172033;color:#fff;display:grid;place-items:center;font-weight:900}.status{font-size:10px;letter-spacing:.06em;padding:7px 9px;border-radius:999px;white-space:nowrap}.status.good{background:#e3f6e9;color:#166534}.status.warn{background:#fff1cf;color:#8a5a11}.status.bad{background:#fee8e8;color:#a12626}.plan{margin-top:14px;border:1px solid #e4e7e1;border-radius:12px;overflow:hidden;background:#fafafa}.plan svg{display:block;width:100%;height:auto;max-height:440px}.metrics{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin-top:10px}.metrics div{border:1px solid #e8ebe5;border-radius:10px;padding:10px}.metrics strong{display:block;margin-top:4px;font-size:13px}.unit-summary{font-size:11px;color:#6b7280}.strategy-block{display:grid;grid-template-columns:1.2fr .8fr 1.2fr;gap:12px;margin-top:14px;padding:14px;background:#f8faf7;border-radius:12px}.strategy-block p{margin:0;color:#536071}.chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:7px}.chips span,.chips b{font-size:9px;background:#e8eef7;border:1px solid #ced9e8;border-radius:999px;padding:5px 7px;font-weight:700}.strategy-block ol{padding-left:18px;margin:7px 0 0;font-size:10px;color:#536071}.pave-read{margin-top:12px;border:1px solid #edd29c;background:#fffaf1;border-radius:12px;padding:12px}.pave-read p{margin:4px 0;color:#4f5b6b}.pave-read>small{display:block;color:#7a8492;font-size:9px;margin-top:8px}.pave-chips{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;margin-top:8px}.pave-chip{border:1px solid #e5e8e2;border-radius:9px;padding:8px}.pave-chip span,.pave-chip small{display:block;font-size:8px;color:#7a8492}.pave-chip strong{display:block;font-size:10px;margin:2px 0}.pave-good{border-color:#b9dfc4;background:#f3fbf5}.pave-good strong{color:#166534}.pave-bad{border-color:#efc8c8;background:#fff8f8}.pave-bad strong{color:#a12626}.diagnostic{padding:16px;margin-top:10px}.diagnostic>div:first-child>div span{font-size:10px;color:#7a8492}.diagnostic>p{font-size:11px;color:#556070}.next-line{margin-top:10px}.next-line p{margin:3px 0;color:#556070;font-size:10px}details{margin-top:12px;border-top:1px solid #eceeea;padding-top:10px}summary{cursor:pointer;font-weight:800}details li{font-size:11px;color:#5e6876}.foot{margin-top:26px;color:#6b7280;font-size:11px}@media(max-width:900px){main{padding:22px 12px 50px}.hero{grid-template-columns:1fr}.summary{grid-template-columns:repeat(2,1fr)}.tool-grid{grid-template-columns:repeat(2,1fr)}.pass-grid{grid-template-columns:1fr}.metrics{grid-template-columns:repeat(2,1fr)}.strategy-block{grid-template-columns:1fr}.pave-chips{grid-template-columns:repeat(3,1fr)}h1{font-size:32px}}@media(max-width:560px){.summary,.tool-grid,.metrics,.pave-chips{grid-template-columns:1fr}.candidate-head{align-items:flex-start;flex-direction:column}}
  </style></head><body><main>
    <div class="hero"><div><p class="eyebrow">LOTSCOPE · PONDY LOT 2</p><h1>Site feasibility with multiple ways to solve the problem.</h1><p class="lead">This report comes from the authoritative Workbench search. The optimizer may move/re-proportion buildings, move/resize/rotate garages, reshape access, and add localized pavement/apron area. Those are competing tools—not a rule that pavement must always be minimized.</p></div><div class="note"><strong>Important:</strong><p>Promotion-ready means the site and mobility evidence cleared the current gates. Floor-plan/room-packing review remains separate, and no candidate should be presented as construction-ready until that stage passes.</p></div></div>
    <section class="summary"><div><span>Evaluated</span><strong>${ranked.evaluatedCount}</strong></div><div><span>Physical passes</span><strong>${ranked.physicalPassCount}</strong></div><div><span>Combined passes</span><strong>${ranked.combinedPassCount}</strong></div><div><span>Promotion-ready</span><strong>${promotionCount}</strong></div><div><span>Distinct frozen finalists</span><strong>${distinctCount}</strong></div><div><span>Room-pack passes</span><strong>${roomPass}/${ranked.finalistFreezeCount ?? ranked.shortlist.length}</strong></div></section>
    <h2 class="section-title">What the automation may change</h2><section class="toolbox"><div class="tool-grid">${toolbox}</div></section>
    <h2 class="section-title">How the automation compares repairs</h2><section class="pass-set"><div class="pass-grid">${passes}</div></section>
    <h2 class="section-title">Current promotion evidence</h2>${cardHtml}
    <h2 class="section-title">Design #2 · Rear Garage Stack repair lab</h2><div class="note"><strong>Why this section exists:</strong><p>A failed concept does not disappear. Here we explicitly test whether more pavement alone can rescue the current vehicle geometry, while keeping building movement, garage movement/rotation, access reshaping and future bounded maneuvers available as alternatives.</p></div>${design2Html}
    <p class="foot">Generated ${new Date().toISOString()} · ${esc(ranked.solver)} · ${esc(ranked.scoringVersion)} · scenario ${esc(ranked.scenario)}. Pavement values are planning sensitivities, not civil takeoffs. Garage rotation remains experimental until its dedicated evidence passes. Gear-change planning remains a planned capability.</p>
  </main></body></html>`;

  return new NextResponse(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}
