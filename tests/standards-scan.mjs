import {restoreSample} from './sample-backup.mjs';
import {expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {launchBrowser,browserName} from './browser-engine.mjs';

const browser=await launchBrowser();
const context=await browser.newContext({viewport:{width:1440,height:1000}});
const page=await context.newPage();page.setDefaultTimeout(20000);
const origin=process.env.AES_TEST_URL||'http://127.0.0.1:5174';
const scans=[],layouts=[],keyboard=[];const errors=[];page.on('pageerror',error=>errors.push(error.message));
let passed=false;
const widths=[320,375,390,640,768,820,1024,1440,1920];
async function resize(width,height=900){await page.setViewportSize({width,height});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
async function chooseStep(index){if(page.viewportSize().width<=820)await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.locator('.steps .step').nth(index).click();}
async function layout(name){
  const result=await page.evaluate(()=>({width:innerWidth,contentWidth:document.documentElement.scrollWidth}));layouts.push({name,...result});assert.ok(result.contentWidth<=result.width+1,`${name}: content ${result.contentWidth}px exceeds viewport ${result.width}px`);
}
async function scan(name){
  const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice']).analyze();
  scans.push({name,violations:result.violations,incomplete:result.incomplete.map(x=>({id:x.id,nodes:x.nodes.map(n=>n.target)}))});
  console.log(`${browserName} ${name}: ${result.violations.length} accessibility violations`);
  assert.equal(result.violations.length,0,JSON.stringify(result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,details:n.failureSummary}))})),null,2));
}
async function dialogKeyboard(name){
  const dialog=page.getByRole('dialog',{name,exact:true});await expect(dialog).toBeFocused();
  await page.keyboard.press('Shift+Tab');assert.ok(await dialog.evaluate(e=>e.contains(document.activeElement)));const last=await page.evaluate(()=>document.activeElement.outerHTML);
  await page.keyboard.press('Tab');assert.ok(await dialog.evaluate(e=>e.contains(document.activeElement)));assert.notEqual(await page.evaluate(()=>document.activeElement.outerHTML),last);
  assert.equal(await page.locator('#root').evaluate(e=>e.inert),true);
  await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);assert.equal(await page.locator('#root').evaluate(e=>e.inert),false);keyboard.push(`${name}: tab containment, Escape, background inertness`);
}
try{
  await page.goto(origin);await page.getByRole('heading',{name:'Inspection reports.'}).waitFor();await scan('library-empty');
  for(const width of widths){await resize(width);await layout(`empty-library-${width}`);}
  await resize(1440);const helpButton=page.getByRole('button',{name:'Help & storage',exact:false});await helpButton.click();await scan('storage-help-dialog');await dialogKeyboard('Reports & storage');await expect(helpButton).toBeFocused();
  await restoreSample(page);await page.getByLabel('Client name',{exact:true}).waitFor();
  for(let index=0;index<7;index++){await chooseStep(index);await scan(`step-${index+1}-desktop`);}
  await page.getByRole('button',{name:'Menu: collapse sidebar',exact:true}).click();await scan('compact-section-navigation');for(let index=0;index<7;index++){await chooseStep(index);await expect(page.locator('.steps .step').nth(index)).toHaveAttribute('aria-current','step');await layout(`compact-step-${index+1}`);}await page.getByRole('button',{name:'Menu: expand sidebar',exact:true}).click();
  for(const width of widths){await resize(width);for(let index=0;index<7;index++){await chooseStep(index);await layout(`step-${index+1}-${width}`);}console.log(`${browserName}: all seven steps fit ${width}px`);}
  await resize(320);await chooseStep(6);await scan('review-320px');
  await page.getByRole('button',{name:'Open navigation',exact:true}).click();const drawer=page.getByRole('dialog',{name:'Report navigation'});await scan('mobile-drawer');await expect(page.getByRole('button',{name:'Close navigation',exact:true})).toBeFocused();
  await page.keyboard.press('Shift+Tab');assert.ok(await drawer.evaluate(e=>e.contains(document.activeElement)));await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Close navigation',exact:true})).toBeFocused();await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Open navigation',exact:true})).toBeFocused();keyboard.push('mobile drawer: tab containment, Escape and focus restoration');
  await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('button',{name:'Help & storage',exact:false}).click();await scan('mobile-nested-dialog');await dialogKeyboard('Reports & storage');await expect(page.getByRole('button',{name:'Help & storage',exact:false})).toBeFocused();await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.body.style.overflow),'');
  await resize(1440);await chooseStep(0);
  await page.locator('.skip-link').focus();await page.keyboard.press('Enter');await expect(page.locator('#main-content')).toBeFocused();
  for(let i=0;i<24;i++){
    await page.keyboard.press('Tab');
    const visible=await page.evaluate(()=>{const active=document.activeElement;if(active===document.body)return {ok:false,name:'body'};const target=active.closest('.stage-option,.signature-upload')||active;const r=target.getBoundingClientRect();const left=Math.max(0,r.left),right=Math.min(innerWidth,r.right),top=Math.max(0,r.top),bottom=Math.min(innerHeight,r.bottom);if(right<=left||bottom<=top)return {ok:false,name:active.outerHTML};const hit=document.elementFromPoint((left+right)/2,(top+bottom)/2);return {ok:target===hit||target.contains(hit),name:active.getAttribute('aria-label')||active.textContent?.slice(0,50)||active.tagName};});
    assert.ok(visible.ok,`Keyboard focus is offscreen or covered: ${visible.name}`);
  }
  keyboard.push('skip link and 24 consecutive visible keyboard focus positions');
  for(let index=0;index<6;index++){await chooseStep(index);await page.getByRole('button',{name:'Complete step & continue',exact:true}).click();}
  await page.getByRole('button',{name:'Mark as ready for export',exact:true}).click();await scan('review-ready');
  await page.getByRole('button',{name:'All inspection reports',exact:true}).click();await scan('library-populated');
  for(const width of widths){await resize(width);await layout(`populated-library-${width}`);}
  await resize(1440);await page.getByRole('button',{name:'Create report',exact:true}).click();await page.getByRole('button',{name:'Complete step & continue',exact:true}).click();await scan('required-field-errors');
  await resize(320);await scan('required-field-errors-320px');await layout('required-field-errors-320px');
  await resize(1440);await page.getByRole('button',{name:'View all sections',exact:true}).click();await scan('all-sections-view');await resize(320);await layout('all-sections-view-320px');
  assert.deepEqual(errors,[]);
  passed=true;
  console.log(`${browserName}: ${scans.length} clean accessibility scans, ${layouts.length} responsive cases, keyboard checks passed.`);
}catch(error){await page.screenshot({path:`test-results/${browserName}-standards-failure.png`,fullPage:true}).catch(()=>{});throw error;}
finally{
  await mkdir('test-results',{recursive:true});await writeFile(`test-results/${browserName}-standards.json`,JSON.stringify({status:passed?'passed':'failed',browser:browserName,scans,layouts,keyboard,errors},null,2));await context.close();await browser.close();
}
