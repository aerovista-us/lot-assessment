// Isolated browser regression of the real read-only React component and CSS.
// This is touch emulation, not authenticated deployment or physical-device acceptance.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {createServer} from 'node:http';
import {mkdtemp,readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';

const root=process.cwd();
const modules=process.env.ROOF_QA_MODULES;
const requireQA=createRequire(modules?path.join(path.resolve(modules),'__roof_qa__.cjs'):import.meta.url);
const {build}=requireQA('esbuild');
const puppeteer=requireQA('puppeteer-core');
assert(process.env.CHROME_BIN,'Set CHROME_BIN to a Chrome/Chromium executable');
const out=path.resolve(process.env.ROOF_QA_OUTPUT??'/tmp/roof-inspector-touch-qa');
await mkdir(out,{recursive:true});
const temp=await mkdtemp(path.join(tmpdir(),'roof-touch-'));
const owners=execFileSync(process.execPath,['--experimental-loader','./scripts/alias-loader.mjs','--input-type=module','-e',
 "import {buildRoofReviewOwners} from './app/workbench/roof-drawings/roof-review-data.ts';process.stdout.write(JSON.stringify(buildRoofReviewOwners()))"],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']});
const ownerIndex=id=>{const i=JSON.parse(owners).findIndex(o=>o.ownerId===id);assert(i>=0,id);return i;};
const entry=`import React from 'react';import {createRoot} from 'react-dom/client';
import Workspace from ${JSON.stringify(path.join(root,'app/workbench/roof-drawings/roof-inspector-workspace.tsx'))};
createRoot(document.getElementById('root')).render(<main className="shell workbench-shell roof-inspector"><header className="roof-inspector-hero"><div><h1>Architectural roof interval inspector</h1><p>CONCEPT ONLY · NOT FOR CONSTRUCTION. Isolated component QA fixture; publication disabled.</p></div></header><Workspace owners={${owners}}/></main>);`;
await build({stdin:{contents:entry,loader:'tsx',resolveDir:root},bundle:true,platform:'browser',jsx:'automatic',nodePaths:modules?[path.resolve(modules)]:[],outfile:path.join(temp,'app.js')});
const css=(await readFile(path.join(root,'app/globals.css'),'utf8'))+'\n'+await readFile(path.join(root,'app/workbench/roof-drawings/roof-inspector.css'),'utf8');
const html='<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+'</style></head><body><div id="root"></div><script src="/app.js"></script></body></html>';
const server=createServer(async(req,res)=>{if(req.url==='/app.js'){res.setHeader('Content-Type','text/javascript');res.end(await readFile(path.join(temp,'app.js')));}else{res.setHeader('Content-Type','text/html');res.end(html);}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await puppeteer.launch({executablePath:process.env.CHROME_BIN,headless:true,protocolTimeout:15000,args:['--no-sandbox','--disable-dev-shm-usage']});
const evidence={sourceSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),scope:'isolated real component + production CSS; touch emulation only',sourceTrackedClean:execFileSync('git',['status','--porcelain','--untracked-files=no'],{encoding:'utf8'}).trim()==='',browserVersion:await browser.version(),nodeVersion:process.version,publicationAllowed:false,cases:[]};
try{
 if(process.env.CI)assert(evidence.sourceTrackedClean,'CI fixture must execute clean tracked files at the recorded source SHA');
 for(const [width,height,touch] of [[390,844,true],[768,1024,true],[1440,1000,false]]){
  console.log(`START ${width}px touch=${touch}`);
  const page=await browser.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.setViewport({width,height,isMobile:touch,hasTouch:touch,deviceScaleFactor:1});
  await page.goto(`http://127.0.0.1:${server.address().port}`,{waitUntil:'networkidle0'});
  await page.waitForSelector('[data-inspected-owner="home-b"]');
  assert.match(await page.$eval('body',e=>e.textContent),/Drawing acceptance remains OPEN/);
  const tap=async(selector,index=0)=>{
   const elements=await page.$$(selector),element=elements[index];assert(element,selector+' '+index);
   await element.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));
   if(touch)await element.tap();else await element.click();
  };
  const noOverflow=async()=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Horizontal overflow at '+width);
  await noOverflow();
  const targets=await page.$$eval('.roof-owner-tab,.roof-view-tabs button,.roof-valley-tabs button,.roof-edge-picker select,.roof-review-controls>label',els=>els.map(e=>({text:e.textContent.slice(0,70),height:e.getBoundingClientRect().height})));
  assert(targets.every(t=>t.height>=44),'Touch target smaller than 44px: '+JSON.stringify(targets));
  if(width===390){
   assert.equal(await page.$eval('select',e=>getComputedStyle(e).fontSize),'16px');
   assert(await page.$eval('select',e=>e.getBoundingClientRect().width>=document.querySelector('.roof-review-controls').clientWidth-1),'Phone edge selector must occupy a full row');
  }
  for(let index=0;index<5;index++){
   await tap('.roof-view-tabs button',index);
   await page.waitForFunction(i=>document.querySelectorAll('.roof-view-tabs button')[i].getAttribute('aria-pressed')==='true',{},index);
   assert.equal(await page.$eval('.roof-review-status',e=>e.textContent),'INTERVAL VERIFIED');
   await noOverflow();
  }
  await tap('.roof-review-controls>label',0);
  assert(await page.$eval('.roof-review-controls input',e=>e.checked));
  await tap('.roof-review-controls>label',1);
  assert(await page.$$eval('.roof-review-controls input',els=>els[1].checked));
  await tap('.roof-valley-tabs button',1);
  assert.equal(await page.$eval('.roof-valley-tabs button:nth-child(2)',e=>e.getAttribute('aria-pressed')),'true');
  assert.equal((await page.$$('[data-section]')).length,2);
  // Native picker behavior still needs actual iOS/Android review; this verifies the component's select change handler.
  await page.select('select','0');
  assert.match(await page.$eval('.roof-edge-evidence',e=>e.textContent),/E1 ·/);
  await noOverflow();
  for(const id of ['home-a','garage-b','garage-a']){
   await tap('.roof-owner-tab',ownerIndex(id));
   await page.waitForSelector(`[data-inspected-owner="${id}"]`);
   assert.equal((await page.$$('[data-section]')).length,0,'No fabricated valley cuts for '+id);
   await noOverflow();
  }
  await tap('.roof-owner-tab',ownerIndex('home-b'));
  await page.waitForSelector('[data-inspected-owner="home-b"]');
  assert.equal(await page.$eval('.roof-view-tabs button',e=>e.getAttribute('aria-pressed')),'true');
  console.log(`PASS ${width}px cameras, owners, valleys, edge handler, targets and overflow`);
  let swipe=false,pinch=false;
  if(touch){
   const client=await page.createCDPSession();
   await client.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
   const south=await page.$('.roof-view-tabs button:nth-child(2)');
   await south.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));
   const box=await south.boundingBox(),x=box.x+box.width/2,y=box.y+box.height/2;
   const before=await page.evaluate(()=>scrollY);
   await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
   for(let i=1;i<=6;i++)await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-i*25}]});
   await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await page.waitForFunction(old=>Math.abs(scrollY-old)>20,{},before);
   assert.equal(await page.$eval('.roof-view-tabs button',e=>e.getAttribute('aria-pressed')),'true','Scroll gesture must not activate South');
   swipe=true;console.log(`PASS ${width}px swipe without camera activation`);
   await new Promise(resolve=>setTimeout(resolve,400));
   const centerX=width/2,centerY=height/2;
   const points=delta=>[{id:1,x:centerX-delta,y:centerY},{id:2,x:centerX+delta,y:centerY}];
   await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points(40)});
   for(let i=1;i<=6;i++)await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:points(40+i*10)});
   await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await page.waitForFunction(()=>visualViewport.scale>1.1);
   pinch=true;console.log(`PASS ${width}px pinch zoom`);
   await client.send('Emulation.setPageScaleFactor',{pageScaleFactor:1});
   await client.detach();
  }
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
  await page.screenshot({path:path.join(out,`roof-${width}.png`),fullPage:true});
  assert.deepEqual(errors,[]);
  evidence.cases.push({width,height,touch,ownersAndViews:true,bothValleys:true,edgeChangeHandler:true,minTargetHeight:Math.min(...targets.map(t=>t.height)),noHorizontalOverflow:true,swipeWithoutActivation:swipe,pinchZoom:pinch,applicationErrors:errors});
  await page.close();
 }
 await writeFile(path.join(out,'results.json'),JSON.stringify(evidence,null,2)+'\n');
 console.log('PASS real roof inspector component: 390px/768px touch emulation + 1440px desktop; all cameras, owners, V1/V2, edge handler, 44px targets, overflow, scroll/pinch; physical device and served-revision review remain open');
}catch(error){
 for(const [i,page] of (await browser.pages()).entries())await page.screenshot({path:path.join(out,`failure-${i}.png`),fullPage:true}).catch(()=>{});
 await writeFile(path.join(out,'failure.json'),JSON.stringify({sourceSha:evidence.sourceSha,error:String(error),completedCases:evidence.cases},null,2)+'\n');
 throw error;
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));await rm(temp,{recursive:true,force:true});}
