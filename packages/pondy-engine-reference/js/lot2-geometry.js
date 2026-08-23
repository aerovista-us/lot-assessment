/**
 * Lot 2 — LOCKED drawing convention · Pass 1.5 geometry engine
 * Pennsylvania RIGHT · compass LEFT · drives from Penn/right only.
 */
const Lot2 = (() => {
  const S = typeof Lot2SOT !== 'undefined' ? Lot2SOT : null;
  const SURVEY = S ? S.SURVEY.map((p) => [...p]) : [
    [0, 0], [148, 0], [148, 50], [125.143, 43.016], [84.813, 43.016], [0, 57.01],
  ];
  const SURVEY_AREA = S ? S.SURVEY_AREA : 7023.43;
  const SETBACKS = S ? { ...S.SETBACKS } : { front: 20, rear: 25, west: 5, east: 10 };
  const SEGMENT_SB = S ? [...S.SEGMENT_SETBACK] : ['west', 'front', 'east', 'east', 'east', 'rear'];
  const DRIVE_W = S ? S.DRIVE_WIDTH : 12;
  const GAR = S ? { ...S.GARAGE } : { w: 22, h: 22, sf: 484 };

  const SCALE = 5.45;
  const MARGIN = { x: 70, y: 40 };
  const VB_W = Math.ceil(148 * SCALE + MARGIN.x * 2 + 40);
  const VB_H = Math.ceil(57.01 * SCALE + MARGIN.y * 2 + 20);

  function segmentSetbackFeet(i) {
    return SETBACKS[SEGMENT_SB[i]];
  }

  function lineIntersect(a, b, c, d) {
    const [x1, y1] = a;
    const [x2, y2] = b;
    const [x3, y3] = c;
    const [x4, y4] = d;
    const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(den) < 1e-9) return [(x2 + x3) / 2, (y2 + y3) / 2];
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
    return [x1 + t * (x2 - x1), y1 + t * (y2 - y1)];
  }

  /** Polygon-accurate inward setback envelope (planning assumptions — not survey). */
  function setbackPoly() {
    const n = SURVEY.length;
    const lines = [];
    for (let i = 0; i < n; i++) {
      const a = SURVEY[i];
      const b = SURVEY[(i + 1) % n];
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const d = segmentSetbackFeet(i);
      lines.push({
        a: [a[0] + nx * d, a[1] + ny * d],
        b: [b[0] + nx * d, b[1] + ny * d],
      });
    }
    const out = [];
    for (let i = 0; i < n; i++) {
      const L0 = lines[(i - 1 + n) % n];
      const L1 = lines[i];
      out.push(lineIntersect(L0.a, L0.b, L1.a, L1.b));
    }
    return out;
  }

  const SETBACK_POLY = setbackPoly();

  function polyArea(coords) {
    let a = 0;
    for (let i = 0; i < coords.length; i++) {
      const [x1, y1] = coords[i];
      const [x2, y2] = coords[(i + 1) % coords.length];
      a += x1 * y2 - x2 * y1;
    }
    return Math.abs(a) / 2;
  }

  function pointInPoly(x, y, poly, eps = 0.08) {
    if (distToPolyBoundary(x, y, poly) <= eps) return true;
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0];
      const yi = poly[i][1];
      const xj = poly[j][0];
      const yj = poly[j][1];
      const hit = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (hit) inside = !inside;
    }
    return inside;
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

  function distToPolyBoundary(x, y, poly) {
    let min = Infinity;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      min = Math.min(min, distPointSeg(x, y, a[0], a[1], b[0], b[1]));
    }
    return min;
  }

  function polyInside(coords, poly) {
    return coords.every(([x, y]) => pointInPoly(x, y, poly));
  }

  function unitFootprint(u) {
    if (u.poly) return u.poly.map((p) => [...p]);
    return [[u.x, u.y], [u.x + u.w, u.y], [u.x + u.w, u.y + u.h], [u.x, u.y + u.h]];
  }

  function garageFootprint(g) {
    if (g.rect) {
      const [x, y, w, h] = g.rect;
      return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
    }
    return [[g.x, g.y], [g.x + g.w, g.y], [g.x + g.w, g.y + g.h], [g.x, g.y + g.h]];
  }

  function allFootprints(concept) {
    const fps = [];
    (concept.units || []).forEach((u) => fps.push({ label: u.name, coords: unitFootprint(u), kind: 'unit' }));
    (concept.garages || []).forEach((g) => {
      if (!g.integrated) fps.push({ label: g.name, coords: garageFootprint(g), kind: 'garage' });
    });
    /** Reserved home plates must sit in survey + working setback (Parking Reset containment). */
    (concept.reservedPlates || []).forEach((p) => {
      fps.push({
        label: p.name || `PLATE ${p.id}`,
        coords: [[p.x, p.y], [p.x + p.w, p.y], [p.x + p.w, p.y + p.h], [p.x, p.y + p.h]],
        kind: 'plate',
      });
    });
    return fps;
  }

  function sx(x) {
    return MARGIN.x + x * SCALE;
  }
  function sy(y) {
    return MARGIN.y + y * SCALE;
  }
  function pts(arr) {
    return arr.map((p) => `${sx(p[0]).toFixed(1)},${sy(p[1]).toFixed(1)}`).join(' ');
  }
  function rect(x, y, w, h, cls, label) {
    return `<rect class="${cls}" x="${sx(x)}" y="${sy(y)}" width="${w * SCALE}" height="${h * SCALE}"/><text class="lab" x="${sx(x + w / 2)}" y="${sy(y + h / 2)}" text-anchor="middle">${label}</text>`;
  }
  function polySvg(coords, cls, label) {
    const cx = coords.reduce((s, p) => s + p[0], 0) / coords.length;
    const cy = coords.reduce((s, p) => s + p[1], 0) / coords.length;
    return `<polygon class="${cls}" points="${pts(coords)}"/><text class="lab" x="${sx(cx)}" y="${sy(cy)}" text-anchor="middle">${label}</text>`;
  }
  function drive(path) {
    return `<polyline class="drive" points="${pts(path)}"/><polyline class="center" points="${pts(path)}"/>`;
  }
  function driveLength(path) {
    let len = 0;
    for (let i = 1; i < path.length; i++) {
      len += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
    }
    return len;
  }

  function unitBoxesForClearance(concept) {
    const boxes = [];
    (concept.units || []).forEach((u) => {
      if (u.poly) boxes.push({ poly: u.poly.map((p) => [...p]), label: u.name });
      else boxes.push({ rect: { x: u.x, y: u.y, w: u.w, h: u.h }, label: u.name });
    });
    return boxes;
  }

  function distPointFootprint(px, py, fp) {
    if (fp.poly) {
      if (pointInPoly(px, py, fp.poly)) return 0;
      let min = Infinity;
      for (let i = 0; i < fp.poly.length; i++) {
        const a = fp.poly[i];
        const b = fp.poly[(i + 1) % fp.poly.length];
        min = Math.min(min, distPointSeg(px, py, a[0], a[1], b[0], b[1]));
      }
      return min;
    }
    const r = fp.rect;
    const dx = Math.max(r.x - px, px - (r.x + r.w), 0);
    const dy = Math.max(r.y - py, py - (r.y + r.h), 0);
    return Math.hypot(dx, dy);
  }

  function structureBoxes(concept) {
    const boxes = [];
    (concept.units || []).forEach((u) => {
      const c = unitFootprint(u);
      const xs = c.map((p) => p[0]);
      const ys = c.map((p) => p[1]);
      boxes.push({ x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys), label: u.name });
    });
    (concept.garages || []).forEach((g) => {
      if (!g.integrated) boxes.push({ x: g.x, y: g.y, w: g.w, h: g.h, label: g.name });
    });
    return boxes;
  }

  function minSeparation(concept) {
    const boxes = structureBoxes(concept);
    let min = Infinity;
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        const dx = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w), 0);
        const dy = Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h), 0);
        min = Math.min(min, Math.hypot(dx, dy));
      }
    }
    return min === Infinity ? 0 : min;
  }

  function unitFirstFloorArea(u) {
    if (u.poly) return polyArea(u.poly);
    return u.w * u.h;
  }

  function baseLot(extra = '') {
    const ny = sy(28);
    return `<defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#5b6771"/></marker></defs>
<polygon class="lot" points="${pts(SURVEY)}"/>
<polygon class="envelope" points="${pts(SETBACK_POLY)}"/>
<text class="dim" x="${sx(74)}" y="${sy(-5)}" text-anchor="middle">148.00′ DEPTH · REAR ← → PENNSYLVANIA</text>
<text class="dim" x="${sx(-4)}" y="${sy(28)}" transform="rotate(-90 ${sx(-4)} ${sy(28)})" text-anchor="middle">57.01′ NORTH / REAR</text>
<text class="sm" x="${sx(42)}" y="${sy(54)}" text-anchor="middle">85.98′</text>
<text class="sm" x="${sx(105)}" y="${sy(46)}" text-anchor="middle">40.33′</text>
<text class="sm" x="${sx(137)}" y="${sy(49.5)}" text-anchor="middle">23.90′</text>
<text class="front" x="${sx(151)}" y="${sy(25)}" transform="rotate(90 ${sx(151)} ${sy(25)})" text-anchor="middle">50.00′ PENNSYLVANIA · SOUTH / FRONT</text>
<path class="north-arrow" d="M${sx(-8)} ${ny} L${sx(8)} ${ny} M${sx(-8)} ${ny} L${sx(-2)} ${ny - 6} M${sx(-8)} ${ny} L${sx(-2)} ${ny + 6}"/>
<text class="sm" x="${sx(-14)}" y="${ny + 4}" text-anchor="middle">N</text>
<text class="sm" x="${sx(-14)}" y="${ny + 16}" text-anchor="middle">REAR</text>
<text class="sm" x="${sx(76)}" y="${sy(52)}" text-anchor="middle">WORKING SETBACK ENVELOPE · planning assumption</text>
${extra}`;
  }

  function renderConcept(concept) {
    let s = '';
    if (concept.court) {
      const [cx, cy, cw, ch] = concept.court;
      s += `<rect class="court" x="${sx(cx)}" y="${sy(cy)}" width="${cw * SCALE}" height="${ch * SCALE}"/><text class="sm" x="${sx(cx + cw / 2)}" y="${sy(cy + ch / 2)}" text-anchor="middle">COURT · ${cw}×${ch}</text>`;
    }
    (concept.garages || []).forEach((g) => {
      if (g.integrated) {
        s += `<rect class="garage integrated" x="${sx(g.x)}" y="${sy(g.y)}" width="${g.w * SCALE}" height="${g.h * SCALE}" stroke-dasharray="4 3"/>`;
      } else if (g.covered) {
        s += `<rect class="garage covered" x="${sx(g.x)}" y="${sy(g.y)}" width="${g.w * SCALE}" height="${g.h * SCALE}" fill="#c5d4c0" stroke="#416145" stroke-width="2" stroke-dasharray="6 4"/><text class="sm" x="${sx(g.x + g.w / 2)}" y="${sy(g.y + g.h / 2)}" text-anchor="middle">${g.name}</text>`;
      } else {
        s += rect(g.x, g.y, g.w, g.h, 'garage', g.name + (g.lift ? ' · LIFT' : ''));
      }
    });
    (concept.reservedPlates || []).forEach((p) => {
      s += `<rect x="${sx(p.x)}" y="${sy(p.y)}" width="${p.w * SCALE}" height="${p.h * SCALE}" fill="#41614518" stroke="#416145" stroke-width="1.8" stroke-dasharray="10 6"/><text class="sm" x="${sx(p.x + p.w / 2)}" y="${sy(p.y + 3)}" text-anchor="middle" fill="#416145">${p.name || p.id} · ${p.w}×${p.h}</text>`;
    });
    (concept.units || []).forEach((u) => {
      if (u.poly) s += polySvg(u.poly, 'house', u.name);
      else s += rect(u.x, u.y, u.w, u.h, 'house', u.name);
    });
    (concept.upperUnits || []).forEach((u) => {
      if (u.poly) s += polySvg(u.poly, 'upper', u.name);
      else s += rect(u.x, u.y, u.w, u.h, 'upper', u.name);
    });
    s += drive(concept.drive);
    (concept.accessPaths || []).forEach((ap) => {
      if (concept.drive && JSON.stringify(ap.path) === JSON.stringify(concept.drive)) return;
      s += drive(ap.path);
    });
    return s;
  }

  const G2_A = [[25, 10], [72, 10], [72, 22], [58, 22], [58, 35], [25, 35]];
  const G2_B = [[88, 10], [127, 10], [127, 33], [98, 33], [98, 22], [88, 22], [88, 10]];

  /**
   * Clear south inbound — northward curve off the y≈41 pinch, then y≈37 lane.
   * Safe CL ceiling along the flat south run is ~38.8′ for an 8′ FS-SUV.
   * IMPORTANT: do not run to x=15 then back east (polyline reversal). Continue west
   * along y≈37 only as far as the garage spur needs, then turn inland.
   */
  const CLEAR_SOUTH_CURVE = [
    [148, 44],
    [140, 42],
    [130, 39],
    [125, 37],
  ];
  /** Full clear run to west alley (when the spur truly continues at x≈15). */
  const CLEAR_SOUTH_INBOUND = [...CLEAR_SOUTH_CURVE, [15, 37]];

  /** Curve onto y≈37, then append spur points (no forced trip to x=15). */
  function clearSouthPath(...spur) {
    const tail = spur.map((p) => [...p]);
    if (!tail.length) return CLEAR_SOUTH_INBOUND.map((p) => [...p]);
    return [...CLEAR_SOUTH_CURVE.map((p) => [...p]), ...tail];
  }

  /** @deprecated use clearSouthPath — kept for call sites that append after [15,37]. */
  function clearSouthDrive(spur) {
    const tail = (spur || []).map((p) => [...p]);
    if (!tail.length) return CLEAR_SOUTH_INBOUND.map((p) => [...p]);
    if (tail[0][0] === 15 && Math.abs(tail[0][1] - 37) < 0.1) {
      return [...CLEAR_SOUTH_CURVE.map((p) => [...p]), ...tail];
    }
    return [...CLEAR_SOUTH_INBOUND.map((p) => [...p]), ...tail];
  }

  const CONCEPTS = {
    reference: { id: 'reference', label: 'Survey Reference', role: 'SOT base', group: 'sot' },
    e2: {
      id: 'e2',
      label: 'E2 Recessed Garage',
      role: 'Conventional benchmark',
      group: 'benchmark',
      firstFloorBenchmark: 900,
      designConcern: '900/910 SF lower split · safest conventional baseline',
      units: [
        { name: 'UNIT A · 900 SF', x: 83, y: 5, w: 45, h: 20, sf: 900 },
        {
          name: 'UNIT B · 910 SF',
          poly: [[25, 25], [127, 25], [127, 33], [72, 33], [72, 35], [25, 35]],
          sf: 910,
        },
      ],
      garages: [
        { name: 'GARAGE A · 22×22', x: 36, y: 8, w: 22, h: 22 },
        { name: 'GARAGE B · 22×22', x: 58, y: 8, w: 22, h: 22 },
      ],
      drivePinchFail: [[148, 41], [128, 41], [15, 41], [15, 12], [58, 12]],
      drive: clearSouthPath([15, 37], [15, 12], [58, 12]),
      clearSouthCorridor: true,
      second: 890,
    },
    g1: {
      id: 'g1',
      label: 'G1 Z-Duplex',
      role: 'Efficiency benchmark · Z-stagger interlock',
      group: 'benchmark',
      designConcern: 'Z-stagger interlock · party-wall / service core',
      units: [
        { name: 'UNIT A · 912 SF', x: 88, y: 5, w: 38, h: 24, sf: 912 },
        { name: 'UNIT B · 646 SF', x: 38, y: 18, w: 38, h: 16, sf: 608 },
      ],
      garages: [
        { name: 'GARAGE A · 22×22', x: 64, y: 5, w: 22, h: 22 },
        { name: 'GARAGE B · 22×22', x: 25, y: 16, w: 22, h: 22 },
      ],
      drivePinchFail: [[148, 41], [128, 41], [15, 41], [15, 12], [64, 12], [25, 12]],
      drive: clearSouthPath([15, 37], [15, 12], [64, 12], [25, 12]),
      clearSouthCorridor: true,
      second: 1054,
    },
    /**
     * G1-A — circulation proof only (not a candidate). Locked g1 untouched.
     * Proved east-facing tandem + y~37 south lane. See access_a skeleton.
     */
    g1a: {
      id: 'g1a',
      label: 'G1-A Circulation Proof',
      role: 'Proof of circulation rules · not a candidate',
      group: 'access-proof',
      circulationProof: true,
      designConcern: 'Proved east doors + south lane — houses were illustrative only',
      units: [
        { name: 'UNIT A · 440 SF', x: 82, y: 5, w: 20, h: 22, sf: 440 },
        { name: 'UNIT B · 506 SF', x: 25, y: 5, w: 46, h: 11, sf: 506 },
      ],
      garages: [
        { name: 'GARAGE A · 22×22', id: 'A', x: 102, y: 5, w: 22, h: 22, doorFace: 'E' },
        { name: 'GARAGE B · 22×22', id: 'B', x: 25, y: 16, w: 22, h: 22, doorFace: 'E' },
      ],
      drive: [[148, 37], [80, 37], [57.3, 27]],
      accessPaths: [
        { garage: 'A', path: [[148, 16], [134.3, 16]] },
        { garage: 'B', path: [[148, 37], [80, 37], [57.3, 27]] },
      ],
      court: [47, 21, 24, 12],
      second: 1327,
    },
    /** Parking Skeleton A/B/C — parking/circulation only (no houses).
     * Display names avoid “Access A/B/C” to prevent collision with J1’s locked Access A trail. */
    access_a: {
      id: 'access_a',
      label: 'Parking Skeleton A — East-Facing Tandem',
      role: 'Known-good parking skeleton (from G1-A / J1 Access A geometry)',
      group: 'parking-skeleton',
      skeleton: true,
      designConcern: 'Both doors east · A straight Penn · B via y~37 south lane · J1 trail called this Access A',
      units: [],
      garages: [
        { name: 'GARAGE A · 22×22', id: 'A', x: 102, y: 5, w: 22, h: 22, doorFace: 'E' },
        { name: 'GARAGE B · 22×22', id: 'B', x: 25, y: 16, w: 22, h: 22, doorFace: 'E' },
      ],
      drive: [[148, 37], [80, 37], [57.3, 27]],
      accessPaths: [
        { garage: 'A', path: [[148, 16], [134.3, 16]] },
        { garage: 'B', path: [[148, 37], [80, 37], [57.3, 27]] },
      ],
      court: [47, 21, 24, 12],
    },
    access_b: {
      id: 'access_b',
      label: 'Parking Skeleton B — Central Garage Core',
      role: 'H6 circulation stripped · no architecture',
      group: 'parking-skeleton',
      skeleton: true,
      designConcern: 'Paired 22×22 core (52,8)+(74,8) · both doors east',
      units: [],
      garages: [
        { name: 'GARAGE A · 22×22', id: 'A', x: 52, y: 8, w: 22, h: 22, doorFace: 'E' },
        { name: 'GARAGE B · 22×22', id: 'B', x: 74, y: 8, w: 22, h: 22, doorFace: 'E' },
      ],
      drive: [[148, 37], [106.25, 37], [106.25, 19]],
      accessPaths: [
        { garage: 'A', path: [[148, 19], [94.5, 19]] },
        { garage: 'B', path: [[148, 37], [106.25, 37], [106.25, 19]] },
      ],
    },
    access_c: {
      id: 'access_c',
      label: 'Parking Skeleton C — Split-Depth Garages',
      role: 'Penn garage + deeper rear/left garage',
      group: 'parking-skeleton',
      skeleton: true,
      designConcern: 'A at Penn (102,5) · B deeper (25,22) · same south lane',
      units: [],
      garages: [
        { name: 'GARAGE A · 22×22', id: 'A', x: 102, y: 5, w: 22, h: 22, doorFace: 'E' },
        { name: 'GARAGE B · 22×22', id: 'B', x: 25, y: 22, w: 22, h: 22, doorFace: 'E' },
      ],
      drive: [[148, 37], [80, 37], [57.3, 33]],
      accessPaths: [
        { garage: 'A', path: [[148, 16], [134.3, 16]] },
        { garage: 'B', path: [[148, 37], [80, 37], [57.3, 33]] },
      ],
      court: [47, 27, 24, 10],
    },
    /**
     * Parking Skeleton D — E1 Rear Stack (parking only).
     * Driveway fix: clear-south corridor + Penn mid-lane to eastern bay; western bay
     * via y≈37 then south-door approach (avoids sweeping through the other plate).
     */
    access_d: {
      id: 'access_d',
      label: 'Parking Skeleton D — E1 Rear Stack',
      role: 'CLOSED · physical FAIL (B staging 12′) · rear ribbon',
      group: 'parking-skeleton',
      skeleton: true,
      closed: true,
      circulationReference: false,
      sourceConcept: 'e1',
      designConcern: 'GA (80,5) door E via Penn mid-lane · GB (25,5) door S via clear-south · clip-free spurs · B staging hard FAIL',
      units: [],
      garages: [
        { name: 'GARAGE A · 22×22', id: 'A', x: 80, y: 5, w: 22, h: 22, doorFace: 'E' },
        { name: 'GARAGE B · 22×22', id: 'B', x: 25, y: 5, w: 22, h: 22, doorFace: 'S' },
      ],
      drivePinchFail: [[148, 41], [128, 41], [15, 41], [15, 38], [64, 38], [64, 27], [15, 38], [15, 12], [25, 12]],
      drive: [[148, 16], [120, 16], [102, 16]],
      accessPaths: [
        { garage: 'A', path: [[148, 16], [120, 16], [102, 16]] },
        { garage: 'B', path: clearSouthPath([90, 37], [55, 37], [36, 32]) },
      ],
      clearSouthCorridor: true,
    },
    /**
     * Parking Skeleton E — E3 Courtyard (parking only).
     * Driveway fix: split door faces (W + E after declared-S audit FAIL), open court,
     * Penn mid-lane to eastern bay + clear-south to western west door. Physical PASS.
     */
    access_e: {
      id: 'access_e',
      label: 'Parking Skeleton E — E3 Courtyard',
      role: 'CLOSED as layout · KEEP as circulation reference (physical PASS · declared W+E)',
      group: 'parking-skeleton',
      skeleton: true,
      closed: true,
      circulationReference: true,
      sourceConcept: 'e3',
      designConcern: 'GA (35,5) door W · GB (85,5) door E · 28′ court · clear-south + Penn mid-lane. Declared S on A fails staging (8′); reference is W+E.',
      units: [],
      court: [134, 10, 14, 22],
      garages: [
        { name: 'GARAGE A · 22×22', id: 'A', x: 35, y: 5, w: 22, h: 22, doorFace: 'W' },
        { name: 'GARAGE B · 22×22', id: 'B', x: 85, y: 5, w: 22, h: 22, doorFace: 'E' },
      ],
      drivePinchFail: [[148, 41], [134, 41], [115, 41], [15, 41], [15, 16], [48, 16]],
      /** Declared-S audit (superseded): S face clear staging 8′ / apron 22.4′ — hard FAIL. Kept for evidence. */
      declaredSouthAudit: {
        face: 'S',
        apronFt: 22.4,
        clearStagingFt: 8,
        result: 'FAIL — apron body off survey; < 20.5′ FS-SUV staging',
      },
      drive: [[148, 16], [120, 16], [107, 16]],
      accessPaths: [
        { garage: 'A', path: clearSouthPath([100, 37], [60, 37], [40, 27], [27, 16]) },
        { garage: 'B', path: [[148, 16], [120, 16], [107, 16]] },
      ],
      clearSouthCorridor: true,
    },
    /**
     * Parking Skeleton F — F1 Rear Motor Court (parking only).
     * Driveway fix: split door faces (S + E), space bays, Penn mid-lane to B,
     * clear-south to A south door — clears shared-wall / mutual clip failure.
     */
    access_f: {
      id: 'access_f',
      label: 'Parking Skeleton F — F1 Rear Motor Court',
      role: 'CLOSED · physical FAIL (A staging 12′) · rear ribbon',
      group: 'parking-skeleton',
      skeleton: true,
      closed: true,
      circulationReference: false,
      sourceConcept: 'f1',
      designConcern: 'GA (28,5) door S · GB (70,5) door E · clear-south + Penn mid-lane · A staging hard FAIL',
      units: [],
      garages: [
        { name: 'GARAGE A · 22×22', id: 'A', x: 28, y: 5, w: 22, h: 22, doorFace: 'S' },
        { name: 'GARAGE B · 22×22', id: 'B', x: 70, y: 5, w: 22, h: 22, doorFace: 'E' },
      ],
      drivePinchFail: [[148, 41], [128, 41], [15, 41], [15, 16], [28, 16]],
      drive: [[148, 16], [120, 16], [92, 16]],
      accessPaths: [
        { garage: 'A', path: clearSouthPath([120, 37], [90, 37], [60, 37], [39, 32]) },
        { garage: 'B', path: [[148, 16], [120, 16], [92, 16]] },
      ],
      clearSouthCorridor: true,
    },
    /**
     * Parking Reset R1 — Practical Pair (E circulation recipe).
     * Two ~14×24 singles (W+E) + two ~10×22 covered · 4 spaces / 2 enclosed.
     * Covered CB shares household-B east apron with GB (not simultaneous).
     */
    reset_r1: {
      id: 'reset_r1',
      label: 'Parking Reset R1 — Practical Pair',
      role: 'ACTIVE · Parking Reset Gate · priority 1',
      group: 'parking-reset',
      parkingReset: true,
      skeleton: true,
      closed: false,
      priority: 1,
      sourceRecipe: 'access_e',
      parkingProgram: {
        name: 'Practical Pair',
        spacesTotal: 4,
        spacesEnclosed: 2,
        note: 'Two single garages + two covered stalls (CB shares B east apron)',
      },
      designConcern: 'E recipe · GA/GB 14×24 W+E · CA west of A · CB east of B with shared apron · Penn mid-lane + clear-south',
      units: [],
      court: [134, 10, 14, 22],
      garages: [
        { name: 'COVERED A · 10×22', id: 'CA', x: 28, y: 5, w: 10, h: 22, doorFace: 'E', covered: true, enclosed: false, spaces: 1, apronIgnoreIds: ['A'] },
        { name: 'GARAGE A · 14×24', id: 'A', x: 72, y: 5, w: 14, h: 24, doorFace: 'W', enclosed: true, spaces: 1, apronIgnoreIds: ['CA'] },
        { name: 'GARAGE B · 14×24', id: 'B', x: 100, y: 5, w: 14, h: 24, doorFace: 'E', enclosed: true, spaces: 1, apronIgnoreIds: ['CB'] },
        { name: 'COVERED B · 10×22', id: 'CB', x: 110, y: 32, w: 10, h: 12, doorFace: 'E', covered: true, enclosed: false, spaces: 1, apronIgnoreIds: ['B'] },
      ],
      households: [
        { id: 'A', structures: ['A', 'CA'], label: 'Household A (west)' },
        { id: 'B', structures: ['B', 'CB'], label: 'Household B (east)' },
      ],
      drive: [[148, 16], [125, 16], [114, 16]],
      accessPaths: [
        { garage: 'A', path: clearSouthPath([115, 37], [85, 37], [72, 17]) },
        { garage: 'CA', path: clearSouthPath([115, 37], [70, 37], [50, 16]) },
        { garage: 'B', path: [[148, 16], [125, 16], [114, 16]] },
        { garage: 'CB', path: [[148, 16], [125, 16], [114, 16], [110, 28]] },
      ],
      clearSouthCorridor: true,
    },
    /**
     * Parking Reset R2 — Lift Pair (E recipe). Two 14×24 with two-car lifts · 4 enclosed.
     */
    reset_r2: {
      id: 'reset_r2',
      label: 'Parking Reset R2 — Lift Pair',
      role: 'ACTIVE · Parking Reset Gate · priority 2',
      group: 'parking-reset',
      parkingReset: true,
      skeleton: true,
      closed: false,
      priority: 2,
      sourceRecipe: 'access_e',
      parkingProgram: {
        name: 'Lift Pair',
        spacesTotal: 4,
        spacesEnclosed: 4,
        note: 'Two 14×24 garages · mechanical two-car lifts · height/cost trade',
      },
      designConcern: 'E recipe · GA/GB 14×24 W+E with lifts · court · Penn mid-lane + clear-south',
      units: [],
      court: [134, 10, 14, 22],
      garages: [
        { name: 'GARAGE A · 14×24 LIFT', id: 'A', x: 72, y: 5, w: 14, h: 24, doorFace: 'W', enclosed: true, lift: true, spaces: 2 },
        { name: 'GARAGE B · 14×24 LIFT', id: 'B', x: 102, y: 5, w: 14, h: 24, doorFace: 'E', enclosed: true, lift: true, spaces: 2 },
      ],
      households: [
        { id: 'A', structures: ['A'], label: 'Household A (west)' },
        { id: 'B', structures: ['B'], label: 'Household B (east)' },
      ],
      drive: [[148, 16], [125, 16], [116, 16]],
      accessPaths: [
        { garage: 'A', path: clearSouthPath([115, 37], [85, 37], [72, 17]) },
        { garage: 'B', path: [[148, 16], [125, 16], [116, 16]] },
      ],
      clearSouthCorridor: true,
    },
    /**
     * Parking Reset R3 — Dual Tandem (E recipe). Two ~16×36 tandem (≈14×46 intent, fit setback).
     */
    reset_r3: {
      id: 'reset_r3',
      label: 'Parking Reset R3 — Dual Tandem',
      role: 'ACTIVE · Parking Reset Gate · priority 4',
      group: 'parking-reset',
      parkingReset: true,
      skeleton: true,
      closed: false,
      priority: 4,
      sourceRecipe: 'access_e',
      parkingProgram: {
        name: 'Dual Tandem',
        spacesTotal: 4,
        spacesEnclosed: 4,
        note: 'Two 16×36 tandem boxes (shortened from ~14×46 to fit Penn setback)',
      },
      designConcern: 'E recipe · tandem W+E · blocking / long-box test · Penn mid-lane + clear-south',
      units: [],
      court: [134, 10, 14, 22],
      garages: [
        { name: 'GARAGE A · 16×36 TANDEM', id: 'A', x: 48, y: 5, w: 36, h: 16, doorFace: 'W', enclosed: true, tandem: true, spaces: 2 },
        { name: 'GARAGE B · 16×36 TANDEM', id: 'B', x: 96, y: 5, w: 32, h: 16, doorFace: 'E', enclosed: true, tandem: true, spaces: 2 },
      ],
      households: [
        { id: 'A', structures: ['A'], label: 'Household A (west)' },
        { id: 'B', structures: ['B'], label: 'Household B (east)' },
      ],
      drive: [[148, 16], [135, 16], [128, 13]],
      accessPaths: [
        { garage: 'A', path: clearSouthPath([110, 37], [70, 37], [42, 27], [42, 13]) },
        { garage: 'B', path: [[148, 16], [135, 16], [128, 13]] },
      ],
      clearSouthCorridor: true,
    },
    /**
     * Parking Reset R4 — Hybrid (E recipe). Two-car + single + covered · 4 spaces / 3 enclosed.
     */
    reset_r4: {
      id: 'reset_r4',
      label: 'Parking Reset R4 — Hybrid',
      role: 'ACTIVE · Parking Reset Gate · priority 3',
      group: 'parking-reset',
      parkingReset: true,
      skeleton: true,
      closed: false,
      priority: 3,
      sourceRecipe: 'access_e',
      parkingProgram: {
        name: 'Hybrid',
        spacesTotal: 4,
        spacesEnclosed: 3,
        note: 'One 22×22 two-car + one 14×24 single + one 10×22 covered',
      },
      designConcern: 'E recipe · asymmetric · GB two-car E · GA single W · CA west covered · Penn mid-lane + clear-south',
      units: [],
      court: [134, 10, 14, 22],
      garages: [
        { name: 'COVERED A · 10×22', id: 'CA', x: 28, y: 5, w: 10, h: 22, doorFace: 'E', covered: true, enclosed: false, spaces: 1, apronIgnoreIds: ['A'] },
        { name: 'GARAGE A · 14×24', id: 'A', x: 72, y: 5, w: 14, h: 24, doorFace: 'W', enclosed: true, spaces: 1, apronIgnoreIds: ['CA'] },
        { name: 'GARAGE B · 22×22', id: 'B', x: 100, y: 5, w: 22, h: 22, doorFace: 'E', enclosed: true, spaces: 2 },
      ],
      households: [
        { id: 'A', structures: ['A', 'CA'], label: 'Household A (west)' },
        { id: 'B', structures: ['B'], label: 'Household B (east · two-car)' },
      ],
      drive: [[148, 16], [128, 16], [122, 16]],
      accessPaths: [
        { garage: 'A', path: clearSouthPath([115, 37], [85, 37], [72, 17]) },
        { garage: 'CA', path: clearSouthPath([115, 37], [70, 37], [50, 16]) },
        { garage: 'B', path: [[148, 16], [128, 16], [122, 16]] },
      ],
      clearSouthCorridor: true,
    },
    /**
     * Parking Reset R6 — Integrated Lift Pair (CONDITIONAL).
     * First viable working geometry — NOT a full Parking Reset PASS.
     * Open: (1) 12×20 bay < 20.5′ vehicle (2) ~14–17′ tangent < 25′ FS-SUV.
     * Hardening continues as R6.1.
     */
    reset_r6: {
      id: 'reset_r6',
      label: 'Parking Reset R6 — Integrated Lift Pair',
      role: 'CONDITIONAL · First viable working geometry · not full PASS',
      group: 'parking-reset-integrated',
      parkingReset: true,
      parkingIntegrated: true,
      sharedSpine: true,
      skeleton: true,
      closed: false,
      workingOption: true,
      conditional: true,
      priority: 1,
      track: 'integrated',
      openIssues: [
        'Bay envelope 12×20 cannot contain 20.5′ FS-SUV + lift clearances — need tested 12×22–24 (door face ≥16′)',
        'Shared-spine 90° fillet ~14–17′ < established 25′ FS-SUV tangent — needs revised fillet or swept-path close, not REVIEW waiver',
      ],
      parkingProgram: {
        name: 'Integrated Lift Pair (conditional)',
        spacesTotal: 4,
        spacesEnclosed: 4,
        note: 'One lift bay beneath each reserved home plate · shared south spine — bay length + fillet still open',
      },
      designConcern: 'Plates ~22′ / ~1012–1056 SF work under integrated math. Bay depth and 25′ fillet remain open — CONDITIONAL only.',
      units: [],
      reservedPlates: [
        { id: 'B', role: 'rear', name: 'HOME PLATE B · rear', x: 28, y: 5, w: 48, h: 22 },
        { id: 'A', role: 'penn', name: 'HOME PLATE A · Penn', x: 80, y: 5, w: 46, h: 22 },
      ],
      garages: [
        { name: 'GARAGE B · 12×20 LIFT', id: 'B', x: 64, y: 5, w: 12, h: 20, doorFace: 'E', enclosed: true, lift: true, spaces: 2 },
        { name: 'GARAGE A · 12×20 LIFT', id: 'A', x: 114, y: 5, w: 12, h: 20, doorFace: 'E', enclosed: true, lift: true, spaces: 2 },
      ],
      households: [
        { id: 'B', structures: ['B'], label: 'Household B (rear)' },
        { id: 'A', structures: ['A'], label: 'Household A (Penn)' },
      ],
      drive: [[148, 32], [125, 32], [100, 32]],
      accessPaths: [
        { garage: 'A', path: [[148, 32], [128, 32], [128, 15]] },
        { garage: 'B', path: [[148, 32], [125, 32], [82, 32], [82, 15]] },
      ],
      clearSouthCorridor: true,
    },
    /**
     * Parking Reset R6.1 — harden R6: 16×24 lift envelopes (FS-SUV depth), same plates.
     * Full PASS only if bayDepth + FS-SUV technical PASS (25′ tangents, no off-lot).
     */
    reset_r6_1: {
      id: 'reset_r6_1',
      label: 'Parking Reset R6.1 — Lift Bay Hardening',
      role: 'LEADING CONDITIONAL · bay depth closed · fillet still open · superseded approach = R6.2',
      group: 'parking-reset-integrated',
      parkingReset: true,
      parkingIntegrated: true,
      sharedSpine: true,
      skeleton: true,
      closed: false,
      parentReset: 'reset_r6',
      priority: 0,
      workingOption: true,
      conditional: true,
      track: 'integrated',
      parkingProgram: {
        name: 'Integrated Lift Pair · hardened bay',
        spacesTotal: 4,
        spacesEnclosed: 4,
        note: '16×24 lift envelope per plate (16′ door face · 24′ depth ≥ 20.5′ FS-SUV + lift margin) · same ~22′ plates',
      },
      designConcern: 'Preserve ≥18′ plates. Bay depth closed. Under validation closure: dual-elevation straights (axle-relative body) · fillet family deferred to R6.2A. Fillet/daily still CONDITIONAL — no waiver.',
      units: [],
      reservedPlates: [
        { id: 'B', role: 'rear', name: 'HOME PLATE B · rear', x: 28, y: 5, w: 48, h: 28 },
        { id: 'A', role: 'penn', name: 'HOME PLATE A · Penn', x: 80, y: 5, w: 46, h: 20 },
      ],
      garages: [
        { name: 'GARAGE B · 16×24 LIFT', id: 'B', x: 46, y: 18, w: 24, h: 16, doorFace: 'E', enclosed: true, lift: true, spaces: 2 },
        { name: 'GARAGE A · 16×24 LIFT', id: 'A', x: 102, y: 5, w: 24, h: 16, doorFace: 'E', enclosed: true, lift: true, spaces: 2 },
      ],
      households: [
        { id: 'B', structures: ['B'], label: 'Household B (rear)' },
        { id: 'A', structures: ['A'], label: 'Household A (Penn)' },
      ],
      /** Parallel E straights — axle-correct body cannot hold the old y=32 south 90° on-lot. */
      drive: [[148, 28], [120, 28]],
      accessPaths: [
        { garage: 'A', path: [[148, 13], [140, 13], [128, 13]] },
        { garage: 'B', path: [[148, 28], [125, 28], [100, 28], [78, 28]] },
      ],
      clearSouthCorridor: true,
    },
    /**
     * Parking Reset R6.2 — front-zone approach relocation (not another 19′ fillet nudge).
     * Curve develops near Pennsylvania before plates; long straight E approaches to 16′ doors.
     * Plates spend width reserve to ~20′ (≥18′ locked min). Bay depth stays 16×24.
     * polygonalSweep: score vehicle envelope poses; CONDITIONAL until ≥25′ / clear sweep.
     */
    reset_r6_2: {
      id: 'reset_r6_2',
      label: 'Parking Reset R6.2 — Front-Zone Approach',
      role: 'BASELINE · Front-zone attempt · superseded by R6.2A for active arc work',
      group: 'parking-reset-integrated',
      parkingReset: true,
      parkingIntegrated: true,
      sharedSpine: true,
      polygonalSweep: true,
      skeleton: true,
      closed: false,
      parentReset: 'reset_r6_1',
      priority: 1,
      track: 'integrated',
      parkingProgram: {
        name: 'Integrated Lift Pair · front-zone approach',
        spacesTotal: 4,
        spacesEnclosed: 4,
        note: '16×24 lift bays · ~20′ plates · A mid-straight at door Y · B south lane after front-zone entry',
      },
      designConcern: 'Move transition into wider Penn/front zone; spend plate width to ~20′ (≥18′). Do not micro-adjust the old 19′ fillet. Swept envelope still must clear 25′ / on-lot for FULL PASS.',
      units: [],
      reservedPlates: [
        { id: 'B', role: 'rear', name: 'HOME PLATE B · rear', x: 28, y: 5, w: 48, h: 20 },
        { id: 'A', role: 'penn', name: 'HOME PLATE A · Penn', x: 80, y: 5, w: 46, h: 20 },
      ],
      garages: [
        { name: 'GARAGE B · 16×24 LIFT', id: 'B', x: 40, y: 5, w: 24, h: 16, doorFace: 'E', enclosed: true, lift: true, spaces: 2 },
        { name: 'GARAGE A · 16×24 LIFT', id: 'A', x: 102, y: 5, w: 24, h: 16, doorFace: 'E', enclosed: true, lift: true, spaces: 2 },
      ],
      households: [
        { id: 'B', structures: ['B'], label: 'Household B (rear)' },
        { id: 'A', structures: ['A'], label: 'Household A (Penn)' },
      ],
      /** Shared Penn opening; A stays on door-elevation straight; B holds south lane until west of A. */
      drive: [[148, 28], [130, 28], [128, 13]],
      accessPaths: [
        { garage: 'A', path: [[148, 13], [140, 13], [130, 13], [128, 13]] },
        { garage: 'B', path: [[148, 34], [125, 34], [91, 34], [66, 34], [66, 13]] },
      ],
      clearSouthCorridor: true,
    },
    /**
     * Parking Reset R6.2A — longer 25′ centerline arc + localized corner flare (not full-drive widen).
     * Recover ~4′ turning development: plates →18′ · bend toward Penn/front · south lane y≈36 ·
     * vertical leg ≥25′ into door band. Spine stays ~12′; flare 16–18′ at arc only.
     */
    reset_r6_2a: {
      id: 'reset_r6_2a',
      label: 'Parking Reset R6.2A — 25′ Arc + Corner Flare',
      role: 'CLOSED FAIL · curved-driveway work stopped · axle body off-lot on south arc',
      group: 'parking-reset-integrated',
      parkingReset: true,
      parkingIntegrated: true,
      sharedSpine: true,
      polygonalSweep: true,
      skeleton: true,
      closed: true,
      closedReason: 'Validation closure: axle-relative FS-SUV leaves lot on 25′ south arc. No more curve optimization.',
      parentReset: 'reset_r6_2',
      priority: 99,
      track: 'integrated',
      spineWidth: 12,
      designRadius: 25,
      turnFlare: { width: 17, note: '16–18′ pavement at 25′ arc only — not full spine widen' },
      parkingProgram: {
        name: 'Integrated Lift Pair · 25′ arc approach',
        spacesTotal: 4,
        spacesEnclosed: 4,
        note: '16×24 lifts · ≥18′ plates · ≥25′ straight before arc · continuous 25′ centerline radius · corner flare ~17′',
      },
      designConcern: 'Turn geometry not driveway width. Under validation closure: Penn plate ≤ x=128; axle-relative body. Current south 90° arc fails on-lot front-swing — CONDITIONAL/FAIL until arc relocates or R6.4 wins.',
      units: [],
      reservedPlates: [
        { id: 'B', role: 'rear', name: 'HOME PLATE B · rear', x: 28, y: 5, w: 48, h: 18 },
        { id: 'A', role: 'penn', name: 'HOME PLATE A · Penn', x: 84, y: 5, w: 44, h: 18 },
      ],
      garages: [
        { name: 'GARAGE B · 16×24 LIFT', id: 'B', x: 40, y: 5, w: 24, h: 16, doorFace: 'E', enclosed: true, lift: true, spaces: 2 },
        { name: 'GARAGE A · 16×24 LIFT', id: 'A', x: 102, y: 5, w: 24, h: 16, doorFace: 'E', enclosed: true, lift: true, spaces: 2 },
      ],
      households: [
        { id: 'B', structures: ['B'], label: 'Household B (rear)' },
        { id: 'A', structures: ['A'], label: 'Household A (Penn)' },
      ],
      /** Arc retained as experiment; axle-correct body currently leaves survey on this corner. */
      drive: [[148, 36], [123, 36], [90, 36]],
      accessPaths: [
        { garage: 'A', path: [[148, 13], [140, 13], [130, 13], [128, 13]] },
        { garage: 'B', path: [[148, 36], [123, 36], [90, 36], [90, 11]] },
      ],
      clearSouthCorridor: true,
      openIssues: [
        'Axle-relative FS-SUV body leaves lot on 25′ south arc — relocate arc or prefer R6.4 straights',
      ],
    },
    /**
     * Parking Reset R6.4 — Straight-Spine Doors (eliminate B’s 90°).
     * Both doors east at bay east ends; A on mid-elevation straight; B on parallel south straight
     * (staggered in Y so B does not drive through A). Trades turn for long reverse-out / shared-opening conflict.
     */
    reset_r6_4: {
      id: 'reset_r6_4',
      label: 'Parking Reset R6.4 — Straight-Spine Doors',
      role: 'REPAIR — DAILY POOR · straight-spine works · deep turnaround + lift retrieval open',
      group: 'parking-reset-integrated',
      parkingReset: true,
      parkingIntegrated: true,
      sharedSpine: true,
      polygonalSweep: true,
      skeleton: true,
      closed: false,
      repairable: true,
      repairStatus: 'DAILY POOR',
      parentReset: 'reset_r6_2',
      priority: 3,
      track: 'integrated',
      footprintsFrozen: true,
      spineWidth: 12,
      parkingProgram: {
        name: 'Integrated Lift Pair · straight-spine doors',
        spacesTotal: 4,
        spacesEnclosed: 4,
        note: 'REPAIR branch: R6.4A turn pocket · R6.4B lift equipment · R6.4C back-in ops',
      },
      designConcern: 'Straight-spine geometry works; deep-household turnaround and independent lift retrieval remain unresolved. Apply repair-before-close.',
      units: [],
      reservedPlates: [
        { id: 'B', role: 'rear', name: 'HOME PLATE B · rear', x: 28, y: 5, w: 48, h: 28 },
        { id: 'A', role: 'penn', name: 'HOME PLATE A · Penn', x: 80, y: 5, w: 46, h: 20 },
      ],
      garages: [
        { name: 'GARAGE B · 16×24 LIFT', id: 'B', x: 40, y: 20, w: 24, h: 16, doorFace: 'E', enclosed: true, lift: true, spaces: 2 },
        { name: 'GARAGE A · 16×24 LIFT', id: 'A', x: 102, y: 5, w: 24, h: 16, doorFace: 'E', enclosed: true, lift: true, spaces: 2 },
      ],
      households: [
        { id: 'B', structures: ['B'], label: 'Household B (rear)' },
        { id: 'A', structures: ['A'], label: 'Household A (Penn)' },
      ],
      drive: [[148, 28], [120, 28]],
      accessPaths: [
        { garage: 'A', path: [[148, 13], [140, 13], [130, 13], [128, 13]] },
        { garage: 'B', path: [[148, 28], [125, 28], [100, 28], [80, 28], [66, 28]] },
      ],
      clearSouthCorridor: true,
      openIssues: [
        'B reverse ~84′ to Penn — REPAIR via R6.4A midpoint turn pocket',
        'Conventional lift = stacked retrieval — REPAIR via R6.4B independent equipment',
      ],
    },
    /**
     * R6.4A — Midpoint turn pocket (repair of R6.4 daily reverse).
     * B reverses only to pocket, one controlled maneuver, exits Pennsylvania forward.
     */
    reset_r6_4a: {
      id: 'reset_r6_4a',
      label: 'Parking Reset R6.4A — Midpoint Turn Pocket',
      role: 'ACTIVE REPAIR · R6.4 branch · hammerhead between plates',
      group: 'parking-reset-integrated',
      parkingReset: true,
      parkingIntegrated: true,
      sharedSpine: true,
      polygonalSweep: true,
      skeleton: true,
      closed: false,
      repairable: true,
      parentReset: 'reset_r6_4',
      priority: 2,
      track: 'integrated',
      turnPocket: true,
      spineWidth: 12,
      parkingProgram: {
        name: 'Integrated Lift Pair · turn pocket',
        spacesTotal: 4,
        spacesEnclosed: 4,
        note: 'Same 16×24 lifts as R6.4 · localized hammerhead near plate gap · B forward-exit to Penn',
      },
      designConcern: 'Smallest geometric repair for 84′ reverse. Pocket must stay in survey; plates ≥18′ after notch; no A approach interference; axle-correct sweep.',
      units: [],
      reservedPlates: [
        { id: 'B', role: 'rear', name: 'HOME PLATE B · rear', x: 28, y: 5, w: 48, h: 28 },
        { id: 'A', role: 'penn', name: 'HOME PLATE A · Penn', x: 80, y: 5, w: 46, h: 20 },
      ],
      garages: [
        { name: 'GARAGE B · 16×24 LIFT', id: 'B', x: 40, y: 20, w: 24, h: 16, doorFace: 'E', enclosed: true, lift: true, spaces: 2 },
        { name: 'GARAGE A · 16×24 LIFT', id: 'A', x: 102, y: 5, w: 24, h: 16, doorFace: 'E', enclosed: true, lift: true, spaces: 2 },
      ],
      households: [
        { id: 'B', structures: ['B'], label: 'Household B (rear)' },
        { id: 'A', structures: ['A'], label: 'Household A (Penn)' },
      ],
      /** Drive includes pocket spur so notched plate math sees the pavement. */
      drive: [[148, 28], [100, 28], [82, 28], [82, 31], [94, 31]],
      accessPaths: [
        { garage: 'A', path: [[148, 13], [140, 13], [130, 13], [128, 13]] },
        {
          garage: 'B',
          path: [[148, 28], [125, 28], [100, 28], [80, 28], [66, 28]],
          forwardExit: true,
          /** Shallow pocket (axle ≤32′) — body+6.25′ must stay inside south survey. */
          outbound: [
            [66, 28],
            [82, 28],
            [82, 31],
            [94, 31],
            [94, 28],
            [120, 28],
            [148, 28],
          ],
        },
      ],
      clearSouthCorridor: true,
      openIssues: [
        'Lift retrieval still stacked unless R6.4B independent equipment',
        'Pocket turn must clear 25′ FS-SUV tangents without clipping A apron',
      ],
    },
    /**
     * R6.4B — same geometry as R6.4; lift equipment interpretation only.
     * Conventional stacked vs pit/puzzle independent retrieval.
     */
    reset_r6_4b: {
      id: 'reset_r6_4b',
      label: 'Parking Reset R6.4B — Independent Lift Equipment',
      role: 'ACTIVE REPAIR · R6.4 branch · equipment interpretation (same 16×24 envelope)',
      group: 'parking-reset-integrated',
      parkingReset: true,
      parkingIntegrated: true,
      sharedSpine: true,
      polygonalSweep: true,
      skeleton: true,
      closed: false,
      repairable: true,
      parentReset: 'reset_r6_4',
      priority: 2,
      track: 'integrated',
      liftInterpretation: 'independent',
      parkingProgram: {
        name: 'Integrated Lift Pair · independent retrieval equipment',
        spacesTotal: 4,
        spacesEnclosed: 4,
        note: 'Geometry = R6.4 · assumes pit/puzzle lift with independent retrieval in same 16×24 · cost/excavation/structure burden ownership',
      },
      designConcern: 'Do not let stacked capacity masquerade as independent. Independent system may PASS daily S5; still needs R6.4A for reverse unless paired.',
      units: [],
      reservedPlates: [
        { id: 'B', role: 'rear', name: 'HOME PLATE B · rear', x: 28, y: 5, w: 48, h: 28 },
        { id: 'A', role: 'penn', name: 'HOME PLATE A · Penn', x: 80, y: 5, w: 46, h: 20 },
      ],
      garages: [
        { name: 'GARAGE B · 16×24 LIFT IND', id: 'B', x: 40, y: 20, w: 24, h: 16, doorFace: 'E', enclosed: true, lift: true, liftIndependent: true, spaces: 2 },
        { name: 'GARAGE A · 16×24 LIFT IND', id: 'A', x: 102, y: 5, w: 24, h: 16, doorFace: 'E', enclosed: true, lift: true, liftIndependent: true, spaces: 2 },
      ],
      households: [
        { id: 'B', structures: ['B'], label: 'Household B (rear)' },
        { id: 'A', structures: ['A'], label: 'Household A (Penn)' },
      ],
      drive: [[148, 28], [120, 28]],
      accessPaths: [
        { garage: 'A', path: [[148, 13], [140, 13], [130, 13], [128, 13]] },
        { garage: 'B', path: [[148, 28], [125, 28], [100, 28], [80, 28], [66, 28]] },
      ],
      clearSouthCorridor: true,
    },
    /**
     * Parking Reset R6.3 — two curb cuts (jurisdiction-dependent fallback).
     * Hold only if it materially shortens B’s reverse / changes lift retrieval.
     */
    reset_r6_3: {
      id: 'reset_r6_3',
      label: 'Parking Reset R6.3 — Two Curb Cuts',
      role: 'AHJ FALLBACK · hold only if it shortens B reverse / changes lift retrieval — not for curb cuts alone',
      group: 'parking-reset-integrated',
      parkingReset: true,
      parkingIntegrated: true,
      sharedSpine: false,
      dualCurbCut: true,
      polygonalSweep: true,
      skeleton: true,
      closed: false,
      parentReset: 'reset_r6_2',
      priority: 5,
      track: 'integrated',
      parkingProgram: {
        name: 'Integrated Lift Pair · dual curb cut',
        spacesTotal: 4,
        spacesEnclosed: 4,
        note: 'Same 16×24 bays / ~20′ plates · two independent Penn curb cuts · long E straights',
      },
      designConcern: 'Fallback if R6.2 shared opening cannot clear swept path. Requires AHJ acceptance of two curb cuts on Pennsylvania.',
      units: [],
      reservedPlates: [
        { id: 'B', role: 'rear', name: 'HOME PLATE B · rear', x: 28, y: 5, w: 48, h: 20 },
        { id: 'A', role: 'penn', name: 'HOME PLATE A · Penn', x: 80, y: 5, w: 46, h: 20 },
      ],
      garages: [
        { name: 'GARAGE B · 16×24 LIFT', id: 'B', x: 40, y: 5, w: 24, h: 16, doorFace: 'E', enclosed: true, lift: true, spaces: 2 },
        { name: 'GARAGE A · 16×24 LIFT', id: 'A', x: 102, y: 5, w: 24, h: 16, doorFace: 'E', enclosed: true, lift: true, spaces: 2 },
      ],
      households: [
        { id: 'B', structures: ['B'], label: 'Household B (rear)' },
        { id: 'A', structures: ['A'], label: 'Household A (Penn)' },
      ],
      drive: [[148, 13], [130, 13]],
      accessPaths: [
        { garage: 'A', path: [[148, 13], [140, 13], [130, 13], [128, 13]] },
        { garage: 'B', path: [[148, 28], [140, 28], [120, 28], [91, 28], [66, 28], [66, 13]] },
      ],
      clearSouthCorridor: true,
    },
    /**
     * Parking Reset R5 — Integrated Practical Pair (priority 2).
     * Same plates/spine as R6 · single bay + covered per home · 4 spaces / 2 enclosed.
     */
    reset_r5: {
      id: 'reset_r5',
      label: 'Parking Reset R5 — Integrated Practical Pair',
      role: 'FULL PASS parking · R5.1e approved duplex base · exact plans',
      workingOption: true,
      fullPass: true,
      r51eDuplexBase: true,
      group: 'parking-reset-integrated',
      parkingReset: true,
      parkingIntegrated: true,
      sharedSpine: true,
      polygonalSweep: true,
      skeleton: true,
      closed: false,
      priority: 1,
      track: 'integrated',
      boundaryClearanceFt: 0.75,
      parkingProgram: {
        name: 'Integrated Practical Pair',
        spacesTotal: 4,
        spacesEnclosed: 2,
        note: 'One 16×24 garage + one covered bay per home · independent retrieval · north pocket forward-exit',
      },
      designConcern: 'Outbound centerline repair: north-of-spine pocket (south 90° illegal for axle-body). Posts + snow edge as obstacles. FULL PASS → public lead + architecture.',
      units: [],
      reservedPlates: [
        { id: 'B', role: 'rear', name: 'HOME PLATE B · rear', x: 28, y: 5, w: 42, h: 28 },
        { id: 'A', role: 'penn', name: 'HOME PLATE A · Penn', x: 70, y: 5, w: 56, h: 22.5 },
      ],
      garages: [
        { name: 'COVERED B · 12×14', id: 'CB', x: 28, y: 20, w: 12, h: 14, doorFace: 'S', covered: true, enclosed: false, spaces: 1, apronIgnoreIds: ['B'] },
        { name: 'GARAGE B · 16×24', id: 'B', x: 42, y: 20, w: 24, h: 16, doorFace: 'E', enclosed: true, spaces: 1, apronIgnoreIds: ['CB'] },
        { name: 'COVERED A · 12×14', id: 'CA', x: 86, y: 5, w: 12, h: 14, doorFace: 'S', covered: true, enclosed: false, spaces: 1, apronIgnoreIds: ['A'] },
        { name: 'GARAGE A · 16×24', id: 'A', x: 100, y: 5, w: 24, h: 16, doorFace: 'E', enclosed: true, spaces: 1, apronIgnoreIds: ['CA'] },
      ],
      households: [
        { id: 'B', structures: ['B', 'CB'], label: 'Household B (rear)' },
        { id: 'A', structures: ['A', 'CA'], label: 'Household A (Penn)' },
      ],
      drive: [[148, 28], [125, 28], [106, 28], [100, 27], [94, 26.5], [86, 27], [80, 28]],
      accessPaths: [
        { garage: 'A', path: [[148, 13], [140, 13], [130, 13], [126, 13]] },
        {
          garage: 'B',
          path: [[148, 28], [125, 28], [100, 28], [80, 28], [68, 28]],
          forwardExit: true,
          outbound: [
            [68, 28],
            [80, 28],
            [86, 27],
            [94, 26.5],
            [100, 27],
            [106, 28],
            [125, 28],
            [148, 28],
          ],
        },
      ],
      siteObstacles: [
        {
          id: 'snow_south',
          label: 'SNOW EDGE · south windrow',
          kind: 'snow',
          poly: [[60, 41.5], [120, 41.5], [120, 43], [60, 43]],
        },
        {
          id: 'curb_penn_n',
          label: 'CURB · Pennsylvania north',
          kind: 'curb',
          poly: [[147.2, 0], [148, 0], [148, 8], [147.2, 8]],
        },
        {
          id: 'curb_penn_s',
          label: 'CURB · Pennsylvania south',
          kind: 'curb',
          poly: [[147.2, 36], [148, 36], [148, 46], [147.2, 46]],
        },
      ],
      clearSouthCorridor: true,
      openIssues: [],
    },
    /**
     * Parking Reset R7 — Integrated Tandem Pair (priority 3).
     */
    reset_r7: {
      id: 'reset_r7',
      label: 'Parking Reset R7 — Integrated Tandem Pair',
      role: 'QUEUED · Integrated track · priority 3',
      group: 'parking-reset-integrated',
      parkingReset: true,
      parkingIntegrated: true,
      sharedSpine: true,
      skeleton: true,
      closed: false,
      priority: 3,
      track: 'integrated',
      parkingProgram: {
        name: 'Integrated Tandem Pair',
        spacesTotal: 4,
        spacesEnclosed: 4,
        note: 'One 16×36 tandem (rear) + one 16×24 (Penn) · staging clearance between plates',
      },
      designConcern: 'Longer plates · tandem depth along X · shared south spine',
      units: [],
      reservedPlates: [
        { id: 'B', role: 'rear', name: 'HOME PLATE B · rear', x: 28, y: 5, w: 52, h: 20 },
        { id: 'A', role: 'penn', name: 'HOME PLATE A · Penn', x: 86, y: 5, w: 40, h: 20 },
      ],
      garages: [
        { name: 'GARAGE B · 16×36 TANDEM', id: 'B', x: 28, y: 5, w: 36, h: 16, doorFace: 'E', enclosed: true, tandem: true, spaces: 2 },
        { name: 'GARAGE A · 16×24 TANDEM', id: 'A', x: 102, y: 5, w: 24, h: 16, doorFace: 'E', enclosed: true, tandem: true, spaces: 2 },
      ],
      households: [
        { id: 'B', structures: ['B'], label: 'Household B (rear)' },
        { id: 'A', structures: ['A'], label: 'Household A (Penn)' },
      ],
      drive: [[148, 34], [125, 34]],
      accessPaths: [
        { garage: 'A', path: [[148, 13], [140, 13], [128, 13]] },
        { garage: 'B', path: [[148, 34], [125, 34], [91, 34], [66, 34], [66, 13]] },
      ],
      clearSouthCorridor: true,
    },
    /**
     * Parking Reset R8 — Carriage-Hinge Pair (priority 4). H2/G2 interlocking plates + compact integrated parking.
     */
    reset_r8: {
      id: 'reset_r8',
      label: 'Parking Reset R8 — Carriage-Hinge Pair',
      role: 'QUEUED · Integrated track · priority 4',
      group: 'parking-reset-integrated',
      parkingReset: true,
      parkingIntegrated: true,
      sharedSpine: true,
      skeleton: true,
      closed: false,
      priority: 4,
      track: 'integrated',
      sourceConcept: 'h2',
      parkingProgram: {
        name: 'Carriage-Hinge Pair',
        spacesTotal: 4,
        spacesEnclosed: 4,
        note: 'Interlocking plates (H2/G2 family) · 16×24 lifts at hinge',
      },
      designConcern: 'Interlock along depth · shared south spine · plates reserved not house-massed',
      units: [],
      reservedPlates: [
        { id: 'B', role: 'rear', name: 'HOME PLATE B · rear hinge', x: 28, y: 5, w: 44, h: 20 },
        { id: 'A', role: 'penn', name: 'HOME PLATE A · Penn hinge', x: 70, y: 5, w: 56, h: 20 },
      ],
      garages: [
        { name: 'GARAGE B · 16×24 LIFT', id: 'B', x: 40, y: 5, w: 24, h: 16, doorFace: 'E', enclosed: true, lift: true, spaces: 2 },
        { name: 'GARAGE A · 16×24 LIFT', id: 'A', x: 102, y: 5, w: 24, h: 16, doorFace: 'E', enclosed: true, lift: true, spaces: 2 },
      ],
      households: [
        { id: 'B', structures: ['B'], label: 'Household B (rear)' },
        { id: 'A', structures: ['A'], label: 'Household A (Penn)' },
      ],
      drive: [[148, 34], [125, 34]],
      accessPaths: [
        { garage: 'A', path: [[148, 13], [140, 13], [128, 13]] },
        { garage: 'B', path: [[148, 34], [125, 34], [91, 34], [66, 34], [66, 13]] },
      ],
      clearSouthCorridor: true,
    },
    /**
     * Archived experimental mews (pre-E1 D). Kept for reference; not in ACCESS_SKELETONS.
     */
    access_d_mews: {
      id: 'access_d_mews',
      label: 'Parking Skeleton D-mews (archive) — Rear Facing Court',
      role: 'Archive · facing mews experiment before E1-derived D',
      group: 'parking-skeleton-archive',
      skeleton: true,
      designConcern: 'Archive only — mid-lot path clipped GB; south lane pinch',
      units: [],
      garages: [
        { name: 'GARAGE A · 22×22', id: 'A', x: 25, y: 8, w: 22, h: 22, doorFace: 'E' },
        { name: 'GARAGE B · 22×22', id: 'B', x: 90, y: 8, w: 22, h: 22, doorFace: 'W' },
      ],
      drive: [[148, 19], [68.5, 19]],
      accessPaths: [
        { garage: 'A', path: [[148, 19], [68.5, 19], [47, 19]] },
        { garage: 'B', path: [[148, 19], [90, 19]] },
      ],
      court: [47, 8, 43, 22],
    },
    /**
     * J1 — Pennsylvania Loft Duplex · Pass 2A massing on locked Access A.
     * Parking owns the ground plane; residential = ground pod + LOG upper.
     */
    j1a: {
      id: 'j1a',
      label: 'J1-A · LOG Bridge',
      role: 'Pass 2A · continuous upper bridge over both garages',
      group: 'j1-massing',
      family: 'j1',
      treatment: 'bridge',
      skeletonRef: 'access_a',
      designConcern: 'Single upper bridge reads as one loft bar from Penn; ground pods are entry/living anchors only',
      units: [
        { name: 'GROUND A · 528 SF', unit: 'A', x: 78, y: 5, w: 24, h: 22, sf: 528 },
        { name: 'GROUND B · 396 SF', unit: 'B', x: 25, y: 5, w: 22, h: 18, sf: 396 },
      ],
      upperUnits: [
        { name: 'UPPER A · LOG 1,127 SF', unit: 'A', poly: [[78, 5], [127, 5], [127, 28], [78, 28]], sf: 1127 },
        { name: 'UPPER B · LOG 1,204 SF', unit: 'B', poly: [[25, 5], [71, 5], [71, 22], [47, 22], [47, 38], [25, 38]], sf: 1204 },
      ],
      garages: [
        { name: 'GARAGE A · 22×22', id: 'A', x: 102, y: 5, w: 22, h: 22, doorFace: 'E' },
        { name: 'GARAGE B · 22×22', id: 'B', x: 25, y: 16, w: 22, h: 22, doorFace: 'E' },
      ],
      drive: [[148, 37], [80, 37], [57.3, 27]],
      accessPaths: [
        { garage: 'A', path: [[148, 16], [134.3, 16]] },
        { garage: 'B', path: [[148, 37], [80, 37], [57.3, 27]] },
      ],
      court: [47, 21, 24, 12],
      program: { ground: { A: 528, B: 396 }, upper: { A: 1127, B: 1204 } },
    },
    j1b: {
      id: 'j1b',
      label: 'J1-B · Staggered Volumes',
      role: 'Pass 2A · two offset upper blocks · Penn-forward vs rear-deep',
      group: 'j1-massing',
      family: 'j1',
      treatment: 'stagger',
      skeletonRef: 'access_a',
      designConcern: 'Penn-near upper volume forward; rear upper stepped deeper — breaks the single bar silhouette',
      units: [
        { name: 'GROUND A · 440 SF', unit: 'A', x: 82, y: 5, w: 20, h: 22, sf: 440 },
        { name: 'GROUND B · 396 SF', unit: 'B', x: 25, y: 5, w: 22, h: 18, sf: 396 },
      ],
      upperUnits: [
        { name: 'UPPER A · 1,176 SF', unit: 'A', x: 85, y: 5, w: 42, h: 28, sf: 1176 },
        { name: 'UPPER B · LOG 484 SF', unit: 'B', x: 25, y: 16, w: 22, h: 22, sf: 484 },
        { name: 'UPPER B · wing 720 SF', unit: 'B', x: 47, y: 5, w: 30, h: 24, sf: 720 },
      ],
      garages: [
        { name: 'GARAGE A · 22×22', id: 'A', x: 102, y: 5, w: 22, h: 22, doorFace: 'E' },
        { name: 'GARAGE B · 22×22', id: 'B', x: 25, y: 16, w: 22, h: 22, doorFace: 'E' },
      ],
      drive: [[148, 37], [80, 37], [57.3, 27]],
      accessPaths: [
        { garage: 'A', path: [[148, 16], [134.3, 16]] },
        { garage: 'B', path: [[148, 37], [80, 37], [57.3, 27]] },
      ],
      court: [47, 21, 24, 12],
      program: { ground: { A: 440, B: 396 }, upper: { A: 1176, B: 1204 } },
    },
    j1c: {
      id: 'j1c',
      label: 'J1-C · Central Spine',
      role: 'Pass 2A · shared upper spine · separate ground entry pods',
      group: 'j1-massing',
      family: 'j1',
      treatment: 'spine',
      skeletonRef: 'access_a',
      designConcern: 'One continuous upper plate over both bays; ground reads as two homes · upper reads as one loft building',
      units: [
        { name: 'GROUND A · 528 SF', unit: 'A', x: 78, y: 5, w: 24, h: 22, sf: 528 },
        { name: 'GROUND B · 396 SF', unit: 'B', x: 25, y: 5, w: 22, h: 18, sf: 396 },
      ],
      upperUnits: [
        { name: 'UPPER · shared spine 1,725 SF', unit: 'shared', poly: [[52, 5], [127, 5], [127, 28], [52, 28]], sf: 1725 },
        { name: 'UPPER B · rear LOG 484 SF', unit: 'B', x: 25, y: 16, w: 22, h: 22, sf: 484 },
      ],
      garages: [
        { name: 'GARAGE A · 22×22', id: 'A', x: 102, y: 5, w: 22, h: 22, doorFace: 'E' },
        { name: 'GARAGE B · 22×22', id: 'B', x: 25, y: 16, w: 22, h: 22, doorFace: 'E' },
      ],
      drive: [[148, 37], [80, 37], [57.3, 27]],
      accessPaths: [
        { garage: 'A', path: [[148, 16], [134.3, 16]] },
        { garage: 'B', path: [[148, 37], [80, 37], [57.3, 27]] },
      ],
      court: [47, 21, 24, 12],
      program: { ground: { A: 528, B: 396 }, upper: { A: 1000, B: 1209 }, upperNote: 'Spine 1,725 SF → A 1,000 + B 725 from shared plate; B adds rear LOG 484 SF' },
    },
    v2: {
      id: 'v2',
      label: 'V2 Long-Axis V',
      role: 'Design ceiling',
      group: 'benchmark',
      designConcern: 'Angled wings · roof / foundation complexity',
      units: [
        { name: 'UNIT A · 798 SF', poly: [[85, 5], [127, 5], [127, 22], [85, 26]], sf: 798 },
        { name: 'UNIT B · 378 SF', poly: [[85, 26], [127, 22], [127, 33], [85, 33]], sf: 378 },
      ],
      garages: [
        { name: 'GARAGE A · 22×22', x: 48, y: 5, w: 22, h: 22 },
        { name: 'GARAGE B · 22×22', x: 25, y: 16, w: 22, h: 22 },
      ],
      drivePinchFail: [[148, 41], [128, 41], [15, 41], [15, 12], [64, 12], [25, 12]],
      drive: clearSouthPath([15, 37], [15, 12], [64, 12], [25, 12]),
      clearSouthCorridor: true,
      second: 1050,
    },
    e1: {
      id: 'e1',
      label: 'E1 Deep-Stagger',
      role: 'Privacy benchmark',
      group: 'revision',
      designConcern: 'Drive clearance · west unit clips garage zone',
      units: [
        { name: 'UNIT A · 880 SF', x: 88, y: 5, w: 40, h: 22, sf: 880 },
        { name: 'UNIT B · 880 SF', x: 30, y: 10, w: 28, h: 22, sf: 616 },
      ],
      garages: [
        { name: 'GARAGE A · 22×22', x: 64, y: 5, w: 22, h: 22 },
        { name: 'GARAGE B · 22×22', x: 25, y: 10, w: 22, h: 22 },
      ],
      drivePinchFail: [[148, 41], [128, 41], [15, 41], [15, 38], [64, 38], [64, 27], [15, 38], [15, 12], [25, 12]],
      drive: clearSouthPath([95, 37], [75, 28]),
      clearSouthCorridor: true,
      second: 920,
    },
    e3: {
      id: 'e3',
      label: 'E3 Front Courtyard',
      role: 'Courtyard benchmark',
      group: 'revision',
      designConcern: 'Court quality · Penn arrival sequence',
      court: [134, 10, 14, 22],
      units: [
        { name: 'UNIT A · 782 SF', x: 82, y: 5, w: 46, h: 17, sf: 782 },
        { name: 'UNIT B · 414 SF', x: 82, y: 24, w: 46, h: 9, sf: 414 },
      ],
      garages: [
        { name: 'GARAGE A · 22×22', x: 48, y: 5, w: 22, h: 22 },
        { name: 'GARAGE B · 22×22', x: 48, y: 13, w: 22, h: 22 },
      ],
      drivePinchFail: [[148, 41], [134, 41], [115, 41], [15, 41], [15, 12], [48, 12]],
      drive: clearSouthPath([15, 37], [15, 12], [48, 12]),
      clearSouthCorridor: true,
      second: 1018,
    },
    f1: {
      id: 'f1',
      label: 'F1 Rear Motor Court',
      role: 'Street-presence benchmark',
      group: 'revision',
      designConcern: 'Aggressive upper-floor load (1400 SF target)',
      units: [
        { name: 'UNIT A · 400 SF', x: 108, y: 5, w: 20, h: 20, sf: 400 },
        { name: 'UNIT B · 200 SF', x: 108, y: 23, w: 20, h: 10, sf: 200 },
      ],
      garages: [
        { name: 'GARAGE A · 22×22', x: 28, y: 5, w: 22, h: 22 },
        { name: 'GARAGE B · 22×22', x: 25, y: 17, w: 22, h: 22 },
      ],
      drivePinchFail: [[148, 41], [128, 41], [15, 41], [15, 12], [28, 12]],
      drive: clearSouthPath([15, 37], [15, 12], [28, 12]),
      clearSouthCorridor: true,
      second: 1400,
    },
    g2: {
      id: 'g2',
      label: 'G2 Interlocking-L',
      role: 'Architectural wildcard',
      group: 'revision',
      designConcern: 'L-wing drive routing · interlock / roof junctions',
      units: [
        { name: `UNIT A · L · ${Math.round(polyArea(G2_A))} SF`, poly: G2_A, sf: Math.round(polyArea(G2_A)) },
        { name: `UNIT B · L · ${Math.round(polyArea(G2_B))} SF`, poly: G2_B, sf: Math.round(polyArea(G2_B)) },
      ],
      garages: [
        { name: 'GARAGE A · 22×22', x: 48, y: 5, w: 22, h: 22 },
        { name: 'GARAGE B · 22×22', x: 48, y: 13, w: 22, h: 22 },
      ],
      drivePinchFail: [[148, 41], [128, 41], [15, 41], [15, 27], [48, 27]],
      drive: clearSouthPath([48, 37], [48, 27]),
      clearSouthCorridor: true,
      second: 982,
    },
    h2: {
      id: 'h2',
      label: 'H2 Carriage-Hinge Duplex',
      role: 'Challenger · hinged L pair around drive',
      group: 'challenger',
      designConcern: 'Split L program · hinge / drive coordination',
      units: [
        { name: 'UNIT A · L · 820 SF', poly: [[98, 5], [127, 5], [127, 22], [98, 22], [98, 14], [72, 14], [72, 5]], sf: 820 },
        { name: 'UNIT B · L · 547 SF', poly: [[98, 24], [127, 24], [127, 33], [72, 33], [72, 35], [98, 33]], sf: 547 },
      ],
      garages: [
        { name: 'GARAGE A · 22×22', x: 48, y: 5, w: 22, h: 22 },
        { name: 'GARAGE B · 22×22', x: 48, y: 13, w: 22, h: 22 },
      ],
      drivePinchFail: [[148, 41], [128, 41], [15, 41], [15, 27], [48, 27]],
      drive: clearSouthPath([48, 37], [48, 27]),
      clearSouthCorridor: true,
      second: 980,
    },
    h3: {
      id: 'h3',
      label: 'H3 Mews Courtyard Pair',
      role: 'Challenger · shared mews at Penn',
      group: 'challenger',
      designConcern: 'Mews court width · shared Penn arrival',
      court: [134, 8, 14, 20],
      units: [
        { name: 'UNIT A · 756 SF', x: 82, y: 5, w: 42, h: 18, sf: 756 },
        { name: 'UNIT B · 378 SF', x: 82, y: 24, w: 42, h: 9, sf: 378 },
      ],
      garages: [
        { name: 'GARAGE A · 22×22', x: 48, y: 5, w: 22, h: 22 },
        { name: 'GARAGE B · 22×22', x: 48, y: 13, w: 22, h: 22 },
      ],
      drivePinchFail: [[148, 41], [134, 41], [110, 41], [15, 41], [15, 12], [48, 12]],
      drive: clearSouthPath([15, 37], [15, 12], [48, 12]),
      clearSouthCorridor: true,
      second: 1044,
    },
    h4: {
      id: 'h4',
      label: 'H4 Garage-Under / LOG',
      role: 'Challenger · living over garage mass',
      group: 'challenger',
      designConcern: 'LOG massing · staggered Penn/rear units',
      units: [
        { name: 'UNIT A · LOG · 880 SF', x: 86, y: 5, w: 40, h: 22, sf: 880 },
        { name: 'UNIT B · LOG · 880 SF', x: 25, y: 10, w: 34, h: 22, sf: 748 },
      ],
      garages: [
        { name: 'GARAGE A · grade', x: 86, y: 5, w: 22, h: 22, integrated: true },
        { name: 'GARAGE B · grade', x: 25, y: 10, w: 22, h: 22, integrated: true },
      ],
      drivePinchFail: [[148, 41], [128, 41], [15, 41], [15, 38], [86, 38], [86, 27], [15, 38], [15, 12], [25, 12]],
      drive: clearSouthPath([97, 37], [97, 27]),
      clearSouthCorridor: true,
      second: 920,
    },
    h5: {
      id: 'h5',
      label: 'H5 Urban Cottage Pair',
      role: 'Challenger · detached cottage plates',
      group: 'challenger',
      designConcern: 'Cottage separation · south drive routing',
      units: [
        { name: 'COTTAGE A · 864 SF', x: 90, y: 5, w: 36, h: 24, sf: 864 },
        { name: 'COTTAGE B · 792 SF', x: 48, y: 10, w: 36, h: 22, sf: 792 },
      ],
      garages: [
        { name: 'GARAGE A · 22×22', x: 64, y: 5, w: 22, h: 22 },
        { name: 'GARAGE B · 22×22', x: 25, y: 16, w: 22, h: 22 },
      ],
      drivePinchFail: [[148, 41], [128, 41], [15, 41], [15, 38], [90, 38], [90, 29], [15, 38], [15, 12], [25, 12]],
      drive: clearSouthPath([95, 37], [75, 28]),
      clearSouthCorridor: true,
      second: 936,
    },
    h6: {
      id: 'h6',
      label: 'H6 Central-Core Duplex',
      role: 'Challenger · garage spine · units flank',
      group: 'challenger',
      designConcern: 'Central-core architecture · garage spine circulation',
      units: [
        { name: 'UNIT A · 902 SF', x: 86, y: 5, w: 41, h: 22, sf: 902 },
        { name: 'UNIT B · 880 SF', x: 25, y: 10, w: 40, h: 22, sf: 880 },
      ],
      garages: [
        { name: 'CORE A · 22×22', x: 52, y: 8, w: 22, h: 22 },
        { name: 'CORE B · 22×22', x: 74, y: 8, w: 22, h: 22 },
      ],
      drivePinchFail: [[148, 40], [128, 40], [74, 40], [74, 30]],
      drive: clearSouthPath([100, 37], [74, 28]),
      clearSouthCorridor: true,
      second: 918,
    },
  };

  /** Access A — immutable circulation infrastructure for J-series (do not move). */
  const ACCESS_A_INFRA = {
    garages: CONCEPTS.access_a.garages,
    drive: CONCEPTS.access_a.drive,
    accessPaths: CONCEPTS.access_a.accessPaths,
    court: CONCEPTS.access_a.court,
  };

  const CONCEPT_ORDER = ['e2', 'g1', 'v2', 'e1', 'e3', 'f1', 'g2', 'h2', 'h3', 'h4', 'h5', 'h6', 'g1a', 'access_a', 'access_b', 'access_c', 'access_d', 'access_e', 'access_f', 'access_d_mews', 'reset_r5', 'reset_r6_1', 'reset_r6_4a', 'reset_r6_4b', 'reset_r6_4', 'reset_r6_3', 'reset_r6_2a', 'reset_r6_2', 'reset_r6', 'reset_r7', 'reset_r8', 'reset_r1', 'reset_r2', 'reset_r3', 'reset_r4', 'j1a', 'j1b', 'j1c'];
  const BENCHMARKS = ['e2', 'g1', 'v2'];
  /** Original seven (non-challenger) — role metadata only; geometry status is separate */
  const ESTABLISHED = ['e2', 'g1', 'v2', 'e1', 'e3', 'f1', 'g2'];
  const CHALLENGERS = ['h2', 'h3', 'h4', 'h5', 'h6'];
  const LIVING_TARGET = { min: 1600, max: 1900, label: '~1,800 SF total living per unit' };
  const SHORTLIST_TRACK = ['e2', 'g1', 'v2', 'h6', 'h3'];
  const SHORTLIST_BACKUP = ['e3'];
  const DEPRIORITIZED = ['e1', 'g2', 'h2', 'h4', 'h5'];
  /** Locked Pass 2 gate — H6/H3 displace a finalist; they do not fill an open third slot. */
  const FINAL_THREE = ['e2', 'g1', 'v2'];
  const ALTERNATES = ['h6', 'h3'];
  const ACCESS_VARIANTS = [];
  const ACCESS_PROOFS = ['g1a'];
  const ACCESS_SKELETONS = ['access_a', 'access_b', 'access_c', 'access_d', 'access_e', 'access_f'];
  /** Strongest FS-SUV pattern after D/E/F close — not a buildable two-home answer. */
  const CIRCULATION_REFERENCE = 'access_e';
  /**
   * Hierarchy: R6.1 public reference · R5 active practical · R6.4A/B repair · R6.2A closed · R6.3 AHJ hold.
   * Repair-before-close: identify failure → smallest fix → rerun affected gates → close only if repair fails.
   */
  const PARKING_RESETS = ['reset_r5', 'reset_r6_1', 'reset_r6_4a', 'reset_r6_4b', 'reset_r6_4', 'reset_r6_3', 'reset_r6_2a', 'reset_r6_2', 'reset_r6', 'reset_r7', 'reset_r8', 'reset_r1', 'reset_r2', 'reset_r4', 'reset_r3'];
  const PARKING_RESETS_INTEGRATED = ['reset_r5', 'reset_r6_1', 'reset_r6_4a', 'reset_r6_4b', 'reset_r6_4', 'reset_r6_3', 'reset_r6_2a', 'reset_r6_2', 'reset_r6', 'reset_r7', 'reset_r8'];
  const PARKING_RESETS_ACTIVE = ['reset_r5', 'reset_r6_4a', 'reset_r6_4b'];
  const PARKING_RESETS_DETACHED = ['reset_r1', 'reset_r2', 'reset_r4', 'reset_r3'];
  const PARKING_HIERARCHY = Object.freeze({
    publicLead: 'reset_r5',
    publicReference: 'reset_r6_1',
    activePractical: 'reset_r5',
    activeRepair: ['reset_r6_4a', 'reset_r6_4b'],
    repairParent: 'reset_r6_4',
    closed: ['reset_r6_2a'],
    ahjFallback: 'reset_r6_3',
    architecture: 'UNLOCKED_DETERMINISTIC',
    fullPass: 'reset_r5',
  });
  const REPAIR_BEFORE_CLOSE = Object.freeze({
    rule: 'Identify exact failure → smallest geometry/ops fix → rerun every affected gate → close only when repair fails, breaks another hard gate, or creates unacceptable ownership trade.',
  });
  const MIN_LIFT_BAY_DEPTH = 22;
  const J1_MASSING = ['j1a', 'j1b', 'j1c'];

  function metrics(concept) {
    const unitAreas = (concept.units || []).map((u) => unitFirstFloorArea(u));
    const unitFirst = unitAreas.reduce((s, a) => s + a, 0) / unitAreas.length;
    const garageSF = (concept.garages || []).reduce((s, g) => s + (g.integrated ? 0 : g.w * g.h), 0);
    const livingSF = unitAreas.reduce((s, a) => s + a, 0);
    const buildingSF = livingSF + garageSF + (concept.garages || []).filter((g) => g.integrated).length * GAR.sf;
    const paved = driveLength(concept.drive) * DRIVE_W;
    return {
      firstFloor: Math.round(unitFirst),
      firstFloorExact: unitAreas.map((a) => +a.toFixed(1)),
      secondFloor: concept.second || 900,
      totalLiving: Math.round(unitFirst + (concept.second || 900)),
      garageEach: GAR.sf,
      garageTotal: (concept.garages || []).length * GAR.sf,
      buildingFootprint: Math.round(buildingSF),
      pavedSF: Math.round(paved),
      yardSF: Math.round(Math.max(0, SURVEY_AREA - buildingSF - paved)),
      minSep: minSeparation(concept).toFixed(1),
      driveLen: driveLength(concept.drive).toFixed(1),
    };
  }

  function validateConcept(concept) {
    const reasons = [];
    const fps = allFootprints(concept);
    let inSurvey = true;
    let inSetback = true;
    fps.forEach((fp) => {
      fp.coords.forEach(([x, y]) => {
        if (!pointInPoly(x, y, SURVEY)) {
          inSurvey = false;
          reasons.push(`${fp.label}: (${x.toFixed(1)}, ${y.toFixed(1)}) outside survey polygon`);
        }
        if (!pointInPoly(x, y, SETBACK_POLY)) {
          inSetback = false;
          reasons.push(`${fp.label}: (${x.toFixed(1)}, ${y.toFixed(1)}) outside working setback polygon`);
        }
      });
    });

    let garageOk = true;
    let bays = 0;
    (concept.garages || []).forEach((g) => {
      bays += 1;
      if (concept.parkingReset) return;
      if (g.w !== GAR.w || g.h !== GAR.h) {
        garageOk = false;
        reasons.push(`${g.name}: must be ${GAR.w}′×${GAR.h}′ (${GAR.sf} SF)`);
      }
    });
    if (!concept.parkingReset && bays < 2) {
      garageOk = false;
      reasons.push('Two 22×22 garage bays required');
    }
    if (concept.parkingReset) {
      garageOk = true;
      const spaces = concept.parkingProgram?.spacesTotal;
      if (spaces != null && spaces < 4) {
        garageOk = false;
        reasons.push(`Parking reset requires ≥4 spaces (declared ${spaces})`);
      }
    }

    const path = concept.drive || [];
    let pennAccess = path.length >= 2 && path[0][0] >= (S ? S.PENN_X : 148) - 1;
    if (!pennAccess) reasons.push('Drive must connect at Pennsylvania / right (x ≈ 148)');

    const unitBoxes = unitBoxesForClearance(concept);
    let minDriveClear = Infinity;
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i];
      const b = path[i + 1];
      const steps = Math.max(4, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 3));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const px = a[0] + (b[0] - a[0]) * t;
        const py = a[1] + (b[1] - a[1]) * t;
        unitBoxes.forEach((fp) => {
          minDriveClear = Math.min(minDriveClear, distPointFootprint(px, py, fp));
        });
      }
    }
    const driveOk = minDriveClear >= DRIVE_W / 2 - 0.75;
    if (!driveOk) reasons.push(`Min drive clearance ${minDriveClear.toFixed(1)}′ < ${DRIVE_W / 2}′ each side`);

    const m = metrics(concept);
    const livingTargetOk = concept.parkingReset || concept.skeleton || !(concept.units || []).length
      ? true
      : m.totalLiving >= LIVING_TARGET.min && m.totalLiving <= LIVING_TARGET.max;
    if (!livingTargetOk) {
      reasons.push(`Total living ${m.totalLiving} SF/unit outside ${LIVING_TARGET.min}–${LIVING_TARGET.max} SF band`);
    }

    let firstFloorBenchmarkOk = true;
    if (concept.firstFloorBenchmark) {
      firstFloorBenchmarkOk = (concept.units || []).every((u) => {
        const a = unitFirstFloorArea(u);
        const target = u.sf || concept.firstFloorBenchmark;
        return Math.abs(a - target) < 80;
      });
      if (!firstFloorBenchmarkOk) {
        reasons.push(`First-floor areas must match declared ~${concept.firstFloorBenchmark} SF benchmark (±80 SF)`);
      }
    }

    const checks = {
      inSurvey,
      inSetback,
      garageOk,
      pennAccess,
      driveOk,
      livingTargetOk,
      firstFloorBenchmarkOk,
    };

    let status = 'PASS';
    if (!inSurvey || !garageOk || !pennAccess) status = 'FAIL';
    else if (!inSetback || !driveOk || !livingTargetOk || !firstFloorBenchmarkOk) status = 'REVIEW';

    let verdict = status === 'PASS' ? 'Geometry PASS under working assumptions' : status === 'REVIEW' ? 'Geometry REVIEW — fix footprint, setback, drive, or program band' : 'Geometry FAIL — parcel, garage, or Penn access';

    return {
      status,
      verdict,
      checks,
      reasons: reasons.slice(0, 8),
      minDriveClear: minDriveClear === Infinity ? null : +minDriveClear.toFixed(1),
      metrics: m,
      designConcern: concept.designConcern || '—',
    };
  }

  function validateAll() {
    const out = {};
    CONCEPT_ORDER.forEach((id) => {
      if (CONCEPTS[id]?.units) out[id] = validateConcept(CONCEPTS[id]);
    });
    return out;
  }

  function plan(id) {
    if (id === 'reference') return `<svg viewBox="0 0 ${VB_W} ${VB_H}" role="img">${baseLot()}</svg>`;
    const c = CONCEPTS[id];
    if (!c) return plan('reference');
    if (c.skeleton || c.circulationProof || c.family === 'j1' || (c.units && c.units.length)) {
      return `<svg viewBox="0 0 ${VB_W} ${VB_H}" role="img">${baseLot(renderConcept(c))}</svg>`;
    }
    return plan('reference');
  }

  function getMetrics(id) {
    const c = CONCEPTS[id];
    return c?.units ? metrics(c) : null;
  }

  function getValidation(id) {
    const c = CONCEPTS[id];
    return c?.units ? validateConcept(c) : null;
  }

  function validationGroups() {
    const vals = validateAll();
    const pass = [];
    const review = [];
    const fail = [];
    CONCEPT_ORDER.forEach((id) => {
      const s = vals[id]?.status;
      if (s === 'PASS') pass.push(id);
      else if (s === 'FAIL') fail.push(id);
      else review.push(id);
    });
    return { pass, review, fail, vals };
  }

  const GROUP_LABELS = {
    benchmark: 'Benchmark trio (role)',
    revision: 'Original seven — non-benchmark roles',
    challenger: 'Challengers H2–H6 (role)',
    variant: 'Access-optimized variants (locked original untouched)',
    'access-proof': 'Circulation proof (not a candidate)',
    'parking-skeleton': 'Parking Skeleton A/B/C — parking only',
    'access-skeleton': 'Parking Skeleton A/B/C — parking only',
    'j1-massing': 'J1 Pennsylvania Loft · Pass 2A massing',
    geometryPass: 'Geometry PASS — shortlist eligible',
    geometryReview: 'Geometry REVIEW — resolve before shortlist',
  };

  const SHORTLIST_MEMO = {
    e2: {
      track: 'main',
      headline: 'Conventional benchmark — everything else must beat this',
      scores: {
        siteCirculation: { r: 'Strong', n: 'West-side drive serves both garages; geometry PASS with 6′ clearance. Long 205′ paved run — swept-path still unverified.' },
        buildability: { r: 'Strong', n: 'Orthogonal plates, standard framing, no angled foundations. Lowest-surprise construction path.' },
        floorPlan: { r: 'Good', n: '900 / 910 SF lower split is honest under taper constraint. Party-wall coordination at Penn stack required.' },
        pennPresence: { r: 'Strong', n: 'Both units address Pennsylvania; garages recessed left/rear — clean street elevation potential.' },
        privacyOutdoor: { r: 'Fair', n: 'Garages and drive consume west band; rear yard shared and modest (~1,785 SF yard est.).' },
        resaleCharacter: { r: 'Good', n: 'Most marketable conventional duplex — safe resale language.' },
        costComplexity: { r: 'Low', n: 'Baseline cost / complexity — the reference penalty every challenger pays against.' },
      },
      massing: 'Two Penn-facing rectangular living blocks over a west-side detached garage pair. Likely gable or simple hip roofs; street reads as duplex houses, not garage architecture.',
      vehicleRisk: 'Moderate — geometry clears 6′ to living mass, but SUV turning from Penn into west spur and backing into tandem-adjacent bays is unproven. Priority swept-path candidate.',
      constructionNote: 'Conventional wood-frame over slab; no skewed walls. Unit B trapezoid may need slightly custom foundation line at rear taper — manageable.',
      argument: 'Locked as conventional control: buildability, resale familiarity, and cost discipline. Alternates must displace it with a material Pass 2 finding — not a prettier diagram.',
      disposition: 'ADVANCE',
      dispositionNote: 'Final Three — conventional benchmark / control case.',
    },
    g1: {
      track: 'main',
      headline: 'Efficiency challenger — V2 privacy with 90° framing',
      scores: {
        siteCirculation: { r: 'Strong', n: 'Z-stagger uses full 148′ depth; drive reaches both garages. Longest paved path (250′) — circulation efficiency tradeoff.' },
        buildability: { r: 'Good', n: 'All orthogonal — simpler than V2. Stagger creates party-wall and vertical-service coordination at the Z overlap.' },
        floorPlan: { r: 'Good', n: '912 / 608 SF lower with 1,054 SF upper target — upper-heavy but within living band. Interlock must be developed, not just boxed.' },
        pennPresence: { r: 'Good', n: 'Unit A holds Penn edge; Unit B set back — readable two-home identity from street.' },
        privacyOutdoor: { r: 'Strong', n: 'Private yards at opposite ends of the Z — best orthogonal answer to V2 separation.' },
        resaleCharacter: { r: 'Good', n: 'Reads as two related homes without exotic geometry — broad market appeal.' },
        costComplexity: { r: 'Low', n: 'No angle premium; modest complexity from staggered cores only.' },
      },
      massing: 'Interlocking rectangular bars staggered along the long axis — Penn-near block forward, rear block shifted west. Garages tucked into the Z notch.',
      vehicleRisk: 'Moderate — longest drive in shortlist. West routing at y=12 passes above unit zones; confirm SUV path at garage mouths.',
      constructionNote: 'Standard framing; critical detail is the Z intersection — stairs, plumbing, and fire separation between overlapping plates.',
      argument: 'Locked as strongest orthogonal challenger to E2: privacy and spatial interest of V2 without angled-foundation/roof penalty. H6 may displace it only after a believable core floor plan.',
      disposition: 'ADVANCE',
      dispositionNote: 'Final Three — orthogonal efficiency / privacy challenger.',
    },
    v2: {
      track: 'main',
      headline: 'Design ceiling — signature architecture if complexity stays honest',
      scores: {
        siteCirculation: { r: 'Good', n: 'Wings open toward rear; garages left of wing tips. Best drive clearance (8′) among Penn-heavy concepts.' },
        buildability: { r: 'Fair', n: 'Angled wing walls, non-orthogonal foundations, and complex roof geometry — real cost premium.' },
        floorPlan: { r: 'Fair', n: '798 / 378 SF lower — heavily upper-loaded (1,638 SF total). Trapezoid plates need careful interior fit-out.' },
        pennPresence: { r: 'Strong', n: 'V apex toward Pennsylvania — strongest architectural gesture on the shortlist.' },
        privacyOutdoor: { r: 'Strong', n: 'Wings define separate rear outdoor rooms; best narrative separation on the lot.' },
        resaleCharacter: { r: 'Strong', n: 'Highest character ceiling — the option that feels designed, not default.' },
        costComplexity: { r: 'High', n: 'Angles, custom roof, and foundation skew — expect meaningful premium over E2/G1.' },
      },
      massing: 'Long-axis V with apex at Penn/right, wings spreading left toward rear. Low angular first floor, larger upper stories stepping over garage-adjacent zone.',
      vehicleRisk: 'Moderate–High — wing tips and rear garage access are the stress test. Geometry PASS does not prove backing maneuvers at garage doors.',
      constructionNote: 'Skewed footings, valley roofs, and potential structural transfers at the V joint. Budget for architect-engineered details early.',
      argument: 'Locked as design ceiling: tests whether Lot 2’s unusual geometry can create a better product, not merely the easiest. Swept-path and cost may still disqualify it.',
      disposition: 'ADVANCE',
      dispositionNote: 'Final Three — architecture ceiling.',
    },
    h6: {
      track: 'main',
      headline: 'Central-core efficiency — pressure-test floor plans and buildability',
      scores: {
        siteCirculation: { r: 'Strong', n: 'Shortest drive (84′), best clearance (9′), direct spine access — best raw circulation geometry on shortlist.' },
        buildability: { r: 'Fair', n: 'Shared garage core with flanking units — fire separation, structure, and noise paths are unproven.' },
        floorPlan: { r: 'Fair', n: '902 / 880 SF lower looks strong on paper, but core layout is undeveloped. Could collapse once rooms are drawn.' },
        pennPresence: { r: 'Good', n: 'Penn/right unit reads street-facing; core garages hidden in middle — less garage visible than E2 from some angles.' },
        privacyOutdoor: { r: 'Strong', n: 'Largest yard estimate (~3,265 SF) — units flank open space instead of stacking.' },
        resaleCharacter: { r: 'Good', n: 'Distinct “two homes around a lane” feel — less conventional than E2, less theatrical than V2.' },
        costComplexity: { r: 'Moderate', n: 'Central core structure, potential shared systems, and fire-rated separation between bays.' },
      },
      massing: 'Garage spine at mid-lot with Penn/right and rear/left living bars flanking. Reads as compound rather than single duplex mass — elevation must unify or deliberately pair.',
      vehicleRisk: 'Low–Moderate — geometry favors this concept for drive-to-garage. Core entry widths and turn radii still need SUV template.',
      constructionNote: 'Garage core may require fire-rated assembly between bays; flanking units need independent egress paths. Highest buildability unknown on shortlist.',
      argument: 'Closest alternate. Circulation efficiency is strategically interesting, but the garage-core still needs a believable floor plan before it can displace G1 or E2.',
      disposition: 'HOLD',
      dispositionNote: 'Alternate #1 — may displace a finalist only if floor-plan, fire separation, or cost testing exposes a material weakness.',
    },
    h3: {
      track: 'main',
      headline: 'Mews lifestyle — prove the courtyard is worth the arrangement',
      scores: {
        siteCirculation: { r: 'Good', n: 'Shared mews at Penn (14×20′ court); flanking units and west garages. Court maneuvering unverified.' },
        buildability: { r: 'Good', n: 'Mostly orthogonal flanking plates — court is paving/grade challenge, not structural exoticism.' },
        floorPlan: { r: 'Fair', n: '756 / 378 SF lower — upper-heavy like V2/H3 peers. Court consumes frontage that could be living area.' },
        pennPresence: { r: 'Strong', n: 'Mews arrival is the story — memorable Penn sequence if court quality delivers.' },
        privacyOutdoor: { r: 'Good', n: 'Semi-public mews vs private rear yards — lifestyle tradeoff, not pure privacy play.' },
        resaleCharacter: { r: 'Strong', n: 'Differentiated product — “mews home” language if execution matches concept.' },
        costComplexity: { r: 'Moderate', n: 'Court paving, drainage, and shared arrival maintenance — ongoing ownership question.' },
      },
      massing: 'Two Penn-adjacent bars flanking a shared mews court at the right/front edge. Garages deep west — street sees court + living, not garage doors.',
      vehicleRisk: 'Moderate — vehicles enter mews from Penn and proceed west to garages. Court turning and guest parking in mews need explicit layout.',
      constructionNote: 'Court grade, drainage toward irregular south boundary, and snow/storage in shared mews are design-development items.',
      argument: 'Must prove the mews is a real outdoor room, not circulation dressed as landscape. May displace a finalist only if that test passes and a Final Three concept shows a material weakness.',
      disposition: 'HOLD',
      dispositionNote: 'Alternate #2 — mews/courtyard lifestyle; not in the Final Three yet.',
    },
    e3: {
      track: 'appendix',
      headline: 'Courtyard fallback — not in the main five, kept as backup',
      scores: {
        siteCirculation: { r: 'Good', n: '14×22′ Penn court similar DNA to H3 but established earlier. Same maneuvering unknowns.' },
        buildability: { r: 'Good', n: 'Orthogonal flanking units — straightforward shells.' },
        floorPlan: { r: 'Fair', n: '782 / 414 SF lower — court trades first-floor area for arrival experience.' },
        pennPresence: { r: 'Strong', n: 'Shared front court at Pennsylvania — strong arrival if landscaped.' },
        privacyOutdoor: { r: 'Good', n: 'Court + rear yards; slightly less yard than H3/H6 estimates.' },
        resaleCharacter: { r: 'Good', n: 'Courtyard duplex — familiar product type, less distinctive than mews label.' },
        costComplexity: { r: 'Moderate', n: 'Court construction similar to H3 without challenger optimizations.' },
      },
      massing: 'Flanking Penn-facing units with shared front court — similar to H3 but slightly wider court (14×22′).',
      vehicleRisk: 'Moderate — parallel to H3; use as fallback if H3 drops but courtyard typology survives.',
      constructionNote: 'If H3 advances, E3 likely redundant. Keep as appendix reference only.',
      argument: 'Hold outside main five and outside the Final Three. Substitute only if H3 drops and the team still wants a courtyard typology.',
      disposition: 'HOLD',
      dispositionNote: 'Appendix / courtyard fallback — not a full contender unless H3 exits.',
    },
  };

  const SCORE_CRITERIA = [
    { key: 'siteCirculation', label: 'Site fit / circulation' },
    { key: 'buildability', label: 'Buildability' },
    { key: 'floorPlan', label: 'Floor-plan quality' },
    { key: 'pennPresence', label: 'Pennsylvania street presence' },
    { key: 'privacyOutdoor', label: 'Privacy / outdoor living' },
    { key: 'resaleCharacter', label: 'Resale / architectural character' },
    { key: 'costComplexity', label: 'Cost / complexity penalty' },
  ];

  return {
    SURVEY,
    SURVEY_AREA,
    SETBACKS,
    SETBACK_POLY,
    CLEAR_SOUTH_INBOUND,
    CLEAR_SOUTH_CURVE,
    clearSouthPath,
    clearSouthDrive,
    CONCEPTS,
    CONCEPT_ORDER,
    LAB_ORDER: CONCEPT_ORDER,
    BENCHMARKS,
    ESTABLISHED,
    REVISION: ['e1', 'e3', 'f1', 'g2'],
    CHALLENGERS,
    LIVING_TARGET,
    SHORTLIST_TRACK,
    SHORTLIST_BACKUP,
    DEPRIORITIZED,
    FINAL_THREE,
    ALTERNATES,
    ACCESS_VARIANTS,
    ACCESS_PROOFS,
    ACCESS_SKELETONS,
    CIRCULATION_REFERENCE,
    PARKING_RESETS,
    PARKING_RESETS_INTEGRATED,
    PARKING_RESETS_ACTIVE,
    PARKING_RESETS_DETACHED,
    PARKING_HIERARCHY,
    REPAIR_BEFORE_CLOSE,
    MIN_LIFT_BAY_DEPTH,
    ACCESS_A_INFRA,
    J1_MASSING,
    SHORTLIST_MEMO,
    SCORE_CRITERIA,
    GROUP_LABELS,
    setbackPoly,
    envelopePoly: setbackPoly,
    polyArea,
    pointInPoly,
    validateConcept,
    validateAll,
    validationGroups,
    plan,
    getMetrics,
    getValidation,
    getAllValidations: validateAll,
  };
})();

if (typeof module !== 'undefined') module.exports = Lot2;
