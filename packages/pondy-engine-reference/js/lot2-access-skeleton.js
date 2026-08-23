/**
 * Lot 2 — Parking Skeleton A-F (parking only; no houses).
 * Display names: Parking Skeleton A-F. Code IDs remain access_a…access_f.
 * “Access A” in the J1 trail = same geometry as Parking Skeleton A — keep names distinct.
 */
const Lot2AccessSkeleton = (() => {
  const S = typeof Lot2SOT !== 'undefined' ? Lot2SOT : {};
  const L = typeof Lot2 !== 'undefined' ? Lot2 : {};
  const A = typeof Lot2Access !== 'undefined' ? Lot2Access : null;
  const V = S.SUV_FS || { length: 20.5, width: 8, doorWidth: 16, apronDepth: 24 };
  const SETBACK = L.SETBACK_POLY;
  const SURVEY = L.SURVEY;
  const DRIVE_HALF = (S.DRIVE_WIDTH || 12) / 2;
  const SKEL = L.ACCESS_SKELETONS || ['access_a', 'access_b', 'access_c'];
  const MIN_HOME_WIDTH = 18;
  const MIN_ZONE_AREA = 500;
  const PLAUSIBLE_FIRST = 600;

  function garageRect(g) {
    return { x: g.x, y: g.y, w: g.w, h: g.h };
  }

  function segPoints(a, b, step) {
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.ceil(d / step));
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
    return pts;
  }

  function allDrivePaths(concept) {
    const paths = [];
    if (concept.accessPaths) concept.accessPaths.forEach((ap) => paths.push(ap.path));
    if (concept.drive && concept.drive.length >= 2) paths.push(concept.drive);
    return paths;
  }

  function distPointSeg(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * dx + (py - y1) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }

  function occupiedByCirculation(concept, x, y, opts = {}) {
    if (!L.pointInPoly(x, y, SETBACK, 0.05)) return true;
    const integrated = opts.integratedParking || concept.parkingIntegrated;
    if (!integrated) {
      for (const g of concept.garages || []) {
        const r = garageRect(g);
        if (x >= r.x - 0.1 && x <= r.x + r.w + 0.1 && y >= r.y - 0.1 && y <= r.y + r.h + 0.1) return true;
      }
    }
    for (const path of allDrivePaths(concept)) {
      for (let i = 0; i < path.length - 1; i++) {
        if (distPointSeg(x, y, path[i][0], path[i][1], path[i + 1][0], path[i + 1][1]) <= DRIVE_HALF + 0.5) return true;
      }
    }
    return false;
  }

  function plateMetrics(plate, concept) {
    /** Sample reserved plate; subtract driveway/apron corridors (notched structural area). */
    const step = 2;
    const cells = [];
    for (let x = plate.x + step * 0.5; x < plate.x + plate.w; x += step) {
      for (let y = plate.y + step * 0.5; y < plate.y + plate.h; y += step) {
        if (occupiedByCirculation(concept, x, y, { integratedParking: true })) continue;
        cells.push([x, y]);
      }
    }
    const area = +(cells.length * step * step).toFixed(0);
    const fullArea = +(plate.w * plate.h).toFixed(0);
    const notchSf = Math.max(0, fullArea - area);
    let minW = Infinity;
    if (cells.length) {
      const ys = [...new Set(cells.map((p) => +p[1].toFixed(1)))].sort((a, b) => a - b);
      ys.forEach((y) => {
        const row = cells.filter((p) => Math.abs(p[1] - y) < step * 0.6).map((p) => p[0]).sort((a, b) => a - b);
        if (row.length < 2) {
          minW = Math.min(minW, step);
          return;
        }
        let run = 1;
        let maxRun = 1;
        for (let k = 1; k < row.length; k++) {
          if (row[k] - row[k - 1] <= step * 1.2) run++;
          else {
            maxRun = Math.max(maxRun, run);
            run = 1;
          }
        }
        maxRun = Math.max(maxRun, run);
        minW = Math.min(minW, maxRun * step);
      });
    } else {
      minW = 0;
    }
    const garageSf = (concept.garages || [])
      .filter((g) => g.plate === plate.id || (!g.covered && plate.containsGarage === g.id))
      .reduce((s, g) => s + g.w * g.h, 0);
    const inPlateGarages = (concept.garages || []).filter((g) => {
      const cx = g.x + g.w / 2;
      const cy = g.y + g.h / 2;
      return cx >= plate.x && cx <= plate.x + plate.w && cy >= plate.y && cy <= plate.y + plate.h;
    });
    const gSf = inPlateGarages.reduce((s, g) => s + g.w * g.h, 0) || garageSf;
    const xsC = cells.map((p) => p[0]);
    const ysC = cells.map((p) => p[1]);
    return {
      area,
      fullArea,
      notchSf,
      notched: notchSf > 0,
      minWidth: minW === Infinity ? 0 : +minW.toFixed(1),
      bboxW: cells.length ? +(Math.max(...xsC) - Math.min(...xsC) + step).toFixed(1) : 0,
      bboxH: cells.length ? +(Math.max(...ysC) - Math.min(...ysC) + step).toFixed(1) : 0,
      minX: plate.x,
      maxX: plate.x + plate.w,
      minY: plate.y,
      maxY: plate.y + plate.h,
      cx: plate.x + plate.w / 2,
      cy: plate.y + plate.h / 2,
      garageGroundSf: gSf,
      integrated: true,
    };
  }

  /** True when an access centerline enters a reserved plate beyond the door-apron strip. */
  function plateDriveCrossing(concept) {
    const plates = concept.reservedPlates || [];
    if (!plates.length) return { ok: true, detail: 'No reserved plates' };
    const hits = [];
    const apron = V.apronDepth || 24;
    (concept.accessPaths || []).forEach((ap) => {
      const g = (concept.garages || []).find((x) => x.id === ap.garage);
      (ap.path || []).forEach((pt) => {
        plates.forEach((p) => {
          if (pt[0] < p.x || pt[0] > p.x + p.w || pt[1] < p.y || pt[1] > p.y + p.h) return;
          let inApron = false;
          if (g) {
            if (g.doorFace === 'E' && pt[0] >= g.x + g.w - 0.5 && pt[0] <= g.x + g.w + apron
              && pt[1] >= g.y - 1 && pt[1] <= g.y + g.h + 1) inApron = true;
            if (g.doorFace === 'W' && pt[0] <= g.x + 0.5 && pt[0] >= g.x - apron
              && pt[1] >= g.y - 1 && pt[1] <= g.y + g.h + 1) inApron = true;
            if (g.doorFace === 'S' && pt[1] >= g.y + g.h - 0.5 && pt[1] <= g.y + g.h + apron
              && pt[0] >= g.x - 1 && pt[0] <= g.x + g.w + 1) inApron = true;
            if (g.doorFace === 'N' && pt[1] <= g.y + 0.5 && pt[1] >= g.y - apron
              && pt[0] >= g.x - 1 && pt[0] <= g.x + g.w + 1) inApron = true;
          }
          if (!inApron) hits.push(`${ap.garage || '?'} @ (${pt[0]}, ${pt[1]}) in ${p.name || p.id}`);
        });
      });
    });
    return {
      ok: hits.length === 0,
      detail: hits.length ? `Drive enters structural plate: ${hits.slice(0, 3).join('; ')}` : 'No structural plate crossing (apron-only OK)',
      hits,
    };
  }

  function architectureRemaining(concept) {
    const integrated = !!concept.parkingIntegrated;
    const reserved = concept.reservedPlates || [];

    /** Integrated track: reserved structural plates; garages are ground program inside the plate — not subtracted. */
    if (integrated && reserved.length >= 2) {
      const byRole = {};
      reserved.forEach((p) => { byRole[p.role || p.id] = p; });
      const plateA = byRole.penn || byRole.A || reserved.find((p) => (p.x + p.w / 2) >= 72) || reserved[1];
      const plateB = byRole.rear || byRole.B || reserved.find((p) => (p.x + p.w / 2) < 72) || reserved[0];
      const zoneA = plateMetrics(plateA, concept);
      const zoneB = plateMetrics(plateB, concept);
      function zoneScore(z, label) {
        if (!z) return { ok: false, note: 'no reserved plate' };
        if (z.minWidth < MIN_HOME_WIDTH) return { ok: false, note: `${z.minWidth}′ min width (< ${MIN_HOME_WIDTH}′)` };
        if (z.area < MIN_ZONE_AREA) return { ok: false, note: `${z.area} SF plate too small` };
        const gNote = z.garageGroundSf ? ` · ${z.garageGroundSf} SF garage ground program` : '';
        const nNote = z.notchSf ? ` · −${z.notchSf} SF drive notch` : '';
        return { ok: true, note: `${z.area} SF plate · ${z.minWidth}′ width · ${z.bboxW}×${z.bboxH}′${gNote}${nNote}` };
      }
      const sA = zoneScore(zoneA, 'A');
      const sB = zoneScore(zoneB, 'B');
      const plausibleHomes = sA.ok && sB.ok && zoneA.area >= PLAUSIBLE_FIRST && zoneB.area >= PLAUSIBLE_FIRST;
      let verdict = 'Poor';
      if (plausibleHomes && zoneA.minWidth >= 20 && zoneB.minWidth >= 20) verdict = 'Strong';
      else if (plausibleHomes) verdict = 'Fair';
      else if (sA.ok || sB.ok) verdict = 'Weak';
      return {
        mode: 'integrated',
        components: [zoneB, zoneA],
        zoneA,
        zoneB,
        unitA: sA,
        unitB: sB,
        plausibleHomes,
        verdict,
        summary: `Unit A (Penn): ${sA.note}. Unit B (rear): ${sB.note}.`,
      };
    }

    const step = 2;
    const xs = [];
    const ys = [];
    for (let x = 25; x <= 128; x += step) xs.push(x);
    for (let y = 5; y <= 43; y += step) ys.push(y);
    const rows = ys.length;
    const cols = xs.length;
    const free = [];
    for (let j = 0; j < rows; j++) {
      free[j] = [];
      for (let i = 0; i < cols; i++) {
        free[j][i] = !occupiedByCirculation(concept, xs[i], ys[j], { integratedParking: integrated });
      }
    }
    const seen = Array.from({ length: rows }, () => Array(cols).fill(false));
    const components = [];
    function flood(j, i) {
      const stack = [[j, i]];
      const cells = [];
      while (stack.length) {
        const [cj, ci] = stack.pop();
        if (cj < 0 || ci < 0 || cj >= rows || ci >= cols || seen[cj][ci] || !free[cj][ci]) continue;
        seen[cj][ci] = true;
        cells.push([xs[ci], ys[cj]]);
        stack.push([cj - 1, ci], [cj + 1, ci], [cj, ci - 1], [cj, ci + 1]);
      }
      return cells;
    }
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        if (free[j][i] && !seen[j][i]) {
          const cells = flood(j, i);
          if (cells.length < 4) continue;
          const cx = cells.reduce((s, p) => s + p[0], 0) / cells.length;
          const cy = cells.reduce((s, p) => s + p[1], 0) / cells.length;
          const area = cells.length * step * step;
          let minW = Infinity;
          ys.forEach((y) => {
            const row = cells.filter((p) => Math.abs(p[1] - y) < step * 0.6).map((p) => p[0]).sort((a, b) => a - b);
            if (row.length < 2) return;
            let run = 1;
            let maxRun = 1;
            for (let k = 1; k < row.length; k++) {
              if (row[k] - row[k - 1] <= step * 1.2) run++;
              else {
                maxRun = Math.max(maxRun, run);
                run = 1;
              }
            }
            maxRun = Math.max(maxRun, run);
            minW = Math.min(minW, maxRun * step);
          });
          const xsC = cells.map((p) => p[0]);
          const ysC = cells.map((p) => p[1]);
          components.push({
            area: +area.toFixed(0),
            minWidth: minW === Infinity ? 0 : +minW.toFixed(1),
            bboxW: +(Math.max(...xsC) - Math.min(...xsC) + step).toFixed(1),
            bboxH: +(Math.max(...ysC) - Math.min(...ysC) + step).toFixed(1),
            minX: Math.min(...xsC),
            maxX: Math.max(...xsC) + step,
            minY: Math.min(...ysC),
            maxY: Math.max(...ysC) + step,
            cx: +cx.toFixed(1),
            cy: +cy.toFixed(1),
          });
        }
      }
    }
    components.sort((a, b) => b.area - a.area);
    const penn = components.filter((c) => c.cx >= 72);
    const rear = components.filter((c) => c.cx < 72);
    const zoneA = penn[0] || null;
    const zoneB = rear[0] || null;
    function zoneScore(z) {
      if (!z) return { ok: false, note: 'no contiguous zone' };
      if (z.minWidth < MIN_HOME_WIDTH) return { ok: false, note: `${z.minWidth}′ min width (< ${MIN_HOME_WIDTH}′ ribbon)` };
      if (z.area < MIN_ZONE_AREA) return { ok: false, note: `${z.area} SF too small` };
      return { ok: true, note: `${z.area} SF · ${z.minWidth}′ min width · ${z.bboxW}×${z.bboxH}′ bbox` };
    }
    const sA = zoneScore(zoneA);
    const sB = zoneScore(zoneB);
    const plausibleHomes = sA.ok && sB.ok && zoneA.area >= PLAUSIBLE_FIRST && zoneB.area >= PLAUSIBLE_FIRST;
    let verdict = 'Poor';
    if (plausibleHomes && zoneA.minWidth >= 20 && zoneB.minWidth >= 20) verdict = 'Strong';
    else if (plausibleHomes) verdict = 'Fair';
    else if (sA.ok || sB.ok) verdict = 'Weak';
    return {
      mode: integrated ? 'integrated-flood' : 'detached',
      components,
      zoneA,
      zoneB,
      unitA: sA,
      unitB: sB,
      plausibleHomes,
      verdict,
      summary: `Unit A (Penn): ${sA.note}. Unit B (rear): ${sB.note}.`,
    };
  }

  function analyzeSkeleton(id) {
    const concept = L.CONCEPTS[id];
    if (!concept || !concept.skeleton) return { id, error: 'Not a skeleton concept' };
    const access = A ? A.analyzeConcept(id) : { technical: 'FAIL', reasons: ['No access engine'] };
    const arch = architectureRemaining(concept);
    const threePoint = access.threePoint || access.shortTangents?.some((n) => n.kind === 'short-tangent');
    const doorsOk = access.doors?.every((d) => d.clear >= V.length && d.ok !== false) ?? false;
    const stagingOk = access.doors?.every((d) => d.clear >= V.length) ?? false;

    let verdict = 'FAIL';
    const reasons = [...(access.reasons || [])];
    if (access.technical === 'PASS' && access.independent && !threePoint && stagingOk && arch.plausibleHomes) {
      verdict = 'PASS';
    } else if (access.technical === 'PASS' && !arch.plausibleHomes) {
      verdict = 'FAIL';
      reasons.push(`Architecture remaining: ${arch.summary} — circulation passes but homes are not plausible.`);
    } else if (access.technical === 'REVIEW') {
      verdict = 'REVIEW';
    } else if (access.technical === 'PASS' && (threePoint || !access.independent)) {
      verdict = 'REVIEW';
      reasons.push('Circulation REVIEW: three-point or stacked dependence.');
    }

    if (verdict === 'PASS' && access.daily && access.daily.startsWith('Fair')) {
      /* still PASS technically */
    }

    return {
      id,
      label: concept.label,
      access,
      architecture: arch,
      verdict,
      physical: access.technical,
      daily: access.daily,
      independent: access.independent,
      threePoint,
      architectureVerdict: arch.verdict,
      plausibleHomes: arch.plausibleHomes,
      reasons: [...new Set(reasons)].slice(0, 12),
      relative: concept.designConcern,
    };
  }

  function analyzeAllSkeletons() {
    const order = SKEL.filter((id) => L.CONCEPTS[id]?.skeleton);
    const rows = {};
    order.forEach((id) => {
      rows[id] = analyzeSkeleton(id);
    });
    return {
      order,
      rows,
      table: order.map((id) => {
        const r = rows[id];
        return {
          id,
          skeleton: r.label,
          physical: r.physical,
          architecture: r.architectureVerdict,
          plausibleHomes: r.plausibleHomes ? 'Yes' : 'No',
          daily: r.daily,
          verdict: r.verdict,
        };
      }),
      lesson: lessonFrom(rows, order),
    };
  }

  function lessonFrom(rows, order) {
    const circPass = order.filter((id) => rows[id].physical === 'PASS');
    const archPass = order.filter((id) => rows[id].verdict === 'PASS');
    if (archPass.length === 0 && circPass.length >= 2) {
      return 'D/E/F fail the Original Program Gate. D and F are physical FAIL (declared south staging 12′ < 20.5′). E is physical PASS on declared W+E (south door audited FAIL at 8′) but fails architecture remaining — rear zone is a ribbon. Next: Parking Reset Gate (smaller / tandem / covered / lift) using E’s path pattern — not architecture. J1 CLOSED.';
    }
    if (archPass.length === 1) {
      return `Only ${rows[archPass[0]].label} fully passes circulation and architecture remaining.`;
    }
    return 'Compare skeleton verdicts and architecture remaining before attaching house concepts.';
  }

  function renderArchitectureOverlay(concept, scale, mx, my) {
    const arch = architectureRemaining(concept);
    const sx = (x) => mx + x * scale;
    const sy = (y) => my + y * scale;
    let s = '';
    function zoneRect(z, cls, label) {
      if (!z) return '';
      const w = (z.maxX - z.minX) * scale;
      const h = (z.maxY - z.minY) * scale;
      const ok = z.minWidth >= MIN_HOME_WIDTH && z.area >= PLAUSIBLE_FIRST;
      return `<rect class="${cls}" x="${sx(z.minX)}" y="${sy(z.minY)}" width="${w}" height="${h}" fill="${ok ? '#41614533' : '#9a3b2e33'}" stroke="${ok ? '#416145' : '#9a3b2e'}" stroke-width="1.5" stroke-dasharray="6 4"/><text class="sm" x="${sx(z.minX + (z.maxX - z.minX) / 2)}" y="${sy(z.minY + (z.maxY - z.minY) / 2)}" text-anchor="middle" fill="${ok ? '#416145' : '#9a3b2e'}">${label} · ${z.area} SF · ${z.minWidth}′ min</text>`;
    }
    s += zoneRect(arch.zoneA, 'zone-a', 'Unit A (Penn)');
    s += zoneRect(arch.zoneB, 'zone-b', 'Unit B (rear)');
    return s;
  }

  return {
    analyzeSkeleton,
    analyzeAllSkeletons,
    architectureRemaining,
    plateDriveCrossing,
    occupiedByCirculation,
    renderArchitectureOverlay,
    SKEL,
  };
})();

if (typeof module !== 'undefined') module.exports = Lot2AccessSkeleton;
