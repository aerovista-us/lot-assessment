import Link from "next/link";
import { LOTSCOPE_PROJECTS } from "@/lib/lotscope-project-catalog";
import manifest from "@/projects/import-manifests/b-street-1011.json";

export const metadata = { title: "LotScope Workbench · B Street project" };

export default function BStreetProjectPage() {
  const project = LOTSCOPE_PROJECTS.find((item) => item.id === "b-street-1011")!;
  return <main className="shell workbench-shell lot-workspace-shell">
    <section className="staff-page-head">
      <p className="eyebrow">PROJECT / B STREET</p>
      <h1>{project.name}</h1>
      <p className="lede">Owner strategy and site-feasibility project — not a separate application or verified parcel design.</p>
      <div className="hero-actions"><Link href="/workbench/projects" className="secondary-button">← All projects</Link></div>
    </section>
    <section className="lot-workspace-grid">
      <article className="wb-panel"><p className="eyebrow">SOURCE DOCUMENTS</p><h2>Owner Powerhouse and research</h2>
        <p>The source repository holds the current owner-facing strategy, document kit, decision paths and due-diligence record. These have not yet been imported into shared Workbench project storage.</p>
        <a className="secondary-button" href={project.customerReport.sourcePath} target="_blank" rel="noopener noreferrer">Review project source repository ↗</a>
      </article>
      <article className="wb-panel"><p className="eyebrow">IMPORT STATUS</p><h2>Import pending</h2><p>Map intake facts, provenance, frontage alternatives, source register, evidence and owner reports to a versioned project revision. Do not automatically replace source records.</p><span className="repair-watch">NOT VALIDATED OR PROMOTED</span></article>
      <article className="wb-panel"><p className="eyebrow">PROFESSIONAL GATES</p><h2>Survey, title, City and lender</h2><p>The parcel split and owner exit strategy require independent professional and authority confirmation. Keep decision outputs conditional.</p><span className="repair-watch">REVIEW REQUIRED</span></article>
    </section>
    <section className="wb-panel" aria-label="Source-pinned B Street import preview">
      <p className="eyebrow">IMPORT PREVIEW / READ ONLY</p><h2>Source-pinned documents</h2>
      <p>Repository: {manifest.sourceRepository} · Revision: <code>{manifest.sourceRevision.slice(0, 12)}</code></p>
      <p>Links below point to source files at that exact revision. File inclusion does not mean its conclusions are professionally verified or imported.</p>
      <div className="project-list">{manifest.artifacts.map(artifact => <div className="project-row-card" key={artifact.id}>
        <div><span className="mode-pill">{artifact.evidenceState.replaceAll("_", " ")}</span><h3>{artifact.title}</h3><p>{artifact.type} · {artifact.visibility} · import pending</p></div>
        <a href={`https://github.com/${manifest.sourceRepository}/blob/${manifest.sourceRevision}/${artifact.path}`} target="_blank" rel="noopener noreferrer">View pinned source ↗</a>
      </div>)}</div>
    </section>
    <section className="wb-panel"><p className="eyebrow">CUSTOMER REPORT</p><h2>{project.customerReport.label}</h2><p>Existing source deliverables remain preserved. Authenticated project-scoped report import, HTML/PDF parity and consent-controlled release are pending. No automatic publication is enabled.</p></section>
  </main>;
}
