// Real production components + CSS in an isolated fixture. This does not test hosted auth.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
const requireQA=createRequire(path.join(process.env.WORKBENCH_QA_MODULES??process.cwd(),'__workbench_qa__.cjs'));
const puppeteer=requireQA('puppeteer-core');
assert(process.env.CHROME_BIN,'CHROME_BIN is required');
assert(process.env.WORKBENCH_UI_FIXTURE_DIR,'Generate the production component fixture first');
const out=path.resolve(process.env.WORKBENCH_QA_OUTPUT??'/tmp/workbench-ui-evidence');
await mkdir(out,{recursive:true});
const fixture=path.resolve(process.env.WORKBENCH_UI_FIXTURE_DIR);
const html=await readFile(path.join(fixture,'index.html'));
const js=await readFile(path.join(fixture,'app.js'));
const server=createServer((request,response)=>{response.setHeader('Content-Type',request.url==='/app.js'?'text/javascript':'text/html');response.end(request.url==='/app.js'?js:html);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await puppeteer.launch({executablePath:process.env.CHROME_BIN,headless:true,timeout:20000,protocolTimeout:20000,args:['--no-sandbox','--disable-dev-shm-usage']});
const base=`http://127.0.0.1:${server.address().port}`;
const evidence={sourceSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),scope:'Isolated production components and CSS; no hosted authentication or physical-device claim',cases:[]};
const routes=[['home','/workbench','.studio-home-hero'],['library','/workbench/projects/pondy-lot2/candidates','.library-discovery'],['design','/workbench/projects/pondy-lot2/candidates/journey-ui-fixture','#universal-design-editor'],['compare','/workbench/projects/pondy-lot2/compare','.compare-evidence-table']];
try{
 for(const [width,height] of [[390,844],[768,1024],[1440,1000]]){
  for(const [view,route,ready] of routes){
   console.log(`START ${view} at ${width}px`);
   const page=await browser.newPage();page.setDefaultTimeout(12000);page.setDefaultNavigationTimeout(12000);const errors=[];page.on('pageerror',error=>errors.push(String(error)));
   await page.setViewport({width,height,deviceScaleFactor:1});
   await page.goto(base+route,{waitUntil:'networkidle0'});await page.waitForSelector(ready);
   const noOverflow=async()=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${view} overflows ${width}px`);
   // Native scroll-into-view can stop a partly visible control beneath the
   // sticky header. Center the target instantly and verify the actual hit.
   const clickPlanControl=async selector=>{
    await page.$eval(selector,element=>element.scrollIntoView({block:'center',behavior:'instant'}));
    assert(await page.$eval(selector,element=>{const box=element.getBoundingClientRect();return element.contains(document.elementFromPoint(box.x+box.width/2,box.y+box.height/2));}),`Plan control is obscured: ${selector}`);
    await page.click(selector);
   };
   await noOverflow();
   if(view==='home'){
    await page.waitForSelector('[data-continue-design]');
    const resumePath=await page.$eval('[data-continue-design]',element=>element.getAttribute('href'));
    assert.deepEqual(await page.$$eval('.studio-journey-card',elements=>elements.slice(1).map(element=>element.getAttribute('href'))),[resumePath+'#universal-design-editor',resumePath+'#customer-report-preview'],'Home journey shortcuts must stay with the resumed design');
   }
   if(width<960){
    await page.click('.workbench-menu-toggle');
    await page.waitForFunction(()=>document.querySelector('.workbench-menu-toggle').getAttribute('aria-expanded')==='true');
    await noOverflow();
    await page.focus('#workbench-navigation-links a');await page.keyboard.press('Escape');
    assert.equal(await page.$eval('.workbench-menu-toggle',e=>e.getAttribute('aria-expanded')),'false');
    assert(await page.$eval('.workbench-menu-toggle',e=>e===document.activeElement),'Escape must return focus to menu toggle');
   }
   if(view==='library'){
    await page.type('input[type="search"]','local UI fixture');
    await page.waitForFunction(()=>document.querySelectorAll('.library-candidate-card').length===1);
    await noOverflow();
    await page.$eval('input[type="search"]',e=>e.select());await page.keyboard.press('Backspace');
    await page.waitForFunction(()=>document.querySelectorAll('.library-candidate-card').length>1);
   }
   let fidelity;
   if(view==='design'){
    assert.equal(await page.$eval('.design-tool-panel',e=>e.open),false,'Advanced tools start collapsed');
    const generator=await page.$('[aria-label="Room layout generator"] input');
    await generator.click();await page.keyboard.down('Control');await page.keyboard.press('KeyA');await page.keyboard.up('Control');
    const program='Laundry, Kitchen, Living, Primary Bedroom, Primary Bath';
    await page.keyboard.type(program);
    assert.equal(await generator.evaluate(e=>e.value),program,'Room program must replace the prior input');
    await page.click('[aria-label="Room layout generator"] button');
    await page.waitForSelector('.layout-option:nth-child(3)');
    await page.click('.layout-option:nth-child(2)');
    await page.waitForFunction(()=>document.querySelectorAll('.layout-option')[1].getAttribute('aria-pressed')==='true');
    await noOverflow();
    await page.screenshot({path:path.join(out,`comparison-${width}.png`),fullPage:false,timeout:15000});
    await page.click('.layout-decision-actions .primary-button');
    await page.waitForSelector('[data-saved-design-document]');
    const selected=await page.$eval('[data-saved-design-document]',e=>e.textContent);
    await page.reload({waitUntil:'networkidle0'});await page.waitForSelector('[data-saved-design-document]');
    assert.deepEqual(JSON.parse(await page.$eval('[data-saved-design-document]',e=>e.textContent)),JSON.parse(selected));
    const roomNames=JSON.parse(selected).shapes.filter(shape=>shape.kind==='ROOM').map(shape=>shape.label).join(', ');
    assert.equal(await page.$eval('[aria-label="Room layout generator"] input',e=>e.value),roomNames,'Saved room program must survive reload');
    const fitted=await page.$eval('.design-floor-canvas',e=>e.getAttribute('viewBox'));
    await clickPlanControl('.design-room-key button');
    await page.waitForFunction(()=>Boolean(document.querySelector('.design-floor-canvas').getAttribute('data-active-shape')));
    await clickPlanControl('button[aria-label="Zoom in"]');
    assert.notEqual(await page.$eval('.design-floor-canvas',e=>e.getAttribute('viewBox')),fitted);
    await noOverflow();
    assert.deepEqual(JSON.parse(await page.$eval('[data-saved-design-document]',e=>e.textContent)),JSON.parse(selected),'Zoom and room selection must not edit geometry');
    await clickPlanControl('.plan-view-controls button:last-child');
    assert.equal(await page.$eval('.design-floor-canvas',e=>e.getAttribute('viewBox')),fitted);

    await page.click('#customer-report-preview button.primary-button');
    await page.waitForSelector('#customer-report-preview iframe');
    await page.waitForFunction(()=>document.querySelector('#customer-report-preview iframe')?.contentDocument?.querySelector('[data-report-design-document]'));
    const reported=await page.$eval('#customer-report-preview iframe',frame=>frame.contentDocument.querySelector('[data-report-design-document]').textContent);
    assert.deepEqual(JSON.parse(reported),JSON.parse(selected),'Report changed the non-top selected design');
    const reportHref=await page.$eval('[data-open-report]',e=>e.href);
    const [fullTarget]=await Promise.all([browser.waitForTarget(target=>target.url()===reportHref,{timeout:12000}),page.click('[data-open-report]')]);
    const fullReport=await fullTarget.page();assert(fullReport,'Full report must open as a page');
    await fullReport.waitForSelector('[data-report-design-document]');
    assert.deepEqual(JSON.parse(await fullReport.$eval('[data-report-design-document]',e=>e.textContent)),JSON.parse(selected),'Full-page report must preserve the same design');
    await fullReport.close();

    fidelity={nonTopSelection:true,reload:true,exactReportDocument:true,fullPageReport:true,roomSelectionAndZoom:true,savedProgram:true,rooms:JSON.parse(selected).shapes.filter(s=>s.kind==='ROOM').length};
    await noOverflow();
    await page.$eval('#universal-design-editor',e=>e.scrollIntoView({block:'start',behavior:'instant'}));
    await page.screenshot({path:path.join(out,`studio-${width}.png`),fullPage:false,timeout:15000});

    // Real pointer capture and SVG screen-to-model conversion, including a
    // nonzero starting angle and crossing the 0/360 boundary both ways.
    await page.select('.intervention-select-label select','garage-b');
    await page.waitForSelector('[data-rotation-component="garage-b"]');
    await clickPlanControl('.direct-plan-toolbar button:nth-child(4)');
    const dragPoint=async angle=>page.$eval('[data-rotation-component="garage-b"] circle',(knob,angle)=>{
     const svg=knob.ownerSVGElement,rect=svg.querySelector('[data-component-id="garage-b"] rect');
     const cx=Number(rect.getAttribute('x'))+Number(rect.getAttribute('width'))/2,cy=Number(rect.getAttribute('y'))+Number(rect.getAttribute('height'))/2;
     const radius=Math.hypot(Number(knob.getAttribute('cx'))-cx,Number(knob.getAttribute('cy'))-cy);
     const point=svg.createSVGPoint();point.x=cx+radius*Math.cos((angle-90)*Math.PI/180);point.y=cy+radius*Math.sin((angle-90)*Math.PI/180);
     const screen=point.matrixTransform(svg.getScreenCTM());return {x:screen.x,y:screen.y};
    },angle);
    const currentHandlePoint=async()=>page.$eval('[data-rotation-component="garage-b"] circle',knob=>{
     const box=knob.getBoundingClientRect();return {x:box.x+box.width/2,y:box.y+box.height/2};
    });
    const centerRotationHandle=async()=>page.$eval('[data-rotation-component="garage-b"] circle',knob=>knob.scrollIntoView({block:'center',behavior:'instant'}));
    const assertHandleReachable=async point=>assert(await page.evaluate(point=>document.elementFromPoint(point.x,point.y)?.matches('[data-rotation-component="garage-b"] circle'),point),'Rotation handle must be visible and unobscured after Fit selection');
    await centerRotationHandle();const start=await currentHandlePoint();await assertHandleReachable(start);await page.mouse.move(start.x,start.y);await page.mouse.down();
    for(const angle of [90,180,270,359,1,359,315,225]){
     const point=await dragPoint(angle);await page.mouse.move(point.x,point.y,{steps:4});
     await page.waitForFunction(angle=>document.querySelector('.direct-manipulation-plan [data-component-id="garage-b"]').getAttribute('transform')?.startsWith(`rotate(${angle} `),{},angle);
    }
    await page.mouse.up();
    await page.reload({waitUntil:'networkidle0'});await page.waitForSelector('.intervention-editor-panel');
    await page.select('.intervention-select-label select','garage-b');
    await page.waitForFunction(()=>document.querySelector('.direct-manipulation-plan [data-component-id="garage-b"]').getAttribute('transform')?.startsWith('rotate(225 '));
    await clickPlanControl('.direct-plan-toolbar button:nth-child(4)');
    await centerRotationHandle();const resumed=await currentHandlePoint();await assertHandleReachable(resumed);await page.mouse.move(resumed.x,resumed.y);await page.mouse.down();
    const wrapped=await dragPoint(270);await page.mouse.move(wrapped.x,wrapped.y,{steps:4});await page.mouse.up();
    await page.waitForFunction(()=>document.querySelector('.direct-manipulation-plan [data-component-id="garage-b"]').getAttribute('transform')?.startsWith('rotate(270 '));
    await page.$eval('.intervention-precision',element=>{element.open=true;});
    await clickPlanControl('label.intervention-field:has(input[step="1"]) input');
    await page.keyboard.down('Control');await page.keyboard.press('KeyA');await page.keyboard.up('Control');await page.keyboard.type('-90');
    await clickPlanControl('.intervention-actions button:first-child');
    assert.match(await page.$eval('.direct-manipulation-plan [data-component-id="garage-b"]',element=>element.getAttribute('transform')),/^rotate\(270 /,'Negative numeric rotation must wrap');
    await noOverflow();
    await page.$eval('.direct-manipulation-wrap',element=>element.scrollIntoView({block:'center',behavior:'instant'}));
    await page.screenshot({path:path.join(out,`rotation-${width}.png`),fullPage:false,timeout:15000});
    fidelity.fullCircleRotation={allQuadrants:true,boundaryBothDirections:true,nonzeroResume:true,reload:true,negativePrecisionEdit:true};
   }
   await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
   await page.screenshot({path:path.join(out,`${view}-${width}.png`),fullPage:view==='home',timeout:15000});
   assert.deepEqual(errors,[],`${view} application errors`);
   evidence.cases.push({width,height,view,noHorizontalOverflow:true,mobileMenu:width<960,applicationErrors:errors,...fidelity});
   await writeFile(path.join(out,'progress.json'),JSON.stringify(evidence,null,2)+'\n');
   console.log(`PASS ${view} at ${width}px${fidelity?' · non-top save/reload/report fidelity':''}`);
   await page.close();
  }
 }
 await writeFile(path.join(out,'results.json'),JSON.stringify(evidence,null,2)+'\n');
}catch(error){
 for(const [index,page] of (await browser.pages()).entries())await page.screenshot({path:path.join(out,`failure-${index}.png`),fullPage:true,timeout:10000}).catch(()=>{});
 await writeFile(path.join(out,'failure.json'),JSON.stringify({error:String(error),completedCases:evidence.cases},null,2)+'\n');throw error;
}finally{
 const timer=setTimeout(()=>browser.process()?.kill('SIGKILL'),5000);
 try{await browser.close();}finally{clearTimeout(timer);server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
