import {expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {launchBrowser,browserName} from './browser-engine.mjs';
import {seedSample} from './sample-report.mjs';

const browser=await launchBrowser();
const context=await browser.newContext({viewport:{width:1440,height:1000}});
const page=await context.newPage();page.setDefaultTimeout(15000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await mkdir(`test-results/${browserName}`,{recursive:true});
try{
  await page.goto(process.env.AES_TEST_URL||'http://127.0.0.1:5174');await page.getByRole('heading',{name:'Inspection reports.'}).waitFor();
  await expect(page.getByRole('button',{name:'Report template'})).toHaveCount(0);
  await seedSample(page);
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  const menu=page.getByRole('button',{name:'Expand sidebar',exact:true});
  assert.equal(await menu.locator('svg').evaluate(e=>getComputedStyle(e).color),'rgb(255, 255, 255)');
  await expect(page.locator('.app-shell')).toHaveClass(/sidebar-collapsed/);await expect(page.locator('.steps .step')).toHaveCount(7);
  for(let i=0;i<7;i++){
    const button=page.locator('.steps .step').nth(i);await expect(button).toBeVisible();await button.click();await expect(button).toHaveAttribute('aria-current','location');
    assert.equal(await page.locator('#report-sidebar').evaluate(e=>e.inert),false);
  }
  await page.locator('.steps .step').nth(1).focus();await page.keyboard.press('Enter');await expect(page.locator('#report-section-heading-1')).toBeFocused();await expect(page.locator('.steps .step').nth(1)).toHaveAttribute('aria-current','location');
  await page.screenshot({path:`test-results/${browserName}/compact-equipment.png`});
  const input=page.getByLabel('Item description row 1',{exact:true});assert.ok(await input.evaluate(e=>parseFloat(getComputedStyle(e).fontSize)>=18));
  await page.getByRole('button',{name:'Add equipment row',exact:true}).click();await expect(page.getByLabel('Item description row 2',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Remove equipment item 2',exact:true}).click();await expect(page.getByLabel('Item description row 2',{exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'All inspection reports',exact:true}).click();
  const leave=page.getByRole('dialog',{name:'Leave this report?'});await expect(leave).toBeVisible();await page.getByRole('button',{name:'Save draft & leave',exact:true}).click();await page.getByRole('heading',{name:'Inspection reports.'}).waitFor();
  await seedSample(page,{reportNo:'AES/SECOND/002',client:'Steel Client',project:'Copper plant',state:'Gujarat',inspectionDate:'2026-11-10',stages:['Pre-Shipment Inspection'],calibration:[{id:'second-instrument',instrument:'Gauge',identity:'ID-02',date:'2026-01-01',due:'2026-12-31',traceability:'NPL'}]});
  await page.getByRole('button',{name:'All inspection reports',exact:true}).click();
  const rows=page.locator('.portal-grid-table tbody tr');await expect(rows).toHaveCount(2);await expect(page.getByRole('button',{name:'Edit',exact:true})).toHaveCount(2);await expect(page.getByRole('button',{name:'Open',exact:true})).toHaveCount(0);
  await page.getByLabel('Search by',{exact:true}).selectOption('client');await page.getByLabel('Search reports',{exact:true}).fill('Reference Client');await expect(rows).toHaveCount(1);await expect(rows).toContainText('AES/UX/REFERENCE/001');
  await page.getByLabel('Accreditation type',{exact:true}).selectOption('NABL');await page.getByLabel('Inspection stage',{exact:true}).selectOption('Final Inspection');await page.getByLabel('Report status',{exact:true}).selectOption('draft');await page.getByLabel('Inspection date from',{exact:true}).fill('2026-11-07');await page.getByLabel('Inspection date to',{exact:true}).fill('2026-11-07');await expect(rows).toHaveCount(1);
  await page.getByLabel('Accreditation type',{exact:true}).selectOption('NPL');await expect(page.getByRole('heading',{name:'No matching reports',exact:true})).toBeVisible();await page.getByRole('button',{name:'Reset filters',exact:true}).click();await expect(rows).toHaveCount(2);
  await page.getByLabel('Search by',{exact:true}).selectOption('project');await page.getByLabel('Search reports',{exact:true}).fill('Copper');await expect(rows).toHaveCount(1);await expect(rows).toContainText('AES/SECOND/002');await page.getByRole('button',{name:'Reset filters',exact:true}).click();
  await page.getByRole('button',{name:'More actions for AES/SECOND/002',exact:true}).click();
  const deleteButton=page.getByRole('button',{name:'Delete report',exact:true});assert.equal(await deleteButton.evaluate(e=>getComputedStyle(e).color),'rgb(255, 255, 255)');await deleteButton.click();await expect(page.getByRole('dialog',{name:'Delete this report?',exact:true})).toBeVisible();await page.getByRole('button',{name:'Keep report',exact:true}).click();await expect(rows).toHaveCount(2);
  await page.screenshot({path:`test-results/${browserName}/workspace-library.png`});
  for(const width of [320,390,768,1024,1440,1920]){
    await page.setViewportSize({width,height:900});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  }
  await page.getByRole('button',{name:'Edit',exact:true}).first().click();await page.setViewportSize({width:390,height:844});await page.screenshot({path:`test-results/${browserName}/workspace-mobile.png`});
  await page.getByRole('button',{name:'Open sidebar',exact:true}).click();await expect(page.locator('.steps .step')).toHaveCount(7);await page.locator('.steps .step').nth(1).click();await expect(page.getByLabel('Item description row 1',{exact:true})).toBeVisible();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  assert.deepEqual(errors,[]);await writeFile(`test-results/${browserName}-workspace-summary.json`,JSON.stringify({status:'passed',browser:browserName,checks:['persistent compact section navigation and keyboard activation','visible menu and delete controls','18px input typography','labelled repeatable entry cards','selected-field search and compound filters','date bounds and reset','Edit actions','removal confirmation','mobile entry layout'],errors},null,2));console.log(`${browserName}: workspace UX checks passed.`);
}catch(error){await page.screenshot({path:`test-results/${browserName}/workspace-failure.png`}).catch(()=>{});throw error;}
finally{await context.close();await browser.close();}
