import Link from 'next/link';
import {SitePlanDiagram} from '@/components/SitePlanDiagram';
import {assessLot,type LotAssessmentInput} from '@/lib/assessment';
const LOTSCOPE_ADVANCED_STORE_URL='https://account.aerocoreos.com/store?product=lotscope-advanced-paid';
const LOTSCOPE_PILOT_STORE_URL='https://account.aerocoreos.com/store?product=lotscope-advanced-pilot';

const sample:LotAssessmentInput={lotWidthFt:78,lotDepthFt:125,frontSetbackFt:20,rearSetbackFt:20,leftSetbackFt:6,rightSetbackFt:6,maxLotCoveragePct:40,units:1,livingAreaPerUnitSqFt:2000,stories:2,garageSpacesPerUnit:2,garageIntegrated:true,drivewayWidthFt:20,minimumAccessWidthFt:20};
const stages=[
 ['01 / UNDERSTAND','Start with the parcel','Review boundary, frontage, setbacks and assumptions before choosing a building program.'],
 ['02 / DESIGN','Create and compare','Explore room layouts, relationships and proposed circulation, then choose a preferred option.'],
 ['03 / RETAIN','Keep the chosen revision','Save a Workbench package to an account-authorized private project without changing the underlying parcel.'],
 ['04 / EXPLAIN','Report from the saved design','Reopen the selected revision and generate a report with consistent geometry and explicit review limits.'],
] as const;
export default function AdvancedOverview(){
 return <main className="shell arch-advanced-shell" style={{paddingBottom:90}}>
  <header className="topbar">
   <Link href="/" className="brand-lockup" style={{textDecoration:'none'}}><span className="brand-mark">LS</span><span><strong>LotScope / Advanced</strong><span>Architectural Site Studio</span></span></Link>
   <nav className="studio-nav" aria-label="Main navigation"><Link href="/">Free assessment</Link><Link href="/workbench">Workbench</Link><Link href="/" className="nav-accent">Free site assessment ↗</Link></nav>
  </header>
  <section className="public-hero">
   <div className="public-hero-copy">
    <p className="hero-kicker">ADVANCED PREVIEW / CONTROLLED RELEASE</p>
    <h1>From lot lines to <span className="hero-strong">a place worth building.</span></h1>
    <p className="lede">LotScope Advanced connects site constraints with authored room layouts, private project revisions, and a customer report that explains the chosen design—not just a drawing.</p>
    <div className="hero-ctas"><Link className="primary-button" href="/">Start a free site study ↗</Link><a className="secondary-button" href="#access">Explore access passes</a></div>
    <div className="hero-footnotes"><span>Account-scoped projects</span><span>Source-bound drawings</span><span>Traceable decisions</span></div>
    <div className="notice"><strong>Access is gated.</strong> Paid checkout and private projects are still release-gated until verified payment and Identity acceptance. Buying a pass does not automatically assign ownership of a project.</div>
   </div>
   <div className="hero-plan"><SitePlanDiagram input={sample} result={assessLot(sample)} id="advanced-sample"/><p className="microcopy">Illustrative example inputs, not a customer parcel or an engineered placement.</p></div>
  </section>
  <section className="arch-advanced-steps" aria-label="Advanced design workflow">{stages.map(([n,title,desc])=><div key={n}><span>{n}</span><strong>{title}</strong><p>{desc}</p></div>)}</section>
  <section className="section">
   <div className="section-heading"><div><p className="eyebrow">TOOLS WITH A PURPOSE</p><h2>More than a floor-plan generator.</h2></div><span className="mode-pill">SOURCE-BOUND CONCEPTS</span></div>
   <div className="arch-proof">
    <article><strong>Parcel-aware reasoning</strong><p>Preserve lot geometry and locked source constraints. Unproven irregular setbacks and access remain open.</p></article>
    <article><strong>Deliberate room relationships</strong><p>Create alternatives for room programs, examine adjacency and proposed corridors, and save the option you actually prefer.</p></article>
    <article><strong>Account-revision proof</strong><p>A private project requires a paid entitlement and a separate project-specific permission. Save, reload and compare the identical document.</p></article>
    <article><strong>Explainable reports</strong><p>Every report retains source geometry and design identity and marks unsupported physical/architectural evidence as open.</p></article>
   </div>
  </section>
  <section className="section" id="access">
   <p className="eyebrow">ACCESS / NO AUTO-RENEWAL</p><h2>A pass for the way you design.</h2>
   <p className="sub">Listed one-time prices. Live checkout availability is determined by the service. Access starts after confirmed payment, and a separate project assignment is required.</p>
   <div className="arch-product-grid">
    <article className="arch-product-card"><span className="arch-step-label">EXPLORATION / 07 DAYS</span><h2>Advanced Pilot</h2><div className="arch-price">$0.01</div><p>Explore deeper design tools with a seven-day window. One-time purchase, no automatic renewal.</p><a href={LOTSCOPE_PILOT_STORE_URL} rel="noopener noreferrer">View in AeroVista Account ↗</a></article>
    <article className="arch-product-card"><span className="arch-step-label">DESIGN DEVELOPMENT / 90 DAYS</span><h2>Advanced Paid</h2><div className="arch-price">$9.99</div><p>Continue the design work with a ninety-day window. One-time purchase, no automatic renewal.</p><a href={LOTSCOPE_ADVANCED_STORE_URL} rel="noopener noreferrer">View in AeroVista Account ↗</a></article>
   </div>
  </section>
  <section className="arch-proof">
   <article><strong>Returning with a project?</strong><p>The protected Advanced project workflow is being validated separately. No private customer access is claimed on this public preview.</p><p><Link className="secondary-button" href="/">Explore free LotScope ↗</Link></p></article>
   <article><strong>Explore before committing?</strong><p>Test parcel dimensions and project programs, compare screening results and save a local study for free.</p><p><Link className="secondary-button" href="/">Free site assessment ↗</Link></p></article>
  </section>
  <p className="arch-disclaimer">DIGITAL CONCEPT / NOT FOR CONSTRUCTION. Neither a model verdict nor payment establishes surveyed boundaries, zoning, access, structural design, fire separation, permit or jurisdictional approval.</p>
  <footer>LOT SCOPE / ADVANCED · AEROVISTA LOCAL · SITE → DESIGN → REPORT</footer>
 </main>;
}
