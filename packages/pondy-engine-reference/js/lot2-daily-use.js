/**
 * Lot 2 — Daily-use scenario scorer (shared)
 * Scenarios S1–S6 for R5 / R6.4 / R6.4A / R6.4B.
 * Repair-before-close: score failures precisely; do not close on first FAIL.
 */
const Lot2DailyUse = (() => {
  const S = typeof Lot2SOT !== 'undefined' ? Lot2SOT : {};
  const L = typeof Lot2 !== 'undefined' ? Lot2 : {};
  const A = typeof Lot2Access !== 'undefined' ? Lot2Access : null;
  const Sk = typeof Lot2AccessSkeleton !== 'undefined' ? Lot2AccessSkeleton : null;
  const V = S.SUV_FS || { length: 20.5, width: 8, doorWidth: 16, apronDepth: 24 };
  const HALF = V.width / 2;
  const PENN = S.PENN_X || 148;

  function pathLen(path) {
    let n = 0;
    for (let i = 1; i < (path || []).length; i++) {
      n += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
    }
    return +n.toFixed(1);
  }

  function steeringReversals(path) {
    if (!path || path.length < 3) return 0;
    let n = 0;
    for (let i = 1; i < path.length - 1; i++) {
      const a = path[i - 1];
      const b = path[i];
      const c = path[i + 1];
      const d1 = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const d2 = Math.atan2(c[1] - b[1], c[0] - b[0]);
      let w = d2 - d1;
      while (w > Math.PI) w -= 2 * Math.PI;
      while (w < -Math.PI) w += 2 * Math.PI;
      if (Math.abs(w) > (25 * Math.PI) / 180) n++;
    }
    return n;
  }

  function garageById(concept, id) {
    return (concept.garages || []).find((g) => g.id === id);
  }

  function accessEntry(concept, gid) {
    return (concept.accessPaths || []).find((p) => p.garage === gid) || null;
  }

  function pathFor(concept, gid) {
    const ap = accessEntry(concept, gid);
    return ap ? (ap.path || []).map((p) => [...p]) : [];
  }

  function outboundFor(concept, gid) {
    const ap = accessEntry(concept, gid);
    if (ap && ap.outbound && ap.outbound.length >= 2) return ap.outbound.map((p) => [...p]);
    return pathFor(concept, gid).slice().reverse();
  }

  function parkedObstacle(g, label) {
    if (!g) return null;
    return {
      label,
      poly: [
        [g.x, g.y + 0.4],
        [g.x + g.w, g.y + 0.4],
        [g.x + g.w, g.y + g.h - 0.4],
        [g.x, g.y + g.h - 0.4],
      ],
    };
  }

  function stagedApronObstacle(g, label) {
    if (!g) return null;
    if (g.doorFace === 'E') {
      const x0 = g.x + g.w;
      const x1 = Math.min(PENN - 1, x0 + V.length);
      const y0 = g.y + g.h / 2 - HALF;
      const y1 = g.y + g.h / 2 + HALF;
      return { label, poly: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]] };
    }
    if (g.doorFace === 'S') {
      const y0 = g.y + g.h;
      const y1 = y0 + V.length;
      const x0 = g.x + g.w / 2 - HALF;
      const x1 = g.x + g.w / 2 + HALF;
      return { label, poly: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]] };
    }
    return null;
  }

  function pointInPoly(x, y, poly) {
    if (L.pointInPoly) return L.pointInPoly(x, y, poly, 0.05);
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0];
      const yi = poly[i][1];
      const xj = poly[j][0];
      const yj = poly[j][1];
      const inter = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-9) + xi;
      if (inter) inside = !inside;
    }
    return inside;
  }

  function pathHitsObstacle(path, obs) {
    if (!path || !obs) return false;
    for (let i = 0; i < path.length - 1; i++) {
      const steps = Math.max(4, Math.ceil(Math.hypot(path[i + 1][0] - path[i][0], path[i + 1][1] - path[i][1]) / 2));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const x = path[i][0] + (path[i + 1][0] - path[i][0]) * t;
        const y = path[i][1] + (path[i + 1][1] - path[i][1]) * t;
        for (const d of [-HALF, 0, HALF]) {
          if (pointInPoly(x, y + d, obs.poly) || pointInPoly(x + d, y, obs.poly)) return true;
        }
      }
    }
    return false;
  }

  /** Reverse distance: door→pocket if forwardExit outbound; else door→Penn. */
  function reverseOutMetrics(concept, gid, g) {
    const ap = accessEntry(concept, gid);
    const inbound = pathFor(concept, gid);
    const outbound = outboundFor(concept, gid);
    const doorX = g.doorFace === 'E' ? g.x + g.w : g.doorFace === 'W' ? g.x : g.x + g.w / 2;
    const doorY = g.doorFace === 'S' ? g.y + g.h : g.doorFace === 'N' ? g.y : g.y + g.h / 2;

    if (ap && ap.forwardExit && ap.outbound) {
      /** Reverse legs until first north/east forward toward Penn (heuristic: until y returns to spine and x increases). */
      let rev = 0;
      for (let i = 1; i < outbound.length; i++) {
        const dx = outbound[i][0] - outbound[i - 1][0];
        const dy = outbound[i][1] - outbound[i - 1][1];
        const leavingDoor = outbound[i - 1][0] <= doorX + 2 && outbound[i][0] >= outbound[i - 1][0];
        const intoPocket = dy > 0.5 || (dx < -0.5 && outbound[i][1] > doorY + 2);
        if (leavingDoor || intoPocket || outbound[i][1] > doorY + 4) {
          rev += Math.hypot(dx, dy);
        } else if (outbound[i][0] > outbound[i - 1][0] && outbound[i][1] <= doorY + 2) {
          break;
        } else {
          rev += Math.hypot(dx, dy);
        }
      }
      return {
        inboundLen: pathLen(inbound),
        reverseDistanceFt: +rev.toFixed(1),
        steeringReversals: steeringReversals(outbound),
        entersPennsylvaniaReverse: false,
        forwardExit: true,
        note: `Turn-pocket / forward-exit · reverse ~${rev.toFixed(1)}′ then forward to Penn`,
      };
    }

    const reverseToPenn = +(Math.abs(PENN - doorX)).toFixed(1);
    return {
      inboundLen: pathLen(inbound),
      reverseDistanceFt: reverseToPenn,
      steeringReversals: steeringReversals(inbound),
      entersPennsylvaniaReverse: g.doorFace === 'E',
      forwardExit: false,
      note: g.doorFace === 'E'
        ? `East door → reverse ~${reverseToPenn}′ toward Pennsylvania`
        : 'Non-east reverse pattern',
    };
  }

  function throatConflict(pathA, pathB) {
    const nearPenn = (p) => p.filter((pt) => pt[0] >= PENN - 12);
    const a = nearPenn(pathA);
    const b = nearPenn(pathB);
    if (!a.length || !b.length) return { conflict: false, dy: null, detail: 'No shared Penn samples' };
    const ya = a.reduce((s, p) => s + p[1], 0) / a.length;
    const yb = b.reduce((s, p) => s + p[1], 0) / b.length;
    const dy = Math.abs(ya - yb);
    const conflict = dy < V.width + 4;
    return {
      conflict,
      dy: +dy.toFixed(1),
      detail: conflict
        ? `Shared throat Y-separation ${dy.toFixed(1)}′ < ${V.width + 4}′`
        : `Throat Y-separation ${dy.toFixed(1)}′ — lanes clear at Penn`,
    };
  }

  function liftIndependence(concept) {
    const lifts = (concept.garages || []).filter((g) => g.lift);
    if (!lifts.length) {
      return {
        liftBays: 0,
        enclosedPositions: (concept.garages || []).filter((g) => g.enclosed).reduce((s, g) => s + (g.spaces || 1), 0),
        independentlyAccessible: true,
        verdict: 'N/A',
        detail: 'No lifts — program uses enclosed + covered stalls (independence scored per stall).',
      };
    }
    const independent = lifts.every((g) => g.liftIndependent) || concept.liftInterpretation === 'independent';
    const stackedSpaces = lifts.reduce((s, g) => s + (g.spaces || 1), 0);
    return {
      liftBays: lifts.length,
      enclosedPositions: stackedSpaces,
      independentlyAccessible: independent,
      verdict: independent ? 'INDEPENDENT' : 'STACKED',
      detail: independent
        ? 'Pit/puzzle (or declared independent) lift — four enclosed positions treated as independently retrievable; cost/excavation/structure ownership burden remains.'
        : 'Conventional stacked lift — four enclosed positions, dependent retrieval. Upper car requires lower clear / platform cycle.',
    };
  }

  /** Carport access path while garage vehicle parked (same household). */
  function carportAccessClear(concept, coveredId, garageId) {
    const cov = garageById(concept, coveredId);
    const gar = garageById(concept, garageId);
    if (!cov || !gar) return { ok: true, detail: 'No covered pair' };
    const parked = parkedObstacle(gar, `${garageId} parked`);
    /** Approach: from Penn south lane to covered door. */
    let approach;
    if (cov.doorFace === 'S') {
      const cx = cov.x + cov.w / 2;
      const spineY = Math.max(28, cov.y + cov.h + HALF + 2);
      approach = [[148, spineY], [cx, spineY], [cx, cov.y + cov.h + 1]];
    } else if (cov.doorFace === 'E') {
      const cy = cov.y + cov.h / 2;
      approach = [[148, cy], [cov.x + cov.w + 2, cy]];
    } else {
      approach = [[148, 34], [cov.x + cov.w / 2, 34], [cov.x + cov.w / 2, cov.y + cov.h]];
    }
    const hit = pathHitsObstacle(approach, parked);
    return {
      ok: !hit,
      detail: hit
        ? `Covered ${coveredId}: approach blocked by parked ${garageId} — not independently usable`
        : `Covered ${coveredId}: approach clear with ${garageId} parked`,
    };
  }

  function snowVisibility(concept, throat) {
    const paths = concept.accessPaths || [];
    const southY = Math.max(...paths.flatMap((p) => (p.path || []).map((pt) => pt[1])), 0);
    const issues = [];
    if (southY >= 30) issues.push(`South lane at y≈${southY}′ — snow windrow competes with FS-SUV envelope`);
    if (throat.conflict) issues.push('Shared throat: snow/guest at Penn blocks both households');
    const forwardB = (accessEntry(concept, 'B') || {}).forwardExit;
    if (!forwardB) issues.push('East-door reverse-out has poor rear visibility into throat');
    else issues.push('Forward Penn exit improves sight lines vs reverse-out (R6.4C supplemental)');
    return { ok: issues.length <= 2 && !throat.conflict, issues, detail: issues.join(' · ') };
  }

  function plateGate(id) {
    if (!Sk || !Sk.analyzeConcept) return { ok: null, detail: 'Skeleton scorer unavailable' };
    try {
      const row = Sk.analyzeConcept(id);
      const widthOk = row && row.homeWidth !== false && (row.checks ? row.checks.homeWidth !== false : true);
      return {
        ok: row ? row.verdict !== 'FAIL' : null,
        detail: row ? (row.homeDetail || row.detail || row.verdict || 'scored') : '—',
        row,
      };
    } catch (e) {
      return { ok: null, detail: String(e.message || e) };
    }
  }

  function plateGateFromReset(id) {
    if (typeof Lot2ParkingReset !== 'undefined' && Lot2ParkingReset.analyzeReset) {
      try {
        const r = Lot2ParkingReset.analyzeReset(id);
        const hw = r.checks && r.checks.homeWidth;
        const ha = r.checks && r.checks.homeArea;
        const ok = !!(hw && hw.ok && ha && ha.ok);
        return {
          ok,
          detail: [hw && hw.detail, ha && ha.detail].filter(Boolean).join(' · ') || r.verdict,
        };
      } catch (e) {
        return { ok: null, detail: String(e.message || e) };
      }
    }
    return plateGate(id);
  }

  function scenario(id, title, result) {
    return { id, title, ...result };
  }

  function analyze(id) {
    const concept = L.CONCEPTS[id];
    if (!concept) return { id, error: 'Missing concept' };
    const gA = garageById(concept, 'A');
    const gB = garageById(concept, 'B');
    const pathA = pathFor(concept, 'A');
    const pathB = pathFor(concept, 'B');
    const outB = outboundFor(concept, 'B');
    const access = A ? A.analyzeConcept(id) : null;
    const plates = plateGateFromReset(id);

    const parkedB = parkedObstacle(gB, 'B parked in bay');
    const parkedA = parkedObstacle(gA, 'A parked in bay');
    const stagedB = stagedApronObstacle(gB, 'B staged in apron');
    const stagedA = stagedApronObstacle(gA, 'A staged in apron');

    const mA = reverseOutMetrics(concept, 'A', gA);
    const mB = reverseOutMetrics(concept, 'B', gB);
    const throat = throatConflict(pathA, pathB.length ? pathB : outB);
    const lift = liftIndependence(concept);
    const snow = snowVisibility(concept, throat);

    const aInBParked = !pathHitsObstacle(pathA, parkedB) && !pathHitsObstacle(pathA, stagedB);
    const bInAParked = !pathHitsObstacle(pathB, parkedA);
    const bInAStaged = !pathHitsObstacle(pathB, stagedA) && !pathHitsObstacle(outB, stagedA);

    const covA = carportAccessClear(concept, 'CA', 'A');
    const covB = carportAccessClear(concept, 'CB', 'B');
    const coveredProgram = !!(garageById(concept, 'CA') || garageById(concept, 'CB'));

    const techOk = access && access.technical !== 'FAIL';
    const reverseOkB = mB.reverseDistanceFt < 60;

    const scenarios = [
      scenario('S1', 'A inbound / outbound with B parked', {
        ok: aInBParked && techOk,
        blocksOther: !aInBParked,
        reverseDistanceFt: mA.reverseDistanceFt,
        steeringReversals: mA.steeringReversals,
        entersPennsylvaniaReverse: mA.entersPennsylvaniaReverse,
        detail: aInBParked
          ? `A clear of B · reverse ~${mA.reverseDistanceFt}′${mA.forwardExit ? ' (forward-exit pattern N/A for A)' : ''}`
          : 'A path hits B parked / staged',
      }),
      scenario('S2', 'B inbound / outbound with A parked', {
        ok: bInAParked && bInAStaged && techOk && reverseOkB,
        blocksOther: !bInAParked || !bInAStaged,
        reverseDistanceFt: mB.reverseDistanceFt,
        steeringReversals: mB.steeringReversals,
        entersPennsylvaniaReverse: mB.entersPennsylvaniaReverse,
        detail: !bInAParked
          ? 'B path hits A parked'
          : !bInAStaged
            ? 'B path/outbound clips A staged apron'
            : !reverseOkB
              ? `Path clear · reverse ~${mB.reverseDistanceFt}′ unreasonable daily`
              : mB.forwardExit
                ? `Turn pocket · reverse ~${mB.reverseDistanceFt}′ · forward Penn exit`
                : `Clear of A · reverse ~${mB.reverseDistanceFt}′ to Penn`,
      }),
      scenario('S3', 'A inbound while B exits', {
        ok: !throat.conflict,
        blocksOther: throat.conflict,
        reverseDistanceFt: mB.reverseDistanceFt,
        steeringReversals: mA.steeringReversals + mB.steeringReversals,
        entersPennsylvaniaReverse: mB.entersPennsylvaniaReverse,
        detail: throat.detail + (mB.forwardExit ? ' · B exits forward' : ' · B reverse-out'),
      }),
      scenario('S4', 'B inbound while A exits', {
        ok: !throat.conflict,
        blocksOther: throat.conflict,
        reverseDistanceFt: mA.reverseDistanceFt,
        steeringReversals: mA.steeringReversals + mB.steeringReversals,
        entersPennsylvaniaReverse: mA.entersPennsylvaniaReverse,
        detail: throat.detail + ' · A exit vs B inbound',
      }),
      scenario('S5', coveredProgram ? 'Independent stall retrieval (garage + covered present)' : 'Lift retrieval with both household vehicles present', {
        ok: coveredProgram ? covA.ok && covB.ok : lift.independentlyAccessible,
        blocksOther: coveredProgram ? !(covA.ok && covB.ok) : !lift.independentlyAccessible,
        reverseDistanceFt: Math.max(mA.reverseDistanceFt, mB.reverseDistanceFt),
        steeringReversals: 0,
        entersPennsylvaniaReverse: mA.entersPennsylvaniaReverse || mB.entersPennsylvaniaReverse,
        detail: coveredProgram
          ? `${covA.detail} · ${covB.detail}`
          : lift.detail,
        lift,
        carports: coveredProgram ? { CA: covA, CB: covB } : null,
      }),
      scenario('S6', 'Snow storage · visibility · shared-throat obstruction', {
        ok: snow.ok && !throat.conflict,
        blocksOther: throat.conflict,
        reverseDistanceFt: null,
        steeringReversals: null,
        entersPennsylvaniaReverse: !mB.forwardExit,
        detail: snow.detail,
      }),
    ];

    const householdBlocks = scenarios.filter((s) => s.blocksOther).map((s) => s.id);
    const maxReverse = Math.max(mA.reverseDistanceFt, mB.reverseDistanceFt);
    const failIds = scenarios.filter((s) => !s.ok).map((s) => s.id);

    let verdict = 'DAILY REVIEW';
    let recommendation = 'Continue repair-before-close on named failures.';
    if (!techOk) {
      verdict = 'REPAIR — SWEEP';
      recommendation = (access && access.reasons && access.reasons[0]) || 'Axle-correct sweep / fillet failed — smallest path or pocket fix.';
    } else if (failIds.includes('S5') && coveredProgram) {
      verdict = 'REPAIR — CARPORT';
      recommendation = 'Covered stall blocked by parked garage vehicle — reorient or separate approach for true independence.';
    } else if (mB.forwardExit && reverseOkB && failIds.filter((x) => x !== 'S5').length === 0 && failIds.includes('S5') && lift.verdict === 'STACKED') {
      verdict = 'REPAIR — LIFT ONLY';
      recommendation = 'Turn pocket addresses reverse; remaining failure is lift independence (R6.4B) or accept stacked with disclosure.';
    } else if (maxReverse >= 60 && !mB.forwardExit) {
      verdict = 'REPAIR — DAILY POOR';
      recommendation = `Deep reverse ~${maxReverse}′ — try R6.4A midpoint turn pocket (or promote R5 if lift family).`;
    } else if (failIds.includes('S5') && lift.verdict === 'STACKED') {
      verdict = 'REPAIR — LIFT ONLY';
      recommendation = 'Stacked lift retrieval — test R6.4B independent equipment in same 16×24, or prefer R5.';
    } else if (plates.ok === false) {
      verdict = 'REPAIR — PLATE';
      recommendation = 'Notched plates fail home-width/area — shrink pocket or drive notch.';
    } else if (failIds.length === 0 && plates.ok !== false) {
      verdict = id === 'reset_r5' ? 'DAILY PASS' : 'DAILY CONDITIONAL';
      recommendation = id === 'reset_r5'
        ? 'R5 clears S1–S6 · promote to public lead when Parking Reset Gate is FULL PASS · unlock deterministic schematic architecture.'
        : 'Daily scenarios clear; keep architecture OFF until Parking Reset FULL PASS.';
    } else if (failIds.length) {
      verdict = 'REPAIR — DAILY';
      recommendation = `Named failures: ${failIds.join(', ')}. Apply repair-before-close.`;
    }

    return {
      id,
      label: concept.label,
      role: concept.role,
      accessTechnical: access ? access.technical : '—',
      accessReasons: access ? access.reasons || [] : [],
      plates,
      metrics: {
        A: mA,
        B: mB,
        throat,
        lift,
        snow,
        maxReverseDistanceFt: maxReverse,
        householdBlocks,
        covered: coveredProgram ? { CA: covA, CB: covB } : null,
      },
      scenarios,
      failIds,
      verdict,
      recommendation,
      hierarchy: L.PARKING_HIERARCHY,
      repairBeforeClose: L.REPAIR_BEFORE_CLOSE,
    };
  }

  function analyzeMany(ids) {
    return (ids || []).map(analyze);
  }

  return { analyze, analyzeMany, pathLen, reverseOutMetrics };
})();

if (typeof module !== 'undefined') module.exports = Lot2DailyUse;
