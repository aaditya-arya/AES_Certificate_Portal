import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../server/sqlite.js';
import {handleApi} from '../server/api.js';
import {newReport,hydrateReport,generalRows,narrative} from '../src/model.js';
import {newDocument} from '../src/document-model.js';
import {suggestedCode,reportNumberBase,documentNumberBase} from '../src/numbering.js';
import {randomizeSampleReport} from '../src/sample-data.js';
const fixture=()=>({...newReport(),client:'M/s. Indo Asia Copper Limited.',manufacturer:'M/s. Bharat Bijlee Limited.',inspector:'Sudhakar Joshi',clientCode:'IACL',manufacturerCode:'BEPL',inspectorCode:'AS',inspectionDate:'2026-11-07'});
function client(db){return async(method,path,data,version)=>{const response=await handleApi(new Request(`http://localhost/api/v1${path}`,{method,headers:{...(data?{'Content-Type':'application/json'}:{}),...(version?{'If-Match':`"${version}"`}:{})},...(data?{body:JSON.stringify(data)}:{})}),db);return {status:response.status,data:response.status===204?null:await response.json()};};}
test('AES numbering follows configured codes and inspection date while suggestions remain distinguishable from assigned codes',()=>{
 assert.equal(suggestedCode('M/s. Indo Asia Copper Limited.'),'IACL');assert.equal(suggestedCode('Mr. Sudhakar Joshi',true),'SJ');assert.equal(reportNumberBase(fixture()),'AESPL/IACL/BEPL/IR/AS/2611/07');assert.equal(reportNumberBase({...fixture(),inspectionDate:'31.02.2026'}),'');
 assert.equal(documentNumberBase('AESPL/IACL/BEPL/IR/AS/2611/0701','flash'),'AESPL/IACL/BEPL/FR/AS/2611/0701/');
 const old={...fixture(),reportNo:'LEGACY/CUSTOM/001'};delete old.numberingMode;assert.equal(hydrateReport(old).numberingMode,'manual');assert.equal(hydrateReport(old).reportNo,'LEGACY/CUSTOM/001');
});
test('concurrent inspections receive distinct stable numbers and deleted references are never reused',async()=>{
 const db=openDatabase(':memory:'),api=client(db);try{
  const reports=Array.from({length:8},fixture);const results=await Promise.all(reports.map(report=>api('POST','/reports',report)));assert.ok(results.every(result=>result.status===201));const numbers=results.map(result=>result.data.data.reportNo);assert.equal(new Set(numbers).size,8);assert.ok(numbers.includes('AESPL/IACL/BEPL/IR/AS/2611/0701'));
  const first=reports[0],saved=(await api('GET',`/reports/${first.id}`)).data.data.report;assert.equal(saved.reportNo,numbers[0]);assert.match(saved.visitSequence,/^\d{2}$/);
  const changed=await api('PUT',`/reports/${first.id}`,{...saved,project:'Updated project',inspectionDate:'2026-11-08'},1);assert.equal(changed.data.data.reportNo,numbers[0]);
  assert.equal((await api('DELETE',`/reports/${first.id}`,null,2)).status,204);const next=await api('POST','/reports',fixture());assert.equal(next.data.data.reportNo,'AESPL/IACL/BEPL/IR/AS/2611/0709');
 }finally{db.close();}
});
test('existing manual references are preserved and skipped when assigning fresh automatic references',async()=>{
 const db=openDatabase(':memory:'),api=client(db);try{
  const manual={...fixture(),reportNo:'AESPL/IACL/BEPL/IR/AS/2611/0701',numberingMode:'manual'};assert.equal((await api('POST','/reports',manual)).status,201);
  const fresh=await api('POST','/reports',fixture());assert.equal(fresh.data.data.reportNo,'AESPL/IACL/BEPL/IR/AS/2611/0702');
  const blank={...newReport(),client:'Only a client'};const partial=await api('POST','/reports',blank);assert.equal(partial.status,201);assert.equal(partial.data.data.reportNo,'');
 }finally{db.close();}
});
test('linked modules inherit the inspection reference with atomic per-type document sequences',async()=>{
 const db=openDatabase(':memory:'),api=client(db);try{
  const report=fixture(),created=await api('POST','/reports',report),number=created.data.data.reportNo;
  const documents=Array.from({length:5},()=>newDocument('flash',report.id));const createdDocs=await Promise.all(documents.map(document=>api('POST','/documents',document)));assert.ok(createdDocs.every(result=>result.status===201));const numbers=createdDocs.map(result=>result.data.data.number);assert.equal(new Set(numbers).size,5);assert.ok(numbers.includes(number.replace('/IR/','/FR/')+'/01'));
  const certificate=await api('POST','/documents',newDocument('irc',report.id));assert.equal(certificate.data.data.number,number.replace('/IR/','/IRC/')+'/01');
 }finally{db.close();}
});
test('one source table derives requester, PO date text, full address, attendees and narrative location correctly',()=>{
 const r={...fixture(),vendorPO:'PO/JFD/CP/ELE/10',vendorPODate:'2026-05-23',street:'Plot 53',area:'Airoli',city:'Navi Mumbai',state:'Maharashtra',postalCode:'400708',persons:[{id:'person',name:'Sudhakar Joshi',organization:'Akshar Engineering Services Pvt. Ltd.'}]};
 const rows=generalRows(r);assert.equal(rows[2][1],'PO/JFD/CP/ELE/10; Dated: 23.05.2026');assert.equal(rows[7][1],r.client);assert.ok(rows[6][1].includes('Navi Mumbai'));assert.ok(rows[6][1].includes('400708'));assert.ok(rows[9][1].includes('OBO Akshar'));assert.ok(narrative(r).includes('Maharashtra On 07.11.2026'));assert.ok(!narrative(r).includes('Navi Mumbai'));
});
test('a complete API report can be marked ready while its automatic number is assigned during persistence',async()=>{
 const db=openDatabase(':memory:'),api=client(db);try{const report=randomizeSampleReport({photos:[]},null,()=>.4);report.numberingMode='automatic';report.reportNo='';report.status='ready';const response=await api('POST','/reports',report);assert.equal(response.status,201,JSON.stringify(response.data));assert.equal(response.data.data.workflow,'completed');assert.ok(response.data.data.reportNo.startsWith(reportNumberBase(report)));}finally{db.close();}
});
