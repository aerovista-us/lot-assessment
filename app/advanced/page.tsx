import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAdvancedSession } from '@/lib/aerovista/advanced-session';
import { getAdvancedAeroVistaServerAdapter } from '@/lib/aerovista/advanced-app-adapter.server';
import { ADVANCED_CAPABILITY } from '@/lib/aerovista/advanced-access';
import { LOTSCOPE_ADVANCED_STORE_URL, LOTSCOPE_PILOT_STORE_URL } from '@/lib/aerovista/advanced-config';
export const dynamic = 'force-dynamic';
export default async function AdvancedHome() {
  const session = await getAdvancedSession();
  if (!session) redirect('/advanced-auth?next=/advanced');
  let entitled = false;
  try {
    const answer = await getAdvancedAeroVistaServerAdapter().identity.can({identityId:session.identity.identityId,capability:ADVANCED_CAPABILITY});
    entitled = Boolean(answer.allowed);
  } catch { /* fail closed */ }
  if (!entitled) return <main className="shell" style={{padding:24, maxWidth:900, margin:'0 auto'}}>
    <p className="eyebrow">LotScope Advanced</p>
    <h1>Design further. Keep every revision.</h1>
    <p>Advanced access has not been verified for this account. You can explore one-time access passes in AeroVista Account; checkout is available only when the secure purchase and design services are ready.</p>
    <section aria-label="Access options" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(250px,1fr))',gap:16,margin:'24px 0'}}>
      <article style={{border:'1px solid var(--border, #58657b)',borderRadius:14,padding:18}}><h2>Advanced Pilot</h2><p><strong>$0.01</strong> · 7 days · one-time</p><p>Evaluate advanced design tools with a short access pass.</p><a href={LOTSCOPE_PILOT_STORE_URL} rel="noopener noreferrer">View pilot in AeroVista Account</a></article>
      <article style={{border:'1px solid var(--border, #58657b)',borderRadius:14,padding:18}}><h2>Advanced Paid</h2><p><strong>$9.99</strong> · 90 days · one-time</p><p>Continue design work with a longer access window. Nothing renews automatically.</p><a href={LOTSCOPE_ADVANCED_STORE_URL} rel="noopener noreferrer">View 90-day pass in AeroVista Account</a></article>
    </section>
    <p>Access starts only after confirmed payment. Opening a private project also requires an authorized project assignment. A saved digital concept is not a real-world construction approval.</p>
    <Link href="/">Continue with free LotScope</Link>
  </main>;
  return <main className="shell" style={{padding:24}}>
    <p className="eyebrow">LotScope Advanced</p><h1>Your account is ready for private projects.</h1>
    <p>Your paid access is verified. Project-specific access must also be granted before any designs can be opened.</p>
    <p>This initial protected release does not invent a list of projects or silently import browser drafts. Open the project link provided for your account.</p>
    <p><a href="https://account.aerocoreos.com/purchases" rel="noopener noreferrer">View your purchases and access period</a></p>
    <Link href="/">Public LotScope</Link>
  </main>;
}
