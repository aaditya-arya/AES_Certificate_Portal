import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openDatabase} from '../server/sqlite.js';
import {handleApi} from '../server/api.js';
import {newReport} from '../src/model.js';
import {fullReport} from './workflow-fixtures.mjs';
function client(db){return async(method,path,body,version)=>{const response=await handleApi(new Request('https://portal.example/api/v1'+path,{method,headers:{'Content-Type':'application/json',...(version?{'If-Match':`"${version}"`}:{})},...(body?{body:JSON.stringify(body)}:{})}),db,{apiKey:'test-integration'});return {status:response.status,body:response.status===204?null:await response.json()};};}
test('automatic AES references produce distinct persistent phone URLs in create, list, read and link responses',async()=>{
 const filename=join(mkdtempSync(join(tmpdir(),'aes-links-')),'links.sqlite');let db=openDatabase(filename),call=client(db);try{const reports=await Promise.all([fullReport('LINK-A'),fullReport('LINK-B')]);const saved=await Promise.all(reports.map(r=>call('POST','/reports',r)));for(const result of saved){assert.equal(result.status,201);assert.match(result.body.data.reportLink.url,/^https:\/\/portal\.example\/reports\/AESPL-TEST-DEMO-IR-QA-/);}assert.notEqual(saved[0].body.data.reportLink.url,saved[1].body.data.reportLink.url);
 const link=saved[0].body.data.reportLink;assert.equal((await call('GET',`/reports/${reports[0].id}/link`)).body.data.url,link.url);assert.equal((await call('GET',`/report-links/${link.slug}`)).body.data.report.id,reports[0].id);assert.ok((await call('GET','/reports')).body.data.every(r=>r.reportLink.url));db.close();db=openDatabase(filename);call=client(db);assert.equal((await call('GET',`/report-links/${link.slug}`)).body.data.report.id,reports[0].id);
 }finally{db.close();}
});
test('legacy duplicate/sanitized references never resolve to another report; corrected and deleted references retain their identity',async()=>{
 const db=openDatabase(':memory:'),call=client(db);try{const a={...newReport(),reportNo:'AES/TEST/001',numberingMode:'manual'},b={...a,id:crypto.randomUUID()},c={...a,id:crypto.randomUUID(),reportNo:'AES-TEST-001'};const results=await Promise.all([a,b,c].map(r=>call('POST','/reports',r)));assert.ok(results.every(r=>r.status===201));assert.equal(new Set(results.map(r=>r.body.data.reportLink.url)).size,3);for(let i=0;i<3;i++)assert.equal((await call('GET',`/report-links/${results[i].body.data.reportLink.slug}`)).body.data.report.id,[a,b,c][i].id);
 const old=results[0].body.data.reportLink;a.reportNo='AES/TEST/CORRECTED';const updated=await call('PUT',`/reports/${a.id}`,a,1);const fresh=updated.body.data.reportLink;assert.notEqual(fresh.slug,old.slug);assert.equal((await call('GET',`/report-links/${old.slug}`)).body.data.report.reportNo,a.reportNo);assert.equal((await call('GET',`/report-links/${fresh.slug}`)).body.data.report.id,a.id);assert.equal((await call('DELETE',`/reports/${a.id}`,null,2)).status,204);assert.equal((await call('GET',`/report-links/${old.slug}`)).status,410);assert.equal((await call('GET',`/report-links/${fresh.slug}`)).status,410);assert.equal((await call('GET','/report-links/NOT-A-REAL-LINK')).status,404);
 const replacement={...newReport(),reportNo:'AES/TEST/001',numberingMode:'manual'};const next=await call('POST','/reports',replacement);assert.notEqual(next.body.data.reportLink.slug,old.slug);assert.equal((await call('GET',`/report-links/${old.slug}`)).status,410);
 }finally{db.close();}
});
test('links wait for an assigned report number and remain behind the existing origin and integration access checks',async()=>{
 const db=openDatabase(':memory:'),call=client(db);try{const report=newReport(),created=await call('POST','/reports',report);assert.equal(created.body.data.reportLink,null);assert.equal((await call('GET',`/reports/${report.id}/link`)).status,422);assert.equal((await call('GET','/integration/report-links/ANY')).status,401);const result=await handleApi(new Request('https://portal.example/api/v1/report-links/ANY',{headers:{Origin:'https://another.example'}}),db);assert.equal(result.status,403);
 }finally{db.close();}
});
test('new activity details start blank and long engineer input persists without reverting to template text',async()=>{
 const db=openDatabase(':memory:'),call=client(db);try{const report=newReport();assert.equal(report.activityDetails,'');assert.equal(report.activityDetailsMode,'custom');report.reportNo='AES/LONG/001';report.numberingMode='manual';report.activityDetails='START OF ENGINEER OBSERVATIONS\n'+('Measurements and findings for this visit.\n'.repeat(4000))+'END OF ENGINEER OBSERVATIONS';const created=await call('POST','/reports',report);assert.equal(created.status,201);const saved=(await call('GET',`/report-links/${created.body.data.reportLink.slug}`)).body.data.report;assert.equal(saved.activityDetails,report.activityDetails);assert.equal(saved.activityDetailsMode,'custom');
 }finally{db.close();}
});
