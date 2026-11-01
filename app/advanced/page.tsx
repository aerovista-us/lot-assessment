import Link from 'next/link';
import {redirect} from 'next/navigation';
import {getAdvancedSession} from '@/lib/aerovista/advanced-session';
import {getAdvancedAeroVistaServerAdapter} from '@/lib/aerovista/advanced-app-adapter.server';
import {ADVANCED_CAPABILITY} from '@/lib/aerovista/advanced-access';
import {LOTSCOPE_ADVANCED_STORE_URL,LOTSCOPE_PILOT_STORE_URL} from '@/lib/aerovista/advanced-config';
import {AdvancedProjectLauncher} from '@/components/AdvancedProjectLauncher';

export const dynamic='force-dynamic';
const stages=[
 ['01','AUTHORIZED','Verify the active pass and private project assignment.'],
 ['02','SELECTED','Choose a Workbench room/floor alternative.'],
 ['03','SAVED','Store and reload the exact revision on your account.'],
 ['04','DOCUMENTED','Generate the report from the verified saved design.']
] as const;
export default async function AdvancedHome(){
 const session=await getAdvancedSession();
 if(!session)redirect('/advanced-auth?next=/advanced');
 let entitled=false;
 try {
  const check=await getAdvancedAeroVistaServerAdapter().identity.can({
   identityId:session.identity.identityId,capability:ADVANCED_CAPABILITY
  });
  entitled=Boolean(check.allowed);
 }catch{/* Identity failures deny access */}
 return <main className="shell arch-advanced-shell" style={{paddingBottom:85}}>
  <header className="topbar"><Link className="brand-lockup" href="/advanced/overview" style={{textDecoration:'none'}}>
   <span className="brand-mark">LS</span><span><strong>LotScope / Advanced</strong><span>Private Architectural Studio</span></span></Link>
   <nav className="studio-nav" aria-label="Advanced navigation"><Link href="/">Free site study</Link><Link href="/advanced/overview">Capabilities</Link><Link href="/workbench">Workbench</Link><a className="nav-accent" href="https://account.aerocoreos.com/purchases" rel="noopener noreferrer">My purchases ↗</a></nav>
  </header>
  <section className="arch-advanced-hero">
   <p className="eyebrow">02 / ACCOUNT DESIGN STUDIO</p>
   <h1>{entitled?'Your next design decision starts here.':'Your design access needs a check.'}</h1>
   <p>{entitled
    ?'Your Advanced capability is verified. Open a project assigned to your account, select the design you want to keep and build a report from the saved source.'
    :'An Advanced entitlement is not currently verified for this session. You can review the listed one-time passes, or keep using free LotScope.'}</p>
   <div className="arch-status-strip" role="status"><strong>{entitled?'ADVANCED CAPABILITY VERIFIED':'ADVANCED ACCESS UNAVAILABLE'}</strong>
    <span>{entitled?'Project permission is checked separately on open.':'Checkout and permission services must be available before access can be granted.'}</span></div>
  </section>
  <section className="arch-advanced-steps" aria-label="Account design workflow">{stages.map(([num,name,description])=>
   <div key={num}><span>{num} / {name}</span><strong>{name==='AUTHORIZED'?'Enter your project':name==='SELECTED'?'Choose a layout':name==='SAVED'?'Prove read-back':'Make your report'}</strong><p>{description}</p></div>
  )}</section>
  {entitled?<div className="arch-project-grid">
   <AdvancedProjectLauncher/>
   <section className="arch-onboarding"><span className="arch-step-label">A REPEATABLE DESIGN WORKFLOW</span>
    <h2>Keep the source, not just the picture.</h2>
    <p>Your project records distinguish an imported browser design from a verified account revision. The report stays blocked if the saved design and report source disagree.</p>
    <Link className="secondary-button" href="/workbench">Open the design Workbench ↗</Link>
    <p>Staff-only Workbench authoring remains independently permission-gated. An Advanced customer pass does not grant internal engineering access.</p>
   </section>
  </div>:<div className="arch-product-grid" aria-label="Available Advanced product descriptions">
   <article className="arch-product-card"><span className="arch-step-label">07 DAYS · ONE-TIME</span><h2>Advanced Pilot</h2><div className="arch-price">$0.01</div><p>Explore Advanced with a seven-day access window. Checkout remains subject to live release readiness.</p><a href={LOTSCOPE_PILOT_STORE_URL} rel="noopener noreferrer">View in AeroVista Account ↗</a></article>
   <article className="arch-product-card"><span className="arch-step-label">90 DAYS · ONE-TIME</span><h2>Advanced Paid</h2><div className="arch-price">$9.99</div><p>A longer ninety-day access window, without automatic renewal. Separate assignment is required for private project access.</p><a href={LOTSCOPE_ADVANCED_STORE_URL} rel="noopener noreferrer">View in AeroVista Account ↗</a></article>
  </div>}
  <p className="arch-disclaimer">Conceptual design and model checks are not construction approval. Professional survey, code, structural, access, fire and jurisdictional review remain independent.</p>
  <footer>LOT SCOPE / ADVANCED · ACCOUNT SCOPED · REVISION VERIFIED</footer>
 </main>;
}
