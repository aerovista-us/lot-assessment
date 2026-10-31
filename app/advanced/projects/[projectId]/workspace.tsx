'use client';

import Link from 'next/link';
import {useEffect,useState} from 'react';
import {isLotScopePackage} from '@/packages/candidates/workspace';
import {validateDesignDocument,canonicalDesignValue,type DesignDocument} from '@/packages/candidates/design-document';
import type {CandidateRecord} from '@/packages/candidates';

const candidatePattern=/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/;
type DesignRevision={candidate:CandidateRecord;document:DesignDocument;payloadSha256:string};
type PackageSelection={candidate:CandidateRecord;document:DesignDocument};
type ReportPreview={html:string;url:string;revision:number};

async function readError(response:Response):Promise<string> {
  const result=await response.json().catch(()=>null) as {error?:string}|null;
  const code=typeof result?.error==='string'?result.error:`HTTP ${response.status}`;
  return `${code.replaceAll('_',' ')} (${response.status})`;
}
function matchingRevision(saved:DesignRevision,selection:PackageSelection) {
  return saved.candidate.id===selection.candidate.id &&
    saved.document.revision===selection.document.revision &&
    canonicalDesignValue(saved.candidate)===canonicalDesignValue(selection.candidate) &&
    canonicalDesignValue(saved.document)===canonicalDesignValue(selection.document);
}

export function AdvancedProjectWorkspace({projectId}:{projectId:string}) {
  const [candidateId,setCandidateId]=useState('');
  const [selection,setSelection]=useState<PackageSelection|null>(null);
  const [saved,setSaved]=useState<DesignRevision|null>(null);
  const [report,setReport]=useState<ReportPreview|null>(null);
  const [working,setWorking]=useState(false);
  const [message,setMessage]=useState('Import a saved Workbench design package, or load an existing account revision.');
  const [error,setError]=useState<string|null>(null);
  const endpoint=(id:string)=>`/api/advanced/projects/${encodeURIComponent(projectId)}/revisions/${encodeURIComponent(id)}`;
  const clearReport=()=>setReport(null);
  useEffect(()=>()=>{if(report)URL.revokeObjectURL(report.url);},[report]);

  async function importPackage(file:File|null) {
    setSelection(null);setSaved(null);clearReport();setError(null);
    if(!file)return;
    try {
      if(file.size>2_000_000)throw Error('The package is larger than the 2 MB secure upload limit.');
      const parsed:unknown=JSON.parse(await file.text());
      if(!isLotScopePackage(parsed))throw Error('This is not a compatible LotScope Workbench export.');
      const document=(parsed as {designDocument?:DesignDocument}).designDocument;
      if(!document)throw Error('No selected layout is saved in this package. Save a room layout in Workbench before exporting.');
      const candidate=parsed.candidate;
      if(candidate.projectId!==projectId || document.projectId!==projectId)
        throw Error('This export belongs to another project. Existing project ownership cannot be reassigned from a file.');
      if(!candidatePattern.test(candidate.id)||document.revision<1)
        throw Error('The candidate ID or saved revision is invalid.');
      validateDesignDocument(candidate,document);
      setSelection({candidate,document});setCandidateId(candidate.id);
      setMessage(`Selected ${candidate.revisionLabel}, saved design revision ${document.revision}. Review it and save to this account.`);
    } catch(cause) {setError(cause instanceof Error?cause.message:'Unable to read the design export.');}
  }

  async function loadRevision(id=candidateId) {
    setError(null);clearReport();
    if(!candidatePattern.test(id)){setError('Enter a valid candidate ID or import a Workbench package.');return;}
    setWorking(true);
    try {
      const response=await fetch(endpoint(id),{cache:'no-store',credentials:'same-origin'});
      if(!response.ok)throw Error(await readError(response));
      const revision=await response.json() as DesignRevision;
      if(revision.candidate?.id!==id || revision.document?.candidateId!==id ||
        revision.candidate?.projectId!==projectId || revision.document?.projectId!==projectId ||
        !/^[a-f0-9]{64}$/.test(revision.payloadSha256))throw Error('The stored revision did not match the requested project and candidate.');
      validateDesignDocument(revision.candidate,revision.document);
      setSaved(revision);setSelection(null);
      setMessage(`Reloaded account revision ${revision.document.revision} from the private saved design.`);
    }catch(cause){setError(cause instanceof Error?cause.message:'Could not reload the saved revision.');}
    finally{setWorking(false);}
  }

  async function saveRevision() {
    if(!selection || working)return;
    setError(null);clearReport();setWorking(true);
    try {
      const response=await fetch(endpoint(selection.candidate.id),{
        method:'PUT',credentials:'same-origin',headers:{'content-type':'application/json'},
        body:JSON.stringify(selection),
      });
      if(!response.ok)throw Error(await readError(response));
      const verify=await fetch(endpoint(selection.candidate.id),{cache:'no-store',credentials:'same-origin'});
      if(!verify.ok)throw Error(`Save was submitted, but read-back failed: ${await readError(verify)}`);
      const revision=await verify.json() as DesignRevision;
      if(!matchingRevision(revision,selection))throw Error('The saved revision differs from the selected design. The report remains blocked.');
      setSaved(revision);setSelection(null);
      setMessage(`Save and server reload verified. Revision ${revision.document.revision} matches the selected design.`);
    }catch(cause){setSaved(null);setError(cause instanceof Error?cause.message:'Save or read-back could not be verified.');}
    finally{setWorking(false);}
  }

  async function generateReport() {
    if(!saved || working)return;
    setError(null);clearReport();setWorking(true);
    try {
      const url=`/api/advanced/projects/${encodeURIComponent(projectId)}/report?candidateId=${encodeURIComponent(saved.candidate.id)}`;
      const response=await fetch(url,{cache:'no-store',credentials:'same-origin'});
      if(!response.ok)throw Error(await readError(response));
      const html=await response.text();
      const document=new DOMParser().parseFromString(html,'text/html');
      const embedded=document.querySelector('[data-report-design-document]')?.textContent;
      if(!embedded)throw Error('Report is missing its source revision evidence.');
      const parsed=JSON.parse(embedded) as DesignDocument;
      if(canonicalDesignValue(parsed)!==canonicalDesignValue(saved.document))
        throw Error('The report was generated from a different design revision. Download is blocked.');
      const blobUrl=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}));
      setReport({html,url:blobUrl,revision:saved.document.revision});
      setMessage(`Report verified against account-saved revision ${saved.document.revision}.`);
    }catch(cause){setError(cause instanceof Error?cause.message:'The report could not be verified.');}
    finally{setWorking(false);}
  }

  const shapes=saved?.document.shapes||selection?.document.shapes||[];
  const rooms=shapes.filter(shape=>shape.kind==='ROOM');
  const zoneCount=shapes.length;
  return <main className="shell" style={{padding:'32px 24px 70px',maxWidth:1100,margin:'0 auto'}}>
    <nav aria-label="Project breadcrumb" style={{marginBottom:20}}><Link href="/advanced">Advanced</Link> / <span aria-current="page">Project {projectId}</span></nav>
    <p className="eyebrow">LOT SCOPE · ACCOUNT WORKSPACE</p>
    <h1>Your design, saved to your account.</h1>
    <p>Import the exact selected Workbench design, save it to your authorized project, reload it from the private store, and build a report from that same revision. Nothing is published merely by importing a file.</p>
    <ol style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:12,paddingLeft:22,margin:'24px 0'}}>
      <li>Choose a design</li><li>Save to your account</li><li>Reload and verify</li><li>Generate matching report</li>
    </ol>
    <p role="status" aria-live="polite" className="wb-panel" style={{padding:14}}>{message}</p>
    {error?<p role="alert" style={{border:'1px solid #bf6a6a',borderRadius:8,padding:14}}>{error}</p>:null}
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:20}}>
      <section className="wb-panel" style={{padding:22}} aria-label="Import and save selected design">
        <h2>1 · Bring your Workbench design</h2>
        <p>Save the chosen room layout and export its <code>.lotscope.json</code> package from Workbench. Only an export belonging to this project can be saved here.</p>
        <p><Link href="/workbench">Open Workbench</Link></p>
        <label htmlFor="advanced-package">Select LotScope export file</label>
        <input id="advanced-package" data-advanced-import type="file" accept=".json,.lotscope.json,application/json" disabled={working} onChange={event=>void importPackage(event.currentTarget.files?.[0]||null)} style={{display:'block',margin:'10px 0 22px',maxWidth:'100%'}}/>
        {selection?<div><h3>{selection.candidate.revisionLabel}</h3><p>Candidate <code>{selection.candidate.id}</code> · revision {selection.document.revision} · {zoneCount} zones</p>
          <button type="button" className="primary-button" data-advanced-save disabled={working} onClick={()=>void saveRevision()}>{working?'Verifying…':'Save and verify account revision'}</button></div>:null}
      </section>
      <section className="wb-panel" style={{padding:22}} aria-label="Reload saved design">
        <h2>2 · Resume an account design</h2>
        <p>Enter the candidate ID from an existing saved project, or use the ID populated by an imported package.</p>
        <label htmlFor="advanced-candidate-id">Candidate ID</label>
        <input id="advanced-candidate-id" data-advanced-candidate-id value={candidateId} disabled={working} onChange={event=>{setCandidateId(event.target.value);setSaved(null);clearReport();}} style={{width:'100%',margin:'10px 0 18px',padding:9}}/>
        <button type="button" className="secondary-button" data-advanced-reload disabled={working||!candidatePattern.test(candidateId)} onClick={()=>void loadRevision()}>Reload from private account storage</button>
        {saved?<div style={{marginTop:20}} data-advanced-saved-revision={saved.document.revision}>
          <strong>Verified saved revision {saved.document.revision}</strong>
          <p>{saved.candidate.revisionLabel} · {zoneCount} zones · {rooms.length} rooms · {saved.document.doors?.length??0} proposed doors</p>
          <p>Source fingerprint <code style={{overflowWrap:'anywhere'}}>{saved.payloadSha256}</code></p>
        </div>:null}
      </section>
    </div>
    <section className="wb-panel" style={{marginTop:20,padding:22}} aria-label="Saved design report">
      <h2>3 · Explain the saved design</h2>
      <p>Reports are produced from your account’s authoritative saved revision—not a browser draft or a newly generated alternative.</p>
      <button type="button" className="primary-button" data-advanced-report disabled={!saved||working} onClick={()=>void generateReport()}>{working?'Verifying report…':'Generate saved-revision report'}</button>
      {report?<div data-advanced-report-verified={report.revision} style={{marginTop:20}}>
        <p><strong>Matching report confirmed · revision {report.revision}</strong></p>
        <a className="secondary-button" href={report.url} download={`${projectId}-${saved?.candidate.id||'design'}-revision-${report.revision}.html`}>Download matching customer report</a>
        <iframe title="Verified customer design report" sandbox="" srcDoc={report.html} style={{display:'block',width:'100%',height:560,border:'1px solid #58657b',borderRadius:12,marginTop:20}}/>
      </div>:null}
    </section>
    <p style={{marginTop:22,opacity:.82}}>Digital concept approval does not constitute structural, site, fire, access, permitting, or construction approval. Independent professional and jurisdictional review remains necessary.</p>
  </main>;
}
