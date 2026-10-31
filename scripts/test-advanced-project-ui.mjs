import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM,VirtualConsole} from 'jsdom';
import {pondyCandidateRegistry} from '../projects/pondy-lot2/candidate-registry.ts';
import {emptyDesignDocument,addOwnerFootprintShape} from '../packages/candidates/design-document.ts';
import {emptyCandidateWorkspace,saveWorkspaceDesignDocument,createWorkspaceExportPackage} from '../packages/candidates/workspace.ts';
import {createCandidateConceptHtml} from '../packages/candidates/customer-report.ts';
import {resolve} from 'node:path';

const projectId=pondyCandidateRegistry.candidates[0].projectId;
const candidate=structuredClone(pondyCandidateRegistry.candidates[0]);
const owner=candidate.components.find(c=>c.kind==='home');
let doc=emptyDesignDocument(candidate);
doc=addOwnerFootprintShape(candidate,doc,{ownerId:owner.id,label:'Ground',kind:'FLOOR_PLATE',story:'GROUND'});
const workspace=saveWorkspaceDesignDocument(emptyCandidateWorkspace(),candidate,doc);
const exported=createWorkspaceExportPackage(pondyCandidateRegistry,workspace,candidate.id);
assert(exported?.designDocument,'Export must contain saved Workbench design');
function reverseJsonKeys(value) {
 if(Array.isArray(value))return value.map(reverseJsonKeys);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).reverse().map(([k,v])=>[k,reverseJsonKeys(v)]));
 return value;
}
const saved={candidate:reverseJsonKeys(candidate),document:reverseJsonKeys(doc),payloadSha256:'a'.repeat(64)};
const reportHtml=(await createCandidateConceptHtml(saved.candidate,saved.document)).html;
const compiled=await build({
 stdin:{contents:"import React from 'react';import {createRoot} from 'react-dom/client';import {AdvancedProjectWorkspace} from './app/advanced/projects/[projectId]/workspace';createRoot(document.getElementById('root')).render(<AdvancedProjectWorkspace projectId='"+projectId+"'/>);",resolveDir:process.cwd(),loader:'tsx'},
 bundle:true,write:false,platform:'browser',format:'iife',target:'es2022',jsx:'automatic',tsconfig:resolve('tsconfig.json'),define:{'process.env.NODE_ENV':'"development"'},
 plugins:[{name:'next-link-stub',setup(builder){builder.onResolve({filter:/^next\/link$/},args=>({path:args.path,namespace:'stub'}));builder.onLoad({filter:/.*/,namespace:'stub'},()=>({loader:'tsx',resolveDir:process.cwd(),contents:'import React from "react";export default function Link({href,children,...props}){return <a href={href} {...props}>{children}</a>}'}));}}],logLevel:'error'
});
const errors=[];const vconsole=new VirtualConsole();vconsole.on('error',err=>errors.push(err));
const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'https://lotscope.aerovista.us/advanced/projects/'+projectId,runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vconsole});
const win=dom.window;win.structuredClone=structuredClone;win.URL.createObjectURL=()=> 'blob:verified-local-report';win.URL.revokeObjectURL=()=>{};
let stored=null;let misreport=false;const calls=[];
win.fetch=async (path,options={})=>{
 calls.push({path,method:options.method||'GET'});
 if(path.includes('/report'))return new Response(misreport?(await createCandidateConceptHtml(saved.candidate,{...saved.document,revision:999})).html:reportHtml,{status:200,headers:{'content-type':'text/html'}});
 if(options.method==='PUT'){stored=structuredClone(saved);return Response.json({saved:true,revision:doc.revision,unchanged:false},{status:201});}
 if(stored)return Response.json(stored);
 return Response.json({error:'revision_not_found'},{status:404});
};
win.eval(compiled.outputFiles[0].text);
const document=win.document;
async function wait(predicate,label){for(let i=0;i<160;i++){if(predicate())return;await new Promise(r=>setTimeout(r,12));}throw Error('Timed out '+label+' '+document.body.textContent?.slice(-400));}
await wait(()=>document.querySelector('[data-advanced-import]'),'advanced project portal');
const input=document.querySelector('[data-advanced-import]');
function upload(data){Object.defineProperty(input,'files',{configurable:true,value:[{size:60000,text:async()=>JSON.stringify(data)}]});input.dispatchEvent(new win.Event('change',{bubbles:true}));}
upload(exported);
await wait(()=>document.querySelector('[data-advanced-save]'),'selected design file');
assert(document.body.textContent.includes('revision '+doc.revision));
document.querySelector('[data-advanced-save]').click();
await wait(()=>document.querySelector('[data-advanced-saved-revision]'),'authoritative save and readback');
assert(calls.some(c=>c.method==='PUT'));
assert(calls.some(c=>c.method==='GET'&&c.path.includes('/revisions/')));
assert(!document.querySelector('[data-advanced-report-verified]'));
document.querySelector('[data-advanced-report]').click();
await wait(()=>document.querySelector('[data-advanced-report-verified]'),'matching report verified');
assert(document.querySelector('a[download]'));
assert(document.body.textContent.includes('Matching report confirmed'));
misreport=true;
document.querySelector('[data-advanced-report]').click();
await wait(()=>document.querySelector('[role="alert"]')?.textContent?.includes('different design revision'),'wrong report rejected');
assert(!document.querySelector('a[download]'),'Mismatched report must not be downloadable');
const hostile={...exported,candidate:{...exported.candidate,projectId:'other-project'}};
upload(hostile);
await wait(()=>document.querySelector('[role="alert"]')?.textContent?.includes('another project'),'cross-project export rejected');
assert(!document.querySelector('[data-advanced-save]'));
assert(!document.querySelector('[data-advanced-report]')?.disabled===false||!document.querySelector('a[download]'));
assert.equal(errors.length,0,errors.join('\n'));
console.log('ADVANCED_ACCOUNT_WORKSPACE_BROWSER_DOM_IMPORT_SAVE_RELOAD_MATCHED_REPORT_CROSS_PROJECT_DENIAL_PASS');
win.close();
