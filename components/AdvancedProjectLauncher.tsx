'use client';
import {useState,type FormEvent} from 'react';
import {useRouter} from 'next/navigation';

/** The URL is never a grant: the destination rechecks entitlement and
 * project-scoped permission on every request. */
export function AdvancedProjectLauncher() {
 const router=useRouter();
 const [id,setId]=useState('');
 const valid=/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(id);
 const submit=(event:FormEvent)=>{event.preventDefault();if(valid)router.push('/advanced/projects/'+encodeURIComponent(id));};
 return <form className="arch-onboarding" onSubmit={submit} aria-label="Open an assigned private project">
  <span className="arch-step-label">YOUR ACCOUNT / PROJECT ACCESS</span>
  <h2>Resume an assigned design.</h2>
  <p>Enter the project ID provided with your assignment. We verify project read/edit permissions separately from your Advanced pass. Unknown or unassigned projects remain private.</p>
  <label htmlFor="assigned-project-id">Assigned project ID</label>
  <div className="arch-project-actions">
   <input id="assigned-project-id" className="arch-project-input" style={{flex:'2 1 220px',margin:0}} value={id} onChange={event=>setId(event.target.value)} placeholder="e.g. your-project-id" autoComplete="off"/>
   <button type="submit" className="primary-button" disabled={!valid}>Open private project ↗</button>
  </div>
  <p>Not seeing a project? Your account may have an active pass but no project assignment yet. Contact the project coordinator; buying a second pass will not create a project.</p>
 </form>;
}
