import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAdvancedSession } from '@/lib/aerovista/advanced-session';
import { getAdvancedAeroVistaServerAdapter } from '@/lib/aerovista/advanced-app-adapter.server';
import { ADVANCED_CAPABILITY } from '@/lib/aerovista/advanced-access';
export const dynamic = 'force-dynamic';
export default async function AdvancedHome() {
  const session = await getAdvancedSession();
  if (!session) redirect('/advanced-auth?next=/advanced');
  let entitled = false;
  try {
    const answer = await getAdvancedAeroVistaServerAdapter().identity.can({identityId:session.identity.identityId,capability:ADVANCED_CAPABILITY});
    entitled = Boolean(answer.allowed);
  } catch { /* fail closed */ }
  if (!entitled) return <main className="shell" style={{padding:24}}><h1>Advanced access unavailable</h1><p>Account access has not been verified. Your free LotScope assessment is still available.</p><Link href="/">Public LotScope</Link></main>;
  return <main className="shell" style={{padding:24}}>
    <p className="eyebrow">LotScope Advanced</p><h1>Your account is ready for private projects.</h1>
    <p>Your paid access is verified. Project-specific access must also be granted before any designs can be opened.</p>
    <p>This initial protected release does not invent a list of projects or silently import browser drafts. Open the project link provided for your account.</p>
    <Link href="/">Public LotScope</Link>
  </main>;
}
