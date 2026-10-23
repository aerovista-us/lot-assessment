import assert from 'node:assert/strict';
import {build} from 'esbuild';
import path from 'node:path';
import {webcrypto} from 'node:crypto';
import {JSDOM,VirtualConsole} from 'jsdom';
// Exercise production components with local navigation/download transports.
// This is a DOM interaction test, not authentication or pixel-layout acceptance.
const root=process.cwd();
const result=await build({stdin:{contents:"import React from 'react';\nimport {createRoot} from 'react-dom/client';\nimport {CandidateWorkspaceClient} from './components/workbench/CandidateWorkspaceClient';\nimport {WorkbenchNavigation} from './components/workbench/WorkbenchNavigation';\nimport {pondyCandidateRegistry} from './projects/pondy-lot2/candidate-registry';\nimport {emptyCandidateWorkspace,upsertWorkspaceCandidate} from './packages/candidates/workspace';\nimport {readBrowserWorkspace,persistBrowserWorkspace} from './packages/candidates/browser-workspace';\nconst id='journey-ui-fixture';\nif(!readBrowserWorkspace(localStorage).candidates.some(c=>c.id===id)){\n const candidate=structuredClone(pondyCandidateRegistry.candidates[0]);\n candidate.id=id;candidate.label='Pondy design journey \u00b7 local UI fixture';candidate.revisionLabel='UI fixture';\n candidate.source='AUTOMATION';candidate.components=candidate.components.filter(c=>c.kind!=='roof');\n const home=candidate.components.find(c=>c.kind==='home')!;\n Object.assign(home,{polygon:[[20,5],[60,5],[60,35],[38,35],[38,27.5],[20,27.5]],x:20,y:5,widthFt:40,depthFt:30,rotationDeg:0});\n persistBrowserWorkspace(localStorage,upsertWorkspaceCandidate(emptyCandidateWorkspace(),candidate));\n}\ncreateRoot(document.getElementById('root')!).render(<><p style={{padding:'10px 20px',margin:0,background:'#49371c'}}>Local fixture verification \u00b7 authentication and hosted deployment are not being tested here.</p><WorkbenchNavigation sourceCommit='local-fixture' environment='review'/><div id='workbench-content'><main className='shell workbench-shell candidate-workspace-shell'><CandidateWorkspaceClient candidateId={id}/></main></div></>);\n",resolveDir:root,loader:'tsx'},
 bundle:true,write:false,platform:'browser',format:'iife',target:'es2022',jsx:'automatic',tsconfig:path.join(root,'tsconfig.json'),
 define:{'process.env.NODE_ENV':'"development"'},logLevel:'error',
 plugins:[{name:'test-router',setup(builder){
  builder.onResolve({filter:/^next\/(link|navigation)$/},args=>({path:args.path,namespace:'test-router'}));
  builder.onLoad({filter:/.*/,namespace:'test-router'},args=>({loader:'tsx',resolveDir:root,contents:args.path==='next/link'?
   'import React from "react"; export default function Link({href,children,...props}:any){return <a href={href} {...props}>{children}</a>}':
   'export function usePathname(){return window.location.pathname} export function useRouter(){return {push:()=>{},replace:()=>{},refresh:()=>{},back:()=>{},forward:()=>{},prefetch:()=>{}}}'}));
 }}]});
const script=result.outputFiles[0].text;
const key='lotscope:pondy-lot2:candidate-workspace:v1';
const errors=[];
async function waitFor(check,label){for(let i=0;i<80;i++){if(check())return;await new Promise(r=>setTimeout(r,10));}throw Error('Timed out: '+label+' | '+[...doc.querySelectorAll('.lifecycle-message')].map(e=>e.textContent).join(' | '));}
async function open(raw){
 const console=new VirtualConsole();console.on('error',(...args)=>errors.push(args.join(' ')));
 const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://fixture.test/workbench/projects/pondy-lot2/candidates/journey-ui-fixture',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:console});
 Object.defineProperty(dom.window,'crypto',{value:webcrypto});
 dom.window.structuredClone=structuredClone;dom.window.TextEncoder=TextEncoder;dom.window.URL.createObjectURL=()=> 'blob:local-test';dom.window.URL.revokeObjectURL=()=>{};
 if(raw)dom.window.localStorage.setItem(key,raw);
 dom.window.eval(script);
 await waitFor(()=>dom.window.document.querySelector('#universal-design-editor'),'editor ready');
 return dom;
}
let app=await open();let doc=app.window.document;
const label=[...doc.querySelectorAll('label')].find(l=>l.textContent.includes('Room names (comma separated)'));
const input=label.querySelector('input');
Object.getOwnPropertyDescriptor(app.window.HTMLInputElement.prototype,'value').set.call(input,'Laundry, Kitchen, Living, Primary Bedroom, Primary Bath');
input.dispatchEvent(new app.window.Event('input',{bubbles:true}));
await new Promise(r=>setTimeout(r,20));
const button=text=>[...doc.querySelectorAll('button')].find(b=>b.textContent===text);
button('Generate room layout alternatives').click();
await waitFor(()=>doc.querySelectorAll('.layout-option').length>=3,'three alternatives');
const second=doc.querySelectorAll('.layout-option')[1];second.click();
await waitFor(()=>second.getAttribute('aria-pressed')==='true','non-top selection');
button('Save selected layout').click();
await waitFor(()=>doc.querySelector('[data-saved-design-document]'),'saved document visible');
const selected=JSON.parse(doc.querySelector('[data-saved-design-document]').textContent);
assert.equal(selected.shapes.filter(s=>s.kind==='ROOM').length,5);
const raw=app.window.localStorage.getItem(key);
app.window.close();app=await open(raw);doc=app.window.document;
assert.deepEqual(JSON.parse(doc.querySelector('[data-saved-design-document]').textContent),selected,'Reload changed selected UI document');
[...doc.querySelectorAll('#customer-report-preview button')].find(b=>b.textContent==='Create Customer Report').click();
await waitFor(()=>doc.querySelector('#customer-report-preview iframe'),'report preview');
const reportHtml=doc.querySelector('#customer-report-preview iframe').getAttribute('srcdoc');
const reportDoc=new JSDOM(reportHtml).window.document;
assert.deepEqual(JSON.parse(reportDoc.querySelector('[data-report-design-document]').textContent),selected,'Report preview changed actual UI selection');
assert(doc.querySelector('#customer-report-preview a[download]'),'Current report must be downloadable');
button('Generate room layout alternatives').click();
await waitFor(()=>doc.querySelectorAll('.layout-option').length>=3,'replacement alternatives');
button('Cancel comparison').click();
await waitFor(()=>doc.querySelectorAll('.layout-option').length===0,'comparison cancelled');
assert.deepEqual(JSON.parse(doc.querySelector('[data-saved-design-document]').textContent),selected,'Cancelling comparison changed saved design');
button('Create shape from owner footprint').click();
await waitFor(()=>!doc.querySelector('#customer-report-preview a[download]'),'stale report download blocked');
assert(doc.querySelector('#customer-report-preview [role="alert"]').textContent.includes('Regenerate'));
assert.equal(doc.querySelector('nav a[aria-current="page"]').textContent,'Candidates');
assert.equal(errors.length,0,errors.join('\n'));
app.window.close();
console.log('PASS actual React components: compare three layouts, choose non-top, save, fresh mount/reload, exact report preview, download enable/staleness, cancel replacement without mutation, active navigation; router/download APIs are local test doubles; no hosted authentication or pixel-layout claim');
