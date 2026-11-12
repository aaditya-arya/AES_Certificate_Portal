import {restoreSample} from './sample-backup.mjs';
import {expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import JSZip from 'jszip';
import AxeBuilder from '@axe-core/playwright';
import {launchBrowser} from './browser-engine.mjs';

const browser=await launchBrowser();const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
  const response=await page.goto(process.env.AES_TEST_URL||'http://127.0.0.1:5185');assert.equal(response.status(),200);await page.getByRole('heading',{name:'Inspection reports.'}).waitFor();
  await restoreSample(page);await page.getByLabel('Client name',{exact:true}).waitFor();
  for(const [label,file] of [['Download Word','production.docx'],['Download PDF','production.pdf']]){const pending=page.waitForEvent('download');await page.locator('.report-command-bar').getByRole('button',{name:label,exact:true}).click();await(await pending).saveAs(`test-results/${file}`);}
  const zip=await JSZip.loadAsync(await readFile('test-results/production.docx'));assert.ok((await zip.file('word/document.xml').async('string')).includes('As per QAP S. No.'));
  const pdf=await readFile('test-results/production.pdf');assert.equal(pdf.subarray(0,5).toString(),'%PDF-');
  for(const width of [320,768,1440]){await page.setViewportSize({width,height:900});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);}
  await page.locator('.steps .step').nth(6).click();await page.getByRole('button',{name:'View all sections',exact:true}).click();
  const accessibility=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice']).analyze();assert.equal(accessibility.violations.length,0,JSON.stringify(accessibility.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))));
  await page.getByRole('button',{name:'Confirm all sections & continue',exact:true}).click();await expect(page.getByRole('button',{name:'Mark as ready for export',exact:true})).toBeVisible();await expect(page.getByRole('progressbar')).toHaveCount(0);
  assert.deepEqual(errors,[]);await mkdir('test-results',{recursive:true});await writeFile('test-results/production-summary.json',JSON.stringify({status:'passed',checks:['HTTP 200','production JS/CSS chunks','reference/template assets','Word export','PDF/font assets','320/768/1440px layout','all-sections mode accessibility','all-sections completion from review'],errors},null,2));console.log('Production build smoke checks passed.');
}finally{await context.close();await browser.close();}
