import {once} from 'node:events';
import {expect} from '@playwright/test';
import {startServer} from '../server/index.js';
import {launchBrowser} from './browser-engine.mjs';
const running=startServer({port:0,database:':memory:'});await once(running.server,'listening');
const browser=await launchBrowser(),page=await browser.newPage();
try{
 await page.goto(`http://127.0.0.1:${running.server.address().port}`);
 await page.getByRole('button',{name:'Create report',exact:true}).first().click();
 await page.getByLabel('Client name',{exact:true}).fill('DATABASE VERSION');
 await expect(page.locator('#save-state')).toContainText('Saved to database');
 await page.route('**/api/v1/reports/**',route=>route.request().method()==='PUT'?route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({error:{code:'VERSION_CONFLICT',message:'Changed in another editor'}})}):route.continue());
 await page.getByLabel('Client name',{exact:true}).fill('UNSAVED VERSION');
 await page.getByRole('button',{name:'Reload saved version',exact:true}).click();
 await page.getByRole('button',{name:'Keep editing',exact:true}).click();
 await expect(page.getByLabel('Client name',{exact:true})).toHaveValue('UNSAVED VERSION');
 await page.getByRole('button',{name:'Reload saved version',exact:true}).click();
 await page.getByRole('dialog').getByRole('button',{name:'Reload saved version',exact:true}).click();
 await expect(page.getByLabel('Client name',{exact:true})).toHaveValue('DATABASE VERSION');
 await expect(page.locator('#save-state')).toContainText('Saved to database');
 console.log('Version conflict keeps edits, supports cancellation and reloads the saved report after confirmation.');
}finally{await browser.close();await running.close();}
