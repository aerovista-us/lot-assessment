/**
 * Circulation-first search for G1-A. Empty lot, then garages, then houses.
 * Does not write Lot2.CONCEPTS.
 */
global.Lot2SOT = require('../js/lot2-sot.js');
global.Lot2 = require('../js/lot2-geometry.js');
const A = require('../js/lot2-access.js');
const L = Lot2;
const V = A.VEHICLE;

function surveyY(x) {
  let maxY = 0;
  const S = L.SURVEY;
  for (let i = 0; i < S.length; i++) {
    const a = S[i];
    const b = S[(i + 1) % S.length];
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

function rect(x, y, w, h) {
  return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
}

function inPoly(coords, poly) {
  return coords.every(([x, y]) => L.pointInPoly(x, y, poly, 0.08));
}

function sweepPath(path, obs) {
  const fil = A.filletPath(path);
  const issues = [];
  fil.poses.forEach((p, i) => {
    const poly = A.vehiclePoly(p.x, p.y, p.th);
    poly.forEach(([x, y]) => {
      if (x >= 147.8) return;
      if (!L.pointInPoly(x, y, L.SURVEY, 0.2)) issues.push(`off ${i} (${x.toFixed(1)},${y.toFixed(1)})`);
    });
    (obs || []).forEach((o) => {
      // SAT via access engine: reuse pose by checking corners in poly roughly
      const hit = poly.some(([x, y]) => L.pointInPoly(x, y, o.poly, 0.05));
      if (hit) issues.push(`hit ${o.label} @${i}`);
    });
  });
  return {
    notes: fil.notes,
    off: issues.filter((s) => s.startsWith('off')).length,
    hits: [...new Set(issues.filter((s) => s.startsWith('hit')))],
    issues: [...new Set(issues)].slice(0, 8),
    poses: fil.poses.length,
  };
}

console.log('SETBACK_POLY', L.SETBACK_POLY.map((p) => p.map((n) => +n.toFixed(2))));
console.log('Buildable N-S: front x=128', +(L.SETBACK_POLY[2][1] - 5).toFixed(2));
const rearY = L.SETBACK_POLY[L.SETBACK_POLY.length - 1];
console.log('rear setback pt', rearY.map((n) => +n.toFixed(2)));

console.log('\nMax y_center for 8′ vehicle (body south on survey):');
[148, 128, 125, 110, 85, 70, 50, 36, 25].forEach((x) => {
  const sy = surveyY(x);
  console.log(x, 'survey', +sy.toFixed(2), 'ymax_cl', +(sy - 4).toFixed(2), 'drive12_ymax_cl', +(sy - 6).toFixed(2));
});

const twoStack = 44;
console.log('\nTwo 22×22 stacked in Y need', twoStack, '· max envelope N-S ~33–38 → cannot stack in setbacks');

function test(name, ga, gb, pathA, pathB) {
  const obsA = [{ label: 'GB', poly: rect(gb.x, gb.y, gb.w, gb.h) }];
  const obsB = [{ label: 'GA', poly: rect(ga.x, ga.y, ga.w, ga.h) }];
  const gOk = inPoly(rect(ga.x, ga.y, 22, 22), L.SETBACK_POLY) && inPoly(rect(gb.x, gb.y, 22, 22), L.SETBACK_POLY);
  const a = sweepPath(pathA, obsA);
  const b = sweepPath(pathB, obsB);
  console.log('\n===', name, 'garages-in-setback', gOk, '===');
  console.log('GA', ga, 'GB', gb);
  console.log('pathA', pathA, a);
  console.log('pathB', pathB, b);
}

// Candidate 1: dual east-facing, Penn-aligned A, offset B
test(
  'east-east Z offset',
  { x: 102, y: 5, w: 22, h: 22 },
  { x: 25, y: 16, w: 22, h: 22 },
  [[148, 16], [124, 16]],
  [[148, 36], [71, 27], [47, 27]],
);

test(
  'east-east A more west',
  { x: 96, y: 5, w: 22, h: 22 },
  { x: 25, y: 16, w: 22, h: 22 },
  [[148, 16], [118, 16]],
  [[148, 36], [71, 27], [47, 27]],
);

function sbY(x) {
  // interpolate SETBACK south at x
  const p = L.SETBACK_POLY;
  let maxY = 0;
  for (let i = 0; i < p.length; i++) {
    const a = p[i];
    const b = p[(i + 1) % p.length];
    const lo = Math.min(a[0], b[0]);
    const hi = Math.max(a[0], b[0]);
    if (x < lo - 0.05 || x > hi + 0.05) continue;
    if (Math.abs(b[0] - a[0]) < 1e-6) maxY = Math.max(maxY, a[1], b[1]);
    else maxY = Math.max(maxY, a[1] + ((x - a[0]) / (b[0] - a[0])) * (b[1] - a[1]));
  }
  return maxY;
}
console.log('\nSetback south at GB east face x=47', +sbY(47).toFixed(2), 'max GB.y', +(sbY(47) - 22).toFixed(2));

test(
  'stay south of A then offset to B door',
  { x: 102, y: 5, w: 22, h: 22 },
  { x: 25, y: 16, w: 22, h: 22 },
  [[148, 16], [124, 16]],
  [[148, 37], [106, 37], [71, 27], [47, 27]],
);

test(
  'B path y~37 until x=90',
  { x: 102, y: 5, w: 22, h: 22 },
  { x: 25, y: 16, w: 22, h: 22 },
  [[148, 16], [124, 16]],
  [[148, 37], [90, 37], [60, 27], [47, 27]],
);

test(
  'A at x=106 (24′ apron to Penn)',
  { x: 106, y: 5, w: 22, h: 22 },
  { x: 25, y: 16, w: 22, h: 22 },
  [[148, 16], [128, 16]],
  [[148, 37], [108, 37], [70, 27], [47, 27]],
);

test(
  'GA x=102 24′ apron; B y~37 to x=80 then to door',
  { x: 102, y: 5, w: 22, h: 22 },
  { x: 25, y: 16, w: 22, h: 22 },
  [[148, 16], [124, 16]],
  [[148, 37], [80, 37], [47, 27]],
);

function bandHits(path, boxes) {
  const fil = A.filletPath(path);
  const hits = [];
  fil.poses.forEach((p, i) => {
    const poly = A.vehiclePoly(p.x, p.y, p.th);
    boxes.forEach((o) => {
      if (poly.some(([x, y]) => L.pointInPoly(x, y, o.poly, 0.05))) hits.push(o.label + '@' + i);
    });
  });
  return [...new Set(hits)];
}

const GA = { x: 102, y: 5, w: 22, h: 22 };
const GB = { x: 25, y: 16, w: 22, h: 22 };
const UA = { x: 71, y: 5, w: 31, h: 22 }; // 682 SF west of GA, 1′ east of 24′ B apron
const UB_n = { x: 25, y: 5, w: 46, h: 11 }; // 506 SF
const pathA = [[148, 16], [124, 16]];
const pathB = [[148, 37], [80, 37], [47, 27]];
const boxes = [
  { label: 'GA', poly: rect(GA.x, GA.y, 22, 22) },
  { label: 'GB', poly: rect(GB.x, GB.y, 22, 22) },
  { label: 'UA', poly: rect(UA.x, UA.y, UA.w, UA.h) },
  { label: 'UB', poly: rect(UB_n.x, UB_n.y, UB_n.w, UB_n.h) },
];
console.log('\nChosen skeleton + Z masses:');
console.log('pathA', sweepPath(pathA, boxes.filter((b) => b.label !== 'GA')));
console.log('pathB', sweepPath(pathB, boxes.filter((b) => b.label !== 'GB')));
console.log('UA in setback', inPoly(rect(UA.x, UA.y, UA.w, UA.h), L.SETBACK_POLY), 'SF', UA.w * UA.h);
console.log('UB in setback', inPoly(rect(UB_n.x, UB_n.y, UB_n.w, UB_n.h), L.SETBACK_POLY), 'SF', UB_n.w * UB_n.h);

