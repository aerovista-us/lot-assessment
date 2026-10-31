import Link from 'next/link';
import {authorizeAdvancedProject} from '@/lib/aerovista/advanced-access';
import {AdvancedProjectWorkspace} from './workspace';

export const dynamic = 'force-dynamic';

export default async function AdvancedProjectPage({params}:{params:Promise<{projectId:string}>}) {
  const {projectId}=await params;
  const authorization=await authorizeAdvancedProject(projectId);
  if (!authorization.allowed) return <main className="shell" style={{maxWidth:760,margin:'7vh auto',padding:24}}>
    <p className="eyebrow">LotScope Advanced</p>
    <h1>Private project access required</h1>
    <p>This project is available only to the account assigned to it. An Advanced purchase alone does not grant access to another customer’s land or plans.</p>
    <p>{authorization.status === 401 ? 'Sign in with the account associated with this project.' : 'Your entitlement, project assignment, or service connectivity has not been verified.'}</p>
    <p><Link href="/advanced-auth">Sign in to Advanced</Link> · <Link href="/advanced">Advanced home</Link></p>
  </main>;
  return <AdvancedProjectWorkspace projectId={projectId}/>;
}
