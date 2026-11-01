import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {build} from 'esbuild';
import {JSDOM,VirtualConsole} from 'jsdom';
import path from 'node:path';
import {assessLot} from '../lib/assessment.ts';
import {initialConfidence} from '../lib/confidence.ts';
import {createPublicStudy,parsePublicStudy,STUDY_STORAGE_KEY} from '../lib/study-session.ts';
import {SitePlanDiagram} from '../components/SitePlanDiagram.tsx';

const input={lotWidthFt:50,lotDepthFt:148,frontSetbackFt:20,rearSetbackFt:20,leftSetbackFt:5,rightSetbackFt:10,maxLotCoveragePct:45,units:2,livingAreaPerUnitSqFt:1800,stories:2,garageSpacesPerUnit:2,garageIntegrated:true,drivewayWidthFt:20,minimumAccessWidthFt:20};
const exportValue=createPublicStudy(input,initialConfidence,'RECTANGLE',null);
assert.deepEqual(parsePublicStudy(JSON.parse(JSON.stringify(exportValue))).input,input);
assert.equal(exportValue.customLot,null);
for(const mutation of [
 {...exportValue,schema:'future'},
 {...exportValue,input:{...input,lotWidthFt:Infinity}},
 {...exportValue,input:{...input,garageIntegrated:'yes'}},
 {...exportValue,confidence:{...initialConfidence,units:'APPROVED'}},
])assert.throws(()=>parsePublicStudy(mutation));
const rect=renderToStaticMarkup(React.createElement(SitePlanDiagram,{input,result:assessLot(input),id:'test-rect'}));
assert.match(rect,/data-site-plan="rectangle"/);
assert.match(rect,/SETBACK INSET/);
assert.match(rect,/data-illustrative-program="not-placed"/);
assert.match(rect,/PROGRAM NOT PLACED/);
assert.match(rect,/preserveAspectRatio/);
const custom={points:[[0,0],[148,0],[148,50],[125.143,43.016],[84.813,43.016],[0,57.01]],frontageEdge:1,frontageStreet:'Example street',areaSqFt:7277,frontageLengthFt:50,boundingWidthFt:148,boundingDepthFt:57.01,screenWidthFt:50,screenDepthFt:145.54,simple:true,complete:true};
const irregular=createPublicStudy(input,initialConfidence,'CUSTOM',custom);
assert.deepEqual(parsePublicStudy(JSON.parse(JSON.stringify(irregular))).customLot?.points,custom.points);
assert.throws(()=>parsePublicStudy({...irregular,customLot:{...custom,points:[[0,0],[Infinity,0],[1,1]]}}));
const real=renderToStaticMarkup(React.createElement(SitePlanDiagram,{input,result:assessLot(input),customLot:custom,id:'test-custom'}));
assert.match(real,/data-site-plan="irregular"/);
assert.doesNotMatch(real,/SETBACK STUDY/);
assert.match(real,/FRONTAGE/);
const root=process.cwd();
const compiled=await build({stdin:{contents:"import React from 'react';import{createRoot}from 'react-dom/client';import Home from './app/page';createRoot(document.getElementById('root')).render(<Home/>);",resolveDir:root,loader:'tsx'},
 bundle:true,write:false,platform:'browser',format:'iife',target:'es2022',jsx:'automatic',tsconfig:path.join(root,'tsconfig.json'),
 define:{'process.env.NODE_ENV':'"development"'},logLevel:'error',
 plugins:[{name:'next-link',setup(builder){builder.onResolve({filter:/^next\/link$/},args=>({path:args.path,namespace:'router'}));builder.onLoad({filter:/.*/,namespace:'router'},()=>({loader:'tsx',resolveDir:root,contents:'import React from "react";export default function Link({href,children,...props}){return <a href={href} {...props}>{children}</a>;}'}));}}]});
const errors=[],log=new VirtualConsole();log.on('error',e=>errors.push(String(e)));
const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'https://lotscope.test/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:log});
const win=dom.window;win.URL.createObjectURL=()=> 'blob:study';win.URL.revokeObjectURL=()=>{};
win.HTMLElement.prototype.scrollIntoView=()=>{};
win.eval(compiled.outputFiles[0].text);
const doc=win.document;
async function wait(condition,label){for(let i=0;i<120;i++){if(condition())return;await new Promise(r=>setTimeout(r,16));}throw Error('Timed out '+label);}
const button=(label)=>[...doc.querySelectorAll('button')].find(node=>node.textContent.trim()===label);
await wait(()=>doc.querySelector('[data-site-plan="rectangle"]'),'dynamic parcel diagram');
assert(doc.querySelector('a[href="/advanced/overview"]'));
assert(!doc.querySelector('.envelope-visual'),'Old fake envelope graphic must be removed');
assert(doc.querySelector('select[aria-label="Choose an example project program"]'));
button('Save on this device').click();
await wait(()=>Boolean(win.localStorage.getItem(STUDY_STORAGE_KEY)),'explicit local save');
const saved=parsePublicStudy(JSON.parse(win.localStorage.getItem(STUDY_STORAGE_KEY)));
assert.equal(saved.input.lotWidthFt,50);
button('Reset inputs').click();
button('Restore local study').click();
await wait(()=>doc.querySelector('[role="status"]')?.textContent.includes('restored'),'restore feedback');
const importer=doc.querySelector('input[aria-label="Import a LotScope study file"]');
assert(importer,'Portable local study import must be available');
Object.defineProperty(importer,'files',{configurable:true,value:[{size:3000,text:async()=>JSON.stringify(exportValue)}]});
importer.dispatchEvent(new win.Event('change',{bubbles:true}));
await wait(()=>doc.querySelector('[role="status"]')?.textContent.includes('imported locally'),'import study proof');
const run=button('Assess this lot');assert(run&&!run.disabled);run.click();
await wait(()=>doc.querySelector('.result-card.visible'),'evaluated state');
assert(button('Add to comparison +'));
button('Add to comparison +').click();
await wait(()=>doc.querySelectorAll('.study-scenario').length===1,'comparison capture');
const scenario=doc.querySelector('.study-scenario');
assert(scenario.textContent.includes('Feasibility score'));
assert(doc.querySelector('#assessment'));
assert(doc.querySelector('a[href="/assessment/guided"]'));
assert(!doc.querySelector('.result-card').textContent.includes('Permit approved'));
assert.equal(errors.length,0,errors.join('; '));
win.close();
console.log('PUBLIC_STUDIO_LIVE_DIAGRAM_LOCAL_SAVE_RESTORE_SCENARIO_COMPARISON_PASS');
