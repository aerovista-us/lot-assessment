import { CASE_STRATEGIES, type CaseProject } from "@/lib/case-comparison";

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const text = (v: unknown, max = 1000): v is string => typeof v === "string" && v.length <= max;
const num = (v: unknown, min = 0, max = 1_000_000): v is number => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
const statuses = ["unknown", "tentative", "verified", "rejected"];
const strategies = Object.keys(CASE_STRATEGIES);
const requiredEvidence = ["survey", "zoning", "access", "structure", "circulation", "approval"];

function alternative(v: unknown): boolean {
  if (!isObj(v)) return false;
  return text(v.id, 100) && text(v.fingerprint, 100)
    && ["X", "Y", "BEST"].includes(String(v.axis)) && text(v.name, 200)
    && strategies.includes(String(v.strategy))
    && ["score","fit","circulation","riskScore"].every(k => num(v[k],0,100))
    && num(v.coverage,0,100)
    && isObj(v.footprint) && num(v.footprint.width,0,10000) && num(v.footprint.depth,0,10000)
    && Array.isArray(v.warnings) && v.warnings.length <= 100
    && v.warnings.every(item => text(item,500));
}

export function validCaseDocument(value: unknown): value is CaseProject {
  if (!isObj(value)) return false;
  const p = value;
  if (!text(p.id,80) || !/^[a-zA-Z0-9_-]{1,80}$/.test(p.id)
      || !text(p.name,200) || !text(p.address,500)
      || !Number.isSafeInteger(p.revision) || Number(p.revision) < 1
      || !text(p.updatedAt,100) || !Number.isFinite(Date.parse(p.updatedAt))
      || !text(p.circulationNotes,10000) || !text(p.nextBoundedCheck,2000)
      || !strategies.includes(String(p.strategy))
      || (p.acceptedAt !== null && (!text(p.acceptedAt,100) || !Number.isFinite(Date.parse(p.acceptedAt))))
      || !isObj(p.lot) || !isObj(p.program)) return false;
  const lot = p.lot;
  if (!text(lot.shape,100) || !text(lot.slope,100) || !text(lot.frontage,100)) return false;
  if (!["width","depth"].every(k=>num(lot[k],0.1,100000))
      || !["setbackFront","setbackRear","setbackLeft","setbackRight"].every(k=>num(lot[k],0,100000))) return false;
  if (!num(p.program.targetArea,0,10000000)
      || !Array.isArray(p.program.rooms) || p.program.rooms.length > 200
      || !p.program.rooms.every((r:unknown)=>isObj(r) && text(r.id,100) && text(r.label,200)
          && num(r.area,0,1000000) && typeof r.include === "boolean")) return false;
  if (!Array.isArray(p.constraints) || p.constraints.length > 200
      || !Array.isArray(p.assumptions) || p.assumptions.length > 200) return false;
  const findings = [...p.constraints, ...p.assumptions];
  if (!findings.every((f:unknown)=>isObj(f) && text(f.id,100) && text(f.text,2000)
      && statuses.includes(String(f.status)))) return false;
  if (!Array.isArray(p.evidence) || p.evidence.length < requiredEvidence.length || p.evidence.length > 100
      || !p.evidence.every((e:unknown)=>isObj(e) && text(e.id,100) && text(e.label,300)
          && statuses.includes(String(e.status)) && typeof e.required === "boolean"
          && text(e.source,2000) && (e.status !== "verified" || e.source.trim().length > 0))) return false;
  const ids = p.evidence.map((e:{id:string})=>e.id);
  if (new Set(ids).size !== ids.length || !requiredEvidence.every(id =>
      p.evidence.some((e:{id:string;required:boolean})=>e.id === id && e.required === true))) return false;
  if (!Array.isArray(p.risks) || p.risks.length > 100 || !p.risks.every((r:unknown)=>
      isObj(r) && text(r.id,100) && text(r.text,2000) && text(r.nextCheck,2000)
      && ["low","medium","high"].includes(String(r.severity))
      && ["open","closed"].includes(String(r.status)))) return false;
  if (!Array.isArray(p.alternatives) || p.alternatives.length > 100 || !p.alternatives.every(alternative)
      || (p.savedLayout !== null && !alternative(p.savedLayout))
      || (p.baselineLayout !== null && !alternative(p.baselineLayout))) return false;
  return true;
}
