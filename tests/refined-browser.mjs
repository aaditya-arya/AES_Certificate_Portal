import {once} from 'node:events';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {createServer} from 'vite';
import {startServer} from '../server/index.js';
import {launchBrowser,browserName} from './browser-engine.mjs';
const api=startServer({port:0,database:':memory:'});await once(api.server,'listening');
const vite=await createServer({server:{host:'127.0.0.1',port:0,proxy:{'/api':{target:`http://127.0.0.1:${api.server.address().port}`,changeOrigin:false}}}});await vite.listen();
const browser=await launchBrowser(),context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
const errors=[];page.on('pageerror',error=>errors.push(error.message));await mkdir('test-results/refined',{recursive:true});
async function scan(){const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice']).analyze();assert.deepEqual(result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[]);}
try{
 await page.goto(`http://127.0.0.1:${vite.httpServer.address().port}`);await page.getByRole('heading',{name:/^Inspection reports\.?$/}).waitFor();
 await page.getByRole('button',{name:'Create sample report',exact:true}).click();await expect(page.getByLabel('Inspection visit report no.',{exact:true})).toHaveValue(/^SAMPLE\/AES\//);await page.getByRole('button',{name:'Save draft',exact:true}).click();await expect(page.locator('#save-state')).toContainText('Saved to database');
 await page.getByRole('button',{name:'All inspection reports',exact:true}).click();await expect(page.locator('.report-list tbody tr')).toHaveCount(1);
 const row=await page.locator('.portal-filter-bar').evaluate(element=>[...element.children].filter(child=>getComputedStyle(child).display!=='none').map(child=>Math.round(child.getBoundingClientRect().top)));assert.ok(Math.max(...row)-Math.min(...row)<3,JSON.stringify(row));
 await scan();await page.screenshot({path:`test-results/refined/${browserName}-dashboard.png`});
 await page.locator('.advanced-filters summary').click();await expect(page.getByLabel('Accreditation type',{exact:true})).toBeVisible();await page.getByLabel('Inspection stage',{exact:true}).selectOption('Final Inspection');await expect(page.locator('#advanced-filter-count')).toHaveText('1');await page.keyboard.press('Escape');await expect(page.locator('.advanced-filters')).not.toHaveAttribute('open','');
 await page.getByRole('button',{name:'Reset filters',exact:true}).click();await page.getByRole('searchbox',{name:'Search reports',exact:true}).fill('does-not-exist-908');await expect(page.getByRole('heading',{name:'No matching reports'})).toBeVisible();await page.getByRole('button',{name:'Reset filters',exact:true}).click();await page.getByRole('button',{name:'Edit',exact:true}).click();await scan();await page.screenshot({path:`test-results/refined/${browserName}-editor.png`});
 for(const width of [320,390,768,1024,1440]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
 await page.setViewportSize({width:390,height:844});await scan();await page.screenshot({path:`test-results/refined/${browserName}-mobile.png`});
 await page.getByRole('button',{name:'All inspection reports',exact:true}).click();await page.locator('.advanced-filters summary').click();await scan();await page.getByRole('button',{name:'Close filters',exact:true}).click();
 for(const width of [320,390,768,821,1024,1440]){await page.setViewportSize({width,height:900});if(width>820&&await page.locator('.sidebar-toggle-button').getAttribute('aria-expanded')==='false')await page.keyboard.press('Control+b');await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);}
 const outputs=await page.evaluate(async()=>{
  const {loadExample}=await import('/src/model.js');const {generatePDF}=await import('/src/pdf.js');const report=await loadExample();
  const encode=blob=>new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.readAsDataURL(blob);});
  const reference=await encode(await generatePDF(report));
  const {randomizeSampleReport}=await import('/src/sample-data.js');const sample=randomizeSampleReport({photos:report.photos},null,()=>.4);const random=await encode(await generatePDF(sample));
  report.documents=Array.from({length:24},(_,i)=>({...report.documents[i%5],id:crypto.randomUUID(),description:`Extended document ${i+1}: `+report.documents[i%5].description}));report.photos[0].caption='Long caption '.repeat(100);const extended=await encode(await generatePDF(report));return {reference,random,extended};
 });
 for(const [name,data]of Object.entries(outputs))await writeFile(`test-results/refined/${name}.pdf`,Buffer.from(data,'base64'));
 assert.deepEqual(errors,[]);console.log(`${browserName}: single-row search, secondary filters, search/reset, responsive editor, clean accessibility scans and three PDF fixtures passed.`);
}catch(error){console.log('Browser errors:',errors);console.log((await page.locator('body').innerText()).slice(-1800));await page.screenshot({path:`test-results/refined/${browserName}-failure.png`});throw error;}finally{await browser.close();await vite.close();await api.close();}
