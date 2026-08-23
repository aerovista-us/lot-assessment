/**
 * Parking Skeleton A/B/C — parking only (no houses).
 * Code IDs: access_a / access_b / access_c.
 * G1-A is circulation proof, not a candidate.
 */
global.Lot2SOT = require('../js/lot2-sot.js');
global.Lot2 = require('../js/lot2-geometry.js');
const A = require('../js/lot2-access.js');

function rect(x, y, w, h) {
  return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
}

function sweepBoth(concept) {
  const branches = A.trimDrive(concept);
  const garages = concept.garages || [];
  const issues = { off: 0, hits: [], notes: [] };
  branches.forEach((br) => {
    const obs = garages.filter((g) => g.name !== br.garage.name).map((g) => ({
      label: g.name,
      poly: rect(g.x, g.y, g.w, g.h),
    }));
    const fil = A.filletPath(br.path);
    issues.notes.push(...fil.notes);
    fil.poses.forEach((p) => {
      const poly = A.vehiclePoly(p.x, p.y, p.th);
      poly.forEach(([x, y]) => {
        if (x < 147.8 && !Lot2.pointInPoly(x, y, Lot2.SURVEY, 0.2)) issues.off++;
      });
      obs.forEach((o) => {
        if (poly.some(([x, y]) => Lot2.pointInPoly(x, y, o.poly, 0.05))) issues.hits.push(o.label);
      });
    });
  });
  issues.hits = [...new Set(issues.hits)];
  return issues;
}

const skeletons = {
  access_a: {
    label: 'Access A — East tandem',
    garages: [{ x: 102, y: 5 }, { x: 25, y: 16 }],
    accessPaths: [
      { garage: 'A', path: [[148, 16], [134.3, 16]] },
      { garage: 'B', path: [[148, 37], [80, 37], [57.3, 27]] },
    ],
    drive: [[148, 37], [80, 37], [57.3, 27]],
  },
  access_b: {
    label: 'Access B — Central core',
    garages: [{ x: 52, y: 8 }, { x: 74, y: 8 }],
    accessPaths: [
      { garage: 'A', path: [[148, 19], [94.5, 19]] },
      { garage: 'B', path: [[148, 37], [108, 37], [106.25, 19]] },
    ],
    drive: [[148, 37], [108, 37], [106.25, 19]],
  },
  access_b2: {
    label: 'Access B alt — core + south lane to B',
    garages: [{ x: 52, y: 8 }, { x: 74, y: 8 }],
    accessPaths: [
      { garage: 'A', path: [[148, 19], [94.5, 19]] },
      { garage: 'B', path: [[148, 37], [80, 37], [57.3, 27]] },
    ],
    drive: [[148, 37], [80, 37], [57.3, 27]],
  },
  access_c: {
    label: 'Access C — Split depth',
    garages: [{ x: 102, y: 5 }, { x: 25, y: 22 }],
    accessPaths: [
      { garage: 'A', path: [[148, 16], [134.3, 16]] },
      { garage: 'B', path: [[148, 37], [80, 37], [57.3, 33]] },
    ],
    drive: [[148, 37], [80, 37], [57.3, 33]],
  },
  access_c2: {
    label: 'Access C alt — deep B y=18',
    garages: [{ x: 102, y: 5 }, { x: 25, y: 18 }],
    accessPaths: [
      { garage: 'A', path: [[148, 16], [134.3, 16]] },
      { garage: 'B', path: [[148, 37], [80, 37], [57.3, 29]] },
    ],
    drive: [[148, 37], [80, 37], [57.3, 29]],
  },
};

Object.entries(skeletons).forEach(([id, s]) => {
  const concept = {
    garages: s.garages.map((g, i) => ({
      name: `GARAGE ${i === 0 ? 'A' : 'B'} · 22×22`,
      id: i === 0 ? 'A' : 'B',
      x: g.x,
      y: g.y,
      w: 22,
      h: 22,
      doorFace: 'E',
    })),
    accessPaths: s.accessPaths,
    drive: s.drive,
    units: [],
  };
  const r = sweepBoth(concept);
  console.log(id, s.label, 'off', r.off, 'hits', r.hits, 'short', r.notes.filter((n) => n.kind === 'short-tangent'));
});
