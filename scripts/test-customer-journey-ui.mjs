import assert from 'node:assert/strict';
import {build} from 'esbuild';
import path from 'node:path';
import {webcrypto} from 'node:crypto';
import {JSDOM,VirtualConsole} from 'jsdom';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
// Exercise production components with local navigation/download transports.
// This is a DOM interaction test, not authentication or pixel-layout acceptance.
const root=process.cwd();
const result=await build({stdin:{contents:"import React from 'react';\nimport {createRoot} from 'react-dom/client';\nimport {CandidateWorkspaceClient} from './components/workbench/CandidateWorkspaceClient';\nimport {WorkbenchNavigation} from './components/workbench/WorkbenchNavigation';\nimport {CandidateLibraryWorkspace} from './components/workbench/CandidateLibraryWorkspace';\nimport {CandidateCompareWorkspace} from './components/workbench/CandidateCompareWorkspace';\nimport WorkbenchHome from './app/workbench/page';\nimport {pondyCandidateRegistry} from './projects/pondy-lot2/candidate-registry';\nimport {emptyCandidateWorkspace,upsertWorkspaceCandidate} from './packages/candidates/workspace';\nimport {readBrowserWorkspace,persistBrowserWorkspace} from './packages/candidates/browser-workspace';\nconst id='journey-ui-fixture';\nif(!readBrowserWorkspace(localStorage).candidates.some(c=>c.id===id)){\n const candidate=structuredClone(pondyCandidateRegistry.candidates[0]);\n candidate.id=id;candidate.label='Pondy design journey \u00b7 local UI fixture';candidate.revisionLabel='UI fixture';\n candidate.source='STAFF_INTERVENTION';candidate.components=candidate.components.filter(c=>c.kind!=='roof');\n const home=candidate.components.find(c=>c.kind==='home')!;\n Object.assign(home,{polygon:[[20,5],[60,5],[60,35],[38,35],[38,27.5],[20,27.5]],x:20,y:5,widthFt:40,depthFt:30,rotationDeg:0});\n persistBrowserWorkspace(localStorage,upsertWorkspaceCandidate(emptyCandidateWorkspace(),candidate));\n}\ncreateRoot(document.getElementById('root')!).render(<><p style={{padding:'10px 20px',margin:0,background:'#49371c'}}>Local fixture verification \u00b7 authentication and hosted deployment are not being tested here.</p><WorkbenchNavigation sourceCommit='local-fixture' environment='review'/><div id='workbench-content'>{window.location.pathname.endsWith('/workbench')?<WorkbenchHome/>:<main className='shell workbench-shell candidate-workspace-shell'>{window.location.pathname.endsWith('/candidates')?<CandidateLibraryWorkspace/>:window.location.pathname.endsWith('/compare')?<CandidateCompareWorkspace/>:<CandidateWorkspaceClient candidateId={id}/>}</main>}</div></>);\n",resolveDir:root,loader:'tsx'},
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
async function waitFor(check,label){for(let i=0;i<80;i++){if(check())return;await new Promise(r=>setTimeout(r,10));}throw Error('Timed out: '+label+' | '+[...doc.querySelectorAll('.lifecycle-message,.intervention-message')].map(e=>e.textContent).join(' | '));}
async function open(raw,url='http://fixture.test/workbench/projects/pondy-lot2/candidates/journey-ui-fixture'){
 const console=new VirtualConsole();console.on('error',(...args)=>errors.push(args.join(' ')));
 const dom=new JSDOM('<!doctype html><div id="root"></div>',{url,runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:console});
 Object.defineProperty(dom.window,'crypto',{value:webcrypto});
 dom.window.structuredClone=structuredClone;dom.window.TextEncoder=TextEncoder;dom.window.URL.createObjectURL=()=> 'blob:local-test';dom.window.URL.revokeObjectURL=()=>{};
 if(raw)dom.window.localStorage.setItem(key,raw);
 dom.window.eval(script);
 await waitFor(()=>dom.window.document.querySelector('#universal-design-editor,.library-discovery,.compare-selector-panel,[data-continue-design]'),'workspace ready');
 return dom;
}
let app=await open();let doc=app.window.document;
const label=[...doc.querySelectorAll('label')].find(l=>l.textContent.includes('Room names (comma separated)'));
const input=label.querySelector('textarea');
const button=text=>[...doc.querySelectorAll('button')].find(b=>b.textContent===text);
const roomRadio=(id,value)=>doc.querySelector(`[data-room-option="${id}"] input[value="${value}"]`);
async function setRoomText(value){
 Object.getOwnPropertyDescriptor(app.window.HTMLTextAreaElement.prototype,'value').set.call(input,value);
 input.dispatchEvent(new app.window.Event('input',{bubbles:true}));await new Promise(resolve=>setTimeout(resolve,20));
}
const beforeRoomChoices=app.window.localStorage.getItem(key);
assert.equal(doc.querySelector('[aria-label="Room layout generator"] select').value,'BEST_FIT');
assert.equal(doc.querySelectorAll('.room-options input[type="radio"]').length,16);
assert.equal(input.tagName,'TEXTAREA','Long room programs must wrap visibly');
await setRoomText('Kitchen');
assert(button('Generate room layout alternatives').disabled);
assert(doc.querySelector('.room-program-count').textContent.includes('at least 2'));
assert.equal(input.getAttribute('aria-invalid'),'true');
await setRoomText('Kitchen, kitchen');
assert(button('Generate room layout alternatives').disabled,'Duplicate names should be explained before generation');
assert(doc.querySelector('.room-program-count').textContent.includes('unique name'));
await setRoomText('Primary Bedroom, Primary   Bedroom');
assert(button('Generate room layout alternatives').disabled,'Whitespace-normalized duplicate names need actionable feedback');
await setRoomText('Living, Kitchen, office, Studio');
assert(roomRadio('office','include').checked,'Typed room names must synchronize the radios without case-sensitive duplicates');
roomRadio('office','skip').click();await waitFor(()=>!input.value.toLowerCase().includes('office'),'skip removes only the chosen room');
assert(input.value.includes('Studio'),'Custom room names must survive radio changes');
roomRadio('pantry','include').click();await waitFor(()=>input.value.includes('Pantry'),'include appends to custom program');
await setRoomText('Living, Kitchen, Bedroom, Laundry, Office, Pantry, Dining Room, Mudroom');
assert(roomRadio('primary-bath','include').disabled,'Stop additional suggestions at the supported eight-room limit');
assert(!roomRadio('laundry','skip').disabled,'Rooms can still be removed at the limit');
await setRoomText(input.value+', Studio');
assert(button('Generate room layout alternatives').disabled,'An oversized typed program must explain its limit before generation');
await setRoomText('Kitchen, Living');
for(const id of ['laundry','primary-bedroom','primary-bath']){
 roomRadio(id,'include').click();await waitFor(()=>roomRadio(id,'include').checked,'include '+id);
}
assert.equal(input.value,'Kitchen, Living, Laundry, Primary Bedroom, Primary Bath');
assert.equal(app.window.localStorage.getItem(key),beforeRoomChoices,'Room option and seed edits must stay unsaved until explicit layout save');
button('Generate room layout alternatives').click();
await waitFor(()=>doc.querySelectorAll('.layout-option').length>=3,'three alternatives');
await waitFor(()=>doc.activeElement===doc.querySelector('.layout-comparison-heading h3'),'generation focuses the new comparison');
const seedDirection=doc.querySelector('[aria-label="Room layout generator"] select');
seedDirection.value='Y';seedDirection.dispatchEvent(new app.window.Event('change',{bubbles:true}));
await waitFor(()=>!button('Save selected layout'),'changing seed direction invalidates previous alternatives');
assert.equal(app.window.localStorage.getItem(key),beforeRoomChoices);
seedDirection.value='BEST_FIT';seedDirection.dispatchEvent(new app.window.Event('change',{bubbles:true}));
await waitFor(()=>doc.querySelectorAll('.layout-option').length>=3,'restoring identical best-fit inputs restores comparison');
input.focus();
button('Generate room layout alternatives').click();
await waitFor(()=>doc.activeElement===doc.querySelector('.layout-comparison-heading h3'),'regenerating the same program focuses the refreshed comparison');
const second=doc.querySelectorAll('.layout-option')[1];second.click();
await waitFor(()=>second.getAttribute('aria-pressed')==='true','non-top selection');
assert(doc.querySelector('.layout-save-summary').textContent.includes('Concept 2'));
assert(doc.querySelector('.layout-save-summary').textContent.includes('ground floor'));
button('Save selected layout').click();
await waitFor(()=>doc.querySelector('[data-saved-design-document]'),'saved document visible');
assert.equal(doc.activeElement,button('Generate room layout alternatives'),'Saving returns focus to the generator');
const selected=JSON.parse(doc.querySelector('[data-saved-design-document]').textContent);
assert.equal(selected.shapes.filter(s=>s.kind==='ROOM').length,5);
const raw=app.window.localStorage.getItem(key);
app.window.close();app=await open(raw);doc=app.window.document;
assert.deepEqual(JSON.parse(doc.querySelector('[data-saved-design-document]').textContent),selected,'Reload changed selected UI document');
const savedNames=selected.shapes.filter(shape=>shape.kind==='ROOM').map(shape=>shape.label).join(', ');
assert.equal(doc.querySelector('[data-room-program-input]').value,savedNames,'Reload must restore the saved room program');
assert(roomRadio('laundry','include').checked&&roomRadio('primary-bath','include').checked,'Saved room names must restore the room-option radios');
const floor=doc.querySelector('#design-story');floor.value='UPPER';floor.dispatchEvent(new app.window.Event('change',{bubbles:true}));
await new Promise(resolve=>setTimeout(resolve,20));
floor.value='GROUND';floor.dispatchEvent(new app.window.Event('change',{bubbles:true}));
await waitFor(()=>doc.querySelector('[data-room-program-input]').value===savedNames,'returning to ground restores its saved program');
assert.deepEqual(JSON.parse(doc.querySelector('[data-saved-design-document]').textContent),selected,'Floor inspection must not mutate the document');

const canvas=doc.querySelector('.design-floor-canvas');const fittedView=canvas.getAttribute('viewBox');
const firstRoom=selected.shapes.find(shape=>shape.kind==='ROOM');
doc.querySelector('[data-room-select="'+firstRoom.id+'"]').click();
await waitFor(()=>canvas.getAttribute('data-active-shape')===firstRoom.id,'room selected directly from key');
assert.match(doc.querySelector('.plan-editing-context').textContent,new RegExp('Editing '+firstRoom.label));
doc.querySelector('button[aria-label="Zoom in"]').click();
await waitFor(()=>canvas.getAttribute('viewBox')!==fittedView,'plan zoom');
assert.deepEqual(JSON.parse(doc.querySelector('[data-saved-design-document]').textContent),selected,'Inspection must not change saved geometry');
[...doc.querySelectorAll('button')].find(button=>button.textContent==='Fit plan').click();
await waitFor(()=>canvas.getAttribute('viewBox')===fittedView,'fit plan');
canvas.dispatchEvent(new app.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
await waitFor(()=>canvas.getAttribute('data-active-shape')==='','finish keyboard editing');
assert.equal(doc.activeElement,canvas,'Ending keyboard editing returns focus to the plan');
doc.querySelector('[data-room-select="'+firstRoom.id+'"]').click();
await waitFor(()=>canvas.getAttribute('data-active-shape')===firstRoom.id,'selected room restored for comparison');


[...doc.querySelectorAll('#customer-report-preview button')].find(b=>b.textContent==='Create Customer Report').click();
await waitFor(()=>doc.querySelector('#customer-report-preview iframe'),'report preview');
const reportHtml=doc.querySelector('#customer-report-preview iframe').getAttribute('srcdoc');
const reportDoc=new JSDOM(reportHtml).window.document;
assert.deepEqual(JSON.parse(reportDoc.querySelector('[data-report-design-document]').textContent),selected,'Report preview changed actual UI selection');
assert(doc.querySelector('#customer-report-preview a[download]'),'Current report must be downloadable');
assert.equal(doc.querySelector('[data-open-report]').getAttribute('href'),doc.querySelector('#customer-report-preview a[download]').getAttribute('href'),'Full-page report must use the same report');
button('Generate room layout alternatives').click();
await waitFor(()=>doc.querySelectorAll('.layout-option').length>=3,'replacement alternatives with room selected');
doc.querySelectorAll('[data-room-select]')[1].click();
await waitFor(()=>doc.querySelectorAll('.layout-option').length>=3,'room inspection preserves comparison');
assert(![...doc.querySelectorAll('.candidate-warning-box')].some(node=>node.textContent.includes('Previous alternatives are stale')),'Selecting a room must not invalidate the comparison');
button('Cancel comparison').click();
await waitFor(()=>doc.querySelectorAll('.layout-option').length===0,'comparison cancelled');
assert.equal(doc.activeElement,button('Generate room layout alternatives'),'Cancel returns focus to the generator');
assert.deepEqual(JSON.parse(doc.querySelector('[data-saved-design-document]').textContent),selected,'Cancelling comparison changed saved design');
const customShapes=[...doc.querySelectorAll('summary')].find(e=>e.textContent.includes('Create custom shapes'));customShapes.click();
assert(customShapes.parentElement.open,'Manual shape tools must be reachable');
button('Create shape from owner footprint').click();
await waitFor(()=>!doc.querySelector('#customer-report-preview a[download]'),'stale report download blocked');
assert(doc.querySelector('#customer-report-preview [role="alert"]').textContent.includes('Regenerate'));
assert(!doc.querySelector('[data-open-report]'),'Stale report must not remain openable');
assert.equal(doc.querySelector('nav a[aria-current="page"]').textContent,'Designs');
assert.equal(errors.length,0,errors.join('\n'));
const menu=doc.querySelector('.workbench-menu-toggle');
assert.equal(menu.getAttribute('aria-expanded'),'false');menu.click();
await waitFor(()=>menu.getAttribute('aria-expanded')==='true','navigation opened');
doc.querySelector('nav a[aria-current="page"]').click();
await waitFor(()=>menu.getAttribute('aria-expanded')==='false','navigation closed after selection');
// Production intervention controls + persistence. SVG coordinate mapping is an
// identity test double here; Chrome exercises the real screen matrix separately.
app.window.close();app=await open(raw);doc=app.window.document;
const savedCandidate=()=>JSON.parse(app.window.localStorage.getItem(key)).candidates.find(c=>c.id==='journey-ui-fixture');
const savedComponent=id=>savedCandidate().components.find(c=>c.id===id);
async function selectPlacement(id){
 const select=doc.querySelector('.intervention-select-label select');
 Object.getOwnPropertyDescriptor(app.window.HTMLSelectElement.prototype,'value').set.call(select,id);
 select.dispatchEvent(new app.window.Event('change',{bubbles:true}));
 await waitFor(()=>doc.querySelector(`[data-rotation-component="${id}"]`),'selected rotation handle');
 await new Promise(resolve=>setTimeout(resolve,20));
}
async function setRotation(value){
 const field=[...doc.querySelectorAll('.intervention-field')].find(l=>l.querySelector('span')?.textContent==='Rotation deg').querySelector('input');
 Object.getOwnPropertyDescriptor(app.window.HTMLInputElement.prototype,'value').set.call(field,String(value));
 field.dispatchEvent(new app.window.Event('input',{bubbles:true}));
 await new Promise(resolve=>setTimeout(resolve,10));button('Save edit').click();
}
await selectPlacement('garage-b');await setRotation(270);
await waitFor(()=>savedComponent('garage-b').rotationDeg===270,'numeric 270 degree save');
assert.equal(savedCandidate().evidenceState,'STALE');
assert.equal(savedCandidate().currentEvaluationId,null);
assert(JSON.parse(app.window.localStorage.getItem(key)).checkpoints.length>0,'Rotation must retain a recovery checkpoint');
button('Undo').click();await waitFor(()=>savedComponent('garage-b').rotationDeg===0,'rotation undo');
button('Redo').click();await waitFor(()=>savedComponent('garage-b').rotationDeg===270,'rotation redo');
const rotatedRaw=app.window.localStorage.getItem(key);
app.window.close();app=await open(rotatedRaw);doc=app.window.document;
await selectPlacement('garage-b');
assert.match(doc.querySelector('.direct-manipulation-plan [data-component-id="garage-b"]').getAttribute('transform'),/^rotate\(270 /,'Reload must render the saved angle');
const svg=doc.querySelector('.direct-manipulation-plan');
svg.createSVGPoint=()=>({x:0,y:0,matrixTransform(){return {x:this.x,y:this.y};}});
svg.getScreenCTM=()=>({inverse(){return this;}});svg.setPointerCapture=()=>{};svg.releasePointerCapture=()=>{};
function pointer(type,target,x,y){
 const event=new app.window.MouseEvent(type,{bubbles:true,clientX:x,clientY:y,button:0});
 Object.defineProperty(event,'pointerId',{value:1});target.dispatchEvent(event);
}
const handle=doc.querySelector('[data-rotation-component="garage-b"] circle');
const garage=savedComponent('garage-b'),center=[garage.x+garage.widthFt/2,garage.y+garage.depthFt/2];
pointer('pointerdown',handle,Number(handle.getAttribute('cx')),Number(handle.getAttribute('cy')));
const beforeDrag=app.window.localStorage.getItem(key);
for(const angle of [315,359,0,1,359,315,270,180,90,45]){
 const radians=(angle-90)*Math.PI/180;
 pointer('pointermove',svg,center[0]+15*Math.cos(radians),center[1]+15*Math.sin(radians));
 await waitFor(()=>{
  const transform=doc.querySelector('.direct-manipulation-plan [data-component-id="garage-b"]').getAttribute('transform');
  return angle===0 ? transform===null : transform?.startsWith(`rotate(${angle} `);
 },'unrestricted drag preview '+angle);
 assert.equal(app.window.localStorage.getItem(key),beforeDrag,'Preview must not save geometry before release');
}
pointer('pointerup',svg,0,0);await waitFor(()=>savedComponent('garage-b').rotationDeg===45,'drag release saves edit');
const beforeCancel=app.window.localStorage.getItem(key);
const cancelHandle=doc.querySelector('[data-rotation-component="garage-b"] circle');
pointer('pointerdown',cancelHandle,Number(cancelHandle.getAttribute('cx')),Number(cancelHandle.getAttribute('cy')));
pointer('pointermove',svg,center[0]-15,center[1]);
doc.dispatchEvent(new app.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
pointer('pointerup',svg,0,0);await new Promise(resolve=>setTimeout(resolve,10));
assert.equal(app.window.localStorage.getItem(key),beforeCancel,'Escape must cancel rotation without saving');
await setRotation(-90);await waitFor(()=>savedComponent('garage-b').rotationDeg===270,'negative numeric wrap');
await setRotation(450);await waitFor(()=>savedComponent('garage-b').rotationDeg===90,'multiple-turn numeric wrap');
await setRotation(0);await waitFor(()=>savedComponent('garage-b').rotationDeg===0,'reset numeric angle');
const beforeTurn=app.window.localStorage.getItem(key);
await setRotation(360);await new Promise(resolve=>setTimeout(resolve,10));
assert.equal(app.window.localStorage.getItem(key),beforeTurn,'360 degrees must preserve geometry, evidence and checkpoints');
await waitFor(()=>!button('Evaluate exact edit').disabled,'equivalent full turn clears pending precision edit');
await selectPlacement('home-b');const homeBefore=structuredClone(savedComponent('home-b'));
await setRotation(270);await waitFor(()=>JSON.stringify(savedComponent('home-b').polygon)!==JSON.stringify(homeBefore.polygon),'custom footprint 270 degree save');
assert.equal(savedComponent('home-b').rotationDeg,0,'Custom rotation remains baked into vertices');
const rotatedHome=structuredClone(savedComponent('home-b'));
[...doc.querySelectorAll('#customer-report-preview button')].find(b=>b.textContent==='Create Customer Report').click();
await waitFor(()=>doc.querySelector('#customer-report-preview iframe'),'rotated report preview');
const rotatedReport=doc.querySelector('#customer-report-preview iframe').getAttribute('srcdoc');
const rotatedReportDom=new app.window.DOMParser().parseFromString(rotatedReport,'text/html');
assert.equal(rotatedReportDom.querySelector('[data-source-footprint="home-b"]').getAttribute('points'),rotatedHome.polygon.map(point=>point.map(value=>Number(value.toFixed(3))).join(',')).join(' '),'Report must contain rotated custom footprint vertices');
assert.equal(errors.length,0,errors.join('\n'));
app.window.close();app=await open(raw,'http://fixture.test/workbench/projects/pondy-lot2/candidates');doc=app.window.document;
const search=doc.querySelector('input[type="search"]');
function changeSearch(value){Object.getOwnPropertyDescriptor(app.window.HTMLInputElement.prototype,'value').set.call(search,value);search.dispatchEvent(new app.window.Event('input',{bubbles:true}));}
changeSearch('local UI fixture');
await waitFor(()=>doc.querySelectorAll('.library-candidate-card').length===1,'search finds saved local draft');
assert.match(doc.querySelector('.library-candidate-card').textContent,/UI fixture/);
changeSearch('no-such-design-87129');
await waitFor(()=>doc.querySelector('.library-no-results'),'search empty state');
[...doc.querySelectorAll('button')].find(b=>b.textContent==='Clear search and filters').click();
await waitFor(()=>!doc.querySelector('.library-no-results')&&search.value==='','clear filters restores library');
[...doc.querySelectorAll('.library-filter-row button')].find(b=>b.textContent==='Local drafts').click();
await waitFor(()=>doc.querySelectorAll('.library-candidate-card').length===1,'local draft filter');
assert.equal(errors.length,0,errors.join('\n'));
app.window.close();app=await open(raw,'http://fixture.test/workbench');doc=app.window.document;
assert.equal(doc.querySelector('[data-continue-design]').getAttribute('data-continue-design'),'journey-ui-fixture','Home must resume actual saved work rather than the registry default');
assert.match(doc.querySelector('[data-continue-design]').getAttribute('href'),/journey-ui-fixture$/);
assert.match(doc.querySelector('.workbench-resume').textContent,/5 rooms/);
const journeyLinks=()=>[...doc.querySelectorAll('.studio-journey-card')].slice(1).map(link=>link.getAttribute('href'));
assert.deepEqual(journeyLinks(),[
 '/workbench/projects/pondy-lot2/candidates/journey-ui-fixture#universal-design-editor',
 '/workbench/projects/pondy-lot2/candidates/journey-ui-fixture#customer-report-preview'
],'Home studio/report shortcuts must follow the same saved design as Continue');
app.window.localStorage.setItem(key,'{broken');app.window.dispatchEvent(new app.window.Event('storage'));
await waitFor(()=>doc.querySelector('.resume-error'),'resume storage error');
assert(!doc.querySelector('[data-continue-design]'),'Unreadable saved work must not silently become a default design');
assert.equal(journeyLinks().length,0,'Unreadable saved work must not send journey shortcuts to another design');
app.window.localStorage.setItem(key,raw);[...doc.querySelectorAll('button')].find(button=>button.textContent==='Retry saved workspace').click();
await waitFor(()=>doc.querySelector('[data-continue-design]'),'resume storage retry');
assert.deepEqual(journeyLinks(),[
 '/workbench/projects/pondy-lot2/candidates/journey-ui-fixture#universal-design-editor',
 '/workbench/projects/pondy-lot2/candidates/journey-ui-fixture#customer-report-preview'
],'Storage retry must restore both shortcuts to the saved design');
assert.equal(errors.length,0,errors.join('\n'));
app.window.close();
if(process.env.WORKBENCH_UI_FIXTURE_DIR){
 const out=path.resolve(process.env.WORKBENCH_UI_FIXTURE_DIR);await mkdir(out,{recursive:true});
 const css=(await readFile(path.join(root,'app/globals.css'),'utf8'))+'\n'+await readFile(path.join(root,'app/workbench/workbench.css'),'utf8');
 await writeFile(path.join(out,'app.js'),script);
 await writeFile(path.join(out,'index.html'),'<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+'</style></head><body><div id="root"></div><script src="/app.js"></script></body></html>');
}
console.log('PASS actual React components: compare three layouts, choose non-top, save, fresh mount/reload, exact report preview, download enable/staleness, cancel replacement without mutation, active/mobile navigation, library filters, direct room selection, non-mutating zoom, saved room program, full-page report staleness and real saved-work resume/error recovery, common-room Include/Skip radios, best-fit seed selection, full-circle manual rotation, precision wrapping, preview/commit/cancel, checkpoint Undo/Redo and rotated report vertices; router/download APIs are local test doubles; no hosted authentication or pixel-layout claim');
