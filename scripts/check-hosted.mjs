import {createInterface} from 'node:readline';
import assert from 'node:assert/strict';
import {newReport,today} from '../src/model.js';
import {reportNumberBase} from '../src/numbering.js';
import {newDocument} from '../src/document-model.js';

// Credentials are supplied through hidden stdin and never persisted.
if(process.stdin.isTTY)process.stdin.setRawMode(true);
console.log('Ready for hosted verification JSON on stdin (input is hidden).');
const terminal=createInterface({input:process.stdin,terminal:false});
const input=await new Promise(resolve=>terminal.once('line',resolve));terminal.close();
if(process.stdin.isTTY)process.stdin.setRawMode(false);
const {url,token}=JSON.parse(input),origin=new URL(url).origin;
const call=(path,options={})=>fetch(`${origin}/api/v1${path}`,{...options,redirect:'error',headers:{Origin:origin,'OAI-Sites-Authorization':`Bearer ${token}`,...options.headers}});
const report=newReport();Object.assign(report,{client:'Temporary deployment verification',manufacturer:'Temporary test vendor',inspector:'Deployment verifier',clientCode:`T${crypto.randomUUID().slice(0,6).toUpperCase()}`,manufacturerCode:'TEST',inspectorCode:'QA',inspectionDate:today()});
const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j7z8AAAAASUVORK5CYII=';
report.photos=[{id:'check-photo',name:'check.png',caption:'Temporary storage verification',data:image}];
let created=false;
const document=newDocument('flash',report.id);document.preparedBy='Deployment verifier';document.summary='Temporary deployment check';document.result='Accepted';document.nonconformance='NIL';document.outstanding='NIL';document.actionBy='None';document.items[0].description='Temporary inspection item';document.attachments=Array.from({length:3},(_,i)=>({id:crypto.randomUUID(),name:`document-check-${i}.png`,caption:`Temporary evidence ${i+1}`,data:image}));let documentCreated=false;
try{
 const health=await call('/health');assert.equal(health.status,200);assert.equal((await health.json()).data.storage,'d1');
 const response=await call('/reports',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(report)});assert.equal(response.status,201);created=true;const assigned=(await response.json()).data;assert.equal(assigned.reportNo,reportNumberBase(report)+'01');assert.equal(assigned.reportLink.url,origin+assigned.reportLink.path);const linkedPage=await fetch(assigned.reportLink.url,{redirect:'error',headers:{'OAI-Sites-Authorization':`Bearer ${token}`}});assert.equal(linkedPage.status,200);assert.ok((await linkedPage.text()).includes('/assets/index-'));const resolved=(await(await call('/report-links/'+assigned.reportLink.slug)).json()).data;assert.equal(resolved.report.id,report.id);
 const detail=await call(`/reports/${report.id}`);assert.equal(detail.status,200);const saved=(await detail.json()).data;assert.equal(saved.report.client,report.client);assert.equal(saved.report.photos[0].data,image);
 const media=await call(`/reports/${report.id}/media/photo-check-photo`);assert.equal(media.status,200);assert.equal(media.headers.get('Content-Type'),'image/png');
 const schema=await call('/openapi.json');assert.equal(schema.status,200);assert.equal((await schema.json()).openapi,'3.1.0');
 const docResponse=await call('/documents',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(document)});assert.equal(docResponse.status,201);documentCreated=true;const docSaved=(await docResponse.json()).data;assert.equal(docSaved.context.reportId,report.id);assert.equal(docSaved.number,assigned.reportNo.replace('/IR/','/FR/')+'/01');
 assert.equal((await call(`/documents/${document.id}/files/${docSaved.attachments[0].id}`)).status,200);
 const issued=await call(`/documents/${document.id}/transitions`,{method:'POST',headers:{'Content-Type':'application/json','If-Match':'"1"'},body:JSON.stringify({action:'issue'})});assert.equal(issued.status,200);assert.equal((await issued.json()).data.status,'issued');
 const revised=await call(`/documents/${document.id}/transitions`,{method:'POST',headers:{'Content-Type':'application/json','If-Match':'"2"'},body:JSON.stringify({action:'revise'})});assert.equal(revised.status,200);assert.equal((await revised.json()).data.revision,'01');
 const history=await call(`/documents/${document.id}/history`);assert.equal((await history.json()).data.length,3);
 const exported=await call(`/documents/${document.id}/export`);assert.equal((await exported.json()).data.attachments.length,0);const historic=await call(`/documents/${document.id}/versions/2`);assert.equal((await historic.json()).data.attachments.length,3);
 console.log('Hosted D1 report, unique direct URL, link resolution, R2 photograph, media download and OpenAPI verification passed.');
 console.log('Hosted linked documents, attachments, issue/revision history and JSON export passed.');
}finally{
 if(documentCreated){const current=(await(await call(`/documents/${document.id}`)).json()).data;let version=current.version;if(current.status==='issued'){const cancelled=await call(`/documents/${document.id}/transitions`,{method:'POST',headers:{'Content-Type':'application/json','If-Match':`"${version}"`},body:JSON.stringify({action:'cancel-issue',note:'Temporary deployment check cleanup'})});assert.equal(cancelled.status,200);version=(await cancelled.json()).data.version;}const removed=await call(`/documents/${document.id}`,{method:'DELETE',headers:{'If-Match':`"${version}"`}});assert.equal(removed.status,204);console.log('Temporary linked document, history and attached file removed.');}
 if(created){const deleted=await call(`/reports/${report.id}`,{method:'DELETE',headers:{'If-Match':'"1"'}});assert.equal(deleted.status,204);assert.equal((await call(`/reports/${report.id}`)).status,404);console.log('Temporary test report and image removed.');}
}
