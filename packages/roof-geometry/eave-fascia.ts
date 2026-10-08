/** Geometry-authoritative fascia for zero-overhang roof boundaries.
 * Nonzero projections require a dedicated roof-extension solver and fail closed.
 */
export type Edge3 = readonly [number, number, number];
export type RoofFaceInput = { polygon: readonly Edge3[] };
export type EaveFasciaSpec = {
  source: string;
  overhangFt: number;
  fasciaDepthFt: number;
  fasciaThicknessFt: number;
};
export type FasciaSegment = { a: Edge3; b: Edge3; bottomA: Edge3; bottomB: Edge3; depthFt: number };
export type FasciaResult = { status: 'AUTHORITATIVE' | 'WITHHELD'; errors: string[]; segments: FasciaSegment[] };
const key = (p: Edge3) => p.map(v => v.toFixed(5)).join(',');
export function solveEaveFascia(faces: readonly RoofFaceInput[], spec: EaveFasciaSpec | null | undefined): FasciaResult {
  const fail = (message: string): FasciaResult => ({ status: 'WITHHELD', errors: [message], segments: [] });
  if (!spec) return fail('No approved eave/fascia specification');
  if (typeof spec.source !== 'string' || !spec.source.trim()) return fail('Fascia requires a traceable design source');
  if (![spec.overhangFt, spec.fasciaDepthFt, spec.fasciaThicknessFt].every(Number.isFinite)) return fail('Eave/fascia dimensions must be finite');
  if (spec.overhangFt !== 0) return fail('Nonzero overhang requires validated roof-surface extension; no offsets may be inferred');
  if (spec.fasciaDepthFt <= 0 || spec.fasciaDepthFt > 3 || spec.fasciaThicknessFt <= 0 || spec.fasciaThicknessFt > 1) return fail('Fascia dimensions outside supported design envelope');
  if (!faces.length || faces.some(f => !Array.isArray(f.polygon) || f.polygon.length < 3 || f.polygon.some(p => p.length !== 3 || !p.every(Number.isFinite)))) return fail('Valid solved 3D roof faces required');
  const edges = new Map<string,{a:Edge3,b:Edge3,count:number}>();
  for (const face of faces) for (let i=0;i<face.polygon.length;i++) {
    const a=face.polygon[i], b=face.polygon[(i+1)%face.polygon.length];
    if (Math.hypot(...a.map((v,j)=>v-b[j])) < 0.00001) continue;
    const ends=[key(a),key(b)].sort(), id=ends.join('|'), found=edges.get(id);
    if (found) found.count++; else edges.set(id,{a,b,count:1});
  }
  const boundary=[...edges.values()].filter(e=>e.count===1);
  if ([...edges.values()].some(e=>e.count>2)) return fail('Nonmanifold roof edge');
  if (!boundary.length) return fail('No solved boundary edges');
  const plate=Math.min(...faces.flatMap(f=>f.polygon.map(p=>p[2])));
  const eaves=boundary.filter(e=>Math.abs(e.a[2]-plate)<0.0001 && Math.abs(e.b[2]-plate)<0.0001);
  if (!eaves.length) return fail('No solved eave edges at plate datum');
  const depth=spec.fasciaDepthFt;
  return {status:'AUTHORITATIVE',errors:[],segments:eaves.map(({a,b})=>({a,b,bottomA:[a[0],a[1],a[2]-depth],bottomB:[b[0],b[1],b[2]-depth],depthFt:depth}))};
}
