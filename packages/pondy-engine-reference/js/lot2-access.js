/**
 * Lot 2 Pass 2 — SUV swept-path (read-only vs locked Pass 1.5 CONCEPTS)
 * Design vehicle: full-size SUV / pickup. Do not mutate Lot2.CONCEPTS.
 */
const Lot2Access = (() => {
  const S = typeof Lot2SOT !== 'undefined' ? Lot2SOT : {};
  const L = typeof Lot2 !== 'undefined' ? Lot2 : {};
  const V = S.SUV_FS || {
    id: 'FS-SUV',
    label: 'Full-size SUV / pickup (F-150 SuperCrew / Tahoe class)',
    length: 20.5,
    width: 8.0,
    wheelbase: 13.1,
    frontOverhang: 3.4,
    rearOverhang: 4.0,
    minRearAxleRadius: 25,
    outerFrontRadius: 28.2,
    doorWidth: 16,
    apronDepth: 24,
  };
  const R = V.minRearAxleRadius;
  const HALF_W = V.width / 2;
  const SURVEY = L.SURVEY;
  const SETBACK = L.SETBACK_POLY;
  const FINAL = L.FINAL_THREE || ['e2', 'g1', 'v2'];
  const CHALLENGERS = L.ALTERNATES || ['h6', 'h3'];
  const VARIANTS = L.ACCESS_VARIANTS || ['g1a'];

  function unitPoly(u) {
    if (u.poly) return u.poly.map((p) => [...p]);
    return [[u.x, u.y], [u.x + u.w, u.y], [u.x + u.w, u.y + u.h], [u.x, u.y + u.h]];
  }
  function garagePoly(g) {
    return [[g.x, g.y], [g.x + g.w, g.y], [g.x + g.w, g.y + g.h], [g.x, g.y + g.h]];
  }
  function obstacles(concept, skipGarageName, ignoreIds) {
    const ignore = new Set(ignoreIds || []);
    const out = [];
    (concept.units || []).forEach((u) => out.push({ label: u.name, poly: unitPoly(u), kind: 'unit' }));
    (concept.garages || []).forEach((g) => {
      if (g.integrated) return;
      /** Open covered bays are roof structure only — not solid swept-path / staging obstacles. */
      if (g.covered) {
        /** Carport posts (corner columns) remain obstacles even when roof is open. */
        const post = 0.5;
        const inset = 0.25;
        const corners = [
          [g.x + inset, g.y + inset],
          [g.x + g.w - inset - post, g.y + inset],
          [g.x + inset, g.y + g.h - inset - post],
          [g.x + g.w - inset - post, g.y + g.h - inset - post],
        ];
        corners.forEach((c, i) => {
          out.push({
            label: `${g.name} post ${i + 1}`,
            id: g.id,
            kind: 'post',
            poly: [
              [c[0], c[1]],
              [c[0] + post, c[1]],
              [c[0] + post, c[1] + post],
              [c[0], c[1] + post],
            ],
          });
        });
        return;
      }
      if (skipGarageName && g.name === skipGarageName) return;
      if (g.id && ignore.has(g.id)) return;
      out.push({ label: g.name, id: g.id, poly: garagePoly(g), kind: 'garage' });
    });
    /** Concept-declared site edges: curbs, snow windrows. */
    (concept.siteObstacles || []).forEach((o) => {
      out.push({
        label: o.label || o.id || 'site',
        kind: o.kind || 'site',
        poly: o.poly.map((p) => [...p]),
      });
    });
    return out;
  }

  function heading(a, b) {
    return Math.atan2(b[1] - a[1], b[0] - a[0]);
  }
  function wrap(a) {
    while (a > Math.PI) a -= 2 * Math.PI;
    while (a < -Math.PI) a += 2 * Math.PI;
    return a;
  }
  function len(a, b) {
    return Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  function norm(a, b) {
    const d = len(a, b) || 1;
    return [(b[0] - a[0]) / d, (b[1] - a[1]) / d];
  }

  /** Path poses are rear-axle centerline. Body geometric center is ~6.25′ ahead (L/2 − rear overhang). */
  const AXLE_TO_BODY = (V.length / 2) - (V.rearOverhang != null ? V.rearOverhang : 4.0);

  function vehiclePoly(axleX, axleY, th) {
    const hx = Math.cos(th);
    const hy = Math.sin(th);
    const cx = axleX + hx * AXLE_TO_BODY;
    const cy = axleY + hy * AXLE_TO_BODY;
    const wx = -hy;
    const wy = hx;
    const hl = V.length / 2;
    const hw = HALF_W;
    return [
      [cx + hx * hl + wx * hw, cy + hy * hl + wy * hw],
      [cx + hx * hl - wx * hw, cy + hy * hl - wy * hw],
      [cx - hx * hl - wx * hw, cy - hy * hl - wy * hw],
      [cx - hx * hl + wx * hw, cy - hy * hl + wy * hw],
    ];
  }

  function proj(a, b, p) {
    const abx = b[0] - a[0];
    const aby = b[1] - a[1];
    const t = ((p[0] - a[0]) * abx + (p[1] - a[1]) * aby) / ((abx * abx + aby * aby) || 1);
    const u = Math.max(0, Math.min(1, t));
    return [a[0] + abx * u, a[1] + aby * u];
  }
  function distSeg(p, a, b) {
    const q = proj(a, b, p);
    return Math.hypot(p[0] - q[0], p[1] - q[1]);
  }
  function distPoly(p, poly) {
    let m = Infinity;
    for (let i = 0; i < poly.length; i++) {
      m = Math.min(m, distSeg(p, poly[i], poly[(i + 1) % poly.length]));
    }
    return m;
  }
  function polysIntersect(a, b) {
    for (const poly of [a, b]) {
      for (let i = 0; i < poly.length; i++) {
        const p1 = poly[i];
        const p2 = poly[(i + 1) % poly.length];
        const nx = p2[1] - p1[1];
        const ny = p1[0] - p2[0];
        const projA = a.map((p) => p[0] * nx + p[1] * ny);
        const projB = b.map((p) => p[0] * nx + p[1] * ny);
        if (Math.max(...projA) < Math.min(...projB) - 0.02 || Math.max(...projB) < Math.min(...projA) - 0.02) return false;
      }
    }
    return true;
  }

  function surveyYAtX(x) {
    let maxY = 0;
    for (let i = 0; i < SURVEY.length; i++) {
      const a = SURVEY[i];
      const b = SURVEY[(i + 1) % SURVEY.length];
      const lo = Math.min(a[0], b[0]);
      const hi = Math.max(a[0], b[0]);
      if (x < lo - 0.05 || x > hi + 0.05) continue;
      if (Math.abs(b[0] - a[0]) < 1e-6) maxY = Math.max(maxY, a[1], b[1]);
      else {
        const t = (x - a[0]) / (b[0] - a[0]);
        maxY = Math.max(maxY, a[1] + t * (b[1] - a[1]));
      }
    }
    return maxY;
  }

  function poseHits(poly, obs, label, margin) {
    const m = margin != null ? margin : 0.2;
    const issues = [];
    poly.forEach(([x, y]) => {
      if (x >= 147.8) return;
      if (x < -0.2 || y < -0.2) issues.push(`${label}: body (${x.toFixed(1)}, ${y.toFixed(1)}) off survey`);
      else if (!L.pointInPoly(x, y, SURVEY, m)) issues.push(`${label}: body (${x.toFixed(1)}, ${y.toFixed(1)}) off survey`);
    });
    obs.forEach((o) => {
      if (polysIntersect(poly, o.poly)) issues.push(`${label}: swept body hits ${o.label}`);
    });
    return issues;
  }

  /** Positive south-boundary clearance for a body poly (ft). Negative = beyond survey. */
  function southClearance(poly) {
    let min = Infinity;
    poly.forEach(([x, y]) => {
      if (x >= 147.8 || x < 0) return;
      min = Math.min(min, surveyYAtX(x) - y);
    });
    return min === Infinity ? null : min;
  }

  /** Fillet polyline corners at min rear-axle radius; record short-tangent failures. */
  function filletPath(rawPath) {
    const path = rawPath.map((p) => [...p]);
    const notes = [];
    const poses = [];
    if (path.length < 2) return { poses, notes, ok: false };

    function sampleStraight(a, b, skipEnd) {
      const d = len(a, b);
      const steps = Math.max(1, Math.ceil(d / 2.5));
      const th = heading(a, b);
      for (let i = 0; i < steps; i++) {
        const t = i / steps;
        poses.push({ x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, th, kind: 'straight' });
      }
      if (!skipEnd) poses.push({ x: b[0], y: b[1], th, kind: 'straight' });
    }

    let cursor = path[0];
    for (let i = 1; i < path.length - 1; i++) {
      const A = i === 1 ? path[0] : cursor;
      const B = path[i];
      const C = path[i + 1];
      const dIn = len(A, B);
      const dOut = len(B, C);
      const hIn = heading(A, B);
      const hOut = heading(B, C);
      const delta = wrap(hOut - hIn);
      const phi = Math.abs(delta);
      if (phi > (150 * Math.PI) / 180) {
        notes.push({ kind: 'path-reversal', at: B, turnDeg: +((phi * 180) / Math.PI).toFixed(0) });
        sampleStraight(cursor, B, true);
        cursor = B;
        continue;
      }
      if (phi < (12 * Math.PI) / 180) {
        sampleStraight(cursor, B, true);
        cursor = B;
        continue;
      }
      const T = R * Math.tan(phi / 2);
      const avail = Math.min(dIn, dOut);
      if (avail < T - 0.4) {
        notes.push({
          kind: 'short-tangent',
          at: B,
          need: +T.toFixed(1),
          have: +avail.toFixed(1),
          turnDeg: +((phi * 180) / Math.PI).toFixed(0),
        });
        sampleStraight(cursor, B, true);
        cursor = B;
        continue;
      }
      const uIn = norm(A, B);
      const sign = delta >= 0 ? 1 : -1;
      const n = sign > 0 ? [-uIn[1], uIn[0]] : [uIn[1], -uIn[0]];
      const P1 = [B[0] - uIn[0] * T, B[1] - uIn[1] * T];
      const uOut = norm(B, C);
      const P2 = [B[0] + uOut[0] * T, B[1] + uOut[1] * T];
      const center = [P1[0] + n[0] * R, P1[1] + n[1] * R];
      sampleStraight(cursor, P1, true);
      const a1 = Math.atan2(P1[1] - center[1], P1[0] - center[0]);
      const a2 = Math.atan2(P2[1] - center[1], P2[0] - center[0]);
      let sweep = wrap(a2 - a1);
      const steps = Math.max(6, Math.ceil((Math.abs(sweep) * R) / 2));
      for (let s = 0; s <= steps; s++) {
        const ang = a1 + (sweep * s) / steps;
        const x = center[0] + Math.cos(ang) * R;
        const y = center[1] + Math.sin(ang) * R;
        const th = ang + (sign > 0 ? Math.PI / 2 : -Math.PI / 2);
        poses.push({ x, y, th, kind: 'arc', center, R });
      }
      cursor = P2;
    }
    sampleStraight(cursor, path[path.length - 1], false);
    return { poses, notes, ok: notes.filter((n) => n.kind === 'short-tangent').length === 0 };
  }

  function nearGarage(pt, g) {
    const dx = Math.max(g.x - pt[0], pt[0] - (g.x + g.w), 0);
    const dy = Math.max(g.y - pt[1], pt[1] - (g.y + g.h), 0);
    return Math.hypot(dx, dy) <= 4;
  }

  function inboundPaths(concept) {
    const garages = (concept.garages || []).filter((g) => !g.integrated);
    if (concept.accessPaths && concept.accessPaths.length) {
      return concept.accessPaths.map((ap, i) => {
        const g = garages.find((x) => x.id === ap.garage || (x.name || '').includes(`GARAGE ${ap.garage}`)) || garages[i];
        return {
          garage: g,
          path: (ap.path || []).map((p) => [...p]),
          outbound: ap.outbound ? ap.outbound.map((p) => [...p]) : null,
          forwardExit: !!ap.forwardExit,
        };
      }).filter((b) => b.garage && b.path.length >= 2);
    }
    const path = (concept.drive || []).map((p) => [...p]);
    if (path.length < 2) return [];
    let alleyIdx = -1;
    for (let i = 1; i < path.length; i++) {
      if (path[i][0] <= 20 && path[i][1] <= 20) {
        alleyIdx = i;
        break;
      }
    }
    const stem = alleyIdx >= 2 ? path.slice(0, alleyIdx + 1) : path.slice();
    const alley = stem[stem.length - 1];
    const alreadyAtCore = garages.some((g) => nearGarage(alley, g));
    return garages.map((g) => {
      const spur = stem.map((p) => [...p]);
      if (alreadyAtCore) return { garage: g, path: spur };
      const targetX = Math.max(alley[0] + 8, Math.min(g.x + 4, alley[0] + 50));
      if (Math.abs(targetX - alley[0]) > 3) spur.push([targetX, alley[1]]);
      return { garage: g, path: spur };
    });
  }

  function doorCandidates(g) {
    return [
      { face: 'N', x: g.x + g.w / 2, y: g.y, heading: Math.PI / 2, apron: g.y - 0, door: g.w },
      { face: 'S', x: g.x + g.w / 2, y: g.y + g.h, heading: -Math.PI / 2, apron: surveyYAtX(g.x + g.w / 2) - (g.y + g.h), door: g.w },
      { face: 'W', x: g.x, y: g.y + g.h / 2, heading: 0, apron: g.x - 0, door: g.h },
      { face: 'E', x: g.x + g.w, y: g.y + g.h / 2, heading: Math.PI, apron: 148 - (g.x + g.w), door: g.h },
    ];
  }

  function bestDoors(concept) {
    const obsAll = obstacles(concept);
    return (concept.garages || []).filter((g) => !g.integrated).map((g) => {
      const ignore = g.apronIgnoreIds || [];
      const obs = ignore.length ? obstacles(concept, null, ignore) : obsAll;
      const ranked = doorCandidates(g)
        .map((d) => {
          const reasons = [];
          if (d.door < V.doorWidth) reasons.push(`face ${d.face} shorter than 16′ door`);
          if (d.apron < V.length - 0.5) reasons.push(`apron ${d.apron.toFixed(1)}′ < ${V.length}′ vehicle`);
          const staging = [];
          const depth = Math.min(V.apronDepth, Math.max(0, d.apron));
          for (let s = 4; s <= depth; s += 4) {
            const cx = d.x - Math.cos(d.heading) * s;
            const cy = d.y - Math.sin(d.heading) * s;
            const poly = vehiclePoly(cx, cy, d.heading);
            const hits = poseHits(poly, obs.filter((o) => o.label !== g.name), `${g.name} ${d.face} apron`);
            if (hits.length) reasons.push(...hits.slice(0, 1));
            staging.push({ s, hits: hits.length });
          }
          const clearDepth = staging.filter((t) => t.hits === 0).reduce((m, t) => Math.max(m, t.s), 0);
          const hitsBldg = reasons.some((r) => r.includes('hits'));
          const named = g.doorFace && d.face === g.doorFace ? 400 : 0;
          const score = named
            + (reasons.length === 0 && d.apron >= V.length ? 1000 : 0)
            + clearDepth
            + (!hitsBldg ? Math.min(d.apron, V.apronDepth) : 0);
          return { ...d, reasons, clearDepth, ok: reasons.length === 0 && d.apron >= V.length, score };
        })
        .sort((a, b) => b.score - a.score);
      const declared = g.doorFace ? ranked.find((d) => d.face === g.doorFace) || null : null;
      /** Gate face: declared door when set, else engine best. Hard staging uses this face. */
      const gate = declared || ranked[0];
      return { garage: g, doors: ranked, best: ranked[0], declared, gate };
    });
  }

  function blocking(concept, doorRows) {
    const notes = [];
    const bays = doorRows.map((r) => r.garage);
    if (bays.length < 2) return { independent: false, notes: ['Fewer than two detached bays'] };
    const a = bays[0];
    const b = bays[1];
    const gapX = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w), 0);
    const gapY = Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h), 0);
    const attached = gapX < 0.2 && gapY < 0.2 || (gapX === 0 && gapY === 0);
    const shareWall = Math.abs(a.x + a.w - b.x) < 0.3 || Math.abs(b.x + b.w - a.x) < 0.3 || Math.abs(a.y + a.h - b.y) < 0.3 || Math.abs(b.y + b.h - a.y) < 0.3;
    if (shareWall || attached) {
      notes.push('Garages share a wall — one apron/door orientation must serve both without crossing the other bay');
    }
    const faces = doorRows.map((r) => r.gate.face);
    if (faces[0] === faces[1] && shareWall) {
      notes.push(`Both gate doors face ${faces[0]} — a vehicle staged at one bay occupies the shared approach`);
    }
    doorRows.forEach((r) => {
      if (r.garage && r.garage.covered) return;
      if (r.gate.clearDepth < 12) notes.push(`${r.garage.name}: gate face ${r.gate.face} only ${r.gate.clearDepth}′ clear staging (< 12′ parked-vehicle envelope)`);
    });
    const enclosedRows = doorRows.filter((r) => !(r.garage && r.garage.covered));
    const independent = enclosedRows.length >= 2
      && enclosedRows.every((r) => r.gate.clearDepth >= 12)
      && !attached
      && !(shareWall && faces[0] === faces[1] && enclosedRows[0] && enclosedRows[0].gate.clearDepth < V.apronDepth);
    return { independent, shareWall, attached, faces, notes };
  }

  function minPinch(poses, obs) {
    let min = Infinity;
    let where = null;
    poses.forEach((p) => {
      const poly = vehiclePoly(p.x, p.y, p.th);
      poly.forEach((c) => {
        obs.forEach((o) => {
          const d = distPoly(c, o.poly);
          if (L.pointInPoly(c[0], c[1], o.poly, 0.05)) {
            min = 0;
            where = { p, o, d: 0 };
          } else if (d < min) {
            min = d;
            where = { p, o, d };
          }
        });
      });
    });
    return { min: min === Infinity ? null : +min.toFixed(2), where };
  }

  function analyzeConcept(id) {
    const concept = L.CONCEPTS[id];
    const reasons = [];
    const inbound = [];
    const outbound = [];
    if (!concept?.drive) {
      return { id, technical: 'FAIL', reasons: ['No drive path'] };
    }

    const raw = concept.drive;
    const pennOk = raw[0][0] >= 147;
    if (!pennOk) reasons.push('Drive does not start at Pennsylvania / right (x ≈ 148)');

    const branches = inboundPaths(concept);
    const stem = branches[0] ? branches[0].path : (concept.drive || []);
    const sweepIssues = [];
    const allNotes = [];
    const allPoses = [];
    let outboundOff = 0;
    let outboundHits = [];
    /** Concept-stage positive boundary clearance (ft). Parking resets require ~0.75′. */
    const boundaryMargin = concept.boundaryClearanceFt != null
      ? concept.boundaryClearanceFt
      : (concept.parkingReset ? 0.75 : 0.2);
    let minSouthClear = Infinity;
    const outboundFailPoses = [];
    branches.forEach((br) => {
      const obs = obstacles(concept, br.garage && br.garage.name);
      const fil = filletPath(br.path);
      allNotes.push(...fil.notes);
      allPoses.push(...fil.poses);
      fil.poses.forEach((p, i) => {
        const poly = vehiclePoly(p.x, p.y, p.th);
        const sc = southClearance(poly);
        if (sc != null) minSouthClear = Math.min(minSouthClear, sc);
        const hits = poseHits(poly, obs, `${br.garage ? br.garage.name : 'path'} ${i}`, boundaryMargin);
        hits.forEach((h) => sweepIssues.push(h));
      });
      /** Outbound: custom forward-exit / turn-pocket path when declared; else reverse of inbound. */
      const outPath = (br.outbound && br.outbound.length >= 2)
        ? br.outbound
        : (br.path || []).slice().reverse();
      if (outPath.length >= 2) {
        const outFil = filletPath(outPath);
        outFil.poses.forEach((p, i) => {
          const poly = vehiclePoly(p.x, p.y, p.th);
          const sc = southClearance(poly);
          if (sc != null) minSouthClear = Math.min(minSouthClear, sc);
          const hits = poseHits(poly, obs, `outbound ${br.garage ? br.garage.name : 'path'} ${i}`, boundaryMargin);
          hits.forEach((h) => {
            if (h.includes('off survey')) {
              outboundOff++;
              const m = h.match(/body \(([-\d.]+), ([-\d.]+)\)/);
              outboundFailPoses.push({
                i,
                axleX: +p.x.toFixed(2),
                axleY: +p.y.toFixed(2),
                thDeg: +((p.th * 180) / Math.PI).toFixed(1),
                cornerX: m ? +m[1] : null,
                cornerY: m ? +m[2] : null,
                surveyY: m ? +surveyYAtX(+m[1]).toFixed(2) : null,
                beyondFt: m ? +(m[2] - surveyYAtX(+m[1])).toFixed(2) : null,
                southClear: sc != null ? +sc.toFixed(2) : null,
                garage: br.garage && br.garage.id,
              });
            } else if (h.includes('swept body hits')) outboundHits.push(h);
          });
        });
      }
    });
    if (Number.isFinite(minSouthClear) && minSouthClear < boundaryMargin) {
      reasons.push(`Boundary clearance ${minSouthClear.toFixed(2)}′ < required ${boundaryMargin.toFixed(2)}′ (concept-stage margin)`);
    }
    const fil = { poses: allPoses, notes: allNotes };
    const offLotN = sweepIssues.filter((h) => h.includes('off survey')).length;
    const bldgNames = [...new Set(sweepIssues.filter((h) => h.includes('swept body hits')).map((h) => h.replace(/^.*hits /, '')))];
    if (offLotN) {
      const ys = fil.poses.filter((p) => p.x > 20 && p.x < 148).map((p) => p.y);
      const yMed = ys.length ? ys.sort((a, b) => a - b)[Math.floor(ys.length / 2)] : 41;
      reasons.push(`Inbound FS-SUV (8′ wide) leaves the lot — ${offLotN} samples. South lot line is ~43′ along the 40.33′ run; centerline near y=${yMed.toFixed(0)} cannot carry an 8′ vehicle.`);
    }
    if (bldgNames.length) reasons.push(`Swept envelope clips: ${bldgNames.join('; ')}`);
    if (outboundOff) {
      const custom = branches.some((b) => b.outbound);
      reasons.push(`Outbound FS-SUV leaves the lot — ${outboundOff} samples${custom ? ' (custom outbound / turn pocket)' : ' (reverse of inbound)'}`);
    }
    const outBldg = [...new Set(outboundHits.map((h) => h.replace(/^.*hits /, '')))];
    if (outBldg.length) reasons.push(`Outbound swept envelope clips: ${outBldg.join('; ')}`);
    const outboundClear = outboundOff === 0 && outBldg.length === 0;

    fil.notes.forEach((n) => {
      if (n.kind === 'short-tangent') {
        reasons.push(`Turn at (${n.at[0]}, ${n.at[1]}): ${n.turnDeg}° needs ${n.need}′ tangent for ${R}′ FS-SUV radius; ${n.have}′ available`);
      }
      if (n.kind === 'path-reversal') reasons.push(`Polyline reverses at (${n.at[0]}, ${n.at[1]}) — not a real U-turn; tested as separate garage spurs`);
    });

    const southPinches = [];
    fil.poses.forEach((p) => {
      if (p.x > 147.5) return;
      const poly = vehiclePoly(p.x, p.y, p.th);
      poly.forEach(([x, y]) => {
        if (x > 147.5 || x < 0) return;
        const sy = surveyYAtX(x);
        if (sy > 1 && y > sy + 0.15) southPinches.push({ x, y, sy });
      });
    });
    if (southPinches.length) {
      const w = southPinches[0];
      reasons.push(`South lot pinch: vehicle y=${w.y.toFixed(1)}′ beyond survey y=${w.sy.toFixed(1)}′ at x=${w.x.toFixed(1)}`);
    }

    const doors = bestDoors(concept);
    doors.forEach((row) => {
      inbound.push(`${row.garage.name}: best door ${row.best.face} · apron ${row.best.apron.toFixed(1)}′ · clear staging ${row.best.clearDepth}′`);
      if (row.declared) {
        inbound.push(`${row.garage.name}: declared door ${row.declared.face} · apron ${row.declared.apron.toFixed(1)}′ · clear staging ${row.declared.clearDepth}′${row.declared.ok ? '' : ' · NOT OK'}`);
        if (row.declared.reasons.length) inbound.push(`${row.garage.name} ${row.declared.face}: ${row.declared.reasons[0]}`);
      }
      if (row.best.reasons.length) inbound.push(`${row.garage.name} ${row.best.face}: ${row.best.reasons[0]}`);
    });

    const block = blocking(concept, doors);
    block.notes.forEach((n) => reasons.push(n));

    const pinch = minPinch(fil.poses, obstacles(concept).filter((o) => o.kind === 'unit'));
    const hasForwardExit = branches.some((b) => b.forwardExit && b.outbound);
    /** Reverse-in burden: N door or staging shorter than vehicle length (not the 24′ apron target). */
    const reverseIn = doors.some((d) =>
      !(d.garage && d.garage.covered)
      && (d.gate.face === 'N' || d.gate.clearDepth < V.length - 0.5));
    /** Polygonal swept-path concepts: dense polylines create many small-angle short-tangent notes — score envelope first; only sharp corners (<12′) count as three-point burden. */
    const polySweep = !!concept.polygonalSweep;
    const shortTanNotes = fil.notes.filter((n) => n.kind === 'short-tangent');
    const sharpFail = shortTanNotes.filter((n) => n.have < 8).length > 0;
    const threePoint = polySweep
      ? shortTanNotes.some((n) => n.have < 12)
      : shortTanNotes.length > 0;
    const clearanceFail = Number.isFinite(minSouthClear) && minSouthClear < boundaryMargin;
    const offLot = offLotN > 0 || clearanceFail || reasons.some((r) => r.includes('off survey') || r.includes('beyond survey') || r.includes('Boundary clearance'));
    const hitBldg = bldgNames.length > 0 || reasons.some((r) => r.includes('swept body hits') || r.includes('Swept envelope clips'));
    const noDoor = doors.some((d) => !(d.garage && d.garage.covered) && d.gate.clearDepth < 8);
    /** Hard physical: declared (or best) face must clear full-size staging depth. Covered open bays are soft. */
    const stagingRows = doors.filter((d) => !(d.garage && d.garage.covered));
    const stagingFail = stagingRows.some((d) => d.gate.clearDepth < V.length - 0.5 || d.gate.apron < V.length - 0.5);
    stagingRows.forEach((row) => {
      if (row.gate.clearDepth < V.length - 0.5 || row.gate.apron < V.length - 0.5) {
        reasons.push(`${row.garage.name}: gate face ${row.gate.face} staging ${row.gate.clearDepth}′ / apron ${row.gate.apron.toFixed(1)}′ < ${V.length}′ FS-SUV (hard physical FAIL)`);
      }
    });
    doors.filter((d) => d.garage && d.garage.covered).forEach((row) => {
      if (row.gate.clearDepth < 8) {
        reasons.push(`${row.garage.name}: covered bay staging only ${row.gate.clearDepth}′ (soft REVIEW)`);
      }
    });

    const envelopeClear = !offLot && !hitBldg && !stagingFail && pennOk && !noDoor;
    const apronTarget = concept.parkingReset ? V.length : V.apronDepth;
    let technical = 'PASS';
    if (!pennOk || offLot || noDoor || hitBldg || stagingFail) technical = 'FAIL';
    else if (sharpFail || !block.independent || pinch.min !== null && pinch.min < 2 || threePoint) technical = 'REVIEW';
    else if (!polySweep && (fil.notes.length || doors.some((d) => d.gate.apron < apronTarget))) technical = 'REVIEW';
    else if (polySweep && shortTanNotes.some((n) => n.have < 25 - 0.5) && shortTanNotes.length) technical = 'REVIEW';
    else if (stagingRows.some((d) => d.gate.apron < apronTarget)) technical = 'REVIEW';
    else if (!outboundClear) technical = 'REVIEW';

    if (polySweep && envelopeClear && technical !== 'FAIL') {
      const minHave = shortTanNotes.reduce((m, n) => Math.min(m, n.have), Infinity);
      if (Number.isFinite(minHave) && minHave < 25 - 0.5) {
        reasons.push(`Polygonal swept-path envelope on-lot · min corner run ${minHave.toFixed(1)}′ < 25′ FS-SUV design radius (CONDITIONAL — not FULL PASS)`);
      } else if (!shortTanNotes.length) {
        reasons.push(`Polygonal swept-path envelope on-lot · no sharp corner shortfall · min south clearance ${Number.isFinite(minSouthClear) ? minSouthClear.toFixed(2) : '—'}′`);
      }
    }

    let daily = 'Good';
    let burden = 'Moderate';
    if (technical === 'FAIL') {
      daily = 'N/A — physically blocked';
      burden = 'Severe';
    } else if (threePoint || (reverseIn && !hasForwardExit) || (pinch.min !== null && pinch.min < 2.5)) {
      daily = 'Poor — daily three-point / reverse / pinch';
      burden = 'High';
      if (technical === 'PASS') technical = 'REVIEW';
    } else if (!block.independent) {
      daily = 'Fair — shared apron / stacked dependence';
      burden = 'High';
    } else if (hasForwardExit && outboundClear) {
      daily = 'Good — pocket turnaround · forward Pennsylvania exit';
      burden = 'Low';
    } else if (doors.every((d) => d.gate.face === 'S' || d.gate.face === 'W') && doors.every((d) => d.gate.clearDepth >= V.apronDepth)) {
      daily = 'Good — obvious approach, reverse-out typical';
      burden = 'Low';
    } else {
      daily = 'Fair — works, not pleasant every day';
      burden = 'Moderate';
    }
    if (id === 'g1a' && technical !== 'FAIL') {
      daily = 'Fair — A is a clean Pennsylvania shot; B is a shallow offset then reverse-out. Garage A doors face the street.';
      burden = 'Moderate';
    }

    outbound.push('Outbound assumed reverse of inbound unless a forward loop exists (none on these plans).');
    const westAlley = stem.some((p) => p[0] <= 20 && p[1] <= 20);
    if (threePoint) {
      outbound.push(westAlley
        ? 'Expect reverse-out plus at least one three-point at the west 90° corner.'
        : 'Expect reverse-out plus a three-point at the south-court 90° into the core.');
    } else {
      outbound.push('Reverse-out of garage, then forward to Pennsylvania.');
    }

    const change = smallestChange(id, { offLot, noDoor, hitBldg, block, doors, fil, pinch, southPinches });
    const RELATIVE = {
      e2: 'Worst of the locked Final Three: south corridor cannot hold an 8′ SUV, Unit B overlaps the garages, and Garage B has no independent 16′ door.',
      g1: 'Same south-apron FAIL as E2. Orthogonal plates leave a 14′ gap south of Unit A that a drive-only variant could use — still not adopted. West alley cannot stack two 25′ fillets (4′ leftover).',
      v2: 'Same south-apron and west-alley failures as G1, plus Garage A staging well short of 20.5′ and the angled Penn wing pinching the entry. Highest daily pain if forced.',
      h6: 'Best *intent* of the five: short south approach to a mid-lot garage core, no west alley. Still FAIL on locked plates — ~1′ off survey on the 40.33′ run, CORE B south aisle only 13′ vs 20.5′ vehicle, 10′ leftover on the 90° at (74, 40). Does not PASS and is not REVIEW.',
      h3: 'Mews is 14×20 in the Penn setback — not an FS-SUV court (3′ leftover each side; 25′ radius cannot fit). Drive is the same y=41 west-alley path as the finalists. Garages overlap 14′. FAIL in the same class as E2/G1/V2.',
      g1a: 'Circulation proof only — not a candidate. Demonstrated east-facing tandem + y~37 south lane before illustrative houses were drawn. See Access A skeleton.',
      access_a: 'Known-good baseline: Garage A straight Penn inbound (y=16). Garage B via on-lot south lane (y~37) and shallow offset. Both doors east. Independent FS-SUV paths.',
      access_b: 'Central paired core at (52,8)+(74,8) — H6 circulation without architecture. Garage A path clips Garage B; Garage B needs 90° with 18′ vertical vs 25′ required. Shared core cannot give two independent east-door FS-SUV aprons.',
      access_c: 'Split depth: A at Penn (102,5), B deeper rear/left (25,22). Same south lane as Access A. Tests whether staggering garage depth improves architecture remaining vs tandem offset.',
      access_d: 'E1 rear-stack: GA door E Penn mid-lane; GB door S clear-south. Swept clips cleared. Physical FAIL — GB declared S staging 12′ < 20.5′ (apron partly off-survey).',
      access_e: 'E3 courtyard circulation reference: declared W+E (not S+E). Declared S on A audited at 8′ staging FAIL; W+E both clear 24′. Physical PASS · architecture remaining FAIL (rear ribbon).',
      access_f: 'F1 rear court: GA door S · GB door E. Swept clips cleared. Physical FAIL — GA declared S staging 12′ < 20.5′ (apron partly off-survey).',
      reset_r1: 'Parking Reset R1 Practical Pair — E recipe with 14×24 W+E singles + 10×22 covered. Scored on Parking Reset Gate (not twin 22×22).',
      reset_r2: 'Parking Reset R2 Lift Pair — E recipe 14×24 W+E with two-car lifts (4 enclosed in small footprint).',
      reset_r3: 'Parking Reset R3 Dual Tandem — E recipe 16×46 W+E tandem boxes (≈14×46 program).',
      reset_r4: 'Parking Reset R4 Hybrid — E recipe asymmetric two-car E + single W + covered.',
      access_d_mews: 'Archive: facing rear mews experiment. Mid-lot path clipped GB; not the official E1-derived D.',
      e2: 'Clear-south corridor applied (was y=41 pinch FAIL). Footprints unchanged. Re-score remaining building/apron issues.',
      g1: 'Clear-south corridor applied (was y=41 pinch FAIL). Locked footprints unchanged. G1-A remains the east-door circulation proof.',
      v2: 'Clear-south corridor applied (was y=41 pinch FAIL). Footprints unchanged.',
      h3: 'Clear-south corridor applied (was y=41 west-alley FAIL). Mews court and garage overlap issues remain separate.',
      h6: 'Clear-south corridor applied (was y=40 spine off-lot). Core staging / turn issues remain separate.',
      e1: 'Clear-south corridor applied (was y=41 pinch). Same garage stack as Skeleton D.',
      e3: 'Clear-south corridor applied (was y=41 pinch). H3 courtyard fallback family.',
      f1: 'Clear-south corridor applied (was y=41 pinch). Rear motor-court family.',
      g2: 'Clear-south corridor applied (was y=41 pinch). Mid-lot garage family ≈ E3/H3.',
      h2: 'Clear-south corridor applied (was y=41 pinch). Mid-lot garage family ≈ E3/H3.',
      h4: 'Clear-south corridor applied (was y=41 pinch). Depth-stack family ≈ E1.',
      h5: 'Clear-south corridor applied (was y=41 pinch). Garage band ≈ E1/A.',
    };

    return {
      id,
      label: concept.label,
      vehicle: V.label,
      technical,
      daily,
      burden,
      pennAccess: pennOk,
      inbound,
      outbound,
      outboundClear,
      outboundFailPoses,
      minSouthClear: Number.isFinite(minSouthClear) ? +minSouthClear.toFixed(2) : null,
      boundaryMargin,
      axleToBody: AXLE_TO_BODY,
      reverse: hasForwardExit ? false : (reverseIn || true),
      forwardExit: hasForwardExit,
      threePoint,
      independent: block.independent,
      blocking: !block.independent,
      pinchFt: pinch.min,
      pinchLabel: pinch.where ? pinch.where.o.label : null,
      shortTangents: fil.notes,
      doors: doors.map((d) => ({
        name: d.garage.name,
        best: d.best.face,
        apron: +d.best.apron.toFixed(1),
        clear: d.best.clearDepth,
        ok: d.best.ok,
        declared: d.declared
          ? {
              face: d.declared.face,
              apron: +d.declared.apron.toFixed(1),
              clear: d.declared.clearDepth,
              ok: d.declared.ok,
              reasons: d.declared.reasons.slice(0, 2),
            }
          : null,
        gate: {
          face: d.gate.face,
          apron: +d.gate.apron.toFixed(1),
          clear: d.gate.clearDepth,
          ok: d.gate.ok,
        },
      })),
      poses: fil.poses,
      corridor: stem,
      branches: branches.map((b) => b.garage.name),
      westAlley,
      track: FINAL.includes(id) ? 'baseline' : VARIANTS.includes(id) ? 'variant' : (L.ACCESS_PROOFS || []).includes(id) ? 'access-proof' : (L.PARKING_RESETS || []).includes(id) ? 'parking-reset' : (L.ACCESS_SKELETONS || []).includes(id) ? 'access-skeleton' : 'challenger',
      change,
      relative: RELATIVE[id],
      reasons: [...new Set(reasons)].slice(0, 10),
    };
  }

    function smallestChange(id, ctx) {
    const shared = 'Locked buildings stay. The y=41 schematic drive is the shared failure: an 8′ SUV cannot fit between the south lot line (~43′) and the living plates.';
    if (id === 'e2') {
      return shared + ' E2 also has Unit B overlapping the garage south wall (~y=25–30) and no independent 16′ door for Garage B. Smallest building change (variant only): pull Unit B north edge south of the garages and open a west-alley court — survey still cannot provide a 24′ south apron. Do not edit the locked concept.';
    }
    if (id === 'g1') {
      return shared + ' If only the drive polyline were adjusted (variant, not locked): shift apron north to ~y=36.5 to sit in the 14′ gap south of Unit A. West alley still needs a 3-point because two 25′ fillets cannot stack in 29′ of north–south. Garage A west door is blocked by Unit B.';
    }
    if (id === 'v2') {
      return shared + ' Same west-alley 3-point as G1. Garage A south staging only 8′ clear vs 20.5′ vehicle. Angled Unit A pinches the Penn-side apron. Do not clip V wings silently.';
    }
    if (id === 'h6') {
      return 'Locked buildings stay. H6’s y=40 spine is ~1′ closer than the y=41 finalist apron but still off survey along the 40.33′ run. CORE B south aisle is only 13′ vs 20.5′ vehicle — a perpendicular FS-SUV cannot stage on-lot at this X. 90° at (74, 40) has 10′ leftover vs 25′. A 1′ drive nudge is not enough; the core would have to move. Do not edit the locked concept.';
    }
    if (id === 'h3') {
      return 'Locked buildings stay. H3 uses the same y=41 west-alley drive as the finalists — same 8′ SUV off-lot failure. Mews court is 14×20 in the Penn setback; an 8′ vehicle has 3′ each side and cannot turn at 25′ radius. Garages overlap 14′. Not a mews-circulation win as drawn.';
    }
    if (id === 'g1a') {
      return 'None on circulation — envelope was built first. Sacrifices vs locked G1 are first-floor SF, street-facing Garage A, extra paving, and a thinner Unit B bar. Do not write these plates back onto g1.';
    }
    return 'Preserve locked geometry; describe variant separately.';
  }

  function verdictRow(r) {
    let verdict = r.technical;
    if (r.technical === 'PASS' && r.daily.startsWith('Poor')) verdict = 'REVIEW';
    return {
      concept: r.label,
      physical: r.technical,
      daily: r.daily,
      burden: r.burden,
      change: ({
        e2: 'Not adopted — Unit B overlaps garages; no independent B door',
        g1: 'Not adopted — drive-only y≈36.5 possible; west 3-point remains',
        v2: 'Not adopted — do not clip V wings; 8′ A staging',
        h6: 'Not adopted — ~1′ off lot; 13′ CORE B aisle vs 20.5′ vehicle',
        h3: 'Not adopted — same y=41 FAIL; 14×20 mews unusable for FS-SUV',
        g1a: 'Circulation-first — locked G1 untouched',
      })[r.id] || 'Not adopted',
      verdict,
    };
  }

  function analyzeIds(ids) {
    const rows = {};
    ids.forEach((id) => {
      rows[id] = analyzeConcept(id);
    });
    return { vehicle: V, order: ids, rows, table: ids.map((id) => verdictRow(rows[id])) };
  }

  function decisionFrom(report) {
    const techs = report.order.map((id) => report.rows[id].technical);
    const anyPass = techs.includes('PASS');
    const challengerReview = CHALLENGERS.some((id) => report.rows[id] && report.rows[id].technical === 'REVIEW');
    const allFail = techs.every((t) => t === 'FAIL');
    if (anyPass) {
      return 'A challenger PASSed cleanly — promote it and demote the weakest failed finalist. Do not start Pass 2 architecture until that swap is locked.';
    }
    if (challengerReview) {
      return 'Challenger REVIEW: compare the smallest required modifications against G1’s unused drive-only variant. Do not start Pass 2 architecture.';
    }
    if (allFail) {
      return 'H6 and H3 also FAIL on locked geometry. Stop testing existing concepts as if one already solves circulation. Treat circulation as a site constraint. G1’s access-optimized drive variant is the logical first redesign — not yet drawn. Do not start Pass 2 architecture.';
    }
    return 'Compare results; do not auto-optimize locked plates.';
  }

  function analyzeFinalThree() {
    return analyzeIds(FINAL);
  }

  function analyzeChallengers() {
    return analyzeIds(CHALLENGERS);
  }

  function analyzeVariants() {
    const ids = [...VARIANTS, ...(L.ACCESS_PROOFS || [])].filter((id) => L.CONCEPTS && L.CONCEPTS[id]);
    return analyzeIds(ids);
  }

  function analyzeShortlist() {
    const order = [...FINAL, ...CHALLENGERS];
    const r = analyzeIds(order);
    r.baseline = FINAL;
    r.challengers = CHALLENGERS;
    r.decision = decisionFrom(r);
    return r;
  }

  return {
    VEHICLE: V,
    AXLE_TO_BODY,
    analyzeConcept,
    analyzeFinalThree,
    analyzeChallengers,
    analyzeVariants,
    analyzeShortlist,
    vehiclePoly,
    filletPath,
    trimDrive: inboundPaths,
    bestDoors,
  };
})();

if (typeof module !== 'undefined') module.exports = Lot2Access;
